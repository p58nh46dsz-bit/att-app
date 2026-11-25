// Login screen (extracted from App's inline JSX) + ForgotModal (password-recovery sheet, launched from here).
function Login({ active, login, setLogin, pass, setPass, showPass, setShowPass, loginError, setLoginError, onLogin, setScreen, setForgotOpen }) {
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const res = await apiLogin(login, pass);
    setBusy(false);
    if (res.status === 200 && res.data.token) { setLoginError(""); onLogin(res.data.user, res.data.token); return; }
    const d = res.data || {};
    setLoginError(
      res.status === 0 ? "Сервер недоступен. Проверьте подключение и попробуйте позже." :
      d.reason === "empty" ? "Введите логин и пароль" :
      d.reason === "locked" ? `Слишком много попыток. Вход закрыт на ${d.minutes} мин.` :
      res.status === 429 ? "Слишком много запросов. Подождите минуту." :
      `Неверный логин или пароль. Осталось попыток: ${d.triesLeft}`
    );
  };
  return (
      <div className={`screen login2${active ? " active" : ""}`}>
        <div className="login2-photo" aria-hidden="true" />
        <form className="login2-body" onSubmit={e => { e.preventDefault(); submit(); }}>
          <div className="login2-emblem"><AttLogo size={128} circular /></div>
          <h1 className="login2-name">Академия<br />транспортных технологий</h1>
          <div className="login2-place">Санкт-Петербург · с 1945 года</div>
          <div className="login2-gap" />
          <div className="login2-group">
            <label className="login2-row">
              <Icon name="user" size={18} color="currentColor" />
              <input type="text" name="username" autoComplete="username" placeholder="Логин" autoCapitalize="none" autoCorrect="off" spellCheck="false" value={login} onChange={e => { setLogin(e.target.value); if (loginError) setLoginError(""); }} />
            </label>
            <label className="login2-row">
              <Icon name="lock" size={18} color="currentColor" />
              <input type={showPass ? "text" : "password"} name="password" autoComplete="current-password" placeholder="Пароль" autoCapitalize="none" value={pass} onChange={e => { setPass(e.target.value); if (loginError) setLoginError(""); }} />
              <button type="button" className="login2-eye" aria-label={showPass ? "Скрыть пароль" : "Показать пароль"} aria-pressed={showPass} onClick={() => setShowPass(v => !v)}>
                <Icon name={showPass ? "eye-off" : "eye"} size={18} color="currentColor" />
              </button>
            </label>
          </div>
          {loginError && <div className="login2-error" role="alert"><Icon name="x-circle" size={16} color="currentColor" />{loginError}</div>}
          <button type="submit" className="login2-primary" disabled={busy}>{busy ? <span className="login2-spin" aria-label="Проверка" /> : "Войти"}</button>
          <button type="button" className="login2-secondary" onClick={() => setScreen("applicant")}>Я абитуриент</button>
          <button type="button" className="login2-forgot" onClick={() => setForgotOpen(true)}>Забыли пароль?</button>
        </form>
      </div>
  );
}
// "Забыли пароль?": a password is not restored by the user — the college administration issues a new one.
// The three real steps of getting back in: the password is reset by the academy (the administrator finds the account by
// name, group or login and sets a new one), then the person changes it in their profile.
const FORGOT_STEPS = [
  ["Обратитесь в академию", "В учебную часть или к администратору АТТ. Сами сбросить пароль не получится"],
  ["Назовите ФИО и группу", "По ним найдут учётную запись и выдадут новый пароль"],
  ["Войдите и смените пароль", "Профиль → «Сменить пароль»"],
];

function ForgotModal({ open, onClose }) {
  if (!open) return null;
  // A floating sheet in the iOS way: the academy's emblem with a lock, the steps as a checklist, one action.
  return (
    <>
      <div className="lk-overlay open login2-fs-overlay" onClick={onClose} />
      <div className="login2-fs" role="dialog" aria-modal="true" aria-labelledby="forgot-title">
        <button type="button" className="login2-fs-close" aria-label="Закрыть" onClick={onClose}><Icon name="x" size={16} color="currentColor" /></button>
        <div className="login2-fs-hero" aria-hidden="true">
          <div className="login2-fs-seal"><AttLogo size={72} circular /></div>
          <span className="login2-fs-lock"><Icon name="lock" size={14} color="currentColor" strokeWidth={2.4} /></span>
        </div>
        <h2 id="forgot-title" className="login2-fs-title">Забыли пароль?</h2>
        <p className="login2-fs-text">Три шага, чтобы снова войти</p>
        <ol className="login2-fs-steps">
          {FORGOT_STEPS.map(([title, sub], i) => (
            <li key={i} className="login2-fs-step">
              <span className="login2-fs-num">{i + 1}</span>
              <div><b>{title}</b><span>{sub}</span></div>
            </li>
          ))}
        </ol>
        <button type="button" className="login2-fs-btn" onClick={onClose}>Понятно</button>
      </div>
    </>
  );
}

// NOTIFICATIONS PANEL
