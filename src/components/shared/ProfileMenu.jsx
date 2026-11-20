// Light is the default theme; the dark one is chosen here and remembered on this device.
function currentTheme() { return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  saveJSON("att_theme", t);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === "dark" ? "#0B1120" : "#0A2A72";
}
function useTheme() {
  const [t, setT] = useState(currentTheme());
  const set = n => { if (n === t) return; tqTap(); applyTheme(n); setT(n); };
  return [t, set];
}
// "Оформление": light / dark, as a segmented control (the same one the schedule uses for День / Неделя).
function ThemeRow({ menu }) {
  const [t, set] = useTheme();
  return (
    <div className={menu ? "tq-theme tq-theme-menu" : "tq-theme"}>
      <div className="tq-theme-label">Оформление</div>
      <div className="tq-seg" role="radiogroup" aria-label="Оформление">
        {[["light","Светлая","sun"],["dark","Тёмная","moon"]].map(([k, label, icon]) => (
          <button key={k} role="radio" aria-checked={t === k} className={t === k ? "active" : ""} onClick={() => set(k)}>
            <Icon name={icon} size={15} color="currentColor" style={{verticalAlign:-3,marginRight:6}} />{label}
          </button>
        ))}
      </div>
    </div>
  );
}
// Small round button for screens without a personal account (sign-in, applicant).
function ThemeButton() {
  const [t, set] = useTheme();
  return (
    <button className="tq-theme-btn" aria-label={t === "dark" ? "Светлая тема" : "Тёмная тема"} onClick={() => set(t === "dark" ? "light" : "dark")}>
      <Icon name={t === "dark" ? "sun" : "moon"} size={18} color="currentColor" />
    </button>
  );
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
function TeacherLKSheet({ user, open, onClose, onLogout, setLkInner, avatar, onAvatar, onProfileSaved }) {
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ department:"", experience:"", email:"", phone:"" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const startEdit = () => { setForm({ department:(user && user.department) || "", experience:(user && user.experience) || "", email:(user && user.email) || "", phone:(user && user.phone) || "" }); setFormError(""); setEditing(true); };
  const saveProfile = async () => {
    setSaving(true); setFormError("");
    const r = await apiAuthed("/me/profile", { method: "PUT", body: form });
    setSaving(false);
    if (r.status === 200) { setEditing(false); if (onProfileSaved) onProfileSaved(); }
    else setFormError((r.data && r.data.error) || (r.status === 0 ? "Нет связи с сервером." : "Не удалось сохранить. Попробуйте ещё раз."));
  };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
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
  const drop = async () => { setBusy(true); await apiAuthed("/me/avatar", { method: "DELETE" }); onAvatar(null); setBusy(false); };
  const go = key => { onClose(); setLkInner(key); };
  const groups = user && user.groups ? user.groups : [];
  const Row = ({ icon, title, value, onClick, danger }) => (
    <button className="tq-item" onClick={onClick} style={{cursor:onClick ? "pointer" : "default"}}>
      <div className="tq-ava" style={{borderRadius:10,width:32,height:32}}><Icon name={icon} size={16} /></div>
      <div style={{flex:1,minWidth:0,fontSize:"0.9375rem"}}>{title}</div>
      {value && <div style={{fontSize:"0.8125rem",color:"var(--sub)",maxWidth:"45%",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</div>}
      {onClick && <Icon name="chevron-right" size={18} style={{color:"var(--sub)",opacity:.6,flexShrink:0}} />}
    </button>
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
            <button className="tq-photo" aria-label="Сменить фото" onClick={()=>fileRef.current && fileRef.current.click()} disabled={busy}>
              <TQAvatar user={user} image={avatar} size={92} />
              <span className="tq-photo-badge"><Icon name="camera" size={15} /></span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={pick} />
            <div className="tq-profile-name">{user ? `${user.lastName} ${user.firstName} ${user.middleName}` : ""}</div>
            <div className="tq-profile-sub">Преподаватель{user && user.department ? ` · ${user.department}` : ""}</div>
            <div style={{display:"flex",gap:8}}>
              <button className="tq-chip" disabled={busy} onClick={()=>fileRef.current && fileRef.current.click()}>{busy ? "Сохраняем…" : avatar ? "Изменить фото" : "Добавить фото"}</button>
              {avatar && <button className="tq-chip" disabled={busy} onClick={drop}>Удалить</button>}
            </div>
            {err && <div role="alert" className="tq-note" style={{color:"var(--bad)"}}>{err}</div>}
          </div>
          <div className="tq-sec">Работа</div>
          <div className="tq-card">
            <Row icon="users" title="Мои группы" value={groups.length ? `${groups.length} ${rusPlural(groups.length, "группа", "группы", "групп")}` : "Не выбраны"} onClick={()=>go("teaching")} />
            <Row icon="file-text" title="Документы" onClick={()=>go("documents")} />
          </div>
          <div className="tq-sec" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>О вас</span>
            {!editing && <button className="tq-link" onClick={startEdit}>Изменить</button>}
          </div>
          {editing ? (
            <div className="tq-card" style={{padding:14,display:"flex",flexDirection:"column",gap:12}}>
              {[["department","Кафедра / ЦК","text","Например, ЦК №5"],["experience","Стаж","text","Например, 12 лет"],["email","Email","email","name@example.ru"],["phone","Телефон","tel","+7 900 000-00-00"]].map(([k,label,type,ph]) => (
                <label key={k} className="tq-flabel">{label}
                  <input className="tq-field" type={type} value={form[k]} placeholder={ph} maxLength={k === "phone" ? 40 : 160} autoCapitalize="none"
                    onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </label>
              ))}
              {formError && <div role="alert" className="tq-note" style={{color:"var(--bad)",textAlign:"left"}}>{formError}</div>}
              <div style={{display:"flex",gap:8}}>
                <button className="tq-btn ghost" style={{minHeight:46}} disabled={saving} onClick={()=>setEditing(false)}>Отмена</button>
                <button className="tq-btn" style={{minHeight:46}} disabled={saving} onClick={saveProfile}>{saving ? "Сохраняем…" : "Сохранить"}</button>
              </div>
            </div>
          ) : (
            <div className="tq-card">
              <Row icon="school" title="Кафедра / ЦК" value={(user && user.department) || "Не указана"} onClick={startEdit} />
              <Row icon="calendar" title="Стаж" value={(user && user.experience) || "Не указан"} onClick={startEdit} />
              <Row icon="mail" title="Email" value={(user && user.email) || "Не указан"} onClick={startEdit} />
              <Row icon="smartphone" title="Телефон" value={(user && user.phone) || "Не указан"} onClick={startEdit} />
            </div>
          )}
          <div className="tq-note" style={{textAlign:"left",padding:"0 4px"}}>Эти данные видят администраторы колледжа.</div>
          <div className="tq-sec">Приложение</div>
          <div className="tq-card">
            <Row icon="lock" title="Сменить пароль" onClick={()=>go("password")} />
            <Row icon="info" title="О приложении" value="Версия 2.0" onClick={()=>go("about-app")} />
          </div>
          <ThemeRow />
          <button className="tq-btn ghost" style={{color:"var(--bad)",marginTop:8,marginBottom:24,flexShrink:0}} onClick={onLogout}>Выйти</button>
        </div>
      </div>
    </>
  );
}

// ── TEACHER GRADE MODAL ────────────────────────────────────────────────────────
function LKAboutApp({ open, onClose, plain }) {
  return (
    <div className={`inner-screen lk-inner${open ? " open" : ""}`}>
      <TopBar plain={plain} onBack={onClose} title="Личный кабинет" tag="О приложении" />
      <div className="inner-body">
        <div style={{textAlign:"center",padding:"10px 0 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <AttLogo size={90} circular />
          <div style={{fontSize:"1.375rem",fontWeight:800,letterSpacing:2}}>АТТ</div>
          <div style={{fontSize:"0.6875rem",color:"var(--sub)",letterSpacing:3}}>АКАДЕМИЯ ТРАНСПОРТНЫХ ТЕХНОЛОГИЙ</div>
          <div style={{background:"var(--card)",borderRadius:20,padding:"4px 14px",fontSize:"0.6875rem",color:"var(--link)"}}>Версия 2.0</div>
        </div>
        <div style={{background:"var(--card)",borderRadius:16,padding:16,display:"flex",flexDirection:"column",gap:0}}>
          {[{label:"Основана",val:"1945 год"}].map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid color-mix(in srgb, var(--line) 13%, transparent)",fontSize:"0.8125rem"}}>
              <span style={{color:"var(--sub)"}}>{r.label}</span>
              <span style={{fontWeight:600}}>{r.val}</span>
            </div>
          ))}
        </div>
        <div style={{background:"color-mix(in srgb, var(--link) 13%, var(--card))",border:"1px solid color-mix(in srgb, var(--link) 20%, transparent)",borderRadius:16,padding:16,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:"0.6875rem",letterSpacing:2,color:"var(--link2)",marginBottom:2}}>{plain ? "Контакты" : "Контакты"}</div>
          {[
            {icon:"globe", label:"Сайт",    val:"атт.спб.рф",              href:"http://xn--80a0ba.xn--90a1af.xn--p1ai"},
            {icon:"mail",  label:"Email",   val:"att@nvsh.gugov.spb.ru",   href:"mailto:att@nvsh.gugov.spb.ru"},
            {icon:"phone", label:"Телефон", val:"+7 (812) 766-24-52"},
            {icon:"map-pin", label:"Адрес", val:"СПб, ул. Салова, д. 65"},
          ].map((r,i)=>{
            const Tag = r.href ? "a" : "div";
            return (
              <Tag key={i} href={r.href} target={r.href ? "_blank" : undefined} rel={r.href ? "noopener" : undefined}
                style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0",textDecoration:"none",color:"inherit",cursor:r.href?"pointer":"default"}}>
                <span style={{width:28,display:"flex",justifyContent:"center"}}><Icon name={r.icon} size={18} color="var(--link)" /></span>
                <div><div style={{fontSize:"0.6875rem",color:"var(--link2)"}}>{r.label}</div><div style={{fontSize:"0.8125rem",textDecoration:r.href?"underline":"none",textDecorationColor:"color-mix(in srgb, var(--link) 33%, transparent)"}}>{r.val}</div></div>
              </Tag>
            );
          })}
        </div>
        <div style={{background:"var(--card)",borderRadius:14,padding:14}}>
          <div style={{fontSize:"0.6875rem",letterSpacing:2,color:"var(--sub)",marginBottom:10}}>{plain ? "Социальные сети" : "Соцсети"}</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[
              {icon:"message-circle", name:"ВКонтакте", href:"https://vk.com/att_college"},
              {icon:"send",           name:"MAX",       href:"https://max.ru/att_college"},
            ].map((s,i)=>(
              <a key={i} href={s.href} target="_blank" rel="noopener"
                style={{background:"var(--surface)",border:"1px solid var(--line)",borderRadius:10,padding:"8px 14px",fontSize:"0.75rem",display:"flex",alignItems:"center",gap:6,cursor:"pointer",textDecoration:"none",color:"inherit"}}>
                <Icon name={s.icon} size={15} color="var(--link)" />{s.name}
              </a>
            ))}
          </div>
        </div>
        <div style={{textAlign:"center",fontSize:"0.6875rem",color:"var(--sub)",lineHeight:1.9,padding:"2px 0 8px"}}>
          © 2026 АТТ — Академия Транспортных Технологий<br/>Все права защищены
        </div>
      </div>
    </div>
  );
}

// ── FORGOT PASSWORD MODAL ──────────────────────────────────────────────────────
