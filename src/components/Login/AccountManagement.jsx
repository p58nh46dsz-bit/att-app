function AdminAccountCard({user,onChange}) {
  const [password,setPassword] = useState(null);
  const [visible,setVisible] = useState(false);
  const [mode,setMode] = useState(null);
  const [newPassword,setNewPassword] = useState("");
  const [confirmation,setConfirmation] = useState("");
  const [deleteLogin,setDeleteLogin] = useState("");
  const [busy,setBusy] = useState(false);
  const pending = useRef(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");
  useEffect(() => {
    setVisible(false);
    try {setPassword(authSavedPassword(user.login));setError("");}
    catch(error){setPassword(null);setError(error.message);}
  },[user]);
  const close = () => {setMode(null);setNewPassword("");setConfirmation("");setDeleteLogin("");setError("");};
  const savePassword = async event => {
    event.preventDefault(); if(pending.current) return;
    setError("");setSuccess("");
    if(newPassword !== confirmation){setError("Пароли не совпадают.");return;}
    pending.current = true;setBusy(true);
    try {
      await authChangePassword(user.login,newPassword);
      close();setPassword(authSavedPassword(user.login));setVisible(false);
      setSuccess("Пароль изменён. Старый пароль больше не подходит.");onChange();
    } catch(error){setError(error.message);}
    finally{pending.current=false;setBusy(false);}
  };
  const remove = () => {
    if(pending.current || authNormalizeLogin(deleteLogin) !== authNormalizeLogin(user.login)) return;
    pending.current=true;setBusy(true);setError("");
    try {authDeleteAccount(user.login);setPassword(null);setVisible(false);onChange();}
    catch(error){setError(error.message);}
    finally{pending.current=false;setBusy(false);}
  };
  return <article aria-label={`Аккаунт ${user.login}`}>
    <strong>{authFullName(user)}</strong><span className="register-user-login">{user.login}</span>
    <div className="register-user-meta"><span>{user.role === "student" ? "Студент" : "Преподаватель"}</span>{user.group && <span>Группа: {user.group}</span>}{user.department && <span>{user.department}</span>}</div>
    <label className="register-field admin-filter-label" htmlFor={`account-password-${user.login}`}>Пароль</label>
    <input className="register-input" id={`account-password-${user.login}`} type={visible ? "text" : "password"} value={password ?? ""} readOnly autoComplete="off" placeholder="Недоступен до смены пароля" />
    {password !== null ? <button className="admin-service-secondary" aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? "Скрыть пароль" : "Показать пароль"}</button> : <p className="register-hint">Старый пароль не сохранён. После смены его можно будет посмотреть.</p>}
    <div className="admin-service-buttons">
      <button className="admin-service-secondary" disabled={busy} onClick={() => {close();setSuccess("");setMode("password");}}>Изменить пароль</button>
      <button className="admin-service-secondary" disabled={busy} onClick={() => {close();setSuccess("");setMode("delete");}}>Удалить</button>
    </div>
    {mode === "password" && <form onSubmit={savePassword} noValidate>
      <label className="register-field admin-filter-label" htmlFor={`new-password-${user.login}`}>Новый пароль</label>
      <input className="register-input" id={`new-password-${user.login}`} type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" maxLength={128} disabled={busy} />
      <label className="register-field admin-filter-label" htmlFor={`confirm-password-${user.login}`}>Повторите пароль</label>
      <input className="register-input" id={`confirm-password-${user.login}`} type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" maxLength={128} disabled={busy} />
      <button className="register-submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить пароль"}</button>
      <button type="button" className="admin-service-secondary" disabled={busy} onClick={close}>Отмена</button>
    </form>}
    {mode === "delete" && <div className="register-warning">
      <p>Удалить аккаунт {authFullName(user)} ({user.login})? В этом браузере вход под ним станет недоступен, открытые сеансы завершатся.</p>
      <label className="register-field admin-filter-label" htmlFor={`delete-login-${user.login}`}>Введите логин для подтверждения</label>
      <input className="register-input" id={`delete-login-${user.login}`} value={deleteLogin} onChange={event => setDeleteLogin(event.target.value)} autoComplete="off" autoCapitalize="none" disabled={busy} />
      <button className="admin-service-secondary" disabled={busy || authNormalizeLogin(deleteLogin) !== authNormalizeLogin(user.login)} onClick={remove}>Удалить аккаунт</button>
      <button className="admin-service-secondary" disabled={busy} onClick={close}>Отмена</button>
    </div>}
    {error && <p className="register-error" role="alert">{error}</p>}{success && <p className="admin-service-success" role="status">{success}</p>}
  </article>;
}
