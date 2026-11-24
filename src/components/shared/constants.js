// Shared color palette, global stylesheet, schedule helpers/fallbacks and small lookup tables.
// No placeholder lessons: when the schedule can't be loaded the screens say so instead of inventing pairs.
const STUDENT_LESSONS_FALLBACK = [];
// 1 студент, 2 студента, 5 студентов
function rusPlural(n, one, few, many) { const m = n % 100, d = n % 10; return m > 10 && m < 20 ? many : d === 1 ? one : d >= 2 && d <= 4 ? few : many; }
// A tiny tap feedback on phones that support it (Android; iOS ignores it).
function tqTap() { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(8); } catch (e) { /* not available */ } }
const fmt = (h,m) => `${h}:${String(m).padStart(2,"0")}`;
const mins = (h,m) => h*60+m;

// ── Date helpers shared by the dashboard "today" card and the full Schedule screen ──
const WD_SHORT = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const WD_FULL  = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
// `confirmed` = these lessons come from a real, checked-for-today record
// (schedule.json), as opposed to placeholder/mock data whose weekday has no
// real meaning. Only mock data gets the blanket "no real check happened, so
// assume weekends are always empty" shortcut — confirmed data is trusted
// as-is, since the academy occasionally schedules classes on a Sat/Sun.
function getNextLesson(lessons, confirmed) {
  const now = new Date();
  if (!confirmed && isWeekend(now))
    return { subj:"Нет пар", room:"", timeStr:"—", label:"ВЫХОДНОЙ ДЕНЬ", online:false };
  const cur = now.getHours()*60 + now.getMinutes();
  for (let i = 0; i < lessons.length; i++) {
    const s = mins(...lessons[i].start), e = mins(...lessons[i].end);
    if (cur >= s && cur < e)
      return { ...lessons[i], timeStr:`${fmt(...lessons[i].start)} – ${fmt(...lessons[i].end)}`, label:"ИДЁТ ПАРА" };
    if (cur < s)
      return { ...lessons[i], timeStr:`${fmt(...lessons[i].start)} – ${fmt(...lessons[i].end)}`, label:"СЛЕДУЮЩАЯ ПАРА" };
  }
  if (lessons.length === 0 && isWeekend(now))
    return { subj:"Нет пар", room:"", timeStr:"—", label:"ВЫХОДНОЙ ДЕНЬ", online:false };
  if (lessons.length === 0)
    return confirmed
      ? { subj:"Сегодня пар нет", room:"", timeStr:"—", label:"НА СЕГОДНЯ ВСЁ", online:false }
      : { subj:"Расписание на сегодня не опубликовано", room:"", timeStr:"—", label:"РАСПИСАНИЕ", online:false };
  return { subj:"Занятия окончены", room:"До завтра!", timeStr:"—", label:"НА СЕГОДНЯ ВСЁ", online:false };
}

