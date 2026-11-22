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
function ForgotModal({ open, onClose }) {
  if (!open) return null;
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open login2-forgot-sheet" role="dialog" aria-modal="true" aria-labelledby="forgot-title">
        <div className="lk-handle" />
        <div className="login2-fs-icon"><Icon name="key-round" size={26} color="currentColor" /></div>
        <h2 id="forgot-title" className="login2-fs-title">Забыли пароль?</h2>
        <p className="login2-fs-text">Восстановить пароль самостоятельно нельзя. Обратитесь в учебную часть или к администратору АТТ — вам выдадут новый пароль.</p>
        <p className="login2-fs-note">Сменить пароль можно в профиле, если вы помните текущий.</p>
        <button className="login2-fs-btn" onClick={onClose}>Понятно</button>
      </div>
    </>
  );
}

// NOTIFICATIONS PANEL
