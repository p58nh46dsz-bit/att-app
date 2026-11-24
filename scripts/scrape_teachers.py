#!/usr/bin/env python3
"""
Scrapes the teachers' timetable from the academy's site (атт.спб.рф): one PDF per day and per building,
  .../images/Rasp/DD-MM-prepod-1-2-korp.pdf   (rows: teacher, then for each of 5 pairs: group, subject, room)
  .../images/Rasp/DD-MM-prepod-3-korp.pdf     (rows: teacher, room, then the group that has the teacher on each pair)
and writes teacher_schedule.json: every lesson of every teacher for the day.

Usage: python3 scrape_teachers.py [--target today|tomorrow|auto] [--out teacher_schedule.json]
       python3 scrape_teachers.py --date 2026-11-20
       python3 scrape_teachers.py --back 6          (also the days of the past week that are not in the file yet)
       python3 scrape_teachers.py --file 1-2:path.pdf --file 3:path.pdf --date 2026-11-20   (parse local copies)
"""
import argparse
import datetime
import json
import re
import sys
import urllib.request

import pdfplumber

BASE_URL = "http://xn--80a0ba.xn--90a1af.xn--p1ai/images/Rasp/"

# Bell schedules — same as scrape_schedule.py ("обед после 2 пары"); period 0 of the 3rd building has no known time.
BELLS = {
    "1-2": {1: ((9, 0), (10, 30)), 2: ((10, 50), (12, 20)), 3: ((13, 25), (14, 45)), 4: ((15, 0), (16, 20)), 5: ((16, 30), (17, 50))},
    "3": {1: ((9, 0), (10, 30)), 2: ((10, 40), (12, 10)), 3: ((12, 55), (14, 25)), 4: ((14, 35), (15, 55)), 5: ((16, 5), (17, 25))},
}
WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]

GROUP_RE = re.compile(r"^[А-ЯЁ]{1,3}-?\d{2,3}")           # ДВ-41, КТ-62, ДВ41, ДИ65(2)
INITIALS_RE = re.compile(r"^[А-ЯЁ]\.[А-ЯЁ]\.?$")
SURNAME_RE = re.compile(r"^[А-ЯЁ][А-Яа-яЁё-]{1,}$")