// Lunch in the 1st–2nd buildings: either after the 2nd pair (12:20–13:25, the timetable's default) or, as the teacher
// decides, in the middle of it (11:30–12:20) — then the pair runs 10:50–11:30 and 12:20–13:10. The 3rd building's
// lunch (12:10–12:55) never moves.
const LUNCH_SPLIT = { first:[11,30], back:[12,20], end:[13,10] };
const lunchPair = lessons => lessons.find(l => l.corpus === "1-2" && l.period === 2);
function lunchSegments(lessons, split) {
  if (!split) return lessons;
  return lessons.flatMap(l => !(l.corpus === "1-2" && l.period === 2) ? [l] : [
    { ...l, end: LUNCH_SPLIT.first, part: 1 },
    { ...l, start: LUNCH_SPLIT.back, end: LUNCH_SPLIT.end, part: 2 },
  ]);
}
// Lunch window of a lesson's building, in minutes: [start, end].
const lunchWindow = (corpus, split) => corpus === "3" ? [mins(12,10), mins(12,55)] : split ? [mins(11,30), mins(12,20)] : [mins(12,20), mins(13,25)];
// While lunch runs before the next lesson, the student's widget says "Обед" instead of "Следующая пара".
function withLunchLabel(l, nowMin, split) {
  if (!l || l.label !== "СЛЕДУЮЩАЯ ПАРА" || !Array.isArray(l.start)) return l;
  const [ls, le] = lunchWindow(l.corpus, split);
  return nowMin >= ls && nowMin < le && mins(...l.start) >= le ? { ...l, label: "ОБЕД" } : l;
}
// Progress of the pair a lesson belongs to, by the clock: from the pair's start to its end, a lunch break inside it included
// (so with a break the pair runs 10:50–13:10 and the percentage moves on through lunch).
// Times are in seconds since midnight. state: "live" (teaching now), "lunch" (inside the pair's break), "wait" (before it).
function pairProgress(lesson, segments, nowSec) {
  const parts = segments.filter(s => s.period === lesson.period && s.group === lesson.group && s.corpus === lesson.corpus)
    .map(s => ({ s: mins(...s.start) * 60, e: mins(...s.end) * 60, part: s.part }));
  if (!parts.length) parts.push({ s: mins(...lesson.start) * 60, e: mins(...lesson.end) * 60 });
  const total = parts.reduce((n, p) => n + (p.e - p.s), 0);
  const done = parts.reduce((n, p) => n + Math.min(Math.max(nowSec - p.s, 0), p.e - p.s), 0);
  const cur = parts.find(p => nowSec >= p.s && nowSec < p.e);
  const nextPart = parts.find(p => nowSec < p.s);
  const state = cur ? "live" : nextPart && done > 0 ? "lunch" : "wait";
  return {
    parts, total, done, state,
    frac: Math.min(1, Math.max(0, (nowSec - parts[0].s) / (parts[parts.length - 1].e - parts[0].s))),
    start: parts[0].s, end: parts[parts.length - 1].e,
    left: cur ? cur.e - nowSec : nextPart ? nextPart.s - nowSec : 0,   // to the end of this part, or to the next one
    lunchEnds: state === "lunch" ? nextPart.s : null,
  };
}
// Labels are kept upper-case as data (they are compared in code); on screen they read in sentence case.
const tqSentence = s => s ? s.charAt(0) + s.slice(1).toLowerCase() : s;
// Quiet tile for the teacher screens: a flat surface and a hairline, no gradient and no glow.
const TQ_TILE = { color:"var(--text)", background:"var(--card2)", boxShadow:"none", border:"1px solid var(--line)" };
const C = {
  bg:      "var(--bg)",
  surface: "var(--surface)",
  card:    "var(--card)",
  accent:  "var(--accent)",
  accentL: "var(--link)",
  green:   "#4CAF6B",
  amber:   "#F5A623",
  blue:    "var(--link)",
  text:    "var(--text)",
  sub:     "var(--sub)",
  border:  "var(--line)",
};
// Small localStorage helpers — wrapped in try/catch because private-browsing
// mode, disabled storage, or a full quota can make localStorage throw on
// read or write, and this app's state should degrade to "not persisted"
// rather than crash.
function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* ignore — nothing useful to do if storage is unavailable/full */
  }
}
const css = `
  /* Geologica is served from this site (vendor/fonts): no request to Google, no visitor addresses leave the server. */
  @font-face { font-family:'Geologica'; font-style:normal; font-weight:300 700; font-display:swap; src:url('./vendor/fonts/geologica-cyrillic-ext.woff2') format('woff2'); unicode-range:U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F; }
  @font-face { font-family:'Geologica'; font-style:normal; font-weight:300 700; font-display:swap; src:url('./vendor/fonts/geologica-cyrillic.woff2') format('woff2'); unicode-range:U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
  @font-face { font-family:'Geologica'; font-style:normal; font-weight:300 700; font-display:swap; src:url('./vendor/fonts/geologica-latin-ext.woff2') format('woff2'); unicode-range:U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF; }
  @font-face { font-family:'Geologica'; font-style:normal; font-weight:300 700; font-display:swap; src:url('./vendor/fonts/geologica-latin.woff2') format('woff2'); unicode-range:U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
  /* ── Themes. Light is the default (white, blue, red: the colours of the national flag); dark is the second theme. ── */
  :root, :root[data-theme="light"] {
    color-scheme:light;
    --bg:#F2F5FA; --surface:#FFFFFF; --surface2:#EDF2FA; --card:#FFFFFF; --card2:#F1F5FB; --line:#DFE6F1;
    --text:#0D1B36; --sub:#5C6C87; --sub2:#44536D; --link:#1B4DB4; --link2:#2A5FD0;
    --ok:#1B8A4C; --bad:#C8281C; --warn:#A8650A; --accent:#1B4DB4; --red:#D52B1E; --amber:#D98A0B; --green:#2E9E5B;
    --ring-a:#2A5FD0; --ring-b:#1B8A4C;
    --shadow:0 1px 2px rgba(16,38,84,.06), 0 8px 24px rgba(16,38,84,.07);
    --band:#0A2A72; --overlay:rgba(6,16,42,.62); --press:rgba(27,77,180,.08); --onband:#fff;
  }
  :root[data-theme="dark"] {
    color-scheme:dark;
    --bg:#0B1120; --surface:#101C33; --surface2:#0d1830; --card:#142240; --card2:#16233F; --line:#1E3560;
    --text:#FFFFFF; --sub:#7B9DBF; --sub2:#9fb4d1; --link:#4A8FE7; --link2:#6fb3f5;
    --ok:#5ec97a; --bad:#ff7e7e; --warn:#f5c067; --accent:#1F5CB8; --red:#E84C4C; --amber:#F5A623; --green:#4CAF6B;
    --ring-a:#6fb3f5; --ring-b:#5ec97a;
    --shadow:none; --band:#0B1120; --overlay:rgba(0,0,0,.6); --press:rgba(255,255,255,.06); --onband:#fff;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  /* Скрываем скроллбар (визуальную полосу прокрутки) везде в приложении —
     сама прокрутка (scroll, то есть возможность пролистать содержимое
     пальцем или колесом мыши) при этом продолжает работать как обычно,
     просто без видимой полоски сбоку. */
  * { scrollbar-width: none; -ms-overflow-style: none; }
  *::-webkit-scrollbar { display: none; width: 0; height: 0; }
  html {
    font-size: 100%; /* 1rem = 16px by default, but still scales with the OS text-size setting (iOS Dynamic Type / Android font scale) */
  }
  html, body {
    background: ${C.bg};
    /* height:100% + overflow:hidden полностью запрещают прокрутку (scroll)
       самой странице целиком. Без этого Safari (и на iPhone, и на Mac —
       в отличие от Chrome) даёт странице слегка "оттягиваться" пружинкой
       за края (elastic/rubber-band эффект, знакомый по тому, как в iOS
       прокрутка чуть "проскакивает" за конец списка и возвращается назад).
       Даже на доли пикселя это уже сдвигает вообще всё на странице —
       включая topbar, который должен быть неподвижен. Теперь прокручиваться
       может только то, что специально для этого предназначено (.dash и
       подобные), а не страница вокруг них. */
    height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
    color: ${C.text};
  }

  /* height (not min-height): .screen must be capped exactly to the viewport
     so .dash's overflow-y:auto (below) is the thing that actually scrolls —
     otherwise .screen just grows taller than the screen to fit its content,
     the whole page scrolls instead, and .topbar (sticky, relying on being
     pinned within a bounded scroll container) drifts off with it instead of
     staying put. 100dvh (dynamic viewport height) is the mobile-safe unit —
     unlike 100vh it accounts for a collapsing browser address bar; browsers
     that don't understand it just keep the 100vh line above. */
  /* overflow-y:auto here is a safety net, not the primary scroll mechanism —
     screens with their own internal scroll area (.dash, etc.) never actually
     need it, since they stay within height:100vh on their own. But a screen
     with no such area (e.g. the login form) would otherwise clip content
     that doesn't fit instead of scrolling to it, now that .screen is capped
     to the viewport instead of growing past it. */
  .screen { position:relative; display:none; flex-direction:column; height:100vh; height:100dvh; overflow-y:auto; }
  .screen.active { display:flex; }

  /* ── ANIMATIONS ── */
  @keyframes shake {
    0%,100% { transform:translateX(0); }
    20%      { transform:translateX(-8px); }
    40%      { transform:translateX(8px); }
    60%      { transform:translateX(-5px); }
    80%      { transform:translateX(5px); }
  }
  .field-shake { animation: shake .4s ease; }
  @keyframes successDrawCheck {
    from { stroke-dashoffset: 16; } to { stroke-dashoffset: 0; }
  }
  @keyframes successDrawRing {
    from { stroke-dashoffset: 63; } to { stroke-dashoffset: 0; }
  }
  .success-check-mark {
    stroke-dasharray: 16; stroke-dashoffset: 16;
    animation: successDrawCheck .35s cubic-bezier(.65,0,.35,1) forwards;
  }
  .success-check-ring {
    stroke-dasharray: 63; stroke-dashoffset: 63; transform-origin: center;
    animation: successDrawRing .45s cubic-bezier(.65,0,.35,1) .3s forwards;
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity:0; } to { opacity:1; }
  }
  @keyframes slideRight {
    from { opacity:0; transform:translateX(-20px); }
    to   { opacity:1; transform:translateX(0); }
  }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(31,92,184,.4); }
    50%      { box-shadow: 0 0 0 8px rgba(31,92,184,0); }
  }
  .anim-fadeup { animation: fadeUp .4s ease both; }
  @keyframes drawCheck { to { stroke-dashoffset:0; } }
  @keyframes drawCircle { to { stroke-dashoffset:0; } }
  .success-check-mark {
    stroke-dasharray:42; stroke-dashoffset:42;
    animation: drawCheck .35s ease-out .1s forwards;
  }
  .success-check-circle {
    stroke-dasharray:183; stroke-dashoffset:183; transform-origin:center; transform:rotate(-90deg);
    animation: drawCircle .5s ease-out .45s forwards;
  }
  [style*="fadeUp"] { animation-fill-mode: both !important; }
  .anim-fadein { animation: fadeIn .3s ease both; }

  /* ── LOGIN ── */
  .login-wrap {
    flex:1; display:flex; flex-direction:column; align-items:center;
    justify-content:center; padding:32px 24px; gap:24px;
  }
  .login-heading { font-size:1.5rem; font-weight:700; letter-spacing:-.3px; text-align:center; }
  .field-wrap { width:100%; position:relative; }
  .field-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:${C.sub}; font-size:0.9375rem; }
  .field-wrap input {
    width:100%; padding:14px 14px 14px 40px;
    background:${C.surface}; border:1px solid ${C.border}; border-radius:12px;
    color:${C.text}; font-family:inherit; font-size:0.9375rem; outline:none;
    transition: border-color .2s;
  }
  .field-wrap input:focus { border-color:${C.accent}; }
  .show-btn {
    position:absolute; right:14px; top:50%; transform:translateY(-50%);
    background:none; border:none; color:${C.sub}; cursor:pointer; font-size:0.75rem;
    display:flex; align-items:center; gap:4px;
  }
  .show-btn:hover { color:${C.accentL}; }
  .forgot { font-size:0.75rem; color:${C.sub}; cursor:pointer; background:none; border:none; font-family:inherit; }
  .forgot:hover { color:${C.accentL}; }
  .btn-primary {
    width:100%; padding:16px; border-radius:50px;
    background: linear-gradient(135deg, ${C.accent}, #0d3585);
    border:none; color:#fff; font-family:inherit; font-size:0.9375rem; font-weight:700;
    cursor:pointer; transition: opacity .15s, transform .1s;
    animation: pulse 2.5s infinite;
  }
  .btn-primary:hover { opacity:.9; }
  .btn-primary:active { transform:scale(.98); }
  .link-btn {
    background:none; border:none; color:${C.sub}; font-family:inherit; font-size:0.8125rem;
    cursor:pointer; display:flex; align-items:center; gap:6px;
    transition: color .2s;
  }
  .link-btn:hover { color:${C.accentL}; }
  .divider { width:100%; display:flex; align-items:center; gap:10px; }
  .divider-line { flex:1; height:1px; background:${C.border}; }
  .divider span { font-size:0.6875rem; color:${C.sub}; }

  /* ── LOGIN 2: a full-bleed photo melts into the night; emblem and form sit on the dark part (same in both themes) ── */
  .screen.login2 { --lg-bg:#0B1325; background:var(--lg-bg); color:#fff; overflow-x:hidden; isolation:isolate; }
  .login2-photo { position:absolute; z-index:-1; left:0; right:0; top:-6%; height:100%; overflow:hidden; }
  .login2-photo::before { content:""; position:absolute; inset:0; background:url(img/login-bg.jpg) 50% 0 / cover no-repeat;
    transform-origin:50% 40%; animation:login2Drift 26s ease-in-out infinite alternate; }
  .login2-photo::after { content:""; position:absolute; inset:0;
    background:radial-gradient(70% 22% at 50% 34%, rgba(11,19,37,.5), transparent 70%), linear-gradient(180deg, rgba(11,19,37,.62) 0%, rgba(11,19,37,.32) 20%, rgba(11,19,37,.18) 34%, rgba(11,19,37,0) 44%, rgba(11,19,37,.45) 54%, rgba(11,19,37,.85) 62%, var(--lg-bg) 70%); }
  .login2-body { position:relative; flex:1 0 auto; min-height:100%; display:flex; flex-direction:column; gap:12px;
    padding:calc(env(safe-area-inset-top) + 20px) 24px calc(env(safe-area-inset-bottom) + 22px); }
  .login2-gap { flex:1 1 auto; min-height:16px; }
  .sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
  .login2-emblem { position:relative; align-self:center; width:128px; height:128px; border-radius:50%; margin-top:6px;
    box-shadow:0 0 0 3px rgba(255,255,255,.95), 0 20px 50px rgba(3,8,22,.6);
    animation:login2In 1s cubic-bezier(.2,.9,.3,1.12) .05s both; }
  .login2-emblem::before { content:""; position:absolute; inset:-70px; z-index:-1; border-radius:50%;
    background:radial-gradient(circle, rgba(150,190,255,.42) 0%, rgba(110,160,255,.14) 38%, transparent 66%); animation:login2Glow 6s ease-in-out infinite; }
  .login2-emblem::after { content:""; position:absolute; inset:-14px; border-radius:50%; border:1px solid rgba(255,255,255,.28);
    -webkit-mask:linear-gradient(180deg,#000 30%,transparent 100%); mask:linear-gradient(180deg,#000 30%,transparent 100%); animation:login2Ring 1.2s cubic-bezier(.2,.9,.3,1) .35s both; }
  .login2-emblem > * { border-radius:50%; overflow:hidden; display:block; }
  .login2-name { margin:22px 0 0; text-align:center; color:#fff; font-size:1.375rem; line-height:1.18; font-weight:700; letter-spacing:-.2px;
    text-shadow:0 2px 16px rgba(5,10,25,.55); animation:login2Up .8s cubic-bezier(.2,.9,.25,1) .15s both; }
  .login2-place { margin-top:-4px; text-align:center; color:rgba(255,255,255,.7); font-size:.75rem; font-weight:600; letter-spacing:.14em; text-transform:uppercase;
    text-shadow:0 1px 10px rgba(5,10,25,.6); animation:login2Up .8s cubic-bezier(.2,.9,.25,1) .2s both; }
  .login2-forgot-sheet { padding:8px 24px calc(env(safe-area-inset-bottom) + 20px); text-align:center; display:flex; flex-direction:column; align-items:center; gap:12px; }
  .login2-fs-icon { width:60px; height:60px; margin-top:12px; border-radius:20px; display:flex; align-items:center; justify-content:center; color:var(--link); background:color-mix(in srgb, var(--link) 12%, var(--card)); }
  .login2-fs-title { margin:4px 0 0; font-size:1.375rem; font-weight:700; color:var(--text); }
  .login2-fs-text { margin:0; max-width:320px; font-size:.9375rem; line-height:1.5; color:var(--sub); }
  .login2-fs-note { margin:0; font-size:.8125rem; color:var(--sub); }
  .login2-fs-btn { width:100%; height:54px; margin-top:4px; border:none; border-radius:27px; font:inherit; font-size:1rem; font-weight:700; color:#fff; cursor:pointer; background:linear-gradient(180deg,#2C63D6,#1442A8); }
  .login2-fs-btn:active { transform:scale(.98); }
  .login2-group { border-radius:22px; overflow:hidden; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.14);
    -webkit-backdrop-filter:blur(20px) saturate(140%); backdrop-filter:blur(20px) saturate(140%); box-shadow:0 10px 30px rgba(3,8,22,.25);
    animation:login2Up .7s cubic-bezier(.2,.9,.25,1) .22s both; }
  .login2-row { display:flex; align-items:center; gap:12px; height:58px; padding:0 6px 0 18px; color:rgba(255,255,255,.5); cursor:text; transition:background .2s, color .2s; }
  .login2-row + .login2-row { border-top:1px solid rgba(255,255,255,.1); }
  .login2-row:focus-within { background:rgba(255,255,255,.06); color:#B9D2FF; }
  .login2-row input { flex:1; min-width:0; height:100%; border:none; outline:none; background:none; padding:0; color:#fff; font:inherit; font-size:1.0625rem; caret-color:#B9D2FF; }
  .login2-row input::placeholder { color:rgba(255,255,255,.5); }
  .login2-row input:-webkit-autofill { -webkit-text-fill-color:#fff; transition:background-color 9999s; }
  .login2-eye { width:44px; height:44px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border:none; background:none; color:rgba(255,255,255,.55); border-radius:14px; cursor:pointer; }
  .login2-eye:active { background:rgba(255,255,255,.08); }
  .login2-forgot { align-self:center; margin:2px 0 0; padding:8px 12px; border:none; background:none; font:inherit; font-size:.9375rem; font-weight:500; color:rgba(255,255,255,.62); cursor:pointer; animation:login2Up .7s cubic-bezier(.2,.9,.25,1) .42s both; }
  .login2-forgot:active { color:#fff; }
  .login2-error { display:flex; align-items:center; gap:8px; padding:12px 14px; border-radius:14px; font-size:.8125rem; line-height:1.35; color:#FF8A80;
    background:rgba(232,76,76,.14); border:1px solid rgba(232,76,76,.25); animation:login2Shake .4s ease; }
  .login2-primary { margin-top:6px; height:58px; border:none; border-radius:29px; font:inherit; font-size:1.0625rem; font-weight:700; color:#0A2A72; cursor:pointer;
    background:linear-gradient(180deg,#FFFFFF,#E3EAF6); box-shadow:0 12px 30px rgba(0,0,0,.35), inset 0 -1px 0 rgba(10,42,114,.12);
    display:flex; align-items:center; justify-content:center; transition:transform .15s, opacity .2s; animation:login2Up .7s cubic-bezier(.2,.9,.25,1) .34s both; }
  .login2-primary:active { transform:scale(.98); }
  .login2-primary:disabled { opacity:.85; }
  .login2-secondary { height:54px; border-radius:27px; font:inherit; font-size:1rem; font-weight:600; cursor:pointer; color:#fff;
    background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); transition:transform .15s, background .2s; animation:login2Up .7s cubic-bezier(.2,.9,.25,1) .38s both; }
  .login2-secondary:active { transform:scale(.98); background:rgba(255,255,255,.1); }
  .login2-spin { width:22px; height:22px; border-radius:50%; border:2.5px solid rgba(10,42,114,.25); border-top-color:#0A2A72; animation:login2Spin .7s linear infinite; }
  @keyframes login2In { from { opacity:0; transform:scale(.8); } to { opacity:1; transform:none; } }
  @keyframes login2Up { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
  @keyframes login2Glow { 0%,100% { opacity:.7; transform:scale(.95); } 50% { opacity:1; transform:scale(1.06); } }
  @keyframes login2Drift { from { transform:scale(1); } to { transform:scale(1.07) translateY(-1%); } }
  @keyframes login2Ring { from { opacity:0; transform:scale(.9); } to { opacity:1; transform:none; } }
  @keyframes login2Spin { to { transform:rotate(360deg); } }
  @keyframes login2Shake { 0%,100% { transform:none; } 25% { transform:translateX(-5px); } 75% { transform:translateX(5px); } }
  @media (prefers-reduced-motion: reduce) { .login2-photo::before, .login2-emblem, .login2-emblem::before, .login2 .login2-title, .login2-group, .login2-forgot, .login2-emblem::after, .login2-name, .login2-place, .login2-primary, .login2-secondary, .login2-error { animation:none; } }

  /* ── TOP BAR ── */
  .topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:calc(14px + env(safe-area-inset-top)) 20px 14px; flex-shrink:0; z-index:20;
    background:color-mix(in srgb, ${C.bg} 80%, transparent); backdrop-filter:blur(12px);
    border-bottom:1px solid ${C.border};
    /* .topbar живёт снаружи прокручиваемой области (.dash) — position:sticky
       ему больше не нужен структурно, но сам по себе он не был причиной
       дрожания при быстрой прокрутке на Safari. Настоящая причина —
       backdrop-filter:blur здесь же: это дорогой для видеочипа эффект,
       который должен пересчитываться каждый кадр, пока под ним быстро
       движется контент, и Safari иногда не успевает — элемент на долю
       секунды визуально отстаёт/дёргается. transform:translateZ(0) —
       стандартный приём, который просит браузер держать этот элемент на
       отдельном, всегда готовом графическом слое вместо пересчёта на лету. */
    transform: translateZ(0);
    will-change: transform;
  }
  .topbar-left { display:flex; align-items:center; gap:14px; }
  .notif-btn { position:relative; background:none; border:none; color:${C.text}; font-size:1.25rem; cursor:pointer; }
  .badge {
    position:absolute; top:-4px; right:-6px; background:#E84C4C;
    border-radius:50%; width:16px; height:16px; font-size:0.5625rem; font-weight:700;
    display:flex; align-items:center; justify-content:center;
  }
  .search-btn { background:none; border:none; color:${C.sub}; font-size:1.125rem; cursor:pointer; }
  .avatar-row { display:flex; align-items:center; gap:8px; }
  .avatar {
    width:32px; height:32px; border-radius:50%; background:${C.accent};
    display:flex; align-items:center; justify-content:center; font-size:0.8125rem; font-weight:700;
  }
  .avatar-name { font-size:0.8125rem; color:${C.sub}; }
  .tag-role {
    font-size:0.625rem; background:color-mix(in srgb, ${C.accent} 20%, transparent); color:${C.accentL};
    padding:3px 10px; border-radius:20px;
  }
  .tag-role.teacher { background:color-mix(in srgb, ${C.green} 13%, transparent); color:var(--ok); }
  .tag-role.applicant { background:color-mix(in srgb, ${C.blue} 13%, transparent); color:var(--link2); }

  /* ── DASH ── */
  .dash { flex:1; overflow-y:auto; padding:20px 20px calc(20px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:16px; }
  .greeting { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:8px; flex-shrink:0; }
  .greeting h1 { font-size:1.375rem; font-weight:700; }
  .group-tag { font-size:0.75rem; color:${C.sub}; background:${C.surface}; padding:4px 10px; border-radius:20px; }

  .next-class {
    background: linear-gradient(135deg, var(--surface), var(--surface2));
    border:1px solid color-mix(in srgb, ${C.accent} 27%, transparent); border-radius:16px; padding:16px; flex-shrink:0;
  }
  .next-class-label { font-size:0.75rem; font-weight:500; color:${C.accentL}; margin-bottom:8px; display:flex; align-items:center; gap:6px; }
  .next-class-row { display:flex; justify-content:space-between; align-items:flex-start; }
  .next-class-time { font-size:0.9375rem; font-weight:600; color:${C.accentL}; text-align:right; }
  .link-tag { font-size:0.75rem; color:${C.accentL}; margin-top:4px; display:flex; align-items:center; gap:4px; cursor:pointer; }

  .stats-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; flex-shrink:0; }
  .stat-card { background:${C.card}; border-radius:14px; padding:18px 16px; touch-action:manipulation; }
  .stat-label { font-size:0.875rem; font-weight:500; color:${C.sub}; display:flex; align-items:center; gap:8px; margin-bottom:10px; }
  .stat-val { font-size:1.625rem; font-weight:800; line-height:1; }
  .bar-track { height:5px; background:${C.border}; border-radius:3px; margin-top:8px; overflow:hidden; }
  .bar-fill { height:100%; border-radius:3px; background:${C.green}; transition: width 1s ease; }
  .bar-fill.accent { background:${C.accent}; }
  .bar-fill.blue { background:${C.blue}; }

  .quick-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; flex-shrink:0; }
  .quick-btn {
    background:${C.card}; border-radius:16px; padding:14px 6px 12px;
    display:flex; flex-direction:column; align-items:center; gap:9px;
    cursor:pointer; border:1px solid ${C.border};
    transition: background .18s ease, transform .18s ease, border-color .18s ease;
  }
  .quick-btn:hover { background:${C.surface}; transform:translateY(-3px); border-color:rgba(255,255,255,0.1); }
  .quick-btn:active { transform:scale(.95); }
  .quick-icon-box {
    width:44px; height:44px; border-radius:12px;
    display:flex; align-items:center; justify-content:center;
    font-size:1.375rem; transition: transform .18s ease;
  }
  .quick-btn:hover .quick-icon-box { transform:scale(1.1); }
  .quick-lbl {
    font-size:0.625rem; font-weight:600; color:${C.sub};
    text-align:center; line-height:1.3;
  }

  /* Flat quick-actions style — outline icons, no boxed icon backdrop, softer
     card frame. Separate classes from .quick-btn so this only affects the
     screens that opt in (kept .quick-btn/.quick-icon-box untouched). */
  .quick-carousel { display:flex; gap:10px; overflow-x:auto; scroll-snap-type:x proximity; padding-bottom:4px; flex-shrink:0; scrollbar-width:none; }
  .quick-carousel::-webkit-scrollbar { display:none; }
  .quick-carousel .quick-btn { flex:0 0 calc(25% - 8px); min-width:78px; scroll-snap-align:start; }
  /* ── Teacher cabinet: the app-like layer (scoped to .tq-*) ─────────────────────────────────────────────
     Immediate press feedback, no tap highlight, 44px targets, grouped lists with hairlines, a tab bar,
     skeleton loading, one easing curve. Nothing here touches the student, admin or applicant screens. */
  .tq-app, .tq-sheet, .tq-screen { -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
  .tq-app [role=button], .tq-app button, .tq-sheet [role=button], .tq-sheet button, .tq-screen [role=button], .tq-screen button {
    user-select:none; -webkit-user-select:none; transition:transform .12s cubic-bezier(.2,0,0,1), background-color .15s, border-color .15s, opacity .15s; }
  .tq-app [role=button]:active, .tq-app button:active, .tq-sheet [role=button]:active, .tq-sheet button:active, .tq-screen [role=button]:active, .tq-screen button:active { transform:scale(.98); }
  .tq-dash { padding-bottom:calc(16px + env(safe-area-inset-bottom)); overscroll-behavior-y:contain; }
  .tq-list { background:${C.card}; border-radius:14px; overflow:hidden; flex-shrink:0; }
  .tq-row { display:flex; align-items:center; gap:12px; padding:12px 16px; min-height:48px; cursor:pointer; background:transparent; transition:background-color .15s; }
  .tq-row + .tq-row { border-top:1px solid color-mix(in srgb, ${C.border} 40%, transparent); }
  .tq-row:active { background:var(--press); transform:none !important; }
  .tq-tabbar { display:flex; flex-shrink:0; background:color-mix(in srgb, ${C.bg} 95%, transparent); border-top:1px solid ${C.border}; padding:6px 8px calc(6px + env(safe-area-inset-bottom)); z-index:30; }
  .tq-tab { flex:1; min-height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; background:none; border:none; color:${C.sub}; font-family:inherit; font-size:0.6875rem; cursor:pointer; }
  .tq-tab.active { color:${C.accentL}; }
  .tq-bar { display:grid !important; grid-template-columns:1fr auto 1fr; align-items:center; }
  .tq-bar-title { font-size:0.9375rem; font-weight:600; text-align:center; white-space:nowrap; }
  .tq-seg { display:flex; background:${C.surface}; border:1px solid ${C.border}; border-radius:10px; padding:2px; gap:2px; flex-shrink:0; }
  .tq-seg > button { flex:1; background:none; border:none; border-radius:8px; padding:8px 0; color:${C.sub}; font-family:inherit; font-size:0.8125rem; cursor:pointer; min-height:36px; }
  .tq-seg > button.active { background:var(--card); color:${C.text}; }

  /* ── Teacher cabinet: top bar, carousel, motion ── */
  .screen.tq-app { --tq-top:calc(env(safe-area-inset-top) + 6px); }
  .standalone .screen.tq-app { --tq-top:max(calc(env(safe-area-inset-top) - 4px), 50px); }
  /* floating avatar and bell: no bar behind them, the page scrolls visibly underneath */
  /* avatar and bell are the first row of the page: they sit at the top and scroll away with the content */
  /* what scrolls up under the status bar blurs and fades out instead of being cut off */
  .tq-edge { position:fixed; top:0; left:0; right:0; height:var(--tq-top); z-index:15; pointer-events:none;
    -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px);
    background:linear-gradient(to bottom, color-mix(in srgb, ${C.bg} 85%, transparent), color-mix(in srgb, ${C.bg} 0%, transparent));
    -webkit-mask-image:linear-gradient(to bottom,#000 30%,transparent); mask-image:linear-gradient(to bottom,#000 30%,transparent); }
  .tq-top { display:flex; align-items:center; justify-content:space-between; position:static; background:transparent; border:none; backdrop-filter:none; transform:none; will-change:auto;
    padding:var(--tq-top) 0 0; margin-bottom:-4px; flex-shrink:0; }
  .tq-app .tq-dash { padding-top:0; padding-bottom:calc(24px + env(safe-area-inset-bottom)); }
  /* the teacher screen is pinned to the viewport, so nothing can scroll the page (and the top bar) on iOS */
  .screen.tq-app { position:fixed; inset:0; height:auto; overflow:hidden; }
  html.tallfix, html.tallfix body { height:var(--tq-vh); }
  html.tallfix .screen.tq-app { bottom:auto; height:var(--tq-vh); }
  .tq-me { display:flex; align-items:center; justify-content:center; width:44px; height:44px; cursor:pointer; }
  .tq-me { width:44px; height:44px; }
  .tq-me .avatar { width:36px; height:36px; font-size:0.8125rem; overflow:hidden; background-size:cover; background-position:center; }
  .tq-me .avatar-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:${C.text}; font-size:0.875rem; }
  .tq-top .notif-btn { width:44px; height:44px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .tq-top .notif-btn { color:#fff; width:44px; height:44px; border-radius:50%; background:transparent; }
  .tq-top .badge { top:9px; right:9px; width:10px; height:10px; font-size:0; border:2px solid ${C.bg}; box-sizing:content-box; }
  /* carousel: no lift on hover (it was clipped by the scroll area); press shrinks instead, with room around the cards */
  .tq-app .quick-carousel { padding:4px 2px 8px; margin:-4px -2px 0; scroll-padding-left:2px; }
  .tq-app .quick-btn:hover { transform:none; background:${C.card}; border-color:${C.border}; }
  .tq-app .quick-btn:hover .quick-icon-box { transform:none; }
  .tq-app .quick-btn:active { transform:scale(.96); background:${C.surface}; }
  .tq-app .stat-card:active { transform:scale(.97); }
  /* motion: one easing, entrance on mount (sheets used to appear with no transition at all) */
  @keyframes tqSheetIn { from { transform:translateY(100%); } to { transform:translateY(0); } }
  @keyframes tqOverlayIn { from { opacity:0; } to { opacity:1; } }
  @keyframes tqRise { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
  .lk-sheet.tq-sheet.open { animation:tqSheetIn .42s cubic-bezier(.22,1,.36,1); }
  .lk-overlay.open:has(+ .tq-sheet) { animation:tqOverlayIn .3s ease; }
  .tq-sheet .tq-list .tq-row:nth-child(-n+10), .tq-screen .tq-list .tq-row:nth-child(-n+10) { animation:tqRise .38s cubic-bezier(.22,1,.36,1) backwards; }
  .tq-sheet .tq-row:nth-child(2), .tq-screen .tq-row:nth-child(2) { animation-delay:.04s; }
  .tq-sheet .tq-row:nth-child(3), .tq-screen .tq-row:nth-child(3) { animation-delay:.08s; }
  .tq-sheet .tq-row:nth-child(4), .tq-screen .tq-row:nth-child(4) { animation-delay:.12s; }
  .tq-sheet .tq-row:nth-child(5), .tq-screen .tq-row:nth-child(5) { animation-delay:.16s; }
  .tq-sheet .tq-row:nth-child(n+6), .tq-screen .tq-row:nth-child(n+6) { animation-delay:.2s; }
  .tq-dash .stats-row > *, .tq-dash .quick-btn { animation:tqRise .45s cubic-bezier(.22,1,.36,1) backwards; }
  .tq-dash .stats-row > *:nth-child(2) { animation-delay:.05s; }
  .tq-dash .quick-btn:nth-child(1) { animation-delay:.08s; } .tq-dash .quick-btn:nth-child(2) { animation-delay:.12s; }
  .tq-dash .quick-btn:nth-child(3) { animation-delay:.16s; } .tq-dash .quick-btn:nth-child(4) { animation-delay:.2s; }
  .tq-dash .quick-btn:nth-child(5) { animation-delay:.24s; }
  .tq-dash .stat-card, .tq-dash .quick-btn { will-change:transform; }

  /* ── Teacher home: glass surfaces over soft ambient light ── */
  .tq-orbs { position:fixed; inset:0; overflow:hidden; pointer-events:none; z-index:0; }
  .tq-orbs i { position:absolute; border-radius:50%; filter:blur(70px); opacity:.55; animation:tqDrift 22s ease-in-out infinite alternate; }
  .tq-orbs i:nth-child(1) { width:340px; height:340px; top:-90px; right:-120px; background:radial-gradient(circle,#2a6cf0,transparent 70%); }
  .tq-orbs i:nth-child(2) { width:300px; height:300px; top:46%; left:-140px; background:radial-gradient(circle,#13b9a4,transparent 70%); opacity:.32; animation-duration:28s; animation-delay:-8s; }
  .tq-orbs i:nth-child(3) { width:280px; height:280px; bottom:-90px; right:-60px; background:radial-gradient(circle,#6a4df0,transparent 70%); opacity:.26; animation-duration:25s; animation-delay:-14s; }
  @keyframes tqDrift { from { transform:translate3d(0,0,0) scale(1); } to { transform:translate3d(-34px,46px,0) scale(1.12); } }
  .tq-app .tq-dash { position:relative; z-index:1; }
  .tq-app .stat-card, .tq-app .quick-btn, .tq-app .section-card, .tq-hero {
    background:linear-gradient(160deg, rgba(255,255,255,.075), rgba(255,255,255,.028));
    border:1px solid rgba(255,255,255,.09); box-shadow:inset 0 1px 0 rgba(255,255,255,.07), 0 10px 30px rgba(3,8,20,.35);
    -webkit-backdrop-filter:blur(22px) saturate(140%); backdrop-filter:blur(22px) saturate(140%); }
  .tq-app .quick-btn:active { background:linear-gradient(160deg, rgba(255,255,255,.12), rgba(255,255,255,.05)); }
  .tq-app .quick-icon-box { background:none !important; box-shadow:none; width:auto; height:40px; border-radius:0; }
  .tq-app .tq-list { background:rgba(8,14,30,.45); }
  .tq-hello { padding:6px 0 2px; }
  .tq-hello-date { font-size:0.8125rem; color:${C.sub}; margin-bottom:10px; }
  .tq-hello-date::first-letter { text-transform:uppercase; }
  .tq-hello h1 { font-size:1.875rem; font-weight:700; line-height:1.12; letter-spacing:-.6px; color:rgba(255,255,255,.55); margin:0; }
  .tq-hello h1 span { color:var(--text); }
  .tq-hello-role { margin-top:8px; font-size:0.8125rem; color:${C.sub}; }
  .tq-hero { display:flex; align-items:center; gap:18px; border-radius:26px; padding:18px 20px; cursor:pointer; flex-shrink:0; }
  .tq-ring { flex-shrink:0; filter:drop-shadow(0 0 14px rgba(79,140,255,.35)); }
  .tq-hero-body { min-width:0; flex:1; }
  .tq-hero-kicker { display:flex; align-items:center; gap:8px; font-size:0.8125rem; color:var(--link2); margin-bottom:4px; }
  .tq-live { width:8px; height:8px; border-radius:50%; background:var(--ok); box-shadow:0 0 0 0 rgba(94,201,122,.6); animation:tqPulse 1.8s ease-out infinite; }
  @keyframes tqPulse { 70% { box-shadow:0 0 0 9px rgba(94,201,122,0); } 100% { box-shadow:0 0 0 0 rgba(94,201,122,0); } }
  .tq-hero-title { font-size:1.375rem; font-weight:700; line-height:1.2; letter-spacing:-.2px; }
  .tq-hero-meta { margin-top:4px; font-size:0.875rem; color:${C.sub}; }
  .tq-app .stat-val { font-size:2.25rem; font-weight:700; letter-spacing:-1px; font-variant-numeric:tabular-nums; }
  .tq-app .section-head.tq-head { text-transform:none; letter-spacing:0; font-size:0.9375rem; font-weight:600; color:var(--text); }


  /* ── Light theme for the teacher cabinet: blue header band, white cards, a red accent ── */
  :root:not([data-theme="dark"]) .tq-orbs, :root:not([data-theme="dark"]) .tq-edge { display:none; }
  :root:not([data-theme="dark"]) .tq-app .stat-card, :root:not([data-theme="dark"]) .tq-app .quick-btn, :root:not([data-theme="dark"]) .tq-app .section-card, :root:not([data-theme="dark"]) .tq-hero {
    background:var(--card); border:1px solid var(--line); box-shadow:var(--shadow); -webkit-backdrop-filter:none; backdrop-filter:none; }
  :root:not([data-theme="dark"]) .tq-app .quick-btn { box-shadow:0 1px 2px rgba(16,38,84,.08); }
  :root:not([data-theme="dark"]) .tq-app .quick-btn:active { background:var(--card2); }
  :root:not([data-theme="dark"]) .tq-app .tq-list { background:var(--card2); }
  :root:not([data-theme="dark"]) .tq-app .tq-row:active { background:var(--press); }
  :root:not([data-theme="dark"]) .tq-app .section-head.tq-head { color:var(--text); }
  :root:not([data-theme="dark"]) .tq-ring { filter:drop-shadow(0 0 9px rgba(46,158,91,.38)) drop-shadow(0 0 20px rgba(42,95,208,.28)); }
  :root:not([data-theme="dark"]) .tq-masthead { position:relative;  flex-shrink:0; margin:0 -20px 4px; padding:0 20px 26px; border-radius:0 0 30px 30px; overflow:hidden;
    background:linear-gradient(#0A2A72 0, #0A2A72 env(safe-area-inset-top), rgba(10,42,114,0) calc(env(safe-area-inset-top) + 70px)), radial-gradient(120% 90% at 100% 0%, #2f66d8 0%, rgba(47,102,216,0) 60%), linear-gradient(160deg,#0A2A72 0%,#123E9C 100%); }
  /* the tricolor line stops where the rounded corners begin, so nothing sticks out past the curve; the colours melt into each other */
  :root:not([data-theme="dark"]) .tq-masthead::after { content:""; position:absolute; left:0; right:0; bottom:0; height:4px;
    background:linear-gradient(90deg,#fff 0,#fff 32.3%,#2A5FD0 34.3%,#2A5FD0 65.7%,#D52B1E 67.7%,#D52B1E 100%); }
  :root:not([data-theme="dark"]) .tq-masthead .notif-btn { color:#fff; }
  :root:not([data-theme="dark"]) .tq-masthead .tq-hello-date { color:rgba(255,255,255,.72); }
  :root:not([data-theme="dark"]) .tq-masthead .tq-hello h1 { color:rgba(255,255,255,.72); }
  :root:not([data-theme="dark"]) .tq-masthead .tq-hello h1 span { color:#fff; }
  :root:not([data-theme="dark"]) .tq-masthead .tq-top { padding-top:max(calc(env(safe-area-inset-top) + 8px), 14px); }
  :root:not([data-theme="dark"]) .tq-masthead .avatar[data-photo="0"] { background:#fff !important; color:#0A2A72; }
  :root:not([data-theme="dark"]) .tq-masthead .avatar[data-photo="1"] { box-shadow:0 0 0 2px #fff; }
  :root:not([data-theme="dark"]) .tq-top .badge { border-color:#123E9C; background:#D52B1E; }
  :root:not([data-theme="dark"]) .tq-live { background:var(--green); }
  :root:not([data-theme="dark"]) .tq-hero-kicker { color:var(--link); }
  :root:not([data-theme="dark"]) .tq-app .stat-label, :root:not([data-theme="dark"]) .tq-app .quick-lbl { color:var(--sub); }
  /* light theme: every screen header is the blue band with the tricolor line */
  :root:not([data-theme="dark"]) .topbar { background:linear-gradient(160deg,#0A2A72,#123E9C); -webkit-backdrop-filter:none; backdrop-filter:none; border-bottom:none; position:relative; color:#fff; }
  /* the flat bar of inner screens stays plain blue: the tricolor belongs to the rounded header of the dashboard */
  :root:not([data-theme="dark"]) .topbar .back-btn, :root:not([data-theme="dark"]) .topbar .avatar-name, :root:not([data-theme="dark"]) .topbar .notif-btn, :root:not([data-theme="dark"]) .topbar .search-btn, :root:not([data-theme="dark"]) .topbar .tq-bar-title { color:#fff; }
  :root:not([data-theme="dark"]) .topbar .tag-role { background:rgba(255,255,255,.16); color:#fff; }
  :root:not([data-theme="dark"]) .topbar svg { stroke:#fff; }
  :root:not([data-theme="dark"]) .topbar .avatar { background:#fff !important; color:#0A2A72; }
  :root:not([data-theme="dark"]) .topbar .badge { border:2px solid #123E9C; }
  .tq-switch { width:46px; height:28px; border-radius:14px; background:var(--line); position:relative; flex-shrink:0; transition:background .25s; }
  .tq-switch i { position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.3); transition:transform .25s cubic-bezier(.22,1,.36,1); }
  .tq-switch.on { background:var(--accent); }
  .tq-switch.on i { transform:translateX(18px); }
  :root:not([data-theme="dark"]) .lk-menu-icon, :root:not([data-theme="dark"]) .lk-row-icon { background:var(--surface2) !important; }
  :root:not([data-theme="dark"]) .lk-menu-icon svg, :root:not([data-theme="dark"]) .lk-row-icon svg { stroke:var(--link); }
  :root:not([data-theme="dark"]) .tq-seg { background:var(--surface2); border-color:transparent; }
  :root:not([data-theme="dark"]) .tq-seg > button.active { background:var(--card); box-shadow:0 1px 3px rgba(16,38,84,.18); color:var(--link); font-weight:600; }
  /* teacher home: once the blue masthead scrolls away, a band of the same blue holds the status bar (the clock is white) */
  .screen.tq-app::before { content:""; position:fixed; top:0; left:0; right:0; height:env(safe-area-inset-top); background:#0A2A72; z-index:30; pointer-events:none; opacity:0; transition:opacity .2s; }
  :root:not([data-theme="dark"]) .screen.tq-app.tq-scrolled::before { opacity:1; box-shadow:0 1px 0 rgba(255,255,255,.08); }
  .tq-theme { padding:14px 4px 6px; display:flex; flex-direction:column; gap:10px; }
  .tq-theme-label { font-size:0.75rem; font-weight:500; color:var(--sub); padding:0 2px; }
  .tq-theme .tq-seg > button { display:flex; align-items:center; justify-content:center; }
  .tq-tricolor { display:flex; gap:3px; margin:-6px auto 4px; }
  .tq-tricolor i { width:18px; height:4px; border-radius:2px; }
  .tq-tricolor i:nth-child(1) { background:#fff; box-shadow:inset 0 0 0 1px var(--line); }
  .tq-tricolor i:nth-child(2) { background:#2A5FD0; }
  .tq-tricolor i:nth-child(3) { background:#D52B1E; }
  :root:not([data-theme="dark"]) .login-logo { box-shadow:0 0 0 6px #fff, 0 14px 40px rgba(27,77,180,.28) !important; }
  :root:not([data-theme="dark"]) .lk-avatar-big { box-shadow:0 6px 16px rgba(27,77,180,.22); }

  /* ── Teacher sheets, v2: a quiet grey sheet with white grouped cards, chips, and a sticky action bar ── */
  .lk-sheet.tq-sheet { background:var(--bg); height:90vh; height:90dvh; }
  .tq-field[type=date] { -webkit-appearance:none; appearance:none; display:block; min-width:0; max-width:100%; min-height:48px; text-align:left; }
  .tq-field::-webkit-date-and-time-value { text-align:left; }
  .tq-sh-head { display:flex; align-items:center; gap:12px; padding:12px 20px 8px; flex-shrink:0; }
  .tq-sh-title { font-size:1.375rem; font-weight:700; letter-spacing:-.3px; line-height:1.2; }
  .tq-sh-sub { font-size:0.8125rem; color:var(--sub); margin-top:3px; }
  .tq-round { width:36px; height:36px; border-radius:50%; background:var(--card); border:1px solid var(--line); display:flex; align-items:center; justify-content:center; color:var(--text); flex-shrink:0; cursor:pointer; padding:0; }
  .tq-sh-body { flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:4px 16px 0; display:flex; flex-direction:column; gap:8px; }
  .tq-sec { font-size:0.8125rem; font-weight:600; color:var(--sub); padding:12px 4px 2px; }
  .tq-card { background:var(--card); border-radius:16px; box-shadow:var(--shadow); overflow:hidden; flex-shrink:0; }
  :root[data-theme="dark"] .tq-card { border:1px solid var(--line); }
  .tq-item { display:flex; align-items:center; gap:12px; padding:12px 14px; min-height:56px; background:transparent; border:none; width:100%; text-align:left; font:inherit; color:inherit; cursor:pointer; }
  .tq-item + .tq-item { border-top:1px solid var(--line); }
  .tq-item:active { background:var(--press); }
  .tq-item-title { font-size:0.9375rem; font-weight:600; }
  .tq-item-sub { font-size:0.75rem; color:var(--sub); margin-top:2px; }
  .tq-chev { color:var(--sub); flex-shrink:0; opacity:.6; }
  .tq-chips { display:flex; gap:8px; overflow-x:auto; margin:0 -16px; padding:2px 16px; flex-shrink:0; scrollbar-width:none; }
  .tq-chips::-webkit-scrollbar { display:none; }
  .tq-chip { flex-shrink:0; padding:9px 15px; border-radius:999px; background:var(--card); border:1px solid var(--line); font:inherit; font-size:0.8125rem; font-weight:500; color:var(--text); cursor:pointer; white-space:nowrap; }
  .tq-chip.on { background:var(--accent); border-color:var(--accent); color:#fff; }
  .tq-pill { font-size:0.6875rem; font-weight:600; padding:3px 9px; border-radius:999px; white-space:nowrap; background:var(--surface2); color:var(--sub); }
  .tq-pill.now { background:color-mix(in srgb, var(--green) 15%, var(--card)); color:var(--ok); }
  .tq-pill.next { background:color-mix(in srgb, var(--link) 12%, var(--card)); color:var(--link); }
  .tq-foot { position:sticky; bottom:0; margin:auto -16px 0; padding:14px 16px calc(14px + env(safe-area-inset-bottom)); background:linear-gradient(color-mix(in srgb, var(--bg) 0%, transparent), var(--bg) 28%); display:flex; flex-direction:column; gap:8px; z-index:2; }
  .tq-btn { width:100%; min-height:52px; border:none; border-radius:16px; background:var(--accent); color:#fff; font:inherit; font-size:1rem; font-weight:600; cursor:pointer; box-shadow:0 8px 20px color-mix(in srgb, var(--accent) 28%, transparent); display:flex; align-items:center; justify-content:center; gap:8px; }
  .tq-btn:disabled { opacity:.45; box-shadow:none; cursor:default; }
  .tq-btn.ghost { background:var(--card); color:var(--text); border:1px solid var(--line); box-shadow:none; }
  .tq-ava { width:36px; height:36px; border-radius:50%; background:color-mix(in srgb, var(--link) 12%, var(--card)); color:var(--link); font-size:0.75rem; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .tq-field { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:12px 14px; font:inherit; font-size:1rem; color:var(--text); width:100%; box-sizing:border-box; outline:none; }
  .tq-field:focus { border-color:var(--link); }
  .tq-yn { display:flex; background:var(--surface2); border-radius:12px; padding:3px; gap:3px; flex-shrink:0; }
  .tq-yn button { min-width:44px; height:34px; padding:0 10px; border:none; border-radius:9px; background:none; color:var(--sub); font:inherit; font-size:0.8125rem; font-weight:600; display:flex; align-items:center; justify-content:center; cursor:pointer; }
  .tq-yn button.yes { background:var(--green); color:#fff; }
  .tq-yn button.no { background:var(--red); color:#fff; }
  .tq-grades { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; }
  .tq-g { height:38px; border-radius:12px; border:1px solid var(--line); background:var(--card); font:inherit; font-weight:600; font-size:0.9375rem; color:var(--sub); cursor:pointer; }
  .tq-g.on { color:#fff; border-color:transparent; }
  .tq-g.on.g5 { background:var(--green); } .tq-g.on.g4 { background:var(--accent); } .tq-g.on.g3 { background:var(--amber); } .tq-g.on.g2, .tq-g.on.gn { background:var(--red); }
  .tq-grade-row { padding:12px 14px; }
  .tq-grade-row + .tq-grade-row { border-top:1px solid var(--line); }
  .tq-stats { display:grid; grid-template-columns:repeat(3,1fr); }
  .tq-stats > div { padding:12px 8px; text-align:center; }
  .tq-stats > div + div { border-left:1px solid var(--line); }
  .tq-stats b { display:block; font-size:1.25rem; font-weight:700; font-variant-numeric:tabular-nums; }
  .tq-stats span { font-size:0.6875rem; color:var(--sub); }
  .tq-note { font-size:0.75rem; color:var(--sub); text-align:center; line-height:1.5; padding:0 8px; }
  .tq-done { display:flex; flex-direction:column; align-items:center; text-align:center; gap:12px; padding:28px 12px; }
  .tq-back { display:inline-flex; align-items:center; gap:0; white-space:nowrap; margin-left:-6px; font-size:0.9375rem; }
  .tq-sched-ctrls { flex-shrink:0; padding:12px 16px 8px; display:flex; flex-direction:column; gap:10px; background:var(--bg); border-bottom:1px solid var(--line); }
  .tq-days { display:grid; grid-template-columns:repeat(6,1fr); gap:6px; }
  .tq-day { display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 0 6px; border-radius:14px; border:none; background:transparent; font:inherit; color:var(--text); cursor:pointer; }
  .tq-day span { font-size:0.6875rem; color:var(--sub); font-weight:500; }
  .tq-day b { font-size:1.125rem; font-weight:600; font-variant-numeric:tabular-nums; }
  .tq-day i { width:5px; height:5px; border-radius:50%; background:transparent; margin-top:2px; }
  .tq-day i.has { background:var(--sub); opacity:.5; }
  .tq-day.today b { color:var(--red); }
  .tq-day.on { background:var(--accent); color:#fff; box-shadow:0 6px 14px color-mix(in srgb, var(--accent) 30%, transparent); }
  .tq-day.on span, .tq-day.on b { color:#fff; }
  .tq-day.on i.has { background:#fff; opacity:.8; }
  .tq-sched-body { background:var(--bg); padding:14px 16px calc(24px + env(safe-area-inset-bottom)) !important; gap:10px !important; }
  .tq-sched-title { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:1.125rem; font-weight:700; padding:2px 4px 4px; flex-shrink:0; }
  .tq-pair { display:flex; gap:14px; align-items:stretch; text-align:left; width:100%; background:var(--card); border:none; border-radius:16px; box-shadow:var(--shadow); padding:14px; font:inherit; color:inherit; cursor:pointer; flex-shrink:0; position:relative; overflow:hidden; }
  :root[data-theme="dark"] .tq-pair { border:1px solid var(--line); }
  .tq-pair::before { content:""; position:absolute; left:0; top:12px; bottom:12px; width:3px; border-radius:0 3px 3px 0; background:var(--accent); }
  .tq-pair.now::before { background:var(--green); }
  .tq-pair.past { opacity:.62; }
  .tq-pair:active { transform:scale(.985); }
  .tq-pair-time { width:50px; flex-shrink:0; display:flex; flex-direction:column; justify-content:space-between; padding-left:4px; font-variant-numeric:tabular-nums; }
  .tq-pair-time b { font-size:1rem; font-weight:700; }
  .tq-pair-time span { font-size:0.75rem; color:var(--sub); }
  .tq-pair-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
  .tq-pair-meta { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
  .tq-pair-meta span { display:inline-flex; align-items:center; gap:3px; font-size:0.6875rem; font-weight:500; color:var(--sub); background:var(--surface2); padding:3px 8px; border-radius:999px; }
  .tq-profile { display:flex; flex-direction:column; align-items:center; gap:8px; padding:0 0 8px; text-align:center; }
  .tq-photo { position:relative; width:92px; height:92px; border-radius:50%; border:none; padding:0; background:none; cursor:pointer; box-shadow:0 10px 24px color-mix(in srgb, var(--accent) 25%, transparent); }
  .tq-photo .avatar { background-size:cover; background-position:center; font-weight:700; color:#fff; }
  .tq-photo-badge { position:absolute; right:-2px; bottom:-2px; width:30px; height:30px; border-radius:50%; background:var(--accent); color:#fff; border:3px solid var(--bg); display:flex; align-items:center; justify-content:center; }
  .tq-profile-name { font-size:1.25rem; font-weight:700; letter-spacing:-.2px; margin-top:6px; }
  .tq-profile-sub { font-size:0.8125rem; color:var(--sub); margin-bottom:6px; }
  /* a faint glow rising from the tricolor line under the blue header */
  :root:not([data-theme="dark"]) .tq-masthead::before {
    content:""; position:absolute; left:0; right:0; bottom:0; height:24px; pointer-events:none; opacity:.42;
    background:linear-gradient(90deg,#fff 0,#fff 32.3%,#4F86F0 34.3%,#4F86F0 65.7%,#E5412F 67.7%,#E5412F 100%);
    -webkit-mask-image:linear-gradient(to top,#000,transparent); mask-image:linear-gradient(to top,#000,transparent); }
  .tq-meter { height:5px; border-radius:3px; background:var(--surface2); margin-top:6px; overflow:hidden; }
  .tq-meter i { display:block; height:100%; border-radius:3px; background:var(--green); }
  .tq-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .tq-table { border-collapse:separate; border-spacing:0; width:100%; font-size:0.8125rem; font-variant-numeric:tabular-nums; }
  .tq-table th { font-weight:600; color:var(--sub); padding:10px 8px; text-align:center; white-space:nowrap; border-bottom:1px solid var(--line); background:var(--card); }
  .tq-table th small { display:block; font-weight:400; font-size:0.625rem; max-width:84px; overflow:hidden; text-overflow:ellipsis; margin:1px auto 0; }
  .tq-table td { padding:9px 8px; text-align:center; border-bottom:1px solid var(--line); }
  .tq-table tr:last-child td { border-bottom:none; }
  .tq-table .tq-sticky { position:sticky; left:0; z-index:1; background:var(--card); text-align:left; white-space:nowrap; padding-left:14px; padding-right:12px; box-shadow:1px 0 0 var(--line); }
  .tq-table td.tq-sticky { font-weight:500; }
  .tq-miss { display:block; font-size:0.625rem; color:var(--bad); font-weight:500; }
  .tq-nomark { color:var(--sub); opacity:.5; }
  .tq-mark { display:inline-flex; width:28px; height:28px; border-radius:9px; align-items:center; justify-content:center; font-weight:700; color:#fff; }
  .tq-mark.m5 { background:var(--green); } .tq-mark.m4 { background:var(--accent); } .tq-mark.m3 { background:var(--amber); } .tq-mark.m2 { background:var(--red); }
  :root:not([data-theme="dark"]) .lk-overlay, :root:not([data-theme="dark"]) .panel-overlay { -webkit-backdrop-filter:none; backdrop-filter:none; }
  .tq-link { background:none; border:none; padding:0 4px; font:inherit; font-size:0.8125rem; font-weight:600; color:var(--link); cursor:pointer; }
  .tq-flabel { display:flex; flex-direction:column; gap:6px; font-size:0.75rem; font-weight:500; color:var(--sub); }
  .tq-flabel .tq-field { font-size:0.9375rem; font-weight:400; color:var(--text); }
  /* a sheet that is always mounted opens with its animation only (no second slide from the transition) */
  .lk-sheet.tq-toggle.open { animation:tqSheetIn .42s cubic-bezier(.22,1,.36,1); transition:none; }
  .lk-overlay.open:has(+ .tq-toggle) { animation:none; }
  .tq-hero-body { display:flex; flex-direction:column; justify-content:center; }
  .tq-hero-title { display:flex; align-items:center; gap:8px; }
  .tq-hero-sub { margin-top:3px; font-size:0.9375rem; color:var(--sub); line-height:1.3; overflow-wrap:anywhere; }
  .tq-hero-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
  .tq-hero-chips span { font-size:0.75rem; font-weight:600; padding:4px 10px; border-radius:999px; background:var(--surface2); color:var(--sub2); font-variant-numeric:tabular-nums; white-space:nowrap; }
  .tq-live { flex-shrink:0; }
  /* pulling the page down: the blue header continues upward instead of showing white. Behind the scrolling page lies a
     layer that is blue in its upper half; everything under the header sits in .tq-dash-body on the page colour, so only
     the gap that a pull opens above the header shows the blue. (Safari paints nothing of the content above its top edge
     during the bounce, so the blue has to come from behind.) */
  :root:not([data-theme="dark"]) .screen.tq-app { background:linear-gradient(#0A2A72 0, #0A2A72 50%, var(--bg) 50%); }
  /* the page under the header is a real block on the page colour (it reaches under the header's rounded corners and
     over the page's side and bottom padding), so a fast flick never shows the blue backdrop between the cards */
  .tq-dash-body { display:flex; flex-direction:column; gap:16px; flex:1 0 auto; position:relative; z-index:0; }
  :root:not([data-theme="dark"]) .tq-dash-body { background:var(--bg);
    margin:-34px -20px calc(-24px - env(safe-area-inset-bottom)); padding:34px 20px calc(24px + env(safe-area-inset-bottom)); }
  .tq-app .tq-masthead { z-index:1; }
  .lk-sheet.tq-pop { height:auto !important; max-height:92dvh; }
  /* iOS-like field sheet: bottom sheet, grouped rows, Cancel / title / Done */
  .lk-sheet.ff-sheet { height:auto !important; max-height:70dvh; border-radius:28px 28px 0 0; }
  .ff-bar { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:8px 16px 4px; }
  .ff-title { font-size:1rem; font-weight:600; color:var(--text); text-align:center; }
  .ff-cancel, .ff-done { background:none; border:none; font:inherit; font-size:1rem; padding:8px 0; cursor:pointer; color:var(--link); }
  .ff-cancel { justify-self:start; }
  .ff-done { justify-self:end; font-weight:600; }
  .ff-done:disabled { opacity:.35; cursor:default; }
  .ff-body { display:flex; flex-direction:column; gap:8px; padding:12px 16px calc(16px + env(safe-area-inset-bottom)); }
  .ff-group { background:var(--card); border:1px solid var(--line); border-radius:14px; overflow:hidden; }
  .ff-row { display:flex; align-items:center; gap:12px; min-height:52px; padding:0 16px; cursor:text; }
  .ff-label { font-size:0.9375rem; color:var(--text); flex-shrink:0; }
  .ff-input { flex:1; min-width:0; border:none; outline:none; background:transparent; font:inherit; font-size:1rem; color:var(--text); text-align:right; padding:14px 0; }
  .ff-input::placeholder { color:var(--sub); opacity:.6; }
  .ff-hint { margin:0 4px; font-size:0.8125rem; line-height:1.4; color:var(--sub); }
  .ff-err { margin:0 4px; font-size:0.875rem; color:var(--bad); }
  .ff-clear { width:100%; min-height:52px; background:none; border:none; font:inherit; font-size:1rem; color:var(--bad); cursor:pointer; }
  .ff-clear:disabled { opacity:.4; }
  .tq-count { min-width:22px; height:22px; padding:0 7px; border-radius:11px; background:var(--red); color:#fff; font-size:0.75rem; font-weight:700; display:inline-flex; align-items:center; justify-content:center; font-variant-numeric:tabular-nums; }
  .tq-actions { position:fixed; left:0; right:0; bottom:0; padding:0 10px calc(10px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:8px; animation:tqSheetIn .38s cubic-bezier(.22,1,.36,1); }
  .tq-actions-card { background:var(--card); border-radius:16px; overflow:hidden; box-shadow:0 10px 40px rgba(6,16,42,.28); }
  .tq-actions-card button { width:100%; min-height:54px; display:flex; align-items:center; justify-content:center; gap:10px; background:none; border:none; font:inherit; font-size:1.0625rem; color:var(--link); cursor:pointer; }
  .tq-actions-card button + button { border-top:1px solid var(--line); }
  .tq-actions-card button:active { background:var(--press); }
  .tq-actions-card .danger { color:var(--bad); }
  .tq-actions-card .cancel { font-weight:600; color:var(--text); }
  /* glass theme switch: a frosted pill in the app's own colours, sun left, moon right, a glass slider over the chosen one */
  .tq-gs { position:relative; width:112px; height:44px; border-radius:22px; padding:0; cursor:pointer; flex-shrink:0; -webkit-tap-highlight-color:transparent;
    border:1px solid var(--line); background:color-mix(in srgb, var(--link) 9%, var(--card));
    box-shadow:inset 0 1px 3px color-mix(in srgb, var(--link) 14%, transparent); transition:background .5s, border-color .5s, box-shadow .5s; }
  .tq-gs-thumb { position:absolute; left:3px; top:3px; width:52px; height:36px; border-radius:18px; border:1px solid rgba(255,255,255,.95);
    background:linear-gradient(180deg,#fff,color-mix(in srgb, var(--link) 12%, #fff)); box-shadow:0 2px 8px color-mix(in srgb, var(--link) 30%, transparent), inset 0 0 6px #fff;
    will-change:transform; transform-origin:center;
    transition:transform .34s cubic-bezier(.32,1.2,.5,1), scale .2s cubic-bezier(.3,1.4,.5,1), background .34s, border-color .34s, box-shadow .34s; }
  .tq-gs:active .tq-gs-thumb { scale:1.1 .94; }
  .tq-gs svg { position:absolute; top:11px; width:22px; height:22px; transition:color .34s, transform .34s cubic-bezier(.32,1.2,.5,1); }
  .tq-gs.night .tq-gs-moon, .tq-gs:not(.night) .tq-gs-sun { transform:scale(1.06); }
  .tq-gs.night .tq-gs-sun { transform:rotate(-40deg) scale(.86); }
  .tq-gs:not(.night) .tq-gs-moon { transform:rotate(20deg) scale(.86); }
  .tq-gs-sun { left:18px; color:#F5A623; }
  .tq-gs-moon { right:18px; color:var(--sub); }
  .tq-gs.night { box-shadow:inset 0 1px 3px rgba(0,0,0,.35); }
  .tq-gs.night .tq-gs-thumb { transform:translateX(54px); border-color:rgba(255,255,255,.2); background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.09)); box-shadow:0 2px 8px rgba(0,0,0,.4), inset 0 0 6px rgba(255,255,255,.08); }
  .tq-gs.night .tq-gs-sun { color:var(--sub); }
  .tq-gs.night .tq-gs-moon { color:#6FB3F5; }
  /* theme change: the switch has already settled, then the old picture dissolves into the new page as a whole */
  ::view-transition-old(root), ::view-transition-new(root) { animation-duration:.45s; animation-timing-function:cubic-bezier(.4,0,.2,1); mix-blend-mode:normal; }
  @keyframes tqskel { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
  .tq-skel { height:14px; border-radius:7px; background:linear-gradient(90deg, var(--card2) 25%, #1b2c4d 50%, var(--card2) 75%); background-size:200% 100%; animation:tqskel 1.6s linear infinite; }
  .tq-empty { display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px; padding:28px 16px; color:${C.sub}; font-size:0.8125rem; line-height:1.5; }
  .tq-empty strong { color:${C.text}; font-weight:500; font-size:0.9375rem; }
  @media (prefers-reduced-motion: reduce) { .tq-skel { animation:none; } .tq-sheet, .tq-sheet *, .tq-dash *, .tq-screen *, .tq-orbs i { animation:none !important; } .tq-app *, .tq-sheet *, .tq-screen * { transition:none !important; } }
  .qa-grid { display:flex; gap:10px; overflow-x:auto; padding-bottom:2px; flex-shrink:0; }
  .qa-btn {
    background:var(--card2); border-radius:16px; padding:22px 6px;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;
    cursor:pointer; border:1px solid color-mix(in srgb, ${C.border} 40%, transparent); touch-action:manipulation;
    transition: background .18s ease, transform .18s ease, border-color .18s ease;
    flex:0 0 calc(25% - 7.5px); overflow:hidden;
  }
  .qa-btn:hover { background:${C.surface}; transform:translateY(-3px); border-color:color-mix(in srgb, ${C.accentL} 33%, transparent); }
  .qa-btn:active { transform:scale(.95); }
  .qa-icon { display:flex; align-items:center; justify-content:center; transition: transform .18s ease; }
  .qa-btn:hover .qa-icon { transform:scale(1.08); }
  .qa-lbl {
    font-size:0.6875rem; font-weight:600; color:var(--link2);
    text-align:center; line-height:1.3;
  }

  .section-card { background:${C.card}; border-radius:16px; padding:16px; touch-action:manipulation; flex-shrink:0; }
  .section-head { font-size:0.8125rem; font-weight:600; letter-spacing:0; color:${C.sub}; margin-bottom:12px; display:flex; align-items:center; gap:6px; }
  .section-head.tq-head { font-size:0.75rem; font-weight:500; letter-spacing:0; }
  .schedule-row { display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid color-mix(in srgb, ${C.border} 20%, transparent); }
  .schedule-row:last-child { border-bottom:none; }
  .sch-time { font-size:0.75rem; font-weight:600; color:${C.accentL}; width:38px; flex-shrink:0; font-variant-numeric:tabular-nums; }
  .sch-subj { font-size:0.875rem; font-weight:500; color:${C.text}; flex:1; padding:0 10px; }
  .sch-room { font-size:0.65625rem; font-weight:600; color:${C.accentL}; background:color-mix(in srgb, ${C.accent} 15%, transparent); border-radius:8px; padding:3.5px 8px; text-align:center; white-space:nowrap; flex-shrink:0; font-variant-numeric:tabular-nums; }

  .deadline-card { background:${C.card}; border-radius:16px; padding:14px 16px; display:flex; align-items:center; gap:12px; flex-shrink:0; }
  .news-card { background:${C.card}; border-radius:16px; padding:14px 16px; flex-shrink:0; }
  .news-item {
    font-size:0.8125rem; color:${C.sub}; border-bottom:1px solid color-mix(in srgb, ${C.border} 13%, transparent);
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    text-decoration:none; cursor:pointer; transition:background .15s ease;
    padding:10px 6px; margin:0 -6px; border-radius:10px;
  }
  .news-item:last-child { border-bottom:none; }
  .news-item:hover { background:${C.surface}; }
  .news-item-body { flex:1; min-width:0; }
  .news-date { font-size:0.65625rem; font-weight:600; color:${C.accentL}; margin-bottom:3px; }
  .news-title {
    font-size:0.8125rem; font-weight:500; color:${C.text}; line-height:1.4;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  }
  .news-chev { display:flex; flex-shrink:0; transition:transform .15s ease; }
  .news-item:hover .news-chev { transform:translateX(2px); }

  .teacher-next {
    background: color-mix(in srgb, var(--green) 12%, var(--card));
    border:1px solid color-mix(in srgb, ${C.green} 27%, transparent); border-radius:16px; padding:16px; flex-shrink:0;
  }
  .teacher-meta-row { display:flex; gap:12px; margin-top:8px; font-size:0.75rem; color:${C.sub}; flex-wrap:wrap; }

  .group-list { display:flex; flex-direction:column; gap:8px; }
  .group-row {
    background:${C.surface}; border-radius:12px; padding:12px 14px;
    display:flex; justify-content:space-between; align-items:center; cursor:pointer;
    transition: background .15s, transform .15s;
  }
  .group-row:hover { background:var(--surface2); transform:translateX(3px); }
  .group-name { font-size:0.875rem; font-weight:600; }
  .group-count { font-size:0.75rem; color:${C.sub}; }

  /* ── BOTTOM NAV ── */
  .bottom-nav {
    display:flex; justify-content:space-around; padding:12px 0 20px;
    background:${C.bg}; border-top:1px solid ${C.border};
    position:sticky; bottom:0;
  }
  .nav-item {
    display:flex; flex-direction:column; align-items:center; gap:4px;
    background:none; border:none; color:${C.sub}; font-family:inherit;
    font-size:0.625rem; cursor:pointer; padding:0 12px; transition: color .15s;
  }
  .nav-item.active { color:${C.accentL}; }
  .nav-item span { font-size:1.25rem; }

  .back-btn {
    background:none; border:none; color:${C.sub}; font-size:0.8125rem;
    cursor:pointer; display:flex; align-items:center; gap:6px;
    padding:0; font-family:inherit; transition: color .15s;
  }
  .back-btn:hover { color:${C.text}; }

  /* ── NOTIFICATIONS ── */
  .panel-overlay {
    position:fixed; inset:0; background:var(--overlay); z-index:200;
    opacity:0; pointer-events:none; transition:opacity .25s; backdrop-filter:blur(4px);
  }
  .panel-overlay.open { opacity:1; pointer-events:all; }
  .notif-panel {
    position:fixed; top:0; left:0; bottom:0; width:min(320px,92vw);
    background:var(--surface); z-index:201; display:flex; flex-direction:column;
    transform:translateX(-100%); transition:transform .32s cubic-bezier(.4,0,.2,1);
    box-shadow:8px 0 40px rgba(0,0,0,.5);
  }
  .notif-panel.open { transform:translateX(0); }
  .notif-header {
    padding:calc(16px + env(safe-area-inset-top)) 20px 16px; border-bottom:1px solid var(--line);
    display:flex; justify-content:space-between; align-items:center;
  }
  .notif-title { font-size:1.0625rem; font-weight:700; }
  .notif-close { background:none; border:none; color:var(--sub); font-size:1.375rem; cursor:pointer; line-height:1; }
  .notif-body { flex:1; overflow-y:auto; padding:12px 16px calc(12px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:8px; }
  .notif-item {
    background:var(--card); border-radius:14px; padding:13px 14px;
    display:flex; gap:12px; align-items:flex-start;
    border-left:3px solid #1F5CB8; animation:fadeUp .3s ease both;
  }
  .notif-item.green { border-left-color:#4CAF6B; }
  .notif-item.amber { border-left-color:#F5A623; }
  .notif-item.red   { border-left-color:#E84C4C; }
  .notif-icon { font-size:1.25rem; flex-shrink:0; margin-top:1px; }
  .notif-text { flex:1; }
  .notif-msg  { font-size:0.8125rem; font-weight:500; margin-bottom:3px; }
  .notif-time { font-size:0.6875rem; color:var(--sub); }
  .notif-unread-dot { width:8px; height:8px; border-radius:50%; background:#E84C4C; flex-shrink:0; margin-top:5px; }

  /* ── SEARCH ── */
  .search-panel {
    position:fixed; top:0; left:0; right:0; background:var(--surface); z-index:201;
    transform:translateY(-100%); transition:transform .32s cubic-bezier(.4,0,.2,1);
    border-bottom:1px solid var(--line); padding:calc(14px + env(safe-area-inset-top)) 16px 16px;
    box-shadow:0 8px 30px rgba(0,0,0,.4);
  }
  .search-panel.open { transform:translateY(0); }
  .search-row { display:flex; gap:10px; align-items:center; margin-bottom:14px; }
  .search-input {
    flex:1; padding:12px 16px; background:var(--card); border:1px solid var(--line);
    border-radius:12px; color:var(--text); font-family:inherit; font-size:0.9375rem; outline:none;
    transition:border-color .2s;
  }
  .search-input:focus { border-color:#1F5CB8; }
  .search-cancel { background:none; border:none; color:var(--sub); font-family:inherit; font-size:0.875rem; cursor:pointer; white-space:nowrap; }
  .search-cancel:hover { color:var(--text); }
  .search-results { display:flex; flex-direction:column; gap:6px; max-height:55vh; overflow-y:auto; }
  .search-result {
    background:var(--card); border-radius:12px; padding:11px 14px;
    display:flex; gap:10px; align-items:center; cursor:pointer;
    transition:background .15s;
  }
  .search-result:hover { background:var(--surface2); }
  .search-result-icon { font-size:1.125rem; flex-shrink:0; }
  .search-result-title { font-size:0.8125rem; font-weight:500; }
  .search-result-sub { font-size:0.6875rem; color:var(--sub); margin-top:1px; }
  .search-empty { text-align:center; color:var(--sub); font-size:0.8125rem; padding:20px 0; }

  /* ══════════════════════════════════════════
     ── PERSONAL ACCOUNT (ЛК) ──
  ══════════════════════════════════════════ */
  @keyframes slideUpSheet {
    from { transform:translateY(100%); }
    to   { transform:translateY(0); }
  }
  .lk-overlay {
    position:fixed; inset:0; background:var(--overlay); z-index:200;
    opacity:0; pointer-events:none; transition:opacity .3s; backdrop-filter:blur(4px);
  }
  .lk-overlay.open { opacity:1; pointer-events:all; }
  .lk-sheet {
    position:fixed; left:0; right:0; bottom:0; z-index:201;
    background:${C.surface}; border-radius:24px 24px 0 0;
    max-height:92vh; display:flex; flex-direction:column;
    transform:translateY(100%); transition:transform .35s cubic-bezier(.4,0,.2,1);
    box-shadow:0 -8px 40px rgba(0,0,0,.6);
  }
  .lk-sheet.open { transform:translateY(0); }
  /* a closed sheet waits just below the screen edge: no shadow bleeding up as a dark band, and no hit area */
  .lk-sheet:not(.open) { box-shadow:none; visibility:hidden; transition:transform .35s cubic-bezier(.4,0,.2,1), visibility 0s .35s; }
  .lk-handle { width:40px; height:4px; background:${C.border}; border-radius:2px; margin:12px auto 0; }
  .lk-header {
    padding:16px 20px 14px; border-bottom:1px solid ${C.border};
    display:flex; align-items:center; gap:14px; flex-shrink:0;
  }
  .lk-avatar-big {
    width:52px; height:52px; border-radius:50%;
    background:linear-gradient(135deg,${C.accent},#0d3585); color:#fff;
    display:flex; align-items:center; justify-content:center;
    font-size:1.375rem; font-weight:700; flex-shrink:0;
    box-shadow:0 0 20px color-mix(in srgb, ${C.accent} 33%, transparent);
  }
  .lk-name { font-size:1.0625rem; font-weight:700; }
  .lk-meta { font-size:0.75rem; color:${C.sub}; margin-top:2px; }
  .lk-edit-btn {
    margin-left:auto; background:${C.card}; border:1px solid ${C.border};
    border-radius:10px; padding:6px 12px; color:${C.sub}; font-size:0.75rem;
    cursor:pointer; font-family:inherit; transition:all .15s;
  }
  .lk-edit-btn:hover { border-color:${C.accentL}; color:${C.accentL}; }
  .lk-body { flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:14px 20px calc(28px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:6px; }
  .lk-section-title { font-size:0.625rem; color:${C.sub}; padding:8px 0 2px; }
  .lk-menu-item {
    display:flex; align-items:center; gap:12px; padding:12px 14px;
    background:${C.card}; border-radius:14px; cursor:pointer;
    transition:background .15s, transform .15s; border:1px solid transparent;
  }
  .lk-menu-item:hover { background:var(--surface2); transform:translateX(3px); border-color:${C.border}; }
  .lk-menu-item:active { transform:scale(.98); }
  .lk-menu-icon {
    width:38px; height:38px; border-radius:10px;
    display:flex; align-items:center; justify-content:center; font-size:1.125rem; flex-shrink:0;
  }
  .lk-menu-text { flex:1; }
  .lk-menu-title { font-size:0.875rem; font-weight:500; }
  .lk-menu-sub { font-size:0.6875rem; color:${C.sub}; margin-top:1px; }
  .lk-menu-arrow { color:${C.sub}; font-size:0.875rem; }
  .lk-menu-badge { background:#E84C4C; color:#fff; border-radius:10px; font-size:0.625rem; font-weight:700; padding:2px 7px; }
  .lk-divider { height:1px; background:color-mix(in srgb, ${C.border} 20%, transparent); margin:4px 0; }
  .lk-stats-row { display:flex; background:${C.card}; border-radius:16px; border:1px solid ${C.border}; overflow:hidden; flex-shrink:0; }
  .lk-stat { flex:1; display:flex; flex-direction:column; align-items:center; gap:5px; padding:14px 6px; cursor:pointer; transition:background .15s; }
  .lk-stat:hover { background:${C.surface}; }
  .lk-stat + .lk-stat { border-left:1px solid ${C.border}; }
  .lk-stat-label { font-size:0.65625rem; color:${C.sub}; text-align:center; line-height:1.3; min-height:14px; }
  .lk-stat-val { font-size:1.0625rem; font-weight:700; }
  .lk-group { background:${C.card}; border-radius:16px; border:1px solid ${C.border}; overflow:hidden; flex-shrink:0; }
  .lk-row {
    display:flex; align-items:center; gap:12px; padding:13px 14px; cursor:pointer;
    transition:background .15s;
  }
  .lk-row:hover { background:${C.surface}; }
  .lk-row:active { transform:scale(.99); }
  .lk-row + .lk-row { border-top:1px solid color-mix(in srgb, ${C.border} 20%, transparent); }
  .lk-row-icon { width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .lk-row-title { flex:1; font-size:0.875rem; font-weight:500; }
  .lk-logout {
    display:flex; align-items:center; justify-content:center; gap:8px;
    padding:13px; background:${C.card}; border-radius:14px; cursor:pointer;
    color:#E84C4C; font-size:0.875rem; font-weight:500; transition:background .15s;
    border:1px solid #E84C4C22;
  }
  .lk-logout:hover { background:rgba(200,40,30,.08); }
  .lk-inner { z-index:300 !important; }

  /* week tabs */
  .week-tabs { display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; }
  .week-tab { padding:7px 14px; border-radius:20px; font-size:0.75rem; white-space:nowrap; cursor:pointer; background:${C.surface}; border:1px solid ${C.border}; transition:all .15s; }
  .week-tab.active { background:color-mix(in srgb, ${C.accent} 20%, transparent); border-color:${C.accent}; color:${C.accentL}; }
  .sched-item { background:${C.card}; border-radius:14px; padding:14px; display:flex; gap:12px; border-left:3px solid ${C.accent}; }
  .sched-time-start { font-size:0.875rem; font-weight:700; color:${C.accentL}; }
  .sched-time-end { font-size:0.6875rem; color:${C.sub}; }
  .sched-subj { font-size:0.875rem; font-weight:600; margin-bottom:4px; }
  .sched-meta { font-size:0.75rem; color:${C.sub}; display:flex; gap:10px; flex-wrap:wrap; }
  .online-link { font-size:0.75rem; color:${C.accentL}; margin-top:5px; cursor:pointer; }

  /* grades */
  .grade-subject { background:${C.card}; border-radius:16px; overflow:hidden; border:1px solid ${C.border}; flex-shrink:0; }
  .grade-subj-header { padding:14px 16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background .15s; }
  .grade-subj-header:hover { background:${C.surface}; }
  .grade-subj-name { font-size:0.875rem; font-weight:600; }
  .grade-avg.good { color:${C.green}; font-weight:700; }
  .grade-avg.ok { color:${C.amber}; font-weight:700; }
  .grade-avg.bad { color:#E84C4C; font-weight:700; }
  .grade-list { padding:0 16px 12px; display:flex; flex-direction:column; gap:4px; }
  .grade-row { display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid color-mix(in srgb, ${C.border} 13%, transparent); font-size:0.8125rem; }
  .grade-row:last-child { border-bottom:none; }
  .grade-type { color:${C.sub}; font-size:0.75rem; }
  .grade-val { font-size:0.875rem; font-weight:700; padding:2px 9px; border-radius:8px; }
  .grade-5 { background:#4CAF6B22; color:var(--ok); }
  .grade-4 { background:color-mix(in srgb, var(--link) 13%, transparent); color:var(--link2); }
  .grade-3 { background:#F5A62322; color:var(--warn); }
  .grade-2 { background:#E84C4C22; color:var(--bad); }
  .debt-row { background:#E84C4C11; border:1px solid #E84C4C33; border-radius:12px; padding:10px 14px; display:flex; justify-content:space-between; font-size:0.8125rem; }

  /* portfolio */
  .ptab { padding:7px 14px; border-radius:20px; font-size:0.75rem; cursor:pointer; background:${C.surface}; border:1px solid ${C.border}; transition:all .15s; }
  .ptab.active { background:color-mix(in srgb, ${C.accent} 20%, transparent); border-color:${C.accent}; color:${C.accentL}; }
  .portfolio-item { background:${C.card}; border-radius:14px; padding:14px; display:flex; gap:12px; border:1px solid ${C.border}; transition:border-color .2s; }
  .portfolio-item:hover { border-color:color-mix(in srgb, ${C.accent} 27%, transparent); }
  .portfolio-tag { display:inline-block; padding:2px 8px; border-radius:8px; font-size:0.625rem; margin-top:6px; background:color-mix(in srgb, ${C.accent} 13%, transparent); color:${C.accentL}; }

  /* curriculum */
  .course-year { background:${C.card}; border-radius:16px; overflow:hidden; border:1px solid ${C.border}; flex-shrink:0; }
  .course-year-header { padding:14px 16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background .15s; font-weight:600; }
  .course-year-header:hover { background:${C.surface}; }
  .course-subjects { padding:0 16px 12px; display:flex; flex-direction:column; gap:5px; }
  .course-subj-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid color-mix(in srgb, ${C.border} 13%, transparent); font-size:0.8125rem; }
  .course-subj-row:last-child { border-bottom:none; }
  .course-subj-type { font-size:0.625rem; color:${C.sub}; padding:2px 7px; background:${C.surface}; border-radius:6px; }

  /* consultations */
  .time-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .time-slot { padding:8px 14px; border-radius:10px; font-size:0.8125rem; text-align:center; cursor:pointer; background:${C.surface}; border:1px solid ${C.border}; transition:all .15s; }
  .time-slot.selected { background:color-mix(in srgb, ${C.accent} 20%, transparent); border-color:${C.accent}; color:${C.accentL}; }
  .time-slot.taken { opacity:.4; cursor:not-allowed; }

  /* spravki */
  .spravka-item { background:${C.card}; border-radius:14px; padding:14px; display:flex; align-items:center; gap:12px; border:1px solid ${C.border}; cursor:pointer; transition:all .2s; }
  .spravka-item:hover { border-color:color-mix(in srgb, ${C.accent} 27%, transparent); transform:translateX(3px); }
  .spravka-status { font-size:0.6875rem; padding:3px 10px; border-radius:20px; white-space:nowrap; }
  .spravka-status.ready { background:color-mix(in srgb, ${C.green} 13%, transparent); color:var(--ok); }
  .spravka-status.process { background:color-mix(in srgb, ${C.amber} 13%, transparent); color:${C.amber}; }
  .spravka-status.new-s { background:color-mix(in srgb, ${C.accent} 13%, transparent); color:${C.accentL}; }

  /* faculty */
  .fac-card { background:${C.card}; border-radius:16px; padding:16px; border:1px solid ${C.border}; cursor:pointer; transition:all .2s; }
  .fac-card:hover { border-color:color-mix(in srgb, ${C.accent} 27%, transparent); transform:translateY(-2px); }
  .fac-paid { background:color-mix(in srgb, ${C.amber} 13%, transparent); color:${C.amber}; display:inline-block; padding:3px 10px; border-radius:20px; font-size:0.6875rem; margin-bottom:8px; }
  .fac-free { background:color-mix(in srgb, ${C.green} 13%, transparent); color:var(--ok); display:inline-block; padding:3px 10px; border-radius:20px; font-size:0.6875rem; margin-bottom:8px; }
  .fac-title { font-size:0.9375rem; font-weight:600; margin-bottom:6px; }
  .fac-stat { font-size:0.75rem; color:${C.sub}; }

  /* ══════════════════════════════════════════
     ── APPLICANT SCREENS ──
  ══════════════════════════════════════════ */

  /* hero banner */
  .app-hero {
    background: linear-gradient(135deg, var(--surface), var(--surface2));
    border:1px solid color-mix(in srgb, ${C.blue} 20%, transparent); border-radius:20px; padding:22px 20px;
    display:flex; flex-direction:column; gap:10px; position:relative; overflow:hidden;
  }
  .app-hero::before {
    content:''; position:absolute; top:-30px; right:-30px;
    width:120px; height:120px; border-radius:50%;
    background: radial-gradient(circle, color-mix(in srgb, ${C.blue} 13%, transparent), transparent 70%);
  }
  .app-hero-title { font-size:1.25rem; font-weight:700; }
  .app-hero-sub { font-size:0.8125rem; color:var(--link2); line-height:1.5; }

  /* nav tiles */
  .app-tiles { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .app-tile {
    background:${C.card}; border-radius:18px; padding:18px 14px;
    display:flex; flex-direction:column; gap:10px; cursor:pointer;
    border:1px solid transparent; transition: border-color .2s, transform .2s, background .2s;
    position:relative; overflow:hidden;
  }
  .app-tile::after {
    content:''; position:absolute; bottom:0; left:0; right:0; height:3px;
    border-radius:0 0 18px 18px; opacity:0; transition: opacity .2s;
  }
  .app-tile:hover { transform:translateY(-3px); background:var(--surface2); }
  .app-tile:hover::after { opacity:1; }
  .app-tile:active { transform:scale(.97); }
  .app-tile.faq::after   { background: linear-gradient(90deg, #1F5CB8, var(--link)); }
  .app-tile.apply::after { background: linear-gradient(90deg, var(--link), #72b0ff); }
  .app-tile.specs::after { background: linear-gradient(90deg, #4CAF6B, #72e895); }
  .app-tile.comm::after  { background: linear-gradient(90deg, #F5A623, var(--warn)); }
  .app-tile.about::after { background: linear-gradient(90deg, #E84C4C, var(--bad)); }
  .app-tile.open::after  { background: linear-gradient(90deg, #A855F7, #d496ff); }
  .app-tile.faq:hover   { border-color: color-mix(in srgb, ${C.accent} 33%, transparent); }
  .app-tile.apply:hover { border-color: color-mix(in srgb, ${C.blue} 33%, transparent); }
  .app-tile.specs:hover { border-color: color-mix(in srgb, ${C.green} 33%, transparent); }
  .app-tile.comm:hover  { border-color: color-mix(in srgb, ${C.amber} 33%, transparent); }
  .app-tile.about:hover { border-color: #E84C4C55; }
  .app-tile.open:hover  { border-color: #A855F755; }
  .app-tile-icon { font-size:1.75rem; }
  .app-tile-title { font-size:0.875rem; font-weight:600; }
  .app-tile-sub { font-size:0.6875rem; color:${C.sub}; line-height:1.4; }

  /* inner screens slide-in */
  .inner-screen {
    position:fixed; inset:0; background:${C.bg};
    display:flex; flex-direction:column;
    transform:translateX(100%); transition:transform .32s cubic-bezier(.4,0,.2,1);
    z-index:100;
  }
  .inner-screen.open { transform:translateX(0); }

  .inner-body { flex:1; overflow-y:auto; padding:20px 20px calc(20px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:14px; }

  /* FAQ */
  .faq-search {
    background:${C.surface}; border:1px solid ${C.border}; border-radius:12px;
    padding:12px 16px; color:${C.text}; font-family:inherit; font-size:0.875rem;
    outline:none; width:100%; transition:border-color .2s;
  }
  .faq-search:focus { border-color:${C.accent}; }
  .faq-item {
    background:${C.card}; border-radius:14px; overflow:hidden; flex-shrink:0;
    border:1px solid ${C.border}; transition: border-color .2s;
  }
  .faq-item.open { border-color:color-mix(in srgb, ${C.accent} 27%, transparent); }
  .faq-q {
    padding:14px 16px; cursor:pointer; display:flex; justify-content:space-between;
    align-items:flex-start; font-size:0.875rem; font-weight:500; gap:10px;
    transition: background .15s;
  }
  .faq-q:hover { background:${C.surface}; }
  .faq-q-text { flex:1; min-width:0; }
  .faq-chevron { color:${C.sub}; font-size:0.75rem; transition:transform .25s; flex-shrink:0; margin-top:3px; }
  .faq-item.open .faq-chevron { transform:rotate(180deg); }
  .faq-a {
    max-height:0; overflow:hidden; transition:max-height .3s ease, padding .3s ease;
    font-size:0.8125rem; color:${C.sub}; line-height:1.6;
    padding:0 16px; border-top:0px solid ${C.border};
  }
  .faq-a > div + div { margin-top:6px; }
  .faq-item.open .faq-a { max-height:2000px; padding:12px 16px; border-top:1px solid color-mix(in srgb, ${C.border} 20%, transparent); }
  .faq-cats { display:flex; gap:8px; flex-wrap:wrap; }
  .faq-cat {
    padding:6px 14px; border-radius:20px; font-size:0.75rem; cursor:pointer;
    background:${C.surface}; border:1px solid ${C.border}; transition:all .15s;
  }
  .faq-cat.active { background:color-mix(in srgb, ${C.accent} 20%, transparent); border-color:${C.accent}; color:${C.accentL}; }

  /* APPLY */
  .step-indicator { display:flex; align-items:center; gap:0; margin-bottom:4px; }
  .step-dot {
    width:28px; height:28px; border-radius:50%; display:flex; align-items:center;
    justify-content:center; font-size:0.75rem; font-weight:700; flex-shrink:0;
    background:${C.surface}; border:2px solid ${C.border}; color:${C.sub};
    transition:all .3s;
  }
  .step-dot.done { background:${C.accent}; border-color:${C.accent}; color:#fff; }
  .step-dot.active { background:color-mix(in srgb, ${C.accent} 13%, transparent); border-color:${C.accent}; color:${C.accentL}; }
  .step-line { flex:1; height:2px; background:${C.border}; transition:background .3s; }
  .step-line.done { background:${C.accent}; }
  .apply-card { background:${C.card}; border-radius:16px; padding:18px; }
  .apply-label { font-size:0.6875rem; color:${C.sub}; margin-bottom:6px; }
  .apply-select {
    width:100%; padding:12px 14px; background:${C.surface}; border:1px solid ${C.border};
    border-radius:10px; color:${C.text}; font-family:inherit; font-size:0.875rem; outline:none;
    appearance:none; cursor:pointer; transition:border-color .2s;
  }
  .apply-select:focus { border-color:${C.blue}; }
  .radio-row { display:flex; gap:10px; }
  .radio-opt {
    flex:1; padding:10px; background:${C.surface}; border:1px solid ${C.border};
    border-radius:10px; text-align:center; font-size:0.8125rem; cursor:pointer; transition:all .15s;
  }
  .radio-opt.selected { background:color-mix(in srgb, ${C.blue} 13%, transparent); border-color:${C.blue}; color:var(--link2); }
  .doc-list { display:flex; flex-direction:column; gap:8px; }
  .doc-row {
    display:flex; align-items:center; gap:10px; padding:10px 12px;
    background:${C.surface}; border-radius:10px; font-size:0.8125rem;
  }
  .doc-status { font-size:1rem; }
  .doc-name { flex:1; }
  .doc-upload { font-size:0.6875rem; color:${C.blue}; cursor:pointer; }
  .checkbox-row {
    display:flex; align-items:flex-start; gap:10px; padding:12px;
    background:${C.surface}; border-radius:10px; cursor:pointer;
  }
  .checkbox { width:18px; height:18px; border-radius:4px; border:2px solid ${C.border}; flex-shrink:0; margin-top:1px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
  .checkbox.checked { background:${C.blue}; border-color:${C.blue}; }
  .apply-nav { display:flex; gap:10px; }
  .btn-sec {
    flex:none; padding:14px; border-radius:50px; border:1px solid ${C.border};
    background:none; color:${C.sub}; font-family:inherit; font-size:0.875rem; cursor:pointer;
    transition:all .15s;
  }
  .btn-sec:hover { border-color:${C.accentL}; color:${C.accentL}; }
  .btn-blue {
    flex:none; padding:14px; border-radius:50px;
    background:linear-gradient(135deg,${C.blue},#2a6fc9);
    border:none; color:#fff; font-family:inherit; font-size:0.875rem; font-weight:700;
    cursor:pointer; transition:opacity .15s;
  }
  .btn-blue:hover { opacity:.88; }
  /* .apply-nav pairs Далее/Отправить (btn-blue) with Назад (btn-sec) side by side — only
     there should they share the row proportionally, so the flex ratio is scoped to it. */
  .apply-nav .btn-sec { flex:1; }
  .apply-nav .btn-blue { flex:2; }

  /* SPECIALTIES */
  .spec-card {
    background:${C.card}; border-radius:16px; padding:16px; cursor:pointer;
    border:1px solid ${C.border}; transition:all .2s;
  }
  .spec-card:hover { border-color:color-mix(in srgb, ${C.green} 33%, transparent); transform:translateY(-2px); }
  .spec-code { font-size:0.6875rem; color:var(--ok); margin-bottom:4px; }
  .spec-name { font-size:0.9375rem; font-weight:600; margin-bottom:8px; }
  .spec-row { display:flex; gap:16px; flex-wrap:wrap; }
  .spec-stat { font-size:0.75rem; color:${C.sub}; display:flex; align-items:center; gap:4px; }
  .spec-badge {
    display:inline-block; padding:3px 10px; border-radius:20px; font-size:0.6875rem; margin-top:8px;
  }
  .spec-badge.budget { background:#4CAF6B22; color:var(--ok); }
  .spec-badge.paid { background:#F5A62322; color:var(--warn); }

  /* ADMISSIONS */
  .contact-card {
    background:${C.card}; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px;
  }
  .contact-row { display:flex; align-items:center; gap:12px; }
  .contact-icon { font-size:1.25rem; width:36px; height:36px; background:${C.surface}; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .contact-info { flex:1; }
  .contact-label { font-size:0.6875rem; color:${C.sub}; }
  .contact-val { font-size:0.875rem; font-weight:500; }
  .contact-btn {
    padding:8px 16px; border-radius:20px; font-size:0.75rem; font-weight:600;
    border:none; cursor:pointer; font-family:inherit; transition:opacity .15s;
    text-decoration:none; display:inline-flex; align-items:center;
  }
  .contact-btn:hover { opacity:.85; }
  .btn-call { background:${C.green}; color:#fff; }
  .btn-mail { background:${C.blue}; color:#fff; }
  .map-placeholder {
    background:${C.surface}; border-radius:14px; height:140px;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:6px; border:1px solid ${C.border}; cursor:pointer;
    transition:border-color .2s;
  }
  .map-placeholder:hover { border-color:color-mix(in srgb, ${C.blue} 33%, transparent); }
  .person-card { background:${C.card}; border-radius:14px; padding:14px; display:flex; gap:12px; align-items:center; }
  .person-ava { width:44px; height:44px; border-radius:50%; background:${C.accent}; display:flex; align-items:center; justify-content:center; font-size:1.125rem; flex-shrink:0; }

  /* ABOUT */
  .about-stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .about-stat { background:${C.card}; border-radius:14px; padding:14px; text-align:center; }
  .about-stat-num { font-size:1.5rem; font-weight:700; color:${C.accentL}; }
  .about-stat-lbl { font-size:0.6875rem; color:${C.sub}; margin-top:4px; line-height:1.3; }
  .about-list-item { display:flex; gap:10px; padding:10px 0; border-bottom:1px solid color-mix(in srgb, ${C.border} 13%, transparent); font-size:0.8125rem; color:${C.sub}; align-items:flex-start; }
  .about-list-item:last-child { border-bottom:none; }
  .about-link { font-size:0.8125rem; color:${C.blue}; cursor:pointer; padding:4px 0; display:flex; align-items:center; gap:6px; }

  /* OPEN DAYS */
  .event-card {
    background:${C.card}; border-radius:16px; overflow:hidden; flex-shrink:0;
    border:1px solid ${C.border}; transition:border-color .2s;
  }
  .event-card:hover { border-color:#A855F755; }
  .event-banner {
    height:80px; display:flex; align-items:center; justify-content:center;
    font-size:2.25rem; position:relative;
  }
  .event-body { padding:14px; }
  .event-title { font-size:0.9375rem; font-weight:600; margin-bottom:6px; }
  .event-meta { display:flex; gap:12px; flex-wrap:wrap; }
  .event-tag { font-size:0.6875rem; color:${C.sub}; display:flex; align-items:center; gap:4px; }
  .event-format { padding:3px 10px; border-radius:20px; font-size:0.6875rem; font-weight:600; }
  .event-format.online { background:color-mix(in srgb, var(--link) 13%, transparent); color:var(--link2); }
  .event-format.offline { background:#4CAF6B22; color:var(--ok); }
  .gallery-strip { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; }
  .gallery-thumb {
    width:80px; height:60px; flex-shrink:0; border-radius:10px;
    display:flex; align-items:center; justify-content:center; font-size:1.5rem;
  }

  /* ── STUDENT BOTTOM NAV ── */
  .student-bottom-nav {
    display:flex; justify-content:space-around; padding:10px 0 18px;
    background:color-mix(in srgb, ${C.bg} 94%, transparent); border-top:1px solid ${C.border};
    flex-shrink:0; backdrop-filter:blur(16px);
  }
  .sbn-btn {
    display:flex; flex-direction:column; align-items:center; gap:3px;
    background:none; border:none; cursor:pointer; padding:4px 16px;
    font-family:inherit; font-size:0.625rem; font-weight:600;
    color:${C.sub}; transition:color .15s;
  }
  .sbn-btn.active { color:${C.accentL}; }
  .sbn-btn-icon { font-size:1.375rem; line-height:1; }
  .sbn-dot { width:4px; height:4px; border-radius:50%; background:${C.accentL}; opacity:0; transition:opacity .2s; margin-top:2px; }
  .sbn-btn.active .sbn-dot { opacity:1; }

  /* ── TEACHER GRADE CELLS ── */
  .grade-cell {
    width:30px; height:30px; border-radius:8px; display:flex; align-items:center;
    justify-content:center; font-size:0.75rem; font-weight:700; cursor:pointer;
    transition:all .15s; background:var(--card); color:var(--sub); border:1px solid var(--line);
  }
  .grade-cell.g5 { background:#4CAF6B33; color:var(--ok); border-color:#4CAF6B55; }
  .grade-cell.g4 { background:color-mix(in srgb, var(--link) 20%, transparent); color:var(--link2); border-color:color-mix(in srgb, var(--link) 33%, transparent); }
  .grade-cell.g3 { background:#F5A62333; color:var(--warn); border-color:#F5A62355; }
  .grade-cell.g2, .grade-cell.gn { background:#E84C4C33; color:var(--bad); border-color:#E84C4C55; }

  /* ── Next-pair widget chips and the pair's sheet (tp-*) ── */
  .tq-ring2 { position:relative; flex-shrink:0; }
  .tq-ring2 svg { display:block; overflow:visible; }
  .tq-ring2-track { stroke:var(--line); }
  .tq-ring2-arc { transition:stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1), opacity .3s; filter:drop-shadow(0 0 6px color-mix(in srgb, var(--ring-a) 45%, transparent)); }
  .tq-ring2.lunch .tq-ring2-arc { filter:drop-shadow(0 0 6px rgba(240,150,40,.45)); }
  .tq-ring2-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text); line-height:1; }
  .tq-ring2-center b { font-size:1.375rem; font-weight:700; letter-spacing:-.03em; font-variant-numeric:tabular-nums; }
  .tq-ring2-center b i { font-style:normal; font-size:.6em; font-weight:600; margin-left:1px; color:var(--sub); }
  .tq-ring2-center b.w { font-size:0.9375rem; letter-spacing:-.01em; }
  .tq-ring2-center small { font-size:0.75rem; font-weight:600; color:var(--sub2); margin:2px 0; }
  .tq-ring2.lunch .tq-ring2-center small { color:var(--warn); font-weight:600; }
  .tq-ring2.done .tq-ring2-center { color:var(--ok); }
  .tq-hero-chips .tq-chip-ask, .tq-hero-chips .tq-chip-clip { display:inline-flex; align-items:center; gap:4px; }
  .tq-hero-chips .tq-chip-ask { background:color-mix(in srgb, var(--amber) 14%, transparent); color:var(--warn); animation:pwRise .35s cubic-bezier(.22,1,.36,1); }
  .tq-hero-chips .tq-chip-clip { background:color-mix(in srgb, var(--ok) 14%, transparent); color:var(--ok); }
  /* pair timer: a plain card like the rest of the sheet — a caption, large light digits, a thin bar of the pair.
     Secondary text is a size up and darker than the app's fine print. */
  .tp-timer { padding:16px 18px 14px; }
  .tp-t-cap { display:flex; align-items:baseline; justify-content:space-between; gap:12px; font-size:1rem; font-weight:600; color:var(--text); letter-spacing:-.01em; }
  .tp-timer.lunch .tp-t-cap > span:first-child { color:var(--warn); }
  .tp-t-side { font-size:1rem; font-weight:500; color:var(--link); font-variant-numeric:tabular-nums; }
  .tp-timer.wait .tp-t-side { color:var(--sub2); }
  .tp-t-clock { margin-top:2px; font-size:4rem; font-weight:300; line-height:1.05; letter-spacing:-.03em; color:var(--text); font-variant-numeric:tabular-nums; }
  .tp-track { display:flex; align-items:center; gap:6px; margin-top:12px; }
  .tp-part, .tp-gap { flex-basis:0; min-width:0; overflow:hidden; }
  .tp-part { height:4px; border-radius:2px; background:var(--line); }
  .tp-gap { min-width:28px; height:2px; border-radius:1px; background:color-mix(in srgb, var(--amber) 35%, transparent); }
  .tp-part b, .tp-gap b { display:block; height:100%; border-radius:inherit; transform-origin:left; transition:transform 1s linear; }
  .tp-part b { background:var(--link); }
  .tp-gap b { background:var(--amber); }
  .tp-scale { position:relative; height:18px; margin-top:10px; font-size:0.875rem; font-weight:500; color:var(--sub2); font-variant-numeric:tabular-nums; }
  .tp-scale span { position:absolute; top:0; white-space:nowrap; }
  .tp-scale span.gap { transform:translateX(-50%); color:var(--warn); }
  /* the pair's sheet: headings and secondary text a step larger and darker than the app's fine print */
  .tp-sheet .tq-sh-sub { font-size:0.9375rem; font-weight:500; color:var(--sub2); margin-top:4px; }
  .tp-sheet .tq-sec { font-size:1.0625rem; font-weight:650; color:var(--text); letter-spacing:-.01em; padding:18px 2px 4px; }
  .tp-sheet .tp-empty { font-size:0.9375rem; font-weight:500; color:var(--sub2); }
  .tp-lunch { display:grid; grid-template-columns:1fr 1fr; gap:4px; padding:4px; border-radius:18px; background:var(--surface2); border:1px solid var(--line); flex-shrink:0; }
  .tp-lunch-opt { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-height:58px; padding:8px 6px; border:1px solid transparent; border-radius:14px;
    background:transparent; color:var(--text); font:inherit; text-align:center; cursor:pointer; transition:background-color .2s, color .2s, box-shadow .2s, border-color .2s; }
  .tp-lunch-opt b { font-size:1rem; font-weight:600; line-height:1.2; letter-spacing:-.01em; }
  .tp-lunch-opt span { font-size:0.875rem; font-weight:500; color:var(--sub2); font-variant-numeric:tabular-nums; line-height:1.25; }
  .tp-lunch-opt.on { background:var(--card); box-shadow:0 2px 8px color-mix(in srgb, var(--link) 18%, transparent); }
  .tp-lunch-opt.on b { color:var(--link); }
  .tp-lunch-opt.hint { border-color:color-mix(in srgb, var(--link) 40%, transparent); border-style:dashed; }
  .tp-count { display:inline-grid; place-items:center; min-width:20px; height:20px; padding:0 6px; margin-left:8px; border-radius:10px; font-size:0.75rem; background:color-mix(in srgb, var(--ok) 16%, transparent); color:var(--ok); vertical-align:1px; }
  .tp-empty { cursor:default !important; justify-content:center; gap:8px; color:var(--sub); font-size:0.875rem; }
  .tp-file-ico { width:40px; height:40px; border-radius:12px; display:grid; place-items:center; flex-shrink:0; background:color-mix(in srgb, currentColor 14%, var(--card)); }
  .tp-file-name { font-size:0.875rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .tp-file { cursor:default; padding-right:8px; }
  .tp-file-open { flex:1; min-width:0; display:flex; align-items:center; gap:12px; border:0; background:none; padding:0; font:inherit; color:inherit; text-align:left; cursor:pointer; }
  .tp-file-open:active { opacity:.6; }
  .tp-file-open:disabled { cursor:default; opacity:.55; }
  .tp-remove { width:36px; height:36px; flex-shrink:0; border:0; border-radius:10px; background:transparent; color:var(--sub); display:grid; place-items:center; cursor:pointer; }
  .tp-remove:active { background:var(--press); }
  .tp-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:8px 0 calc(16px + env(safe-area-inset-bottom)); flex-shrink:0; }
  .tp-actions .tq-btn { min-height:50px; font-size:0.9375rem; }
  .tp-actions .tp-attach { background:var(--surface2); color:var(--link); box-shadow:none; border:1px solid var(--line); }
  .tq-lunch-gap { display:flex; align-items:center; justify-content:center; gap:6px; flex-shrink:0; padding:2px 0; font-size:0.8125rem; font-weight:600; color:var(--warn); }
  .tq-lunch-gap::before, .tq-lunch-gap::after { content:""; flex:1; height:1px; border-top:1px dashed color-mix(in srgb, var(--amber) 50%, transparent); }
  .tq-bell-lunch { background:color-mix(in srgb, var(--amber) 8%, transparent); }
  .tq-bell-lunch span { color:var(--warn) !important; }

  /* ── Notifications inbox (nf-*) ── */
  .nf-body { gap:6px; }
  .nf-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-shrink:0; padding-bottom:4px; }
  .nf-seg { display:inline-flex; gap:2px; padding:3px; border-radius:12px; background:var(--surface2); border:1px solid var(--line); }
  .nf-seg > button { display:inline-flex; align-items:center; gap:6px; border:0; background:transparent; border-radius:9px; padding:7px 12px; min-height:34px;
    font:inherit; font-size:0.875rem; font-weight:500; color:var(--sub2); cursor:pointer; transition:background-color .2s, color .2s, box-shadow .2s; }
  .nf-seg > button.on { background:var(--card); color:var(--text); font-weight:600; box-shadow:0 1px 3px rgba(16,38,84,.12); }
  .nf-seg-n { min-width:18px; height:18px; padding:0 5px; border-radius:9px; display:inline-grid; place-items:center; font-size:0.6875rem; font-weight:700; background:var(--red); color:#fff; font-variant-numeric:tabular-nums; }
  .nf-readall { border:0; background:none; padding:8px 2px; font:inherit; font-size:0.9375rem; font-weight:600; color:var(--link); cursor:pointer; white-space:nowrap; }
  .nf-readall:active { opacity:.6; }
  .nf-group { display:flex; flex-direction:column; gap:8px; flex-shrink:0; animation:pwRise .4s cubic-bezier(.22,1,.36,1) backwards; }
  .nf-group + .nf-group { animation-delay:.05s; }
  .nf-day { margin:12px 4px 0; font-size:1.0625rem; font-weight:650; letter-spacing:-.01em; color:var(--text); }
  .nf-list { background:var(--card); border-radius:18px; overflow:hidden; box-shadow:var(--shadow); }
  :root[data-theme="dark"] .nf-list { border:1px solid var(--line); }
  .nf-row { position:relative; display:flex; align-items:flex-start; gap:12px; width:100%; padding:14px 16px 14px 14px; border:0; background:transparent;
    text-align:left; font:inherit; color:inherit; cursor:pointer; transition:background-color .35s; -webkit-tap-highlight-color:transparent; }
  .nf-row + .nf-row::before { content:""; position:absolute; top:0; left:66px; right:0; height:1px; background:var(--line); }
  .nf-row.unread { background:color-mix(in srgb, var(--link) 6%, var(--card)); }
  .nf-row:active { background:var(--press); }
  .nf-ico { width:40px; height:40px; border-radius:12px; flex-shrink:0; display:grid; place-items:center; }
  .nf-main { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
  .nf-top { display:flex; align-items:baseline; justify-content:space-between; gap:10px; }
  .nf-top b { font-size:0.9375rem; font-weight:600; color:var(--text); letter-spacing:-.01em; }
  .nf-top time { flex-shrink:0; font-size:0.8125rem; font-weight:500; color:var(--sub); font-variant-numeric:tabular-nums; }
  .nf-row.unread .nf-top time { color:var(--link); font-weight:600; }
  .nf-msg { font-size:0.9375rem; line-height:1.4; color:var(--sub2); display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:3; overflow:hidden; overflow-wrap:anywhere; }
  .nf-row.unread .nf-msg { color:var(--text); }
  .nf-row.open .nf-msg { -webkit-line-clamp:unset; display:block; }
  .nf-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:6px; background:var(--link); transform:scale(0); opacity:0; transition:transform .3s cubic-bezier(.34,1.56,.64,1), opacity .2s; }
  .nf-row.unread .nf-dot { transform:scale(1); opacity:1; }
  .nf-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:6px; padding:80px 24px; animation:pwRise .45s cubic-bezier(.22,1,.36,1); }
  .nf-empty-ico { width:72px; height:72px; border-radius:24px; display:grid; place-items:center; margin-bottom:10px; color:var(--link); background:color-mix(in srgb, var(--link) 10%, var(--card)); }
  .nf-empty-title { font-size:1.1875rem; font-weight:650; color:var(--text); }
  .nf-empty-text { font-size:0.9375rem; color:var(--sub2); max-width:260px; line-height:1.4; }
  /* the unread dot on the bell pops in */
  .tq-top .badge { animation:nfPop .45s cubic-bezier(.34,1.56,.64,1) both; }
  @keyframes nfPop { from { transform:scale(0); } to { transform:scale(1); } }
  @media (prefers-reduced-motion: reduce) { .nf-group, .nf-empty, .tq-top .badge { animation:none; } }

  /* ── Staff of the administration (sf-*) ── */
  .sf-app { position:fixed; inset:0; overflow-y:auto; background:var(--bg); flex-direction:column; gap:16px; padding:calc(env(safe-area-inset-top) + 18px) 16px calc(28px + env(safe-area-inset-bottom)); -webkit-overflow-scrolling:touch; }
  .sf-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:6px 4px 0; }
  .sf-date { font-size:0.8125rem; color:var(--sub); text-transform:capitalize; }
  .sf-hello { margin:4px 0 0; font-size:1.5rem; font-weight:700; line-height:1.2; letter-spacing:-.02em; color:var(--text); }
  .sf-hello span { color:var(--link); }
  .sf-role { margin-top:8px; display:inline-block; font-size:0.75rem; font-weight:600; padding:4px 10px; border-radius:999px; background:color-mix(in srgb, var(--link) 12%, var(--card)); color:var(--link); }
  .sf-out { flex-shrink:0; border:0; background:none; padding:8px 4px; font:inherit; font-size:0.9375rem; font-weight:600; color:var(--bad); cursor:pointer; }
  .sf-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .sf-card { display:flex; flex-direction:column; align-items:flex-start; gap:6px; min-height:168px; padding:16px; border:0; border-radius:24px; background:var(--card); box-shadow:var(--shadow); text-align:left; font:inherit; color:var(--text); cursor:pointer; transition:transform .15s; -webkit-tap-highlight-color:transparent; }
  :root[data-theme="dark"] .sf-card { border:1px solid var(--line); }
  .sf-card:active { transform:scale(.97); }
  .sf-ico { width:46px; height:46px; border-radius:15px; display:grid; place-items:center; margin-bottom:6px; }
  .sf-title { font-size:0.9375rem; font-weight:650; line-height:1.25; letter-spacing:-.01em; }
  .sf-sub { font-size:0.8125rem; line-height:1.35; color:var(--sub); }
  .sf-foot { margin-top:auto; display:flex; align-items:center; gap:8px; padding-top:8px; }
  .sf-stat { font-size:0.75rem; font-weight:600; color:var(--sub2); }
  .sf-badge { min-width:22px; height:22px; padding:0 7px; border-radius:11px; background:var(--red); color:#fff; font-size:0.75rem; font-weight:700; display:grid; place-items:center; }
  .sf-body { gap:12px; }
  .sf-list { display:flex; flex-direction:column; gap:10px; }
  .sf-item { display:flex; flex-direction:column; gap:6px; padding:14px 16px; border-radius:18px; background:var(--card); box-shadow:var(--shadow); border:0; font:inherit; color:var(--text); text-align:left; width:100%; }
  :root[data-theme="dark"] .sf-item { border:1px solid var(--line); }
  .sf-tap { cursor:pointer; }
  .sf-tap:active { background:var(--press); }
  .sf-item-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
  .sf-item-top b { font-size:0.9375rem; font-weight:650; line-height:1.3; overflow-wrap:anywhere; }
  .sf-item-body { font-size:0.875rem; line-height:1.45; color:var(--sub2); white-space:pre-wrap; overflow-wrap:anywhere; }
  .sf-meta { font-size:0.8125rem; color:var(--sub); }
  .sf-tag { flex-shrink:0; font-size:0.6875rem; font-weight:700; padding:3px 9px; border-radius:999px; background:color-mix(in srgb, var(--link) 12%, var(--card)); color:var(--link); }
  .sf-tag.new { background:color-mix(in srgb, var(--red) 14%, var(--card)); color:var(--red); }
  .sf-tag.resolved { background:color-mix(in srgb, var(--ok) 14%, var(--card)); color:var(--ok); }
  .sf-area { resize:none; min-height:96px; font-family:inherit; line-height:1.4; }
  .sf-switch { display:flex; align-items:center; gap:10px; font-size:0.9375rem; color:var(--text); padding:4px 2px; }
  .sf-switch input { width:20px; height:20px; accent-color:var(--link); }
  .sf-quote { padding:14px 16px; border-radius:16px; background:var(--surface2); font-size:0.9375rem; line-height:1.5; color:var(--text); white-space:pre-wrap; overflow-wrap:anywhere; }
  .sf-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .sf-stats > div { display:flex; flex-direction:column; gap:4px; padding:14px 12px; border-radius:18px; background:var(--card); box-shadow:var(--shadow); }
  .sf-stats span { font-size:0.75rem; color:var(--sub); }
  .sf-stats b { font-size:1.375rem; font-weight:700; color:var(--text); font-variant-numeric:tabular-nums; }
  .sf-group { display:grid; grid-template-columns:auto 1fr; gap:4px 14px; align-items:center; }
  .sf-group-code { font-size:1rem; font-weight:650; }
  .sf-group-avg { justify-self:end; font-size:1.125rem; font-weight:700; font-variant-numeric:tabular-nums; color:var(--sub); }
  .sf-group-avg[data-tone="good"] { color:var(--ok); }
  .sf-group-avg[data-tone="mid"] { color:var(--warn); }
  .sf-group-avg[data-tone="bad"] { color:var(--bad); }
  .sf-group-meta { grid-column:1 / -1; font-size:0.8125rem; color:var(--sub); }
  /* staff dashboard: hero with the day's numbers, livelier cards */
  .sf-hero { display:flex; flex-direction:column; gap:16px; padding:18px 18px 16px; border-radius:24px; background:var(--card); border:1px solid var(--line); }
  .sf-hero-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
  .sf-hero-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:0; border-top:1px solid var(--line); padding-top:14px; }
  .sf-hero-stats > div { display:flex; flex-direction:column; gap:3px; padding:0 8px; }
  .sf-hero-stats > div + div { border-left:1px solid var(--line); }
  .sf-hero-stats b { font-size:1.5rem; font-weight:700; letter-spacing:-.02em; color:var(--text); font-variant-numeric:tabular-nums; }
  .sf-hero-stats span { font-size:0.75rem; line-height:1.3; color:var(--sub); }
  .sf-card .sf-title { color:var(--text); }
  .sf-tap:active { background:var(--press); }

  /* ── Coursework and ДПО management (mg-*) ── */
  .mg-choices { display:flex; flex-direction:column; gap:8px; }
  .mg-opt > .tq-field { flex:1; min-width:0; width:auto; }   /* the field takes the row, so the ✕ sits at its right edge */
  .mg-choice { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:50px; padding:12px 14px; border-radius:14px; border:1px solid var(--line); background:var(--card); font:inherit; color:var(--text); text-align:left; cursor:pointer; transition:border-color .2s, background-color .2s; }
  .mg-choice:disabled { cursor:default; opacity:.65; }
  .mg-choice.mine { border-color:var(--ok); background:color-mix(in srgb, var(--ok) 6%, var(--card)); }
  .mg-choice-title { font-size:0.9375rem; line-height:1.3; overflow-wrap:anywhere; }
  .mg-pick { padding:14px 16px; display:flex; flex-direction:column; gap:12px; flex-shrink:0; }
  .mg-select { appearance:auto; }
  .mg-pick-info { display:flex; flex-direction:column; gap:2px; }
  .mg-body { gap:10px; }
  .mg-new { flex-shrink:0; }
  .mg-topic, .mg-prog { align-items:flex-start; }
  .mg-title { font-size:1rem; line-height:1.3; overflow-wrap:anywhere; }
  .mg-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .tq-pill.ok { background:color-mix(in srgb, var(--ok) 15%, transparent); color:var(--ok); }
  .tq-pill.warn { background:color-mix(in srgb, var(--amber) 18%, transparent); color:var(--warn); }
  .tq-pill.now { background:color-mix(in srgb, var(--link) 14%, transparent); color:var(--link); }
  .tq-pill { font-size:0.8125rem; padding:4px 10px; }
  .mg-head { padding:16px 18px; flex-shrink:0; }
  .mg-head-title { font-size:1.125rem; font-weight:650; letter-spacing:-.01em; color:var(--text); line-height:1.25; overflow-wrap:anywhere; }
  .mg-descr { margin-top:8px; font-size:0.9375rem; line-height:1.45; color:var(--sub2); overflow-wrap:anywhere; white-space:pre-wrap; }
  .mg-area { resize:none; min-height:88px; font-family:inherit; line-height:1.4; }
  .mg-danger { align-self:center; margin:10px 0 6px; border:0; background:none; padding:10px 14px; font:inherit; font-size:0.9375rem; font-weight:600; color:var(--bad); cursor:pointer; }
  .mg-grades { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
  .mg-grade { min-height:56px; border-radius:16px; border:1px solid var(--line); background:var(--card); font:inherit; font-size:1.5rem; font-weight:650; color:var(--text); cursor:pointer; transition:transform .12s, background-color .15s; }
  .mg-grade:active { transform:scale(.94); }
  .mg-grade.g5 { color:var(--ok); } .mg-grade.g4 { color:var(--link); } .mg-grade.g3 { color:var(--warn); } .mg-grade.g2 { color:var(--bad); }
  .tq-btn.mg-secondary, .tq-btn.mg-send { background:var(--surface2); color:var(--link); box-shadow:none; border:1px solid var(--line); }
  .mg-prog-main { flex:1; min-width:0; border:0; background:none; padding:0; font:inherit; color:inherit; text-align:left; cursor:pointer; }
  .mg-prog-main:disabled { cursor:default; }
  .mg-lead { flex-shrink:0; min-height:36px; padding:0 14px; border-radius:999px; border:1px solid var(--line); background:var(--surface2); font:inherit; font-size:0.875rem; font-weight:600; color:var(--link); cursor:pointer; transition:background-color .2s, color .2s; }
  .mg-lead.on { background:var(--accent); border-color:var(--accent); color:#fff; }
  .mg-q { display:flex; flex-direction:column; gap:8px; padding:14px; border-radius:18px; background:var(--card); border:1px solid var(--line); flex-shrink:0; }
  .mg-q-head { display:flex; align-items:center; justify-content:space-between; font-size:0.9375rem; color:var(--text); }
  .mg-opt { display:flex; align-items:center; gap:8px; }
  .mg-radio { flex-shrink:0; width:26px; height:26px; border-radius:50%; border:2px solid var(--line); background:transparent; display:grid; place-items:center; color:#fff; cursor:pointer; padding:0; transition:background-color .15s, border-color .15s; }
  .mg-radio.on { background:var(--ok); border-color:var(--ok); }
  .mg-link { align-self:flex-start; border:0; background:none; padding:6px 2px; font:inherit; font-size:0.9375rem; font-weight:600; color:var(--link); cursor:pointer; }
  .mg-results { padding:2px 16px 12px 68px; display:flex; flex-direction:column; gap:6px; }
  .mg-result { display:flex; justify-content:space-between; gap:12px; font-size:0.875rem; color:var(--sub2); }
  .mg-result b { color:var(--text); font-weight:650; }
  .mg-stud { padding:16px 18px; display:flex; flex-direction:column; gap:10px; flex-shrink:0; }
  .mg-stud-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
  .mg-file { display:flex; align-items:center; gap:8px; font-size:0.9375rem; color:var(--sub2); overflow-wrap:anywhere; }
  .mg-comment { padding:10px 12px; border-radius:12px; font-size:0.9375rem; line-height:1.4; background:color-mix(in srgb, var(--ok) 10%, transparent); color:var(--text); overflow-wrap:anywhere; }
  .mg-comment.warn { background:color-mix(in srgb, var(--amber) 14%, transparent); }

  /* ── About the app (ab-*) ── */
  .ab { gap:10px; }
  .ab-hero { display:flex; flex-direction:column; align-items:center; gap:4px; padding:12px 0 14px; animation:pwRise .45s cubic-bezier(.22,1,.36,1) backwards; }
  .ab-icon { width:88px; height:88px; border-radius:22px; margin-bottom:10px; box-shadow:0 14px 30px -12px color-mix(in srgb, var(--band) 70%, transparent), 0 0 0 1px color-mix(in srgb, var(--text) 8%, transparent); }
  .ab-name { font-size:1.5rem; font-weight:700; letter-spacing:-.015em; color:var(--text); }
  .ab-ver { font-size:0.875rem; color:var(--sub); }
  .ab-actions { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:8px; animation:pwRise .45s .05s cubic-bezier(.22,1,.36,1) backwards; }
  .ab-action { display:flex; flex-direction:column; align-items:center; gap:7px; padding:12px 4px 10px; border-radius:16px; background:var(--card); box-shadow:var(--shadow);
    font-size:0.75rem; font-weight:500; color:var(--link); text-decoration:none; transition:transform .15s, background-color .15s; -webkit-tap-highlight-color:transparent; }
  :root[data-theme="dark"] .ab-action { border:1px solid var(--line); }
  .ab-action:active { transform:scale(.95); background:var(--press); }
  .ab-action-ico { width:40px; height:40px; border-radius:50%; display:grid; place-items:center; color:#fff; background:var(--link); }
  .ab-cap { font-size:0.8125rem; font-weight:600; color:var(--sub); padding:8px 4px 0; animation:pwRise .45s .1s cubic-bezier(.22,1,.36,1) backwards; }
  .ab-card { animation:pwRise .45s .1s cubic-bezier(.22,1,.36,1) backwards; }
  .ab-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:0 16px; min-height:50px; font-size:0.9375rem; }
  .ab-row + .ab-row { border-top:1px solid var(--line); }
  .ab-row-label { color:var(--text); }
  .ab-row-val { color:var(--sub); text-align:right; }
  .ab-link { text-decoration:none; }
  .ab-tile { width:36px; height:36px; border-radius:10px; flex:none; display:grid; place-items:center; color:#fff; font-weight:800; font-size:0.8125rem; letter-spacing:-.02em; }
  .ab-foot { text-align:center; font-size:0.75rem; color:var(--sub); padding:14px 0 6px; opacity:.8; }
  @media (prefers-reduced-motion: reduce) { .ab *, .ab-hero { animation:none !important; } }

  /* ── Password change (pw-*) ── */
  .pw { display:flex; flex-direction:column; gap:14px; flex:1; }
  .pw-hero { display:flex; flex-direction:column; align-items:center; gap:12px; padding:6px 0 8px; animation:pwRise .45s cubic-bezier(.22,1,.36,1) backwards; }
  .pw-badge { width:64px; height:64px; border-radius:20px; display:grid; place-items:center; color:#fff;
    background:linear-gradient(150deg, var(--link2), var(--band)); box-shadow:0 10px 24px -8px color-mix(in srgb, var(--link) 70%, transparent), inset 0 1px 0 rgba(255,255,255,.25); }
  .pw-title { margin:0; font-size:1.375rem; font-weight:700; letter-spacing:-.01em; color:var(--text); }
  .pw-group { background:var(--card); border:1px solid var(--line); border-radius:18px; overflow:hidden;
    transition:border-color .2s, box-shadow .2s; animation:pwRise .45s cubic-bezier(.22,1,.36,1) backwards; }
  .pw-group.g2 { animation-delay:.05s; }
  .pw-group:focus-within { border-color:color-mix(in srgb, var(--link) 55%, var(--line)); box-shadow:0 0 0 4px color-mix(in srgb, var(--link) 14%, transparent); }
  .pw-row { position:relative; display:flex; align-items:center; gap:12px; padding:0 8px 0 16px; min-height:56px; }
  .pw-row + .pw-row::before { content:""; position:absolute; top:0; left:46px; right:0; height:1px; background:var(--line); }
  .pw-ico { color:var(--sub); flex:none; display:grid; transition:color .2s; }
  .pw-row:focus-within .pw-ico { color:var(--link); }
  .pw-input { flex:1; min-width:0; background:transparent; border:0; outline:none; padding:16px 0; font:inherit; font-size:1rem; color:var(--text); }
  .pw-input::placeholder { color:var(--sub); opacity:.85; }
  .pw-eye { flex:none; width:40px; height:40px; border:0; border-radius:12px; background:transparent; color:var(--sub); display:grid; place-items:center; cursor:pointer; transition:background-color .15s, color .15s; }
  .pw-eye:active { background:var(--press); color:var(--text); }
  .pw-state { flex:none; width:40px; height:40px; display:grid; place-items:center; }
  .pw-state > * { animation:pwPop .32s cubic-bezier(.34,1.56,.64,1); }
  .pw-meter { display:flex; align-items:center; gap:12px; padding:0 4px; animation:pwRise .45s .1s cubic-bezier(.22,1,.36,1) backwards; }
  .pw-bars { flex:1; display:grid; grid-template-columns:repeat(4,1fr); gap:5px; }
  .pw-bars i { height:4px; border-radius:4px; background:var(--line); transition:background-color .35s ease; }
  .pw-bars[data-level="1"] i:nth-child(-n+1), .pw-bars[data-level="2"] i:nth-child(-n+2) { background:var(--bad); }
  .pw-bars[data-level="3"] i:nth-child(-n+3) { background:var(--amber); }
  .pw-bars[data-level="4"] i { background:var(--ok); }
  .pw-level { font-size:0.8125rem; font-weight:600; min-width:72px; text-align:right; color:var(--sub); transition:color .3s; }
  .pw-level[data-level="1"], .pw-level[data-level="2"] { color:var(--bad); }
  .pw-level[data-level="3"] { color:var(--warn); }
  .pw-level[data-level="4"] { color:var(--ok); }
  .pw-chips { display:flex; flex-wrap:wrap; gap:6px; padding:0 2px; animation:pwRise .45s .14s cubic-bezier(.22,1,.36,1) backwards; }
  .pw-chip { display:inline-flex; align-items:center; gap:5px; padding:6px 11px 6px 9px; border-radius:999px; font-size:0.8125rem; font-weight:500;
    background:var(--surface2); color:var(--sub); transition:background-color .25s, color .25s; }
  .pw-chip svg { transition:transform .3s cubic-bezier(.34,1.56,.64,1), opacity .2s; }
  .pw-chip:not(.ok) svg { transform:scale(.6); opacity:.45; }
  .pw-chip.ok { background:color-mix(in srgb, var(--ok) 14%, transparent); color:var(--ok); }
  .pw-error { display:flex; align-items:center; justify-content:center; gap:8px; padding:11px 14px; border-radius:14px; font-size:0.8125rem; font-weight:500;
    color:var(--bad); background:color-mix(in srgb, var(--bad) 10%, transparent); animation:pwShake .4s; }
  .pw-submit { margin-top:auto; width:100%; min-height:54px; border:0; border-radius:16px; font:inherit; font-size:1rem; font-weight:700; color:#fff; cursor:pointer;
    background:var(--link); box-shadow:0 10px 24px -10px color-mix(in srgb, var(--link) 80%, transparent);
    transition:background-color .25s, color .25s, box-shadow .25s, transform .15s; display:flex; align-items:center; justify-content:center; gap:10px; }
  .pw-submit:active:not(:disabled) { transform:scale(.98); }
  .pw-submit:disabled { background:var(--surface2); color:var(--sub); box-shadow:none; cursor:default; }
  .pw-submit.busy:disabled { background:var(--link); color:#fff; }
  .pw-spin { width:18px; height:18px; border-radius:50%; border:2px solid rgba(255,255,255,.35); border-top-color:#fff; animation:pwSpin .7s linear infinite; }
  .pw-done { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; text-align:center; padding:24px 8px; animation:pwRise .45s cubic-bezier(.22,1,.36,1); }
  .pw-done .pw-title { margin-top:6px; }
  .pw-done-sub { font-size:0.875rem; color:var(--sub); line-height:1.5; max-width:260px; }
  .pw-done .pw-submit { margin-top:24px; }
  @keyframes pwRise { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
  @keyframes pwPop { from { opacity:0; transform:scale(.4); } to { opacity:1; transform:none; } }
  @keyframes pwShake { 0%,100% { transform:none; } 20%,60% { transform:translateX(-6px); } 40%,80% { transform:translateX(6px); } }
  @keyframes pwSpin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .pw *, .pw, .pw-done { animation:none !important; transition:none !important; } }
`;

// ─── helpers ─────────────────────────────────────────────────────────────────
const BELLS_BY_CORPUS = {
  "1-2": [["1 пара","09:00–10:30"],["2 пара","10:50–12:20"],["ОБЕД","12:20–13:25"],["3 пара","13:25–14:45"],["4 пара","15:00–16:20"],["5 пара","16:30–17:50"]],
  "3":   [["1 пара","09:00–10:30"],["2 пара","10:40–12:10"],["ОБЕД","12:10–12:55"],["3 пара","12:55–14:25"],["4 пара","14:35–15:55"],["5 пара","16:05–17:25"]],
};
const ICON_BY_SUBJ = {};   // a subject has its own icon only when one is assigned here
