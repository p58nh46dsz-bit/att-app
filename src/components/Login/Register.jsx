// Local admin entry only. Regular sign-in remains entirely in Login.jsx/auth.js.
// Keep this demo account separate from generated student/teacher accounts.
const REGISTER_LOCAL_ADMIN = {
  login: "admin", role: "admin", firstName: "Администратор", lastName: "", middleName: "",
  salt: "att-admin-local-v1", hash: "aa4c99a7a7f50f7ae5061c980c3023481a086010dd87fa3561f6b95b9ecf324a",
};
const REGISTER_ROLES = [
  { value: "student", label: "Студент" },
  { value: "teacher", label: "Преподаватель" },
];

function RegistrationLogin(props) {
  const busy = useRef(false);
  const enterAdmin = async event => {
    if (!props.active || authNormalizeLogin(props.login) !== "admin") return;
    event.preventDefault();
    event.stopPropagation();
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await authVerify([REGISTER_LOCAL_ADMIN], props.login, props.pass);
      if (result.ok) { props.setLoginError(""); props.onLogin(result.account); }
      else props.setLoginError(result.reason === "locked"
        ? `Слишком много попыток. Вход закрыт на ${result.minutes} мин.`
        : result.reason === "empty" ? "Введите логин и пароль" : "Неверный логин или пароль");
    } catch (error) { props.setLoginError("Не удалось выполнить вход. Попробуйте ещё раз."); }
    finally { busy.current = false; }
  };
  return <div style={{display:"contents"}}
    onClickCapture={event => { if (event.target.closest("button.btn-primary")) enterAdmin(event); }}
    onKeyDownCapture={event => { if (event.key === "Enter" && event.target.tagName === "INPUT") enterAdmin(event); }}>
    <Login {...props} />
  </div>;
}

// Reject broken storage before calling authAddAccount: shared saveJSON reports
// no write errors, so also read back the account before reporting success.
function registerAllAccounts() {
  authReadAdminState();
  try {
    const raw = window.localStorage.getItem("att_accounts_extra");
    if (raw !== null && !Array.isArray(JSON.parse(raw))) throw new Error("Invalid accounts");
  } catch (error) { throw new Error("Не удалось прочитать аккаунты. Проверьте хранилище браузера; существующие данные не изменены."); }
  const accounts = authAllAccounts();
  if (accounts.some(account => !account || typeof account.login !== "string" ||
      typeof account.lastName !== "string" || typeof account.firstName !== "string" ||
      typeof account.salt !== "string" || typeof account.hash !== "string" ||
      !REGISTER_ROLES.some(role => role.value === account.role))) {
    throw new Error("Некорректные данные аккаунтов.");
  }
  return accounts;
}

// Dashboard state contains only display fields, never hashes, salts or passwords.
function registerReadUsers() {
  return registerAllAccounts().map(({ login, role, lastName, firstName, middleName, group, department, position }) =>
    ({ login, role, lastName, firstName, middleName, group, department, position }));
}

function registerPerson(draft) {
  const person = {
    role: draft.role, lastName: draft.lastName.trim(), firstName: draft.firstName.trim(), middleName: draft.middleName.trim(),
  };
  if (!REGISTER_ROLES.some(role => role.value === person.role)) throw new Error("Выберите роль пользователя.");
  const namePattern = /^[А-Яа-яЁёA-Za-z\s-]+$/;
  for (const [field, label] of [["lastName", "Фамилия"], ["firstName", "Имя"], ["middleName", "Отчество"]]) {
    if ((field !== "middleName" && !person[field]) || (person[field] && (!namePattern.test(person[field]) ||
        !authTranslit(person[field]) || person[field].length > 60))) {
      throw new Error(`${label}: укажите имя буквами, до 60 символов.`);
    }
  }
  if (person.role === "student") {
    person.group = draft.group.trim().toUpperCase();
    if (!person.group || person.group.length > 40 || !authTranslit(person.group) || !/^[А-Яа-яЁёA-Za-z0-9\s-]+$/.test(person.group)) {
      throw new Error("Укажите группу студента, например ДВ-41.");
    }
  } else {
    Object.assign(person, {
      department: draft.department.trim(), position: draft.position.trim() || "Преподаватель",
      experience: draft.experience.trim(),
      groups: Array.from(new Set(draft.groups.split(",").map(group => group.trim().toUpperCase()).filter(Boolean))),
      email: draft.email.trim(), phone: draft.phone.trim(),
    });
    if (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) throw new Error("Проверьте email преподавателя.");
  }
  return person;
}

