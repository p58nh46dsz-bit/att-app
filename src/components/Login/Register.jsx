// Administrator screens: dashboard, users list, "create account" form. The administrator signs in through
// the normal login form (the server returns role "admin"); accounts, passwords and everything shown here
// live on the server (/admin/*), validated there — the checks in this file are only for convenience.
const REGISTER_ROLES = [
  { value: "student", label: "Студент" },
  { value: "teacher", label: "Преподаватель" },
];

function AdminDashboard({ onLogout, schedule, scheduleStatus }) {
  const services = useAdminServices();
  const audit = useAdminAudit();
  const serviceCounts = adminServiceCounts(services.data);
  const [page, setPage] = useState("home");
  const [menuOpen,setMenuOpen] = useState(false);
  const navigate = destination => {setMenuOpen(false);setPage(destination);};
  const [users, setUsers] = useState([]);
  const [storageError, setStorageError] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const reload = async () => {
    const r = await apiAuthed("/admin/users");
    if (r.status === 200) { setUsers(r.data); setStorageError(""); }
    else setStorageError("Не удалось загрузить аккаунты. Проверьте подключение к серверу.");
  };
  useEffect(() => { reload(); }, []);
  const needle = query.trim().toLowerCase();
  const filtered = users.filter(user => (role === "all" || user.role === role) &&
    [authFullName(user), user.login, user.group || ""].some(value => value.toLowerCase().includes(needle)));
  if (page === "create") return <Register onBack={() => { reload(); setPage("home"); }} onCreated={reload} />;
  if (page === "audit") return <AdminAudit onBack={() => setPage("home")} />;
  if (["publications", "schedule", "events"].includes(page)) return <AdminCollege page={page} services={services} schedule={schedule} scheduleStatus={scheduleStatus} onOpen={setPage} onBack={() => setPage("home")} />;
  if (["news", "certificates", "appeals"].includes(page)) return <AdminServices page={page} services={services} onBack={() => setPage("home")} />;

  return <section className="screen active admin-screen" aria-label="Кабинет администратора">
    <style>{registerCSS + adminServiceCSS + adminMenuCSS}</style>
    <header className="topbar">
      <div className="topbar-left">{page === "home" ? <span className="tag-role">АТТ Академия</span> : <button className="back-btn" onClick={() => setPage("home")}>← Назад</button>}</div>
      <button className="avatar-row admin-avatar-button" aria-label="Открыть меню администратора" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
        <span className="avatar">А</span><span className="avatar-name">Администратор</span><span className="tag-role">админ</span>
      </button>
    </header>
    <main className={`dash admin-body${page === "home" ? " admin-home" : ""}`}>
      {page === "home" ? <>
        <div className="greeting anim-fadeup"><h1>Здравствуйте, администратор</h1><p className="admin-subtitle">Колледж сегодня · личный кабинет</p></div>
        <AdminCollege services={services} schedule={schedule} scheduleStatus={scheduleStatus} onOpen={navigate} />
        <div className="admin-home-stats">
          {[{page:"certificates",title:"Заявки на справки",count:serviceCounts.certificates,icon:"file-text"},{page:"appeals",title:"Обращения",count:serviceCounts.appeals,icon:"message-circle"}].map(item => <button className="stat-card admin-stat" key={item.page} onClick={() => navigate(item.page)}><span className="stat-label"><Icon name={item.icon} size={16} color={C.accentL}/>{item.title}</span><span className="stat-val">{services.error ? "—" : item.count}</span><span className="admin-stat-hint">Ожидают обработки →</span></button>)}
        </div>
        {services.error && <p className="register-error" role="alert">{services.error}</p>}
        <div className="quick-grid admin-desktop-shortcuts">{[{page:"users",title:"Пользователи",icon:"users"},{page:"create",title:"Создать аккаунт",icon:"users"},{page:"news",title:"Объявления",icon:"megaphone"},{page:"audit",title:"Журнал действий",icon:"file-text"}].map(item => <button className="quick-btn admin-shortcut" key={item.page} onClick={() => navigate(item.page)}><span className="quick-icon-box"><Icon name={item.icon} size={20} color="#fff"/></span><span className="quick-lbl">{item.title}</span></button>)}</div>
        <button className="section-card admin-audit-preview" onClick={() => navigate("audit")}><span className="section-head"><Icon name="file-text" size={12} color={C.accentL}/> ЖУРНАЛ ДЕЙСТВИЙ</span><span className="admin-audit-preview-row"><span>{audit.error ? "Не удалось загрузить журнал" : audit.items[0] ? `${audit.items[0].action} · ${audit.items[0].target}` : "История изменений администратора"}</span><span aria-hidden="true">›</span></span></button>
        {audit.error && <p role="alert" className="register-warning">{audit.error}</p>}
      </> : <>
        <div className="greeting"><h1>Пользователи</h1></div>
        <p className="admin-subtitle">Все аккаунты студентов и преподавателей</p>
        <div className="register-card">
          <label className="register-field" htmlFor="admin-search">Поиск</label>
          <input id="admin-search" className="register-input" type="search" placeholder="ФИО, логин или группа" value={query} onChange={event => setQuery(event.target.value)} />
          <label className="register-field admin-filter-label" htmlFor="admin-role-filter">Роль</label>
          <select id="admin-role-filter" className="register-input" value={role} onChange={event => setRole(event.target.value)}>
            <option value="all">Все роли</option>{REGISTER_ROLES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <p className="register-hint" role="status">Найдено: {filtered.length}</p>
          <ul className="register-users">{filtered.map(user => <li key={user.id}>
            <AdminAccountCard user={user} onChange={reload} />
          </li>)}</ul>
          {!filtered.length && !storageError && <p className="register-empty">Ничего не найдено</p>}
        </div>
        <button className="register-submit" onClick={() => setPage("create")}>Создать учётные записи</button>
      </>}
      {storageError && <p className="register-error" role="alert">{storageError}</p>}
    </main>
    {menuOpen && <AdminMenu onClose={() => setMenuOpen(false)} onOpen={navigate} onLogout={onLogout} usersCount={users.length} />}
  </section>;
}

function Register({ onBack, onCreated }) {
  const initialDraft = { role:"student", lastName:"", firstName:"", middleName:"", group:"", department:"", position:"", experience:"", groups:"", email:"", phone:"" };
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  const [issued, setIssued] = useState(null);
  const [showIssuedPassword,setShowIssuedPassword] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const update = (field, value) => { setDraft(previous => ({...previous, [field]:value})); setError(""); };
  const submit = async event => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setError("");
    const r = await apiAuthed("/admin/users", { method: "POST", body: draft });
    if (r.status === 201) {
      adminAuditChanged();
      if (mounted.current) {
        setIssued({login:r.data.login, password:r.data.password, duplicatePerson:r.data.duplicatePerson, name:r.data.name});
        setDraft(initialDraft);
        onCreated();
      }
    } else if (mounted.current) setError((r.data && r.data.error) || "Не удалось создать аккаунт. Проверьте подключение к серверу.");
    pending.current = false; if (mounted.current) setBusy(false);
  };
  const leave = () => {
    if (busy) return;
    setIssued(null); onBack();
  };
  const field = (name, title, placeholder, required = false, maxLength = 60) => <div className="register-field" key={name}>
    <label htmlFor={`register-${name}`}>{title}{required ? " *" : ""}</label>
    <input className="register-input" id={`register-${name}`} value={draft[name]} onChange={event => update(name,event.target.value)}
      placeholder={placeholder} maxLength={maxLength} autoComplete="off" required={required} />
  </div>;

  return <section className="screen active admin-screen" aria-label="Создание учётной записи">
    <style>{registerCSS + adminServiceCSS}</style>
    <header className="topbar"><button className="back-btn" disabled={busy} onClick={leave}>← Назад</button><span className="admin-page-title">Создание аккаунта</span></header>
    <main className="dash admin-body">
      {issued ? <div className="register-card register-issued" role="status">
        <Icon name="check-circle-2" size={40} color={C.green} />
        <h1>Учётная запись создана</h1><p className="admin-subtitle">{issued.name}</p>
        {issued.duplicatePerson && <p className="register-warning" role="alert">Уже есть пользователь с таким же ФИО и группой. Новый аккаунт создан с другим логином. Проверьте, не зарегистрировали ли вы одного человека повторно.</p>}
        <label className="register-field" htmlFor="register-issued-login">Логин</label>
        <input className="register-input" id="register-issued-login" value={issued.login} readOnly autoComplete="off" />
        <label className="register-field" htmlFor="register-issued-password">Пароль</label>
        <input className="register-input" id="register-issued-password" type={showIssuedPassword ? "text" : "password"} value={issued.password} readOnly autoComplete="off" />
        <button className="admin-service-secondary" onClick={() => setShowIssuedPassword(value => !value)}>{showIssuedPassword ? "Скрыть пароль" : "Показать пароль"}</button>
        <p className="register-hint">Передайте логин и пароль пользователю. Позже пароль можно посмотреть или изменить в разделе «Пользователи» (каждый просмотр записывается в журнал).</p>
        <button className="register-submit" onClick={() => { setIssued(null); onBack(); }}>Вернуться в кабинет</button>
      </div> : <>
        <div className="greeting"><h1>Новая учётная запись</h1></div>
        <p className="admin-subtitle">Заполните данные пользователя. Логин и пароль создадутся автоматически.</p>
        <form className="register-card" onSubmit={submit} noValidate>
          <fieldset disabled={busy}>
            <div className="register-field"><label htmlFor="register-role">Роль *</label>
              <select id="register-role" className="register-input" value={draft.role} onChange={event => update("role",event.target.value)}>
                {REGISTER_ROLES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            {field("lastName","Фамилия","Матвеев",true)}
            {field("firstName","Имя","Иван",true)}
            {field("middleName","Отчество","Алексеевич (если есть)")}
            {draft.role === "student" ? field("group","Группа","ДВ-41",true,40) : <>
              {field("department","Кафедра / подразделение","Например, ЦК №8",false,160)}
              {field("position","Должность","Преподаватель",false,120)}
              <details className="register-details"><summary>Дополнительные данные преподавателя</summary>
                {field("experience","Стаж","Например, 14 лет")}
                {field("groups","Группы через запятую","ДВ-41, ДВ-31",false,300)}
                {field("email","Email","teacher@academy.ru",false,160)}
                {field("phone","Телефон","+7 ...",false,40)}
              </details>
            </>}
            <p className="register-hint">* Обязательные поля. Логин и пароль создадутся автоматически и будут доступны администратору в разделе «Пользователи».</p>
            {error && <p className="register-error" role="alert">{error}</p>}
            <button className="register-submit" type="submit" disabled={busy}>{busy ? "Создаём аккаунт…" : "Создать аккаунт"}</button>
          </fieldset>
        </form>
      </>}
    </main>
  </section>;
}

const registerCSS = `
  .admin-screen { color:${C.text}; }
  .admin-screen .topbar { gap:8px; }
  .admin-avatar-button { background:none; border:none; color:inherit; font:inherit; cursor:pointer; gap:6px; }
  .admin-avatar-button .avatar { background:${C.accent}; }
  .admin-avatar-button .avatar-name { font-size:12px; }
  .admin-avatar-button .tag-role { font-size:10px; }
  .admin-body { width:100%; max-width:560px; margin:0 auto; }
  .admin-subtitle { color:${C.sub}; font-size:13px; line-height:1.5; }
  .admin-profile { display:flex; align-items:center; gap:14px; }
  .admin-profile-avatar { width:54px; height:54px; flex-shrink:0; border-radius:50%; background:${C.accent}; display:grid; place-items:center; font-size:22px; font-weight:600; }
  .admin-profile h2 { font-size:16px; margin-bottom:4px; }
  .admin-profile p { color:${C.sub}; font-size:12px; line-height:1.5; }
  .admin-login { display:block; margin-top:7px; color:${C.accentL}; font-size:12px; }
  .admin-stat { flex:1; min-width:0; text-align:left; color:${C.text}; border:1px solid ${C.border}; cursor:pointer; font:inherit; }
  .admin-stat .stat-label { display:flex; align-items:center; gap:5px; }
  .admin-stat .stat-val { display:block; }
  .admin-stat-hint { color:${C.sub}; font-size:10px; }
  .admin-actions { display:flex; flex-direction:column; gap:10px; }
  .admin-action { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:14px 12px; border:1px solid ${C.border}; border-radius:14px; background:${C.surface}; color:${C.text}; cursor:pointer; font:inherit; }
  .admin-action-primary { background:#1F5CB822; border-color:#4A8FE766; }
  .admin-action-icon { flex-shrink:0; width:36px; height:36px; border-radius:10px; background:#1F5CB833; display:grid; place-items:center; }
  .admin-action > span:nth-child(2) { flex:1; min-width:0; }
  .admin-action strong { display:block; font-size:13px; line-height:1.5; }
  .admin-action small { display:block; font-size:11px; color:${C.sub}; margin-top:4px; line-height:1.4; }
  .admin-page-title { font-size:13px; font-weight:600; }
  .register-card { padding:20px; border:1px solid ${C.border}; background:${C.card}; border-radius:18px; flex-shrink:0; }
  .register-card fieldset { border:0; min-width:0; }
  .register-field { display:block; color:${C.sub}; font-size:13px; margin-bottom:7px; }
  div.register-field { margin-bottom:16px; }
  .register-field label { display:block; margin-bottom:7px; }
  .register-input { width:100%; min-width:0; min-height:46px; background:${C.surface}; color:${C.text}; border:1px solid ${C.border}; border-radius:12px; padding:12px; font:inherit; font-size:16px; }
  .admin-screen input::placeholder { color:${C.sub}; opacity:.8; }
  .admin-screen input:focus, .admin-screen select:focus { outline:2px solid ${C.accentL}; outline-offset:2px; }
  .admin-screen button:focus-visible, .admin-screen summary:focus-visible { outline:2px solid ${C.accentL}; outline-offset:3px; }
  .admin-screen button:disabled { opacity:.5; cursor:wait; }
  .admin-filter-label { margin-top:16px; }
  .register-submit { width:100%; min-height:48px; border:0; border-radius:14px; background:${C.accent}; color:#fff; padding:15px 10px; font:inherit; font-weight:600; font-size:14px; cursor:pointer; }
  .register-card .register-submit { margin-top:18px; }
  .register-hint { color:${C.sub}; font-size:12px; line-height:1.6; }
  .register-error, .register-warning { font-size:13px; line-height:1.6; border-radius:12px; padding:12px; margin-top:14px; overflow-wrap:anywhere; }
  .register-error { color:#ff9a9a; background:#E84C4C18; border:1px solid #E84C4C55; }
  .register-warning { color:#f5c067; background:#F5A62312; border:1px solid #F5A62344; }
  .register-users { list-style:none; margin-top:8px; }
  .register-users li { padding:14px 0; border-bottom:1px solid ${C.border}; overflow-wrap:anywhere; }
  .register-users li:last-child { border-bottom:0; padding-bottom:0; }
  .register-users strong { font-size:14px; line-height:1.5; }
  .register-user-login { display:block; font-size:13px; color:${C.sub}; margin-top:4px; }
  .register-user-meta { display:flex; flex-wrap:wrap; gap:6px 12px; font-size:12px; color:${C.accentL}; margin-top:8px; }
  .register-empty { padding:20px 0 4px; text-align:center; color:${C.sub}; font-size:13px; }
  .register-details { margin-bottom:16px; }
  .register-details summary { color:${C.accentL}; font-size:13px; cursor:pointer; padding:10px 0; line-height:1.5; }
  .register-issued h1 { font-size:20px; margin:14px 0 8px; }
  .register-issued .register-field { margin-top:18px; }
  .register-issued .register-input { font-family:ui-monospace,monospace; }
`;