def fetch_pdf(url, out_path):
    """The site answers HTTP 200 with an HTML page when a file isn't published, so check the content."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
    except Exception as e:  # noqa: BLE001
        print(f"fetch error for {url}: {e}", file=sys.stderr)
        return False
    if not data.startswith(b"%PDF"):
        print(f"not a PDF (probably not published yet): {url}", file=sys.stderr)
        return False
    with open(out_path, "wb") as f:
        f.write(data)
    return True


def lines_of(page, tol=2.5):
    """Words of a page grouped into text lines (top to bottom), each line sorted left to right."""
    words = sorted(page.extract_words(), key=lambda w: (w["top"], w["x0"]))
    lines = []
    for w in words:
        if lines and abs(lines[-1][0] - w["top"]) <= tol:
            lines[-1][1].append(w)
        else:
            lines.append([w["top"], [w]])
    return [sorted(ws, key=lambda w: w["x0"]) for _, ws in lines]


def norm_group(text):
    """'ДВ41(2)' -> ('ДВ-41', '(2)'); 'ДВ-41' -> ('ДВ-41', '')."""
    m = re.match(r"^([А-ЯЁ]{1,3})-?(\d{2,3})(.*)$", text)
    if not m:
        return text, ""
    return f"{m.group(1)}-{m.group(2)}", m.group(3)


def title_name(surname, initials):
    """'КОРОЩЕНКО' + 'А.В.' -> 'Корощенко А.В.' (the 3rd building prints names in capitals)."""
    parts = [p.capitalize() if p.isupper() else p for p in surname.split("-")]
    return f"{'-'.join(parts)} {initials}"


# ── 1-2 корпус: Преподаватель | (Группа Дисциплина Аудит) x 5 pairs ─────────────────────────────────────────
PERIOD_BASE_12 = [81, 181, 281, 381, 481]   # x of the "Группа" column of pairs 1..5; each pair is ~100 wide


def name_texts(line):
    """Texts of the teacher-name cells of a line. 'В.А.1к' (a load note glued to the initials) -> 'В.А.'."""
    texts = [w["text"] for w in line if w["x0"] < 75]
    if texts:
        texts[-1] = re.sub(r"(?<=\.)\d+к?$", "", texts[-1])
    return texts


def join_split_names(ls):
    """A long surname can wrap: 'Меньщикова' on one line and 'Е.В.' a line below, with the group cells in between.
    Glue the surname line, the initials line and the cell-only lines between them into one row."""
    out, used = [], set()
    for i, line in enumerate(ls):
        if i in used:
            continue
        t = name_texts(line)
        if len(t) == 1 and SURNAME_RE.match(t[0]):
            for j in range(i + 1, min(len(ls), i + 4)):
                nt = name_texts(ls[j])
                if len(nt) == 1 and INITIALS_RE.match(nt[0]):
                    between = ls[i + 1:j]
                    if (ls[j][0]["top"] - line[0]["top"] <= 14
                            and all(not name_texts(b) and b for b in between)):
                        merged = list(line) + list(ls[j]) + [w for b in between for w in b]
                        out.append(sorted(merged, key=lambda w: w["x0"]))
                        used.update(range(i + 1, j + 1))
                        break
            else:
                out.append(line)
        else:
            out.append(line)
    return out


def parse_corpus12(path):
    lessons = []
    slots = {}   # (page, teacher, period) -> lesson; a pair's group and subject can be printed on separate lines
    with pdfplumber.open(path) as pdf:
        for pi, page in enumerate(pdf.pages):
            ls = join_split_names(lines_of(page))
            named = []   # (top, teacher) for every line that starts with a teacher's name
            for line in ls:
                texts = name_texts(line)
                if len(texts) >= 2 and SURNAME_RE.match(texts[0]) and INITIALS_RE.match(texts[-1]):
                    named.append((line[0]["top"], " ".join(texts)))
            current = None
            for line in ls:
                if any(t["text"].startswith(("Зав.", "стр")) or "____" in t["text"] or re.match(r"^\d{2}\.\d{2}\.\d{4}$", t["text"]) for t in line):
                    continue                      # page footer: signature line and print time
                cells = [w for w in line if w["x0"] >= 75 and w["text"] not in ("Группа", "Дисциплина", "Аудит")]
                texts = name_texts(line)
                if len(texts) >= 2 and SURNAME_RE.match(texts[0]) and INITIALS_RE.match(texts[-1]):
                    current = " ".join(texts)
                elif texts and not cells:
                    continue                      # headers, "ЦК-01", notes such as "(11к)"
                elif not texts and cells and named:
                    # group cells printed a few points off their name line belong to the nearest teacher row
                    top = line[0]["top"]
                    dist, nearest = min(((abs(t - top), n) for t, n in named), key=lambda x: x[0])
                    current = nearest if dist <= 15 else None
                if not cells or current is None:
                    continue
                cell = {}
                for w in cells:
                    idx = int((w["x0"] - 76) // 100)
                    if not 0 <= idx < 5:
                        continue
                    off = w["x0"] - PERIOD_BASE_12[idx]
                    slot = cell.setdefault(idx + 1, {"group": "", "subj": [], "room": []})
                    if off < 26 and GROUP_RE.match(w["text"]):
                        slot["group"] = w["text"]
                    elif off < 78:
                        slot["subj"].append(w["text"])
                    else:
                        slot["room"].append(w["text"])
                for period, c in cell.items():
                    notes = [t for t in c["subj"] if re.match(r"^\(.*\)$", t)]       # "(11к)" and similar remarks
                    subj = [t for t in c["subj"] if t not in notes]
                    if not subj and not c["group"]:
                        continue
                    rec = slots.setdefault((pi, current, period),
                                           {"teacher": current, "period": period, "group": "", "subj": "", "room": "", "note": ""})
                    rec["group"] = rec["group"] or c["group"]
                    rec["subj"] = " ".join(x for x in (rec["subj"], " ".join(subj)) if x)
                    rec["room"] = " ".join(x for x in (rec["room"], " ".join(c["room"])) if x)
                    rec["note"] = " ".join(x for x in (rec["note"], " ".join(notes)) if x)
    return list(slots.values())


# ── 3 корпус: ФИО | каб. | groups under the pair columns 0..5 ──────────────────────────────────────────────
def parse_corpus3(path):
    lessons = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            ls = lines_of(page)
            head = next((l for l in ls if [w["text"] for w in l[:6]] == ["0", "1", "2", "3", "4", "5"]), None)
            if head is None:
                continue
            centers = {int(w["text"]): (w["x0"] + w["x1"]) / 2 for w in head}
            for line in ls:
                texts = [w["text"] for w in line]
                if len(texts) < 3 or not SURNAME_RE.match(texts[0]):
                    continue
                k = next((i for i in range(1, min(len(texts), 4)) if INITIALS_RE.match(texts[i])), None)
                if k is None:
                    continue
                name = title_name(" ".join(texts[:k]) if k > 1 else texts[0], texts[k])
                room = texts[k + 1] if k + 1 < len(texts) and re.match(r"^\d{3,4}$", texts[k + 1]) else ""
                for w in line[k + (2 if room else 1):]:
                    if not GROUP_RE.match(w["text"]):
                        continue
                    c = (w["x0"] + w["x1"]) / 2
                    period = min(centers, key=lambda p: abs(centers[p] - c))
                    group, note = norm_group(w["text"])
                    lessons.append({"teacher": name, "period": period, "group": group, "subj": "", "room": room, "note": note})
    return lessons


def build_day(date, files=None):
    """All lessons of all teachers for one date. `files` maps '1-2'/'3' to local PDFs (otherwise they are downloaded).
    Returns None when neither building has a PDF for the date."""
    dd, mm = date.strftime("%d"), date.strftime("%m")
    out, urls = [], {}
    for corpus, suffix, parser in (("1-2", "1-2", parse_corpus12), ("3", "3", parse_corpus3)):
        url = f"{BASE_URL}{dd}-{mm}-prepod-{suffix}-korp.pdf"
        path = (files or {}).get(corpus) or f"/tmp/_prepod_{corpus}.pdf"
        if not (files or {}).get(corpus) and not fetch_pdf(url, path):
            continue
        urls[corpus] = url
        for l in parser(path):
            bells = BELLS[corpus].get(l["period"])
            l["corpus"] = corpus
            l["start"], l["end"] = (list(bells[0]), list(bells[1])) if bells else (None, None)
            out.append(l)
    if not urls:
        return None
    out.sort(key=lambda l: (l["teacher"], l["period"], l["corpus"], l["group"]))
    return {"date": date.strftime("%Y-%m-%d"), "weekday": WEEKDAYS[date.weekday()], "source_urls": urls,
            "generated_at": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat() + "Z", "lessons": out}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", choices=["today", "tomorrow", "auto"], default="auto")
    ap.add_argument("--date", help="YYYY-MM-DD (overrides --target)")
    ap.add_argument("--file", action="append", default=[], help="CORPUS:PATH of a local PDF, e.g. 1-2:a.pdf")
    ap.add_argument("--back", type=int, default=0, help="also fetch the N days before the target that are not in the file yet")
    ap.add_argument("--out", default="teacher_schedule.json")
    args = ap.parse_args()

    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    if args.date:
        target = datetime.date.fromisoformat(args.date)
    elif args.target == "today":
        target = now.date()
    elif args.target == "tomorrow":
        target = now.date() + datetime.timedelta(days=1)
    else:
        target = now.date() if now.hour < 9 else now.date() + datetime.timedelta(days=1)
    files = dict(f.split(":", 1) for f in args.file) if args.file else None

    try:
        with open(args.out, "r", encoding="utf-8") as f:
            existing = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        existing = {}
    days = existing.get("days", {})

    # the target day always (it may change during the day); earlier days only when the file doesn't have them yet
    wanted = [target] + [target - datetime.timedelta(days=i) for i in range(1, args.back + 1)
                         if (target - datetime.timedelta(days=i)).isoformat() not in days]
    day = None
    for d in wanted:
        rec = build_day(d, files if d == target else None)
        if rec is None:
            if d == target:
                # Not an error on a weekend (nothing is published); on a school day the caller retries later.
                print(f"no teachers' timetable published for {target}", file=sys.stderr)
                if args.back == 0:
                    sys.exit(0 if target.weekday() >= 5 else 1)
            continue
        if not rec["lessons"]:
            print(f"WARNING: no lessons parsed for {d} (parser mismatch?)", file=sys.stderr)
            if d == target and args.back == 0:
                sys.exit(1)
            continue
        days[rec["date"]] = rec
        if d == target:
            day = rec
    if day is None and not days:
        sys.exit(1)
    cutoff = (now.date() - datetime.timedelta(days=14)).strftime("%Y-%m-%d")
    days = {d: rec for d, rec in sorted(days.items()) if d >= cutoff}
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump({"generated_at": datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat() + "Z", "days": days}, f, ensure_ascii=False, indent=1)
    day = day or days[max(days)]
    teachers = {l["teacher"] for l in day["lessons"]}
    print(f"{day['date']}: {len(day['lessons'])} lessons, {len(teachers)} teachers -> {args.out}")


if __name__ == "__main__":
    main()