async function registerCreatePerson(person) {
  const create = async () => {
    // The shared auth functions own all login/password generation and hashing.
    registerAllAccounts();
    const result = await authCreateAccount(person, authAccountPool(true));
    authAddAccount(result.account,result.password);
    const saved = registerAllAccounts().some(account => account.login === result.account.login && account.hash === result.account.hash);
    if (!saved) throw new Error("Аккаунт не сохранён. Проверьте доступность хранилища браузера и свободное место.");
    return result;
  };
  // Serialize registration across tabs when Web Locks is available.
  return navigator.locks ? navigator.locks.request("att-account-registration", create) : create();
}

function AdminDashboard({ onLogout }) {
  const services = useAdminServices();
  const serviceCounts = adminServiceCounts(services.data);
  const [page, setPage] = useState("home");
  const [users, setUsers] = useState([]);
  const [storageError, setStorageError] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const reload = () => {
    try { setUsers(registerReadUsers()); setStorageError(""); }
    catch (error) { setStorageError("Не удалось прочитать аккаунты. Проверьте хранилище браузера; существующие данные не изменены."); }
  };
  useEffect(() => {
    reload();
    const onStorage = event => { if (event.key === "att_accounts_extra" || event.key === AUTH_ADMIN_KEY || event.key === null) reload(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const openUsers = (filter = "all") => { setRole(filter); setQuery(""); setPage("users"); };
  const needle = query.trim().toLowerCase();
  const filtered = users.filter(user => (role === "all" || user.role === role) &&
    [authFullName(user), user.login, user.group || ""].some(value => value.toLowerCase().includes(needle)));
  if (page === "create") return <Register onBack={() => { reload(); setPage("home"); }} onCreated={reload} />;
  if (["news", "certificates", "appeals"].includes(page)) return <AdminServices page={page} services={services} onBack={() => setPage("home")} />;

  return <section className="screen active admin-screen" aria-label="Кабинет администратора">
    <style>{registerCSS + adminServiceCSS}</style>
    <header className="topbar">
      <div className="topbar-left"><button className="back-btn" onClick={page === "home" ? onLogout : () => setPage("home")}>
        {page === "home" ? "← Выход" : "← Назад"}</button></div>
      <button className="avatar-row admin-avatar-button" aria-label="Личный кабинет администратора" onClick={() => setPage("home")}>
        <span className="avatar">А</span><span className="avatar-name">Администратор</span><span className="tag-role">админ</span>
      </button>
    </header>
    <main className="dash admin-body">
      {page === "home" ? <>
        <div className="greeting"><h1>Здравствуйте, администратор</h1></div>
        <p className="admin-subtitle">Личный кабинет · АТТ Академия</p>
        <section className="admin-profile section-card" aria-label="Профиль администратора">
          <div className="admin-profile-avatar">А</div>
          <div><h2>Администратор</h2><p>Пользователи и работа колледжа</p><span className="admin-login">Логин: admin</span></div>
        </section>
        <section className="section-card admin-actions" aria-label="Очередь задач">
          <div className="section-head">ОЧЕРЕДЬ ЗАДАЧ</div>
          <div className="admin-service-queue">
            {[{page:"certificates",label:"Справки",count:serviceCounts.certificates},{page:"appeals",label:"Обращения",count:serviceCounts.appeals},{page:"news",label:"Объявления",count:serviceCounts.news}].map(item =>
              <button key={item.page} onClick={() => setPage(item.page)}><strong>{services.error ? "—" : item.count}</strong><span>{item.label}</span></button>)}
          </div>
          <p className="register-hint">Справки и обращения — демонстрационные данные. Счётчики учитывают текущие статусы; объявления — опубликованные.</p>
        </section>
        <section className="section-card admin-actions" aria-label="Работа колледжа">
          <div className="section-head">РАБОТА КОЛЛЕДЖА</div>
          {[{page:"news",icon:"megaphone",title:"Новости и объявления",sub:"Создание, аудитория и закрепление"},{page:"certificates",icon:"file-text",title:"Заявки на справки",sub:"Получены, в работе, готовы"},{page:"appeals",icon:"message-circle",title:"Обращения",sub:"Ответы и решение вопросов"}].map(item =>
            <button className="admin-action" key={item.page} onClick={() => setPage(item.page)}><span className="admin-action-icon"><Icon name={item.icon} size={22} color={C.accentL} /></span><span><strong>{item.title}</strong><small>{item.sub}</small></span><span aria-hidden="true">›</span></button>)}
        </section>
        {services.error && <p className="register-error" role="alert">{services.error}</p>}
        <div className="stats-row">
          {REGISTER_ROLES.map(item => <button className="stat-card admin-stat" key={item.value} onClick={() => openUsers(item.value)}>
            <span className="stat-label"><Icon name={item.value === "student" ? "graduation-cap" : "briefcase"} size={14} color={C.accentL} /> {item.value === "student" ? "Студенты" : "Преподаватели"}</span>
            <span className="stat-val">{storageError ? "—" : users.filter(user => user.role === item.value).length}</span>
            <span className="admin-stat-hint">Открыть список →</span>
          </button>)}
        </div>
        <section className="section-card admin-actions" aria-label="Управление пользователями">
          <div className="section-head">УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ</div>
          <button className="admin-action admin-action-primary" onClick={() => setPage("create")}>
            <span className="admin-action-icon"><Icon name="users" size={22} color="#fff" /></span>
            <span><strong>Создать учётные записи</strong><small>Новый студент или преподаватель</small></span><span aria-hidden="true">›</span>
          </button>
          <button className="admin-action" onClick={() => openUsers()}>
            <span className="admin-action-icon"><Icon name="search" size={22} color={C.accentL} /></span>
            <span><strong>Пользователи</strong><small>Поиск и список аккаунтов</small></span><span aria-hidden="true">›</span>
          </button>
        </section>
        <p className="register-hint">Аккаунты и их пароли доступны в разделе «Пользователи». Изменения действуют в этом браузере.</p>
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
          <ul className="register-users">{filtered.map(user => <li key={user.login}>
            <AdminAccountCard user={user} onChange={reload} />
          </li>)}</ul>
          {!filtered.length && !storageError && <p className="register-empty">Ничего не найдено</p>}
        </div>
        <button className="register-submit" onClick={() => setPage("create")}>Создать учётные записи</button>
      </>}
      {storageError && <p className="register-error" role="alert">{storageError}</p>}
    </main>
  </section>;
}

function Register({ onBack, onCreated }) {
  const initialDraft = { role:"student", lastName:"", firstName:"", middleName:"", group:"", department:"", position:"", experience:"", groups:"", email:"", phone:"" };
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  // Account hashes stay separate from the approved local password-viewing storage.
  const [issued, setIssued] = useState(null);
  const [showIssuedPassword,setShowIssuedPassword] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const update = (field, value) => { setDraft(previous => ({...previous, [field]:value})); setError(""); };
  const submit = async event => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setError("");
    try {
      const person = registerPerson(draft);
      const { account, password, duplicatePerson } = await registerCreatePerson(person);
      if (mounted.current) {
        setIssued({login:account.login, password, duplicatePerson, name:authFullName(account)});
        setDraft(initialDraft);
        onCreated();
      }
    } catch (error) { if (mounted.current) setError(error.message || "Не удалось создать аккаунт."); }
    finally { pending.current = false; if (mounted.current) setBusy(false); }
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
    <style>{registerCSS}</style>
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
        <p className="register-hint">Передайте логин и пароль пользователю. Позже пароль можно посмотреть или изменить в разделе «Пользователи».</p>
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
