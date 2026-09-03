// Shared color palette, global stylesheet, schedule helpers/fallbacks and small lookup tables.
const STUDENT_LESSONS_FALLBACK = [
  { start:[10,30], end:[12,0],  subj:"Экономика",       room:"ауд. 204",          online:true  },
  { start:[12,10], end:[13,40], subj:"Физика",           room:"ауд. 101",          online:false },
  { start:[14,0],  end:[15,30], subj:"Программирование", room:"лаб. 305",          online:false },
];
const TEACHER_LESSONS = [
  { start:[10,30], end:[12,0],  subj:"Экономика",    room:"ДВ-41 · ауд. 204", online:false },
  { start:[12,10], end:[13,40], subj:"Экономика",    room:"ДВ-31 · ауд. 101", online:false },
  { start:[14,0],  end:[15,30], subj:"Консультация", room:"ауд. 305",          online:false },
];
const fmt = (h,m) => `${h}:${String(m).padStart(2,"0")}`;
const mins = (h,m) => h*60+m;
function getNextLesson(lessons) {
  const now = new Date();
  const day = now.getDay();
  const cur = now.getHours()*60 + now.getMinutes();
  if (day === 0 || day === 6)
    return { subj:"Нет пар", room:"Выходной день", timeStr:"—", label:"ВЫХОДНОЙ ДЕНЬ", online:false };
  for (let i = 0; i < lessons.length; i++) {
    const s = mins(...lessons[i].start), e = mins(...lessons[i].end);
    if (cur >= s && cur < e)
      return { ...lessons[i], timeStr:`${fmt(...lessons[i].start)} – ${fmt(...lessons[i].end)}`, label:"ИДЁТ ПАРА" };
    if (cur < s)
      return { ...lessons[i], timeStr:`${fmt(...lessons[i].start)} – ${fmt(...lessons[i].end)}`, label:"СЛЕДУЮЩАЯ ПАРА" };
  }
  return { subj:"Занятия окончены", room:"До завтра!", timeStr:"—", label:"НА СЕГОДНЯ ВСЁ", online:false };
}
const C = {
  bg:      "#0B1120",
  surface: "#101C33",
  card:    "#142240",
  accent:  "#1F5CB8",
  accentL: "#4A8FE7",
  green:   "#4CAF6B",
  amber:   "#F5A623",
  blue:    "#4A8FE7",
  text:    "#FFFFFF",
  sub:     "#7B9DBF",
  border:  "#1E3560",
};
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Geologica', sans-serif; background: ${C.bg}; color: ${C.text}; }

  .screen { display:none; flex-direction:column; min-height:100vh; }
  .screen.active { display:flex; }

  /* ── SPLASH SCREEN ── */
  @keyframes splashFadeOut {
    0%   { opacity:1; }
    100% { opacity:0; }
  }
  @keyframes morphBlob {
    0%   { border-radius:60% 40% 70% 30% / 50% 60% 40% 70%; transform:scale(.1) rotate(0deg);   opacity:0; filter:blur(40px); }
    20%  { border-radius:50% 50% 50% 50% / 50% 50% 50% 50%; transform:scale(.6) rotate(45deg);  opacity:.7; filter:blur(12px); }
    50%  { border-radius:40% 60% 30% 70% / 60% 40% 70% 30%; transform:scale(1.1) rotate(90deg); opacity:1; filter:blur(4px); }
    75%  { border-radius:50% 50% 50% 50%; transform:scale(.95) rotate(95deg); filter:blur(1px); }
    100% { border-radius:50% 50% 50% 50%; transform:scale(1) rotate(0deg);   opacity:1; filter:blur(0px); }
  }
  @keyframes morphGlow {
    0%,100% { box-shadow:0 0 0px 0px #1F5CB800; }
    40%      { box-shadow:0 0 60px 20px #1F5CB8aa, 0 0 120px 40px #4A8FE744; }
    100%     { box-shadow:0 0 25px 6px #1F5CB855, 0 0 60px 16px #1F5CB822; }
  }
  @keyframes liquidDrip {
    0%   { transform:scaleY(0) translateY(-50%); opacity:0; border-radius:50%; }
    40%  { transform:scaleY(1.3) translateY(0%); opacity:1; border-radius:30% 30% 60% 60%; }
    70%  { transform:scaleY(.9) translateY(4px); border-radius:40% 40% 55% 55%; }
    100% { transform:scaleY(1) translateY(0px);  border-radius:50%; opacity:0; }
  }
  @keyframes textMorph {
    0%   { opacity:0; filter:blur(20px); letter-spacing:20px; transform:scaleX(1.4); }
    60%  { opacity:1; filter:blur(2px);  letter-spacing:12px; transform:scaleX(1.05); }
    100% { opacity:1; filter:blur(0);    letter-spacing:8px;  transform:scaleX(1); }
  }
  @keyframes subLiquid {
    0%   { opacity:0; transform:translateY(-10px) scaleY(1.5); filter:blur(8px); }
    100% { opacity:1; transform:translateY(0) scaleY(1);       filter:blur(0); }
  }
  @keyframes blobFloat {
    0%,100% { transform:translate(0,0) scale(1); }
    33%      { transform:translate(12px,-8px) scale(1.08); }
    66%      { transform:translate(-8px,10px) scale(.94); }
  }
  .splash {
    position:fixed; inset:0; z-index:999;
    background: radial-gradient(ellipse at 50% 40%, #0d1e42 0%, #060c18 100%);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:28px; overflow:hidden;
  }
  .splash.hiding {
    animation: splashFadeOut .6s ease forwards;
    pointer-events:none;
  }
  /* ambient blobs */
  .splash-blob {
    position:absolute; border-radius:50%; filter:blur(60px); opacity:.18;
    animation: blobFloat 5s ease-in-out infinite;
  }
  .splash-logo-wrap {
    position:relative; border-radius:50%; overflow:hidden;
    width:120px; height:120px; flex-shrink:0;
  }
  .splash-drip {
    position:absolute; bottom:-18px; left:50%; transform:translateX(-50%);
    width:28px; height:28px; background:#1F5CB8;
    animation: liquidDrip 1s ease .5s both;
    z-index:3;
  }
  .splash-texts {
    display:flex; flex-direction:column; align-items:center; gap:8px;
  }
  .splash-title {
    font-size:36px; font-weight:800; color:#fff;
    font-family:'Geologica',sans-serif;
    animation: textMorph .9s cubic-bezier(.4,0,.2,1) 1.2s both;
    text-shadow: 0 0 30px #1F5CB888;
  }
  .splash-sub {
    font-size:11px; letter-spacing:3px; color:#1F5CB899;
    font-family:'Geologica',sans-serif;
    animation: subLiquid .7s ease 1.9s both;
  }
  .splash-dots {
    display:flex; gap:10px;
    animation: subLiquid .5s ease 2.2s both;
  }
  .splash-dot {
    width:7px; height:7px; border-radius:50%; background:#1F5CB877;
    animation: liquidDrip 1.4s ease-in-out infinite;
  }
  .splash-dot:nth-child(2) { animation-delay:.2s; background:#4A8FE766; }
  .splash-dot:nth-child(3) { animation-delay:.4s; }

  /* ── ANIMATIONS ── */
  @keyframes shake {
    0%,100% { transform:translateX(0); }
    20%      { transform:translateX(-8px); }
    40%      { transform:translateX(8px); }
    60%      { transform:translateX(-5px); }
    80%      { transform:translateX(5px); }
  }
  .field-shake { animation: shake .4s ease; }
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
  [style*="fadeUp"] { animation-fill-mode: both !important; }
  .anim-fadein { animation: fadeIn .3s ease both; }

  /* ── LOGIN ── */
  .login-wrap {
    flex:1; display:flex; flex-direction:column; align-items:center;
    justify-content:center; padding:32px 24px; gap:24px;
  }
  .login-heading { font-size:18px; font-weight:600; letter-spacing:2px; text-align:center; }
  .field-wrap { width:100%; position:relative; }
  .field-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:${C.sub}; font-size:15px; }
  .field-wrap input {
    width:100%; padding:14px 14px 14px 40px;
    background:${C.surface}; border:1px solid ${C.border}; border-radius:12px;
    color:${C.text}; font-family:inherit; font-size:15px; outline:none;
    transition: border-color .2s;
  }
  .field-wrap input:focus { border-color:${C.accent}; }
  .show-btn {
    position:absolute; right:14px; top:50%; transform:translateY(-50%);
    background:none; border:none; color:${C.sub}; cursor:pointer; font-size:12px;
    display:flex; align-items:center; gap:4px;
  }
  .show-btn:hover { color:${C.accentL}; }
  .forgot { font-size:12px; color:${C.sub}; letter-spacing:1px; cursor:pointer; background:none; border:none; font-family:inherit; }
  .forgot:hover { color:${C.accentL}; }
  .btn-primary {
    width:100%; padding:16px; border-radius:50px;
    background: linear-gradient(135deg, ${C.accent}, #0d3585);
    border:none; color:#fff; font-family:inherit; font-size:15px; font-weight:700;
    letter-spacing:2px; cursor:pointer; transition: opacity .15s, transform .1s;
    animation: pulse 2.5s infinite;
  }
  .btn-primary:hover { opacity:.9; }
  .btn-primary:active { transform:scale(.98); }
  .link-btn {
    background:none; border:none; color:${C.sub}; font-family:inherit; font-size:13px;
    letter-spacing:1.5px; cursor:pointer; display:flex; align-items:center; gap:6px;
    transition: color .2s;
  }
  .link-btn:hover { color:${C.accentL}; }
  .divider { width:100%; display:flex; align-items:center; gap:10px; }
  .divider-line { flex:1; height:1px; background:${C.border}; }
  .divider span { font-size:11px; color:${C.sub}; }

  /* ── TOP BAR ── */
  .topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 20px; position:sticky; top:0; z-index:20;
    background:${C.bg}cc; backdrop-filter:blur(12px);
    border-bottom:1px solid ${C.border};
  }
  .topbar-left { display:flex; align-items:center; gap:14px; }
  .notif-btn { position:relative; background:none; border:none; color:${C.text}; font-size:20px; cursor:pointer; }
  .badge {
    position:absolute; top:-4px; right:-6px; background:#E84C4C;
    border-radius:50%; width:16px; height:16px; font-size:9px; font-weight:700;
    display:flex; align-items:center; justify-content:center;
  }
  .search-btn { background:none; border:none; color:${C.sub}; font-size:18px; cursor:pointer; }
  .avatar-row { display:flex; align-items:center; gap:8px; }
  .avatar {
    width:32px; height:32px; border-radius:50%; background:${C.accent};
    display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700;
  }
  .avatar-name { font-size:13px; color:${C.sub}; }
  .tag-role {
    font-size:10px; background:${C.accent}33; color:${C.accentL};
    padding:3px 10px; border-radius:20px; letter-spacing:1px;
  }
  .tag-role.teacher { background:${C.green}22; color:#5ec97a; }
  .tag-role.applicant { background:${C.blue}22; color:#6fb3f5; }

  /* ── DASH ── */
  .dash { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px; }
  .greeting { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:8px; }
  .greeting h1 { font-size:22px; font-weight:700; }
  .group-tag { font-size:12px; color:${C.sub}; background:${C.surface}; padding:4px 10px; border-radius:20px; }

  .next-class {
    background: linear-gradient(135deg, #0d2060, #091535);
    border:1px solid ${C.accent}44; border-radius:16px; padding:16px;
  }
  .next-class-label { font-size:10px; letter-spacing:2px; color:${C.accentL}; margin-bottom:8px; display:flex; align-items:center; gap:6px; }
  .next-class-row { display:flex; justify-content:space-between; align-items:flex-start; }
  .next-class-time { font-size:15px; font-weight:600; color:${C.accentL}; text-align:right; }
  .link-tag { font-size:12px; color:${C.accentL}; margin-top:4px; display:flex; align-items:center; gap:4px; cursor:pointer; }

  .stats-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .stat-card { background:${C.card}; border-radius:14px; padding:14px; }
  .stat-label { font-size:11px; color:${C.sub}; display:flex; align-items:center; gap:6px; margin-bottom:8px; }
  .stat-val { font-size:17px; font-weight:700; }
  .bar-track { height:5px; background:${C.border}; border-radius:3px; margin-top:8px; overflow:hidden; }
  .bar-fill { height:100%; border-radius:3px; background:${C.green}; transition: width 1s ease; }
  .bar-fill.accent { background:${C.accent}; }
  .bar-fill.blue { background:${C.blue}; }

  .quick-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
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
    font-size:22px; transition: transform .18s ease;
  }
  .quick-btn:hover .quick-icon-box { transform:scale(1.1); }
  .quick-lbl {
    font-size:10px; font-weight:600; color:${C.sub};
    text-align:center; line-height:1.3;
  }

  .section-card { background:${C.card}; border-radius:16px; padding:16px; }
  .section-head { font-size:10px; letter-spacing:2px; color:${C.sub}; margin-bottom:12px; display:flex; align-items:center; gap:6px; }
  .schedule-row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid ${C.border}33; }
  .schedule-row:last-child { border-bottom:none; }
  .sch-time { font-size:12px; color:${C.accentL}; width:42px; flex-shrink:0; }
  .sch-subj { font-size:13px; flex:1; padding:0 8px; }
  .sch-room { font-size:12px; color:${C.sub}; }

  .deadline-card { background:${C.card}; border-radius:16px; padding:14px 16px; display:flex; align-items:center; gap:12px; }
  .news-card { background:${C.card}; border-radius:16px; padding:14px 16px; }
  .news-item { font-size:13px; color:${C.sub}; padding:6px 0; border-bottom:1px solid ${C.border}22; }
  .news-item:last-child { border-bottom:none; }

  .teacher-next {
    background: linear-gradient(135deg, #1d2e1a, #162414);
    border:1px solid ${C.green}44; border-radius:16px; padding:16px;
  }
  .teacher-meta-row { display:flex; gap:12px; margin-top:8px; font-size:12px; color:${C.sub}; flex-wrap:wrap; }

  .group-list { display:flex; flex-direction:column; gap:8px; }
  .group-row {
    background:${C.surface}; border-radius:12px; padding:12px 14px;
    display:flex; justify-content:space-between; align-items:center; cursor:pointer;
    transition: background .15s, transform .15s;
  }
  .group-row:hover { background:#152a50; transform:translateX(3px); }
  .group-name { font-size:14px; font-weight:600; }
  .group-count { font-size:12px; color:${C.sub}; }

  /* ── BOTTOM NAV ── */
  .bottom-nav {
    display:flex; justify-content:space-around; padding:12px 0 20px;
    background:${C.bg}; border-top:1px solid ${C.border};
    position:sticky; bottom:0;
  }
  .nav-item {
    display:flex; flex-direction:column; align-items:center; gap:4px;
    background:none; border:none; color:${C.sub}; font-family:inherit;
    font-size:10px; cursor:pointer; padding:0 12px; transition: color .15s;
  }
  .nav-item.active { color:${C.accentL}; }
  .nav-item span { font-size:20px; }

  .back-btn {
    background:none; border:none; color:${C.sub}; font-size:13px;
    cursor:pointer; display:flex; align-items:center; gap:6px;
    padding:0; font-family:inherit; transition: color .15s;
  }
  .back-btn:hover { color:${C.text}; }

  /* ── NOTIFICATIONS ── */
  .panel-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:200;
    opacity:0; pointer-events:none; transition:opacity .25s; backdrop-filter:blur(4px);
  }
  .panel-overlay.open { opacity:1; pointer-events:all; }
  .notif-panel {
    position:fixed; top:0; right:0; bottom:0; width:min(320px,92vw);
    background:#101C33; z-index:201; display:flex; flex-direction:column;
    transform:translateX(100%); transition:transform .32s cubic-bezier(.4,0,.2,1);
    box-shadow:-8px 0 40px rgba(0,0,0,.5);
  }
  .notif-panel.open { transform:translateX(0); }
  .notif-header {
    padding:16px 20px; border-bottom:1px solid #1E3560;
    display:flex; justify-content:space-between; align-items:center;
  }
  .notif-title { font-size:17px; font-weight:700; }
  .notif-close { background:none; border:none; color:#7B9DBF; font-size:22px; cursor:pointer; line-height:1; }
  .notif-body { flex:1; overflow-y:auto; padding:12px 16px; display:flex; flex-direction:column; gap:8px; }
  .notif-item {
    background:#142240; border-radius:14px; padding:13px 14px;
    display:flex; gap:12px; align-items:flex-start;
    border-left:3px solid #1F5CB8; animation:fadeUp .3s ease both;
  }
  .notif-item.green { border-left-color:#4CAF6B; }
  .notif-item.amber { border-left-color:#F5A623; }
  .notif-item.red   { border-left-color:#E84C4C; }
  .notif-icon { font-size:20px; flex-shrink:0; margin-top:1px; }
  .notif-text { flex:1; }
  .notif-msg  { font-size:13px; font-weight:500; margin-bottom:3px; }
  .notif-time { font-size:11px; color:#7B9DBF; }
  .notif-unread-dot { width:8px; height:8px; border-radius:50%; background:#E84C4C; flex-shrink:0; margin-top:5px; }

  /* ── SEARCH ── */
  .search-panel {
    position:fixed; top:0; left:0; right:0; background:#101C33; z-index:201;
    transform:translateY(-100%); transition:transform .32s cubic-bezier(.4,0,.2,1);
    border-bottom:1px solid #1E3560; padding:14px 16px 16px;
    box-shadow:0 8px 30px rgba(0,0,0,.4);
  }
  .search-panel.open { transform:translateY(0); }
  .search-row { display:flex; gap:10px; align-items:center; margin-bottom:14px; }
  .search-input {
    flex:1; padding:12px 16px; background:#142240; border:1px solid #1E3560;
    border-radius:12px; color:#fff; font-family:inherit; font-size:15px; outline:none;
    transition:border-color .2s;
  }
  .search-input:focus { border-color:#1F5CB8; }
  .search-cancel { background:none; border:none; color:#7B9DBF; font-family:inherit; font-size:14px; cursor:pointer; white-space:nowrap; }
  .search-cancel:hover { color:#fff; }
  .search-results { display:flex; flex-direction:column; gap:6px; max-height:55vh; overflow-y:auto; }
  .search-result {
    background:#142240; border-radius:12px; padding:11px 14px;
    display:flex; gap:10px; align-items:center; cursor:pointer;
    transition:background .15s;
  }
  .search-result:hover { background:#152a50; }
  .search-result-icon { font-size:18px; flex-shrink:0; }
  .search-result-title { font-size:13px; font-weight:500; }
  .search-result-sub { font-size:11px; color:#7B9DBF; margin-top:1px; }
  .search-empty { text-align:center; color:#7B9DBF; font-size:13px; padding:20px 0; }

  /* ══════════════════════════════════════════
     ── PERSONAL ACCOUNT (ЛК) ──
  ══════════════════════════════════════════ */
  @keyframes slideUpSheet {
    from { transform:translateY(100%); }
    to   { transform:translateY(0); }
  }
  .lk-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:200;
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
  .lk-handle { width:40px; height:4px; background:${C.border}; border-radius:2px; margin:12px auto 0; }
  .lk-header {
    padding:16px 20px 14px; border-bottom:1px solid ${C.border};
    display:flex; align-items:center; gap:14px;
  }
  .lk-avatar-big {
    width:52px; height:52px; border-radius:50%;
    background:linear-gradient(135deg,${C.accent},#0d3585);
    display:flex; align-items:center; justify-content:center;
    font-size:22px; font-weight:700; flex-shrink:0;
    box-shadow:0 0 20px ${C.accent}55;
  }
  .lk-name { font-size:17px; font-weight:700; }
  .lk-meta { font-size:12px; color:${C.sub}; margin-top:2px; }
  .lk-edit-btn {
    margin-left:auto; background:${C.card}; border:1px solid ${C.border};
    border-radius:10px; padding:6px 12px; color:${C.sub}; font-size:12px;
    cursor:pointer; font-family:inherit; transition:all .15s;
  }
  .lk-edit-btn:hover { border-color:${C.accentL}; color:${C.accentL}; }
  .lk-body { overflow-y:auto; padding:14px 20px 28px; display:flex; flex-direction:column; gap:6px; }
  .lk-section-title { font-size:10px; letter-spacing:2px; color:${C.sub}; padding:8px 0 2px; }
  .lk-menu-item {
    display:flex; align-items:center; gap:12px; padding:12px 14px;
    background:${C.card}; border-radius:14px; cursor:pointer;
    transition:background .15s, transform .15s; border:1px solid transparent;
  }
  .lk-menu-item:hover { background:#152a50; transform:translateX(3px); border-color:${C.border}; }
  .lk-menu-item:active { transform:scale(.98); }
  .lk-menu-icon {
    width:38px; height:38px; border-radius:10px;
    display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;
  }
  .lk-menu-text { flex:1; }
  .lk-menu-title { font-size:14px; font-weight:500; }
  .lk-menu-sub { font-size:11px; color:${C.sub}; margin-top:1px; }
  .lk-menu-arrow { color:${C.sub}; font-size:14px; }
  .lk-menu-badge { background:#E84C4C; color:#fff; border-radius:10px; font-size:10px; font-weight:700; padding:2px 7px; }
  .lk-divider { height:1px; background:${C.border}33; margin:4px 0; }
  .lk-logout {
    display:flex; align-items:center; justify-content:center; gap:8px;
    padding:13px; background:${C.card}; border-radius:14px; cursor:pointer;
    color:#E84C4C; font-size:14px; font-weight:500; transition:background .15s;
    border:1px solid #E84C4C22;
  }
  .lk-logout:hover { background:#2a1a1a; }
  .lk-inner { z-index:300 !important; }

  /* week tabs */
  .week-tabs { display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; }
  .week-tab { padding:7px 14px; border-radius:20px; font-size:12px; white-space:nowrap; cursor:pointer; background:${C.surface}; border:1px solid ${C.border}; transition:all .15s; }
  .week-tab.active { background:${C.accent}33; border-color:${C.accent}; color:${C.accentL}; }
  .sched-item { background:${C.card}; border-radius:14px; padding:14px; display:flex; gap:12px; border-left:3px solid ${C.accent}; }
  .sched-time-start { font-size:14px; font-weight:700; color:${C.accentL}; }
  .sched-time-end { font-size:11px; color:${C.sub}; }
  .sched-subj { font-size:14px; font-weight:600; margin-bottom:4px; }
  .sched-meta { font-size:12px; color:${C.sub}; display:flex; gap:10px; flex-wrap:wrap; }
  .online-link { font-size:12px; color:${C.accentL}; margin-top:5px; cursor:pointer; }

  /* grades */
  .grade-subject { background:${C.card}; border-radius:16px; overflow:hidden; border:1px solid ${C.border}; flex-shrink:0; }
  .grade-subj-header { padding:14px 16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background .15s; }
  .grade-subj-header:hover { background:${C.surface}; }
  .grade-subj-name { font-size:14px; font-weight:600; }
  .grade-avg.good { color:${C.green}; font-weight:700; }
  .grade-avg.ok { color:${C.amber}; font-weight:700; }
  .grade-avg.bad { color:#E84C4C; font-weight:700; }
  .grade-list { padding:0 16px 12px; display:flex; flex-direction:column; gap:4px; }
  .grade-row { display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid ${C.border}22; font-size:13px; }
  .grade-row:last-child { border-bottom:none; }
  .grade-type { color:${C.sub}; font-size:12px; }
  .grade-val { font-size:14px; font-weight:700; padding:2px 9px; border-radius:8px; }
  .grade-5 { background:#4CAF6B22; color:#5ec97a; }
  .grade-4 { background:#4A8FE722; color:#6fb3f5; }
  .grade-3 { background:#F5A62322; color:#f5c067; }
  .grade-2 { background:#E84C4C22; color:#ff7e7e; }
  .debt-row { background:#E84C4C11; border:1px solid #E84C4C33; border-radius:12px; padding:10px 14px; display:flex; justify-content:space-between; font-size:13px; }

  /* portfolio */
  .ptab { padding:7px 14px; border-radius:20px; font-size:12px; cursor:pointer; background:${C.surface}; border:1px solid ${C.border}; transition:all .15s; }
  .ptab.active { background:${C.accent}33; border-color:${C.accent}; color:${C.accentL}; }
  .portfolio-item { background:${C.card}; border-radius:14px; padding:14px; display:flex; gap:12px; border:1px solid ${C.border}; transition:border-color .2s; }
  .portfolio-item:hover { border-color:${C.accent}44; }
  .portfolio-tag { display:inline-block; padding:2px 8px; border-radius:8px; font-size:10px; margin-top:6px; background:${C.accent}22; color:${C.accentL}; }

  /* curriculum */
  .course-year { background:${C.card}; border-radius:16px; overflow:hidden; border:1px solid ${C.border}; flex-shrink:0; }
  .course-year-header { padding:14px 16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background .15s; font-weight:600; }
  .course-year-header:hover { background:${C.surface}; }
  .course-subjects { padding:0 16px 12px; display:flex; flex-direction:column; gap:5px; }
  .course-subj-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid ${C.border}22; font-size:13px; }
  .course-subj-row:last-child { border-bottom:none; }
  .course-subj-type { font-size:10px; color:${C.sub}; padding:2px 7px; background:${C.surface}; border-radius:6px; }

  /* consultations */
  .time-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .time-slot { padding:8px 14px; border-radius:10px; font-size:13px; text-align:center; cursor:pointer; background:${C.surface}; border:1px solid ${C.border}; transition:all .15s; }
  .time-slot.selected { background:${C.accent}33; border-color:${C.accent}; color:${C.accentL}; }
  .time-slot.taken { opacity:.4; cursor:not-allowed; }

  /* spravki */
  .spravka-item { background:${C.card}; border-radius:14px; padding:14px; display:flex; align-items:center; gap:12px; border:1px solid ${C.border}; cursor:pointer; transition:all .2s; }
  .spravka-item:hover { border-color:${C.accent}44; transform:translateX(3px); }
  .spravka-status { font-size:11px; padding:3px 10px; border-radius:20px; white-space:nowrap; }
  .spravka-status.ready { background:${C.green}22; color:#5ec97a; }
  .spravka-status.process { background:${C.amber}22; color:${C.amber}; }
  .spravka-status.new-s { background:${C.accent}22; color:${C.accentL}; }

  /* faculty */
  .fac-card { background:${C.card}; border-radius:16px; padding:16px; border:1px solid ${C.border}; cursor:pointer; transition:all .2s; }
  .fac-card:hover { border-color:${C.accent}44; transform:translateY(-2px); }
  .fac-paid { background:${C.amber}22; color:${C.amber}; display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; margin-bottom:8px; }
  .fac-free { background:${C.green}22; color:#5ec97a; display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; margin-bottom:8px; }
  .fac-title { font-size:15px; font-weight:600; margin-bottom:6px; }
  .fac-stat { font-size:12px; color:${C.sub}; }

  /* ══════════════════════════════════════════
     ── APPLICANT SCREENS ──
  ══════════════════════════════════════════ */

  /* hero banner */
  .app-hero {
    background: linear-gradient(135deg, #0d2060 0%, #091535 100%);
    border:1px solid ${C.blue}33; border-radius:20px; padding:22px 20px;
    display:flex; flex-direction:column; gap:10px; position:relative; overflow:hidden;
  }
  .app-hero::before {
    content:''; position:absolute; top:-30px; right:-30px;
    width:120px; height:120px; border-radius:50%;
    background: radial-gradient(circle, ${C.blue}22, transparent 70%);
  }
  .app-hero-title { font-size:20px; font-weight:700; }
  .app-hero-sub { font-size:13px; color:#6fb3f5; line-height:1.5; }

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
  .app-tile:hover { transform:translateY(-3px); background:#152a50; }
  .app-tile:hover::after { opacity:1; }
  .app-tile:active { transform:scale(.97); }
  .app-tile.faq::after   { background: linear-gradient(90deg, #1F5CB8, #4A8FE7); }
  .app-tile.apply::after { background: linear-gradient(90deg, #4A8FE7, #72b0ff); }
  .app-tile.specs::after { background: linear-gradient(90deg, #4CAF6B, #72e895); }
  .app-tile.comm::after  { background: linear-gradient(90deg, #F5A623, #ffc86b); }
  .app-tile.about::after { background: linear-gradient(90deg, #E84C4C, #ff7e7e); }
  .app-tile.open::after  { background: linear-gradient(90deg, #A855F7, #d496ff); }
  .app-tile.faq:hover   { border-color: ${C.accent}55; }
  .app-tile.apply:hover { border-color: ${C.blue}55; }
  .app-tile.specs:hover { border-color: ${C.green}55; }
  .app-tile.comm:hover  { border-color: ${C.amber}55; }
  .app-tile.about:hover { border-color: #E84C4C55; }
  .app-tile.open:hover  { border-color: #A855F755; }
  .app-tile-icon { font-size:28px; }
  .app-tile-title { font-size:14px; font-weight:600; }
  .app-tile-sub { font-size:11px; color:${C.sub}; line-height:1.4; }

  /* inner screens slide-in */
  .inner-screen {
    position:fixed; inset:0; background:${C.bg};
    display:flex; flex-direction:column;
    transform:translateX(100%); transition:transform .32s cubic-bezier(.4,0,.2,1);
    z-index:100;
  }
  .inner-screen.open { transform:translateX(0); }

  .inner-body { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:14px; }

  /* FAQ */
  .faq-search {
    background:${C.surface}; border:1px solid ${C.border}; border-radius:12px;
    padding:12px 16px; color:${C.text}; font-family:inherit; font-size:14px;
    outline:none; width:100%; transition:border-color .2s;
  }
  .faq-search:focus { border-color:${C.accent}; }
  .faq-item {
    background:${C.card}; border-radius:14px; overflow:hidden;
    border:1px solid ${C.border}; transition: border-color .2s;
  }
  .faq-item.open { border-color:${C.accent}44; }
  .faq-q {
    padding:14px 16px; cursor:pointer; display:flex; justify-content:space-between;
    align-items:center; font-size:14px; font-weight:500; gap:10px;
    transition: background .15s;
  }
  .faq-q:hover { background:${C.surface}; }
  .faq-chevron { color:${C.sub}; font-size:12px; transition:transform .25s; flex-shrink:0; }
  .faq-item.open .faq-chevron { transform:rotate(180deg); }
  .faq-a {
    max-height:0; overflow:hidden; transition:max-height .3s ease, padding .3s ease;
    font-size:13px; color:${C.sub}; line-height:1.6;
    padding:0 16px; border-top:0px solid ${C.border};
  }
  .faq-item.open .faq-a { max-height:200px; padding:12px 16px; border-top:1px solid ${C.border}33; }
  .faq-cats { display:flex; gap:8px; flex-wrap:wrap; }
  .faq-cat {
    padding:6px 14px; border-radius:20px; font-size:12px; cursor:pointer;
    background:${C.surface}; border:1px solid ${C.border}; transition:all .15s;
  }
  .faq-cat.active { background:${C.accent}33; border-color:${C.accent}; color:${C.accentL}; }

  /* APPLY */
  .step-indicator { display:flex; align-items:center; gap:0; margin-bottom:4px; }
  .step-dot {
    width:28px; height:28px; border-radius:50%; display:flex; align-items:center;
    justify-content:center; font-size:12px; font-weight:700; flex-shrink:0;
    background:${C.surface}; border:2px solid ${C.border}; color:${C.sub};
    transition:all .3s;
  }
  .step-dot.done { background:${C.accent}; border-color:${C.accent}; color:#fff; }
  .step-dot.active { background:${C.accent}22; border-color:${C.accent}; color:${C.accentL}; }
  .step-line { flex:1; height:2px; background:${C.border}; transition:background .3s; }
  .step-line.done { background:${C.accent}; }
  .apply-card { background:${C.card}; border-radius:16px; padding:18px; }
  .apply-label { font-size:11px; color:${C.sub}; margin-bottom:6px; letter-spacing:1px; }
  .apply-select {
    width:100%; padding:12px 14px; background:${C.surface}; border:1px solid ${C.border};
    border-radius:10px; color:${C.text}; font-family:inherit; font-size:14px; outline:none;
    appearance:none; cursor:pointer; transition:border-color .2s;
  }
  .apply-select:focus { border-color:${C.blue}; }
  .radio-row { display:flex; gap:10px; }
  .radio-opt {
    flex:1; padding:10px; background:${C.surface}; border:1px solid ${C.border};
    border-radius:10px; text-align:center; font-size:13px; cursor:pointer; transition:all .15s;
  }
  .radio-opt.selected { background:${C.blue}22; border-color:${C.blue}; color:#6fb3f5; }
  .doc-list { display:flex; flex-direction:column; gap:8px; }
  .doc-row {
    display:flex; align-items:center; gap:10px; padding:10px 12px;
    background:${C.surface}; border-radius:10px; font-size:13px;
  }
  .doc-status { font-size:16px; }
  .doc-name { flex:1; }
  .doc-upload { font-size:11px; color:${C.blue}; cursor:pointer; }
  .checkbox-row {
    display:flex; align-items:flex-start; gap:10px; padding:12px;
    background:${C.surface}; border-radius:10px; cursor:pointer;
  }
  .checkbox { width:18px; height:18px; border-radius:4px; border:2px solid ${C.border}; flex-shrink:0; margin-top:1px; display:flex; align-items:center; justify-content:center; transition:all .15s; }
  .checkbox.checked { background:${C.blue}; border-color:${C.blue}; }
  .apply-nav { display:flex; gap:10px; }
  .btn-sec {
    flex:none; padding:14px; border-radius:50px; border:1px solid ${C.border};
    background:none; color:${C.sub}; font-family:inherit; font-size:14px; cursor:pointer;
    transition:all .15s;
  }
  .btn-sec:hover { border-color:${C.accentL}; color:${C.accentL}; }
  .btn-blue {
    flex:none; padding:14px; border-radius:50px;
    background:linear-gradient(135deg,${C.blue},#2a6fc9);
    border:none; color:#fff; font-family:inherit; font-size:14px; font-weight:700;
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
  .spec-card:hover { border-color:${C.green}55; transform:translateY(-2px); }
  .spec-code { font-size:11px; color:#5ec97a; letter-spacing:1px; margin-bottom:4px; }
  .spec-name { font-size:15px; font-weight:600; margin-bottom:8px; }
  .spec-row { display:flex; gap:16px; flex-wrap:wrap; }
  .spec-stat { font-size:12px; color:${C.sub}; display:flex; align-items:center; gap:4px; }
  .spec-badge {
    display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; margin-top:8px;
  }
  .spec-badge.budget { background:#4CAF6B22; color:#5ec97a; }
  .spec-badge.paid { background:#F5A62322; color:#f5c067; }

  /* ADMISSIONS */
  .contact-card {
    background:${C.card}; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px;
  }
  .contact-row { display:flex; align-items:center; gap:12px; }
  .contact-icon { font-size:20px; width:36px; height:36px; background:${C.surface}; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .contact-info { flex:1; }
  .contact-label { font-size:11px; color:${C.sub}; }
  .contact-val { font-size:14px; font-weight:500; }
  .contact-btn {
    padding:8px 16px; border-radius:20px; font-size:12px; font-weight:600;
    border:none; cursor:pointer; font-family:inherit; transition:opacity .15s;
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
  .map-placeholder:hover { border-color:${C.blue}55; }
  .person-card { background:${C.card}; border-radius:14px; padding:14px; display:flex; gap:12px; align-items:center; }
  .person-ava { width:44px; height:44px; border-radius:50%; background:${C.accent}; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }

  /* ABOUT */
  .about-stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .about-stat { background:${C.card}; border-radius:14px; padding:14px; text-align:center; }
  .about-stat-num { font-size:24px; font-weight:700; color:${C.accentL}; }
  .about-stat-lbl { font-size:11px; color:${C.sub}; margin-top:4px; line-height:1.3; }
  .about-list-item { display:flex; gap:10px; padding:10px 0; border-bottom:1px solid ${C.border}22; font-size:13px; color:${C.sub}; align-items:flex-start; }
  .about-list-item:last-child { border-bottom:none; }
  .about-link { font-size:13px; color:${C.blue}; cursor:pointer; padding:4px 0; display:flex; align-items:center; gap:6px; }

  /* OPEN DAYS */
  .event-card {
    background:${C.card}; border-radius:16px; overflow:hidden;
    border:1px solid ${C.border}; transition:border-color .2s;
  }
  .event-card:hover { border-color:#A855F755; }
  .event-banner {
    height:80px; display:flex; align-items:center; justify-content:center;
    font-size:36px; position:relative;
  }
  .event-body { padding:14px; }
  .event-title { font-size:15px; font-weight:600; margin-bottom:6px; }
  .event-meta { display:flex; gap:12px; flex-wrap:wrap; }
  .event-tag { font-size:11px; color:${C.sub}; display:flex; align-items:center; gap:4px; }
  .event-format { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
  .event-format.online { background:#4A8FE722; color:#6fb3f5; }
  .event-format.offline { background:#4CAF6B22; color:#5ec97a; }
  .gallery-strip { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; }
  .gallery-thumb {
    width:80px; height:60px; flex-shrink:0; border-radius:10px;
    display:flex; align-items:center; justify-content:center; font-size:24px;
  }

  /* ── STUDENT BOTTOM NAV ── */
  .student-bottom-nav {
    display:flex; justify-content:space-around; padding:10px 0 18px;
    background:${C.bg}f0; border-top:1px solid ${C.border};
    flex-shrink:0; backdrop-filter:blur(16px);
  }
  .sbn-btn {
    display:flex; flex-direction:column; align-items:center; gap:3px;
    background:none; border:none; cursor:pointer; padding:4px 16px;
    font-family:inherit; font-size:10px; font-weight:600; letter-spacing:0.5px;
    color:${C.sub}; transition:color .15s;
  }
  .sbn-btn.active { color:${C.accentL}; }
  .sbn-btn-icon { font-size:22px; line-height:1; }
  .sbn-dot { width:4px; height:4px; border-radius:50%; background:${C.accentL}; opacity:0; transition:opacity .2s; margin-top:2px; }
  .sbn-btn.active .sbn-dot { opacity:1; }

  /* ── TEACHER GRADE CELLS ── */
  .grade-cell {
    width:30px; height:30px; border-radius:8px; display:flex; align-items:center;
    justify-content:center; font-size:12px; font-weight:700; cursor:pointer;
    transition:all .15s; background:#142240; color:#7B9DBF; border:1px solid #1E3560;
  }
  .grade-cell.g5 { background:#4CAF6B33; color:#5ec97a; border-color:#4CAF6B55; }
  .grade-cell.g4 { background:#4A8FE733; color:#6fb3f5; border-color:#4A8FE755; }
  .grade-cell.g3 { background:#F5A62333; color:#f5c067; border-color:#F5A62355; }
  .grade-cell.g2, .grade-cell.gn { background:#E84C4C33; color:#ff7e7e; border-color:#E84C4C55; }
`;

// ─── helpers ─────────────────────────────────────────────────────────────────
const BELLS_BY_CORPUS = {
  "1-2": [["1 пара","09:00–10:30"],["2 пара","10:50–12:20"],["ОБЕД","12:20–13:25"],["3 пара","13:25–14:45"],["4 пара","15:00–16:20"],["5 пара","16:30–17:50"]],
  "3":   [["1 пара","09:00–10:30"],["2 пара","10:40–12:10"],["ОБЕД","12:10–12:55"],["3 пара","12:55–14:25"],["4 пара","14:35–15:55"],["5 пара","16:05–17:25"]],
};
const TEACHER_BY_SUBJ = { "Экономика": "Наталья Сергеевна" };
const ICON_BY_SUBJ = { "Экономика": "briefcase", "Физика": "magnet", "Программирование": "laptop" };
