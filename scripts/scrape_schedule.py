#!/usr/bin/env python3
"""
Scrapes the real class schedule for group ДВ-41 from att.spb.ru (АТТ Академия)
and writes schedule.json for the app to consume.

Usage: python3 scrape_schedule.py [--target today|tomorrow|auto] [--out schedule.json]
"""
import sys
import re
import json
import argparse
import datetime
import urllib.request

import pdfplumber

BASE_URL = "http://xn--80a0ba.xn--90a1af.xn--p1ai/images/Rasp/"
GROUP_CORPUS12 = "ДВ-41"   # hyphenated name used in 1-2 корпус PDFs
GROUP_CORPUS3 = "ДВ41"     # non-hyphenated name used in 3 корпус PDFs

# ДВ-41's weekly corpus rotation (per user confirmation)
CORPUS_BY_WEEKDAY = {
    0: "12",  # Monday    -> 1-2 корпус
    1: "3",   # Tuesday   -> 3 корпус
    2: "12",  # Wednesday -> 1-2 корпус
    3: "3",   # Thursday  -> 3 корпус
    4: "3",   # Friday    -> 3 корпус
}

# Bell schedules — "обед после 2 пары" variant (confirmed by user)
BELLS_CORPUS12 = {
    1: ((9, 0), (10, 30)),
    2: ((10, 50), (12, 20)),
    3: ((13, 25), (14, 45)),
    4: ((15, 0), (16, 20)),
    5: ((16, 30), (17, 50)),
}
BELLS_CORPUS3 = {
    1: ((9, 0), (10, 30)),
    2: ((10, 40), (12, 10)),
    3: ((12, 55), (14, 25)),
    4: ((14, 35), (15, 55)),
    5: ((16, 5), (17, 25)),
}

WEEKDAY_NAMES = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]


def next_school_day(base_date):
    """Return the next weekday (Mon-Fri) on/after base_date, skipping weekends."""
    d = base_date
    while d.weekday() >= 5:
        d += datetime.timedelta(days=1)
    return d


