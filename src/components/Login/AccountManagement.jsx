function AdminAccountCard({user,onChange,groupList=[]}) {
  // The password is fetched only when the admin presses "Показать пароль" (the server journals every view).
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
  useEffect(() => { setVisible(false); setPassword(null); setError(""); },[user.id]);
  const [draft,setDraft] = useState(null);
  const startEdit = () => {
    close();setSuccess("");
    setDraft({login:user.login||"",lastName:user.lastName||"",firstName:user.firstName||"",middleName:user.middleName||"",group:user.group||"",
      department:user.department||"",position:user.position||"",experience:user.experience||"",email:user.email||"",phone:user.phone||"",groups:user.groups||[]});
    setMode("edit");
  };
  const setField = (name,value) => {setDraft(previous => ({...previous,[name]:value}));setError("");};
  const saveProfile = async event => {
    event.preventDefault(); if(pending.current) return;
    pending.current = true;setBusy(true);setError("");setSuccess("");
    const body = user.role === "student" ? {login:draft.login,lastName:draft.lastName,firstName:draft.firstName,middleName:draft.middleName,group:draft.group}
      : {...draft};
    const r = await apiAuthed(`/admin/users/${user.id}`,{method:"PATCH",body});
    pending.current=false;setBusy(false);
    if(r.status === 200){adminAuditChanged();onChange();setMode(null);setDraft(null);setSuccess("Данные сохранены.");}
    else setError((r.data && r.data.error) || offline);
  };
  const close = () => {setDraft(null);setMode(null);setNewPassword("");setConfirmation("");setDeleteLogin("");setError("");};
  const offline = "Не удалось выполнить запрос. Проверьте подключение к серверу.";
  const togglePassword = async () => {
    if (visible) { setVisible(false); setPassword(null); return; }
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setSuccess("");
    const r = await apiAuthed(`/admin/users/${user.id}/password`);
    pending.current = false; setBusy(false);
    if (r.status === 200 && typeof r.data.password === "string") { setPassword(r.data.password); setVisible(true); adminAuditChanged(); }
    else setError(r.status === 200 ? "Пароль не сохранён. Задайте новый — после этого его можно будет посмотреть." : offline);
  };
  const savePassword = async event => {
    event.preventDefault(); if(pending.current) return;
    setError("");setSuccess("");
    if(newPassword !== confirmation){setError("Пароли не совпадают.");return;}
    pending.current = true;setBusy(true);
    const r = await apiAuthed(`/admin/users/${user.id}/password`,{method:"POST",body:{password:newPassword}});
    pending.current=false;setBusy(false);
    if(r.status === 200){
      close();setPassword(null);setVisible(false);adminAuditChanged();onChange();
      setSuccess("Пароль изменён. Старый пароль и открытые сеансы пользователя больше не действуют.");
    } else setError((r.data && r.data.error) || offline);
  };
  const remove = async () => {
    if(pending.current || authNormalizeLogin(deleteLogin) !== authNormalizeLogin(user.login)) return;
    pending.current=true;setBusy(true);setError("");
    const r = await apiAuthed(`/admin/users/${user.id}`,{method:"DELETE"});
    pending.current=false;setBusy(false);
    if(r.status === 200){adminAuditChanged();onChange();} else setError((r.data && r.data.error) || offline);
  };
  return <article aria-label={`Аккаунт ${user.login}`}>
    <strong>{authFullName(user)}</strong><span className="register-user-login">{user.login}</span>
    <div className="register-user-meta"><span>{user.role === "student" ? "Студент" : "Преподаватель"}</span>{user.group && <span>Группа: {user.group}</span>}{user.department && <span>{user.department}</span>}{user.role === "teacher" && user.experience && <span>Стаж: {user.experience}</span>}{user.role === "teacher" && user.email && <span>{user.email}</span>}{user.role === "teacher" && user.phone && <span>{user.phone}</span>}{user.nameIncomplete && <span className="admin-service-badge" title="Учётная запись создана автоматически при выставлении оценки: в списке группы было только имя с инициалами">Уточнить ФИО</span>}</div>
    <label className="register-field admin-filter-label" htmlFor={`account-password-${user.login}`}>Пароль</label>
    <input className="register-input" id={`account-password-${user.login}`} type={visible ? "text" : "password"} value={visible ? password : ""} readOnly autoComplete="off" placeholder="Скрыт" />
    {user.hasPassword ? <button className="admin-service-secondary" disabled={busy} aria-pressed={visible} onClick={togglePassword}>{visible ? "Скрыть пароль" : "Показать пароль"}</button> : <p className="register-hint">Пароль не сохранён. После смены пароля его можно будет посмотреть.</p>}
    <div className="admin-service-buttons">
      <button className="admin-service-secondary" disabled={busy} onClick={startEdit}>Изменить данные</button>
      <button className="admin-service-secondary" disabled={busy} onClick={() => {close();setSuccess("");setMode("password");}}>Изменить пароль</button>
      <button className="admin-service-secondary" disabled={busy} onClick={() => {close();setSuccess("");setMode("delete");}}>Удалить</button>
    </div>
    {mode === "edit" && draft && <form onSubmit={saveProfile} noValidate>
      <div className="register-field"><label htmlFor={`edit-login-${user.login}`}>Логин</label>
        <input className="register-input" id={`edit-login-${user.login}`} value={draft.login} onChange={event => setField("login",event.target.value.toLowerCase())} maxLength={40} autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={busy} />
        <p className="register-hint">Латинские буквы, цифры, точка, дефис, подчёркивание; от 3 до 40 символов. После смены человек входит под новым логином, пароль остаётся прежним.</p></div>
      {[["lastName","Фамилия"],["firstName","Имя"],["middleName","Отчество"]].map(([key,label]) => <div className="register-field" key={key}>
        <label htmlFor={`edit-${key}-${user.login}`}>{label}</label>
        <input className="register-input" id={`edit-${key}-${user.login}`} value={draft[key]} onChange={event => setField(key,event.target.value)} maxLength={60} autoComplete="off" disabled={busy} />
      </div>)}
      {user.role === "student" ? <div className="register-field"><label htmlFor={`edit-group-${user.login}`}>Группа</label>
        <select className="register-input" id={`edit-group-${user.login}`} value={draft.group} onChange={event => setField("group",event.target.value)} disabled={busy}>
          {!groupList.includes(draft.group) && <option value={draft.group}>{draft.group || "Выберите группу"}</option>}
          {groupList.map(code => <option key={code} value={code}>{code}</option>)}
        </select></div> : <>
        {[["department","Кафедра / подразделение",160],["position","Должность",120],["experience","Стаж",60],["email","Email",160],["phone","Телефон",40]].map(([key,label,max]) => <div className="register-field" key={key}>
          <label htmlFor={`edit-${key}-${user.login}`}>{label}</label>
          <input className="register-input" id={`edit-${key}-${user.login}`} value={draft[key]} onChange={event => setField(key,event.target.value)} maxLength={max} autoComplete="off" disabled={busy} />
        </div>)}
        <div className="register-field"><label>Группы</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:6}}>
            {groupList.map(code => {const on = draft.groups.includes(code); return <button type="button" key={code} className="admin-service-secondary" aria-pressed={on} disabled={busy}
              style={on ? {background:"#1F5CB8",color:"#fff"} : undefined}
              onClick={() => setField("groups", on ? draft.groups.filter(x => x !== code) : [...draft.groups, code])}>{code}</button>;})}
          </div>
          <p className="register-hint">Если убрать группу, предметы преподавателя в ней тоже уберутся.</p>
        </div></>}
      <button className="register-submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить"}</button>
      <button type="button" className="admin-service-secondary" disabled={busy} onClick={close}>Отмена</button>
    </form>}
    {mode === "password" && <form onSubmit={savePassword} noValidate>
      <label className="register-field admin-filter-label" htmlFor={`new-password-${user.login}`}>Новый пароль</label>
      <input className="register-input" id={`new-password-${user.login}`} type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" maxLength={128} disabled={busy} />
      <label className="register-field admin-filter-label" htmlFor={`confirm-password-${user.login}`}>Повторите пароль</label>
      <input className="register-input" id={`confirm-password-${user.login}`} type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="new-password" maxLength={128} disabled={busy} />
      <button className="register-submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить пароль"}</button>
      <button type="button" className="admin-service-secondary" disabled={busy} onClick={close}>Отмена</button>
    </form>}
    {mode === "delete" && <div className="register-warning">
      <p>Удалить аккаунт {authFullName(user)} ({user.login})? Вход под ним станет недоступен, а его данные (справки, обращения, уведомления) будут удалены.</p>
      <label className="register-field admin-filter-label" htmlFor={`delete-login-${user.login}`}>Введите логин для подтверждения</label>
      <input className="register-input" id={`delete-login-${user.login}`} value={deleteLogin} onChange={event => setDeleteLogin(event.target.value)} autoComplete="off" autoCapitalize="none" disabled={busy} />
      <button className="admin-service-secondary" disabled={busy || authNormalizeLogin(deleteLogin) !== authNormalizeLogin(user.login)} onClick={remove}>Удалить аккаунт</button>
      <button className="admin-service-secondary" disabled={busy} onClick={close}>Отмена</button>
    </div>}
    {error && <p className="register-error" role="alert">{error}</p>}{success && <p className="admin-service-success" role="status">{success}</p>}
  </article>;
}
