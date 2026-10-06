// Temporary admin-login adapter while another developer owns Login.jsx.
// Only admin attempts are intercepted; other login flows stay with Login.
// Replace this adapter when shared authentication provides the admin role.
function RegistrationLogin(props) {
  const enterAdmin = event => {
    if (!props.active || props.login.trim().toLowerCase() !== "admin") return;
    event.preventDefault();
    event.stopPropagation();
    if (props.pass !== "1") {
      props.setLoginError("Неверный логин или пароль");
      return;
    }
    props.setLoginError("");
    props.setScreen("admin");
  };
  return (
    <div style={{display:"contents"}}
      onClickCapture={event => {
        if (event.target.closest("button.btn-primary")) enterAdmin(event);
      }}
      onKeyDownCapture={event => {
        if (event.key === "Enter" && event.target.tagName === "INPUT") enterAdmin(event);
      }}>
      <Login {...props} />
    </div>
  );
}

function Register({ onLogout }) {
  const emptyDraft = { fullName: "", role: "student", group: "", login: "", password: "" };
  const [draft, setDraft] = useState(emptyDraft);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [created, setCreated] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const reload = () => {
      try { setAccounts(readRegisteredAccounts()); setStorageError(""); }
      catch (error) { setStorageError("Не удалось прочитать сохранённые аккаунты. Проверьте хранилище браузера."); }
    };
    reload();
    const onStorage = event => {
      if (event.key === REGISTER_STORAGE_KEY || event.key === null) reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (name, value) => {
    setDraft(previous => ({ ...previous, [name]: value, ...(name === "role" && value !== "student" ? { group: "" } : {}) }));
    setError("");
  };
  const submit = event => {
    event.preventDefault();
    setError("");
    setCreated(null);
    try {
      const account = createRegisteredAccount(draft);
      setAccounts(readRegisteredAccounts());
      setCreated({ fullName: account.fullName, login: account.login });
      setDraft(emptyDraft);
      setShowPassword(false);
    } catch (error) { setError(error.message); }
  };
  const needle = query.trim().toLowerCase();
  const filtered = accounts.filter(account => [account.fullName, account.login, account.group || "",
    REGISTER_ROLES.find(role => role.value === account.role).label].some(value => value.toLowerCase().includes(needle)));

  return (
    <section className="screen active register-screen" aria-label="Кабинет администратора">
      <style>{registerCSS}</style>
      <header className="register-header">
        <div><div className="register-brand">АТТ АКАДЕМИЯ</div><h1>Администратор</h1></div>
        <button type="button" className="register-logout" onClick={onLogout}>Выйти</button>
      </header>
      <main className="register-body">
        <div className="register-intro"><h2>Учётные записи</h2><p>Создавайте аккаунты и назначайте роли пользователей.</p></div>
        <form className="register-card" onSubmit={submit} noValidate>
          <h3>Новый аккаунт</h3>
          <label className="register-field" htmlFor="register-name">ФИО
            <input id="register-name" value={draft.fullName} onChange={event => update("fullName", event.target.value)}
              placeholder="Иванов Иван Иванович" autoComplete="off" maxLength={120} required />
          </label>
          <label className="register-field" htmlFor="register-role">Роль
            <select id="register-role" value={draft.role} onChange={event => update("role", event.target.value)}>
              {REGISTER_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </label>
          {draft.role === "student" && <label className="register-field" htmlFor="register-group">Группа
            <input id="register-group" value={draft.group} onChange={event => update("group", event.target.value)}
              placeholder="Например, ДВ-41" maxLength={40} autoComplete="off" required />
          </label>}
          <label className="register-field" htmlFor="register-login">Логин
            <input id="register-login" value={draft.login} onChange={event => update("login", event.target.value)}
              placeholder="Например, ivanov.i" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={80} required />
          </label>
          <label className="register-field" htmlFor="register-password">Пароль</label>
          <div className="register-password">
            <input id="register-password" type={showPassword ? "text" : "password"} value={draft.password}
              onChange={event => update("password", event.target.value)} placeholder="Задайте пароль"
              autoComplete="new-password" maxLength={128} required />
            <button type="button" aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? "Скрыть" : "Показать"}</button>
          </div>
          <p className="register-hint">Передайте логин и пароль пользователю после создания аккаунта.</p>
          {error && <p role="alert" className="register-error">{error}</p>}
          {created && <div role="status" className="register-success">Аккаунт создан: {created.fullName}. Логин: <strong>{created.login}</strong></div>}
          <button type="submit" className="register-submit">Создать аккаунт</button>
        </form>
        <section className="register-card" aria-label="Созданные аккаунты">
          <h3>Созданные аккаунты <span className="register-count">{accounts.length}</span></h3>
          <input className="register-search" aria-label="Поиск аккаунтов" placeholder="ФИО, логин, группа или роль"
            type="search" value={query} onChange={event => setQuery(event.target.value)} />
          {storageError && <p role="alert" className="register-error">{storageError}</p>}
          {!storageError && (filtered.length ? <ul className="register-accounts">{filtered.map(account => <li key={account.id}>
            <div className="register-account-name">{account.fullName}</div>
            <div className="register-account-login">{account.login}</div>
            <div className="register-account-meta"><span>{REGISTER_ROLES.find(role => role.value === account.role).label}</span>
              {account.group && <span>Группа: {account.group}</span>}</div>
          </li>)}</ul> : <p className="register-empty">{accounts.length ? "Ничего не найдено" : "Созданных аккаунтов пока нет"}</p>)}
        </section>
        <p className="register-local-note">Данные сохраняются только в этом браузере на этом устройстве.</p>
      </main>
    </section>
  );
}

const registerCSS = `
  .register-screen { color:${C.text}; }
  .register-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:20px 20px 16px; padding-top:max(20px,env(safe-area-inset-top)); border-bottom:1px solid ${C.border}; flex-shrink:0; }
  .register-brand { font-size:10px; letter-spacing:2px; color:${C.accentL}; margin-bottom:6px; font-weight:700; }
  .register-header h1 { font-size:20px; }
  .register-logout { background:${C.surface}; border:1px solid ${C.border}; border-radius:12px; color:${C.text}; padding:12px 16px; cursor:pointer; font:inherit; font-size:13px; min-height:44px; }
  .register-body { overflow-y:auto; min-height:0; padding:20px; padding-bottom:max(24px,env(safe-area-inset-bottom)); width:100%; max-width:560px; margin:0 auto; }
  .register-intro { margin-bottom:20px; }
  .register-intro h2 { font-size:22px; margin-bottom:8px; }
  .register-intro p { font-size:14px; line-height:1.5; color:${C.sub}; }
  .register-card { padding:20px; border:1px solid ${C.border}; background:${C.card}; border-radius:20px; margin-bottom:16px; }
  .register-card h3 { font-size:16px; margin-bottom:18px; }
  .register-field { display:block; color:${C.sub}; font-size:13px; margin-bottom:14px; }
  .register-field input, .register-field select, .register-password input, .register-search { width:100%; min-width:0; min-height:46px; background:${C.surface}; color:${C.text}; border:1px solid ${C.border}; border-radius:12px; padding:12px; font:inherit; font-size:16px; }
  .register-field input, .register-field select { display:block; margin-top:7px; }
  .register-screen input::placeholder { color:${C.sub}; opacity:.8; }
  .register-screen input:focus, .register-screen select:focus { outline:2px solid ${C.accentL}; outline-offset:2px; }
  .register-screen button:focus-visible { outline:2px solid ${C.accentL}; outline-offset:3px; }
  .register-password { display:flex; gap:8px; align-items:center; margin-top:-7px; }
  .register-password input { flex:1; }
  .register-password button { background:none; border:none; color:${C.accentL}; font:inherit; font-size:12px; min-height:44px; cursor:pointer; flex-shrink:0; }
  .register-hint, .register-local-note { color:${C.sub}; font-size:12px; line-height:1.5; margin-top:10px; }
  .register-submit { margin-top:18px; width:100%; border:0; border-radius:14px; background:${C.accent}; color:white; padding:15px 10px; font:inherit; font-weight:600; font-size:15px; cursor:pointer; }
  .register-error, .register-success { font-size:13px; line-height:1.5; border-radius:12px; padding:12px; margin-top:14px; overflow-wrap:anywhere; }
  .register-error { color:#ff9a9a; background:#E84C4C18; border:1px solid #E84C4C55; }
  .register-success { color:#8ee8a6; background:#4CAF6B18; border:1px solid #4CAF6B55; }
  .register-count { color:${C.sub}; font-weight:400; margin-left:6px; }
  .register-accounts { list-style:none; margin-top:8px; }
  .register-accounts li { padding:14px 0; border-bottom:1px solid ${C.border}; overflow-wrap:anywhere; }
  .register-accounts li:last-child { border-bottom:0; padding-bottom:0; }
  .register-account-name { font-size:14px; font-weight:600; line-height:1.5; }
  .register-account-login { font-size:13px; color:${C.sub}; margin-top:4px; }
  .register-account-meta { display:flex; flex-wrap:wrap; gap:6px 12px; font-size:12px; color:${C.accentL}; margin-top:8px; }
  .register-empty { padding:20px 0 4px; text-align:center; color:${C.sub}; font-size:13px; }
`;
