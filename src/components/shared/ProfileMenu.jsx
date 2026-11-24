// Light is the default theme; the dark one is chosen here and remembered on this device.
function currentTheme() { return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  saveJSON("att_theme", t);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === "dark" ? "#0B1120" : "#0A2A72";
}
// Changing the theme: the browser takes a picture of the old look and dissolves it into the live new one on the GPU
// (View Transitions), so nothing is re-coloured element by element. The switch keeps its own live layer so its slider moves.
function changeTheme(next, setState) {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const apply = () => { applyTheme(next); ReactDOM.flushSync(() => setState(next)); };
  if (!document.startViewTransition || reduce) { apply(); return; }
  document.startViewTransition(apply);
}
function useTheme() {
  const [t, setT] = useState(currentTheme());
  const set = n => { if (n === currentTheme()) return; changeTheme(n, setT); };
  return [t, set];
}
// Glass switch: a frosted pill with a sun and a moon; a glass slider rests over the chosen one.
function ThemeOrb({ night, onToggle, label, className }) {
  return (
    <button role="switch" aria-checked={night} aria-label={label} className={`tq-gs${night ? " night" : ""}${className ? " " + className : ""}`} onClick={e => onToggle(e.currentTarget)}>
      <i className="tq-gs-thumb" />
      <svg className="tq-gs-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="12" r="4.4" fill="currentColor" stroke="none" /><path d="M12 2.4v2.4M12 19.2v2.4M2.4 12h2.4M19.2 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M5.2 18.8l1.7-1.7M17.1 6.9l1.7-1.7" /></svg>
      <svg className="tq-gs-moon" viewBox="0 0 24 24" fill="currentColor"><path d="M20.4 14.6A8.6 8.6 0 0 1 9.4 3.6a.5.5 0 0 0-.7-.6A9.3 9.3 0 1 0 21 15.3a.5.5 0 0 0-.6-.7Z" /></svg>
    </button>
  );
}
// "Оформление" row of a settings card (inline), or a card of its own where there is no list around it.
function ThemeRow({ inline }) {
  const [t, set] = useTheme();
  // The slider moves on its own first; the page changes theme only once it has arrived,
  // so the two animations never compete for the same frames.
  const [night, setNight] = useState(t === "dark");
  const timer = useRef(0);
  useEffect(() => { setNight(t === "dark"); }, [t]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const toggle = () => {
    const nextNight = !night;
    tqTap();
    setNight(nextNight);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => set(nextNight ? "dark" : "light"), 340);
  };
  const row = (
    <div className="tq-item" style={{cursor:"default",minHeight:64}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:"0.9375rem",fontWeight:600}}>Оформление</div>
        <div className="tq-item-sub">{night ? "Тёмное" : "Светлое"}</div>
      </div>
      <ThemeOrb night={night} label={night ? "Включить светлую тему" : "Включить тёмную тему"} onToggle={toggle} />
    </div>
  );
  return inline ? row : <div className="tq-card">{row}</div>;
}
// LKSheet (student profile sheet), TeacherLKSheet (teacher profile sheet), LKAboutApp ("about the app", shared by both).
function LKSheet({ user, open, onClose, onLogout, setLkInner, unreadCount, realLessons, gradeStats }) {
  const todayCount = (realLessons || []).length;
  const mainItems = [
    {key:"schedule",  icon:"calendar",       bg:"color-mix(in srgb, var(--link) 13%, var(--card))", color:"var(--link)", title:"Расписание"},
    {key:"grades",    icon:"bar-chart-3",    bg:"color-mix(in srgb, var(--green) 15%, var(--card))", color:"var(--ok)", title:"Успеваемость"},
    {key:"portfolio", icon:"trophy",         bg:"color-mix(in srgb, #8a5cf0 14%, var(--card))", color:"#F5A623", title:"Портфолио"},
    {key:"consult",   icon:"message-circle", bg:"color-mix(in srgb, var(--link) 13%, var(--card))", color:"var(--link)", title:"Консультации"},
    {key:"spravki",   icon:"file-text",      bg:"color-mix(in srgb, var(--amber) 16%, var(--card))", color:"#F5A623", title:"Справки"},
    {key:"coursework", icon:"file-edit",     bg:"color-mix(in srgb, var(--link) 13%, var(--card))", color:"var(--link)", title:"Курсовая"},
  ];
  const otherItems = [
    {key:"notifications", icon:"bell",        bg:"color-mix(in srgb, var(--link) 13%, var(--card))", color:"var(--link)", title:"Уведомления", badge: unreadCount>0 ? String(unreadCount) : null},
    {key:"curriculum", icon:"clipboard-list", bg:"var(--surface)", color:"var(--link)", title:"Учебный план"},
    {key:"faculty",    icon:"graduation-cap", bg:"color-mix(in srgb, var(--link) 13%, var(--card))", color:"var(--link)", title:"Факультативы"},
    {key:"teachers",   icon:"users",          bg:"color-mix(in srgb, #8a5cf0 14%, var(--card))", color:"#b78af0", title:"Преподаватели"},
    {key:"about-app",  icon:"help-circle",    bg:"color-mix(in srgb, var(--link) 13%, var(--card))", color:"var(--link)", title:"Помощь"},
  ];
  const go = key => { onClose(); setLkInner(key); };
  return (
    <>
      <div className={`lk-overlay${open?" open":""}`} onClick={onClose} />
      <div className={`lk-sheet${open?" open":""}`}>
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big">{authInitials(user)}</div>
          <div>
            <div className="lk-name">{authShortName(user)}</div>
            <div className="lk-meta">Студент · Группа: {user ? user.group : "—"}</div>
          </div>
        </div>
        <div className="lk-body" style={{gap:14}}>
          <div className="lk-stats-row">
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="lk-stat" onClick={()=>go("grades")}>
              <Icon name="graduation-cap" size={17} color="var(--link)" />
              <div className="lk-stat-label">Средний балл</div>
              <div className="lk-stat-val" style={{color:"var(--link)"}}>{gradeStats && gradeStats.avg !== null ? gradeStats.avg : "—"}</div>
            </div>
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="lk-stat" onClick={()=>go("grades")}>
              <Icon name="book-open" size={17} color="var(--link)" />
              <div className="lk-stat-label">Долги</div>
              <div className="lk-stat-val" style={{color:"var(--ok)"}}>{gradeStats && gradeStats.avg !== null ? gradeStats.debts : "—"}</div>
            </div>
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="lk-stat" onClick={()=>go("schedule")}>
              <Icon name="calendar" size={17} color="var(--link)" />
              <div className="lk-stat-label">Занятия</div>
              <div className="lk-stat-val">{todayCount}</div>
            </div>
          </div>
          <div className="lk-group">
            {mainItems.map(it=>(
              <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={it.key} className="lk-row" onClick={()=>go(it.key)}>
                <div className="lk-row-icon" style={{background:it.bg}}><Icon name={it.icon} size={17} color={it.color} /></div>
                <div className="lk-row-title">{it.title}</div>
                <span className="lk-menu-arrow">›</span>
              </div>
            ))}
          </div>
          <div className="lk-group">
            {otherItems.map(it=>(
              <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={it.key} className="lk-row" onClick={it.onClick || (()=>go(it.key))}>
                <div className="lk-row-icon" style={{background:it.bg}}><Icon name={it.icon} size={17} color={it.color} /></div>
                <div className="lk-row-title">{it.title}</div>
                {it.badge && <span className="lk-menu-badge">{it.badge}</span>}
                <span className="lk-menu-arrow">›</span>
              </div>
            ))}
          </div>
          <div className="lk-group">
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="lk-row" onClick={()=>go("password")}>
              <div className="lk-row-icon" style={{background:"var(--surface2)"}}><Icon name="lock" size={17} color="var(--sub)" /></div>
              <div className="lk-row-title">Сменить пароль</div>
              <span className="lk-menu-arrow">›</span>
            </div>
            <ThemeRow />
          </div>
          <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="lk-logout" onClick={onLogout}>Выйти</div>
          <div style={{textAlign:"center",fontSize:"0.6875rem",color:C.sub,padding:"4px 0"}}>Версия 2.0 · АТТ</div>
        </div>
      </div>
    </>
  );
}