def fetch_pdf(url, out_path):
    """Fetch a PDF. The site returns HTTP 200 with an HTML "not found" page
    (instead of a real 404) when the file for a given date isn't published
    yet, so validate the actual content, not just the status code."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status != 200:
                return False
            data = resp.read()
    except Exception as e:
        print(f"fetch error for {url}: {e}", file=sys.stderr)
        return False
    if not data.startswith(b"%PDF"):
        print(f"not a PDF (likely not published yet): {url}", file=sys.stderr)
        return False
    with open(out_path, "wb") as f:
        f.write(data)
    return True


# ── Parser: 3 корпус format (table grid "0 1 2 3 4 5") ──────────────────────
PERIOD_X_C3 = {1: 79.8, 2: 161.2, 3: 242.6, 4: 324.0, 5: 405.4}


def classify_period_c3(x0):
    best, best_dist = None, 999
    for p, cx in PERIOD_X_C3.items():
        d = abs(x0 - cx)
        if d < best_dist:
            best_dist, best = d, p
    return best if best_dist < 45 else None


def cluster_names(tokens_sorted_by_x, gap_threshold=18):
    if not tokens_sorted_by_x:
        return []
    clusters = [[tokens_sorted_by_x[0]]]
    for w in tokens_sorted_by_x[1:]:
        prev = clusters[-1][-1]
        gap = w["x0"] - prev["x1"]
        if gap < gap_threshold:
            clusters[-1].append(w)
        else:
            clusters.append([w])
    names = []
    for c in clusters:
        s = c[0]["text"]
        for a, b in zip(c, c[1:]):
            gap = b["x0"] - a["x1"]
            s += ("" if gap < 1.5 else " ") + b["text"]
        names.append(s)
    return names


def parse_corpus3(pdf_path, group_code):
    result = {}
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            group_rows = [w for w in words if w["text"] == group_code and w["x0"] < 30]
            for grow in group_rows:
                gy = grow["top"]
                block = [w for w in words if gy - 20 <= w["top"] <= gy + 40 and w["x0"] > 55]

                subj_words = sorted([w for w in block if -3 <= w["top"] - gy <= 3], key=lambda w: w["x0"])
                room_words = sorted([w for w in block if -20 <= w["top"] - gy <= -5], key=lambda w: w["x0"])

                teach_words = [w for w in block if 8 <= w["top"] - gy <= 40]
                row_tops = sorted(set(round(w["top"]) for w in teach_words))
                bands = []
                for t in row_tops:
                    if bands and t - bands[-1][-1] <= 3:
                        bands[-1].append(t)
                    else:
                        bands.append([t])
                teacher_rows = []
                for band in bands:
                    row_tokens = sorted([w for w in teach_words if round(w["top"]) in band], key=lambda w: w["x0"])
                    teacher_rows.append(cluster_names(row_tokens))

                periods_order = [classify_period_c3(w["x0"]) for w in subj_words]
                rooms = {p: room_words[i]["text"] for i, p in enumerate(periods_order) if i < len(room_words)}

                teachers = {p: [] for p in periods_order}
                for row_names in teacher_rows:
                    for i, name in enumerate(row_names):
                        if i < len(periods_order):
                            teachers[periods_order[i]].append(name)

                for i, w in enumerate(subj_words):
                    p = periods_order[i]
                    if p is None:
                        continue
                    result[p] = {
                        "subj": w["text"],
                        "room": rooms.get(p, ""),
                        "teacher": " / ".join(dict.fromkeys(teachers.get(p, []))),
                    }
    return result


# ── Parser: 1-2 корпус format (3-column block, "N Subject" inline) ──────────
def parse_corpus12(pdf_path, group_code):
    result = {}
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            group_headers = [w for w in words if w["text"] == group_code]
            for gh in group_headers:
                header_top = gh["top"]
                row_headers = sorted(
                    [w for w in words if abs(w["top"] - header_top) < 2 and re.match(r"^Д[А-Я]-\d+", w["text"])],
                    key=lambda w: w["x0"],
                )
                try:
                    rank = next(i for i, w in enumerate(row_headers) if w["text"] == group_code)
                except StopIteration:
                    continue

                block_words = [w for w in words if header_top + 15 < w["top"] < header_top + 130]
                digit_tokens = [w for w in block_words if w["text"] in ("1", "2", "3", "4", "5")]
                digit_tokens.sort(key=lambda w: w["x0"])
                clusters = []
                for w in digit_tokens:
                    if clusters and w["x0"] - clusters[-1][-1]["x0"] < 40:
                        clusters[-1].append(w)
                    else:
                        clusters.append([w])
                clusters.sort(key=lambda c: c[0]["x0"])
                if rank >= len(clusters):
                    continue
                my_digits = sorted(clusters[rank], key=lambda w: w["top"])
                col_x0 = my_digits[0]["x0"]
                col_right = col_x0 + 190

                for dtok in my_digits:
                    period = int(dtok["text"])
                    dtop = dtok["top"]
                    subj_words = [
                        w for w in block_words
                        if abs(w["top"] - dtop) < 2 and col_x0 < w["x0"] < col_right
                        and w is not dtok and w["text"] not in ("1", "2", "3", "4", "5")
                    ]
                    subj = subj_words[0]["text"] if subj_words else None
                    if not subj:
                        continue
                    others = [
                        w for w in block_words
                        if col_x0 - 5 < w["x0"] < col_right and w["text"] not in ("1", "2", "3", "4", "5")
                        and w not in subj_words
                    ]
                    mine = [w for w in others if min(my_digits, key=lambda d: abs(d["top"] - w["top"])) is dtok]
                    mine.sort(key=lambda w: (w["top"], w["x0"]))

                    teachers, rooms, cur = [], [], []
                    i = 0
                    while i < len(mine):
                        w = mine[i]
                        if w["text"] == "каб":
                            teachers.append(" ".join(t["text"].rstrip(",") for t in cur))
                            cur = []
                            rooms.append(mine[i + 1]["text"] if i + 1 < len(mine) else "")
                            i += 2
                        else:
                            cur.append(w)
                            i += 1
                    result[period] = {"subj": subj, "teacher": " / ".join(teachers), "room": " / ".join(rooms)}
    return result


def build_schedule(target_date):
    weekday = target_date.weekday()
    corpus = CORPUS_BY_WEEKDAY.get(weekday)
    if corpus is None:
        return None

    dd = target_date.strftime("%d")
    mm = target_date.strftime("%m")

    if corpus == "12":
        url = f"{BASE_URL}{dd}-{mm}-grup-1-2-korp.pdf"
        pdf_path = "/tmp/_schedule_fetch.pdf"
        if not fetch_pdf(url, pdf_path):
            return None
        periods = parse_corpus12(pdf_path, GROUP_CORPUS12)
        bells = BELLS_CORPUS12
        corpus_label = "1-2"
    else:
        url = f"{BASE_URL}{dd}-{mm}-grup-3-korp.pdf"
        pdf_path = "/tmp/_schedule_fetch.pdf"
        if not fetch_pdf(url, pdf_path):
            return None
        periods = parse_corpus3(pdf_path, GROUP_CORPUS3)
        bells = BELLS_CORPUS3
        corpus_label = "3"

    lessons = []
    for period in sorted(periods.keys()):
        info = periods[period]
        if not info.get("subj"):
            continue
        start, end = bells.get(period, (None, None))
        if start is None:
            continue
        lessons.append({
            "period": period,
            "start": list(start),
            "end": list(end),
            "subj": info["subj"],
            "teacher": info.get("teacher", ""),
            "room": info.get("room", ""),
        })

    return {
        "date": target_date.strftime("%Y-%m-%d"),
        "weekday": WEEKDAY_NAMES[weekday],
        "corpus": corpus_label,
        "group": "ДВ-41",
        "lessons": lessons,
        "source_url": url,
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", choices=["today", "tomorrow", "auto"], default="auto")
    ap.add_argument("--out", default="schedule.json")
    args = ap.parse_args()

    now_utc = datetime.datetime.utcnow()
    if args.target == "today":
        base = now_utc.date()
    elif args.target == "tomorrow":
        base = now_utc.date() + datetime.timedelta(days=1)
    else:
        base = now_utc.date() if now_utc.hour < 9 else now_utc.date() + datetime.timedelta(days=1)

    target_date = next_school_day(datetime.datetime.combine(base, datetime.time()))
    target_date = target_date.date() if hasattr(target_date, "date") else target_date

    data = build_schedule(target_date)
    if data is None:
        print(f"FAILED to fetch/parse schedule for {target_date}", file=sys.stderr)
        sys.exit(1)

    if not data["lessons"]:
        print(f"WARNING: no lessons parsed for {target_date} (group may have a day off, or parser mismatch)", file=sys.stderr)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"OK: wrote {args.out} for {data['date']} ({data['weekday']}, corpus {data['corpus']}), {len(data['lessons'])} lessons")


if __name__ == "__main__":
    main()