// ── LK TEACHERS — real teacher names/subjects pulled from the scraped ДВ-41 schedule ──
function LKTeachers({ open, onClose, schedule }) {
  // Everyone named in the group's timetable, with the subjects they teach (a lesson may list several people).
  const byName = new Map();
  for (const day of Object.values((schedule && schedule.days) || {})) {
    for (const l of day.lessons || []) {
      for (const name of String(l.teacher || "").split("/").map(x => x.trim()).filter(Boolean)) {
        if (!byName.has(name)) byName.set(name, new Set());
        if (l.subj) byName.get(name).add(l.subj);
      }
    }
  }
  const teachers = [...byName].map(([name, subjects]) => ({ name, subjects: [...subjects] })).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return (
    <div className={`inner-screen lk-inner${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Преподаватели" />
      <div className="inner-body">
        <div style={{fontSize:"0.8125rem",color:C.sub,marginBottom:4}}>{teachers.length ? `Группа ${(schedule && schedule.group) || ""} · по данным расписания` : "Список появится, когда загрузится расписание группы"}</div>
        <div className="lk-group">
          {teachers.map((t,i)=>(
            <div key={i} className="lk-row" style={{cursor:"default"}}>
              <div className="lk-row-icon" style={{background:`hsl(${(i*47)%360},40%,22%)`}}>
                <span style={{fontSize:"0.8125rem",fontWeight:700,color:"var(--text)"}}>{t.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</span>
              </div>
              <div style={{flex:1}}>
                <div className="lk-row-title" style={{marginBottom:2}}>{t.name}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {t.subjects.map(s=>(
                    <span key={s} style={{fontSize:"0.625rem",padding:"2px 7px",borderRadius:20,background:C.surface,color:C.sub,border:`1px solid ${C.border}`}}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── TEACHER LK SHEET ──────────────────────────────────────────────────────────
// A chosen photo becomes a 256x256 square JPEG (centre crop), small enough to keep in the database.
function tqShrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height), c = document.createElement("canvas");
      c.width = c.height = 256;
      c.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 256, 256);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}
// Round picture or initials; the same piece is used in the top bar and in the profile.
function TQAvatar({ user, image, size = 36 }) {
  return (
    <div className="avatar" data-photo={image ? "1" : "0"} style={{width:size,height:size,fontSize:size * 0.36,background:image ? `center / cover no-repeat url(${image})` : "var(--accent)"}}>
      {image ? "" : (user ? user.firstName.charAt(0) : "")}
    </div>
  );
}
// One field edited in an iOS-style bottom sheet: "Отмена" / title / "Готово", a grouped row with the label on the left
// and the value on the right, the hint below, and "Удалить" as its own row when there is a value.
function TQFieldSheet({ cfg, value, onSave, onClose }) {
  const [v, setV] = useState(value || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const dirty = v.trim() !== (value || "").trim();
  const save = async () => {
    if (!dirty || busy) return;
    setBusy(true); setErr("");
    const e = await onSave(v.trim());
    setBusy(false);
    if (e) setErr(e);
  };
  const clear = async () => {
    setBusy(true); setErr("");
    const e = await onSave("");
    setBusy(false);
    if (e) setErr(e);
  };
  return (
    <>
      <div className="lk-overlay open" style={{zIndex:300}} onClick={onClose} />
      <div className="lk-sheet open ff-sheet" style={{zIndex:301}} role="dialog" aria-label={cfg.title}>
        <div className="lk-handle" />
        <div className="ff-bar">
          <button type="button" className="ff-cancel" onClick={onClose}>Отмена</button>
          <div className="ff-title">{cfg.title}</div>
          <button type="button" className="ff-done" disabled={busy || !dirty} onClick={save}>{busy ? "…" : "Готово"}</button>
        </div>
        <div className="ff-body">
          <div className="ff-group">
            <label className="ff-row">
              <span className="ff-label">{cfg.title}</span>
              <input className="ff-input" autoFocus type={cfg.type} inputMode={cfg.mode} value={v} placeholder={cfg.hint} maxLength={cfg.max}
                autoCapitalize="none" autoCorrect="off" spellCheck={false}
                onChange={e => { setV(e.target.value); setErr(""); }} onKeyDown={e => { if (e.key === "Enter") save(); }} />
            </label>
          </div>
          <p className="ff-hint">{`Например: ${cfg.hint}`}</p>
          {err && <div role="alert" className="ff-err">{err}</div>}
          {value && <div className="ff-group"><button type="button" className="ff-clear" disabled={busy} onClick={clear}>Удалить {cfg.title.toLowerCase()}</button></div>}
        </div>
      </div>
    </>
  );
}
// Choices for the photo: destructive one in red, "Отмена" as its own block, like a system action sheet.
function TQActionSheet({ actions, onClose }) {
  return (
    <>
      <div className="lk-overlay open" style={{zIndex:300}} onClick={onClose} />
      <div className="tq-actions" style={{zIndex:301}}>
        <div className="tq-actions-card">
          {actions.map(a => <button key={a.label} className={a.danger ? "danger" : ""} onClick={() => { onClose(); a.run(); }}><Icon name={a.icon} size={18} />{a.label}</button>)}
        </div>
        <div className="tq-actions-card"><button className="cancel" onClick={onClose}>Отмена</button></div>
      </div>
    </>
  );
}
const TQ_FIELDS = {
  department: { title:"Кафедра / ЦК", type:"text", mode:"text", hint:"Например, ЦК №5", max:160 },
  experience: { title:"Стаж", type:"text", mode:"text", hint:"Например, 12 лет", max:60 },
  email:      { title:"Email", type:"email", mode:"email", hint:"name@example.ru", max:160 },
  phone:      { title:"Телефон", type:"tel", mode:"tel", hint:"+7 900 000-00-00", max:40 },
};
function TeacherLKSheet({ user, open, onClose, onLogout, setLkInner, avatar, onAvatar, onProfileSaved, unread = 0, onOpenNotifs }) {
  const galleryRef = useRef(null), cameraRef = useRef(null);
  const [field, setField] = useState(null);       // key of TQ_FIELDS being edited
  const [photoMenu, setPhotoMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!open) { setField(null); setPhotoMenu(false); } }, [open]);
  const pick = async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true); setErr("");
    try {
      const image = await tqShrinkPhoto(f);
      const r = await apiAuthed("/me/avatar", { method: "PUT", body: { image } });
      if (r.status === 200) onAvatar(image); else setErr("Не удалось сохранить фото.");
    } catch (x) { setErr("Не удалось открыть это фото."); }
    setBusy(false);
  };
  const dropPhoto = async () => { setBusy(true); await apiAuthed("/me/avatar", { method: "DELETE" }); onAvatar(null); setBusy(false); };
  const saveField = async v => {
    const body = { department:(user && user.department) || "", experience:(user && user.experience) || "", email:(user && user.email) || "", phone:(user && user.phone) || "", [field]: v };
    const r = await apiAuthed("/me/profile", { method: "PUT", body });
    if (r.status === 200) { setField(null); if (onProfileSaved) onProfileSaved(); return ""; }
    return (r.data && r.data.error) || (r.status === 0 ? "Нет связи с сервером." : "Не удалось сохранить. Попробуйте ещё раз.");
  };
  const copyLogin = async () => { try { await navigator.clipboard.writeText(user.login); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch (e) {} };
  const go = key => { onClose(); setLkInner(key); };
  const groups = user && user.groups ? user.groups : [];
  const Row = ({ icon, title, value, onClick, badge, muted }) => (
    <button className="tq-item" onClick={onClick} style={{cursor:onClick ? "pointer" : "default"}}>
      <div className="tq-ava" style={{borderRadius:10,width:32,height:32}}><Icon name={icon} size={16} /></div>
      <div style={{flex:1,minWidth:0,fontSize:"0.9375rem"}}>{title}</div>
      {badge > 0 && <span className="tq-count">{badge}</span>}
      {value && <div style={{fontSize:"0.8125rem",color:muted ? "var(--sub)" : "var(--text)",opacity:muted ? 1 : .75,maxWidth:"48%",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</div>}
      {onClick && <Icon name="chevron-right" size={18} style={{color:"var(--sub)",opacity:.6,flexShrink:0}} />}
    </button>
  );
  const editRow = (key, icon, empty) => (
    <Row icon={icon} title={TQ_FIELDS[key].title} value={(user && user[key]) || empty} muted={!(user && user[key])} onClick={() => setField(key)} />
  );
  return (
    <>
      <div className={`lk-overlay${open?" open":""}`} onClick={onClose} />
      <div className={`lk-sheet tq-sheet tq-toggle${open?" open":""}`}>
        <div className="lk-handle" />
        <div className="tq-sh-head" style={{justifyContent:"flex-end",paddingBottom:0}}>
          <button className="tq-round" aria-label="Закрыть" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="tq-sh-body">
          <div className="tq-profile">
            <button className="tq-photo" aria-label="Изменить фото" onClick={() => setPhotoMenu(true)} disabled={busy}>
              <TQAvatar user={user} image={avatar} size={96} />
              <span className="tq-photo-badge"><Icon name="camera" size={15} /></span>
            </button>
            <input ref={galleryRef} type="file" accept="image/*" style={{display:"none"}} onChange={pick} />
            <input ref={cameraRef} type="file" accept="image/*" capture="user" style={{display:"none"}} onChange={pick} />
            <div className="tq-profile-name">{user ? `${user.lastName} ${user.firstName} ${user.middleName}` : ""}</div>
            <div className="tq-profile-sub">Преподаватель{user && user.department ? ` · ${user.department}` : ""}</div>
            {err && <div role="alert" className="tq-note" style={{color:"var(--bad)"}}>{err}</div>}
          </div>
          <div className="tq-card" style={{marginTop:8}}>
            <Row icon="bell" title="Уведомления" badge={unread} onClick={() => { onClose(); if (onOpenNotifs) onOpenNotifs(); }} />
            <Row icon="calendar" title="Моё расписание" onClick={() => go("tschedule")} />
            <Row icon="users" title="Группы и предметы" value={groups.length ? `${groups.length} ${rusPlural(groups.length, "группа", "группы", "групп")}` : "Не выбраны"} muted onClick={() => go("teaching")} />
            <Row icon="file-edit" title="Курсовые" onClick={() => go("tcoursework")} />
            <Row icon="graduation-cap" title="ДПО" onClick={() => go("tdpo")} />
            <Row icon="file-text" title="Документы" onClick={() => go("documents")} />
          </div>
          <div className="tq-sec">О вас</div>
          <div className="tq-card">
            {editRow("department", "school", "Не указана")}
            {editRow("experience", "calendar", "Не указан")}
            {editRow("email", "mail", "Не указан")}
            {editRow("phone", "smartphone", "Не указан")}
            <Row icon="user" title="Логин" value={copied ? "Скопировано" : user && user.login} muted onClick={copyLogin} />
          </div>
          <div className="tq-sec">Приложение</div>
          <div className="tq-card">
            <ThemeRow inline />
            <Row icon="lock" title="Сменить пароль" onClick={() => go("password")} />
            <Row icon="info" title="О приложении" value="Версия 2.0" muted onClick={() => go("about-app")} />
          </div>
          <button className="tq-btn ghost" style={{color:"var(--bad)",marginTop:8,marginBottom:24,flexShrink:0}} onClick={onLogout}>Выйти</button>
        </div>
      </div>
      {photoMenu && <TQActionSheet onClose={() => setPhotoMenu(false)} actions={[
          { label:"Сделать снимок", icon:"camera", run:() => cameraRef.current && cameraRef.current.click() },
          { label:"Выбрать из галереи", icon:"image", run:() => galleryRef.current && galleryRef.current.click() },
          ...(avatar ? [{ label:"Удалить фото", icon:"x", danger:true, run:dropPhoto }] : []),
        ]} />}
      {field && <TQFieldSheet key={field} cfg={TQ_FIELDS[field]} value={(user && user[field]) || ""} onSave={saveField} onClose={() => setField(null)} />}
    </>
  );
}

// ── ABOUT THE APP ─────────────────────────────────────────────────────────────
const ABOUT_ACTIONS = [
  { icon:"phone",   label:"Позвонить", href:"tel:+78127662452" },
  { icon:"mail",    label:"Почта",     href:"mailto:att@nvsh.gugov.spb.ru" },
  { icon:"globe",   label:"Сайт",      href:"http://xn--80a0ba.xn--90a1af.xn--p1ai", ext:true },
  { icon:"map_pin", label:"На карте",  href:"https://yandex.ru/maps/?text=" + encodeURIComponent("Санкт-Петербург, ул. Салова, д. 65"), ext:true },
];
const ABOUT_INFO = [
  { label:"Основана", val:"1945" },
  { label:"Адрес",    val:"ул. Салова, 65" },
  { label:"Телефон",  val:"+7 (812) 766-24-52" },
  { label:"Сайт",     val:"атт.спб.рф" },
];
const ABOUT_SOCIAL = [
  { name:"ВКонтакте", handle:"att_college", href:"https://vk.com/att_college", mark:"VK", color:"#0077FF" },
  { name:"MAX",       handle:"att_college", href:"https://max.ru/att_college", mark:"M",  color:"linear-gradient(140deg,#3E8BFF,#8B3DFF)" },
];
function LKAboutApp({ open, onClose, plain }) {
  return (
    <div className={`inner-screen lk-inner${open ? " open" : ""}`}>
      <TopBar plain={plain} onBack={onClose} title="Личный кабинет" tag="О приложении" />
      <div className="inner-body ab">
        <div className="ab-hero">
          <img className="ab-icon" src="icon-512.png" alt="" width="88" height="88" />
          <div className="ab-name">АТТ Академия</div>
          <div className="ab-ver">Версия 2.0</div>
        </div>
        <div className="ab-actions">
          {ABOUT_ACTIONS.map(a => (
            <a key={a.label} className="ab-action" href={a.href} target={a.ext ? "_blank" : undefined} rel={a.ext ? "noopener" : undefined}>
              <span className="ab-action-ico"><Icon name={a.icon} size={22} /></span>{a.label}
            </a>
          ))}
        </div>
        <div className="ab-cap">Академия</div>
        <div className="tq-card ab-card">
          {ABOUT_INFO.map(r => (
            <div key={r.label} className="ab-row">
              <span className="ab-row-label">{r.label}</span>
              <span className="ab-row-val">{r.val}</span>
            </div>
          ))}
        </div>
        <div className="ab-cap">Мы в соцсетях</div>
        <div className="tq-card ab-card">
          {ABOUT_SOCIAL.map(s => (
            <a key={s.name} className="tq-item ab-link" href={s.href} target="_blank" rel="noopener">
              <span className="ab-tile" style={{background:s.color}}>{s.mark}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"0.9375rem",fontWeight:600}}>{s.name}</div>
                <div className="tq-item-sub">{s.handle}</div>
              </div>
              <Icon name="chevron-right" size={18} style={{color:"var(--sub)",opacity:.6,flexShrink:0}} />
            </a>
          ))}
        </div>
        <div className="ab-foot">© 1945–2026 Академия транспортных технологий</div>
      </div>
    </div>
  );
}

// ── FORGOT PASSWORD MODAL ──────────────────────────────────────────────────────
