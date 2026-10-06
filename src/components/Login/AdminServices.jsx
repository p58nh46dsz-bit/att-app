// Admin workflow screens: announcements, certificate requests, appeals. Data lives on the server
// (GET /admin/services); every change is sent with services.act() and the list is reloaded.
const ADMIN_CERT_STATUSES = {new:"Получена",processing:"В работе",ready:"Готова"};
const ADMIN_APPEAL_STATUSES = {new:"Новое",working:"В работе",resolved:"Решено"};

function adminServiceCounts(data) {
  return {certificates:data.certificates.filter(item => item.status !== "ready").length,
    appeals:data.appeals.filter(item => item.status !== "resolved").length,
    news:data.announcements.filter(item => item.status === "published").length};
}
// Tells the journal widgets to reload after any admin change.
const adminAuditChanged = () => window.dispatchEvent(new Event("att-admin-audit"));

function useAdminServices() {
  const [data,setData] = useState({announcements:[],certificates:[],appeals:[],events:[]});
  const [error,setError] = useState("");
  const load = async () => {
    const r = await apiAuthed("/admin/services");
    if (r.status === 200) { setData(r.data); setError(""); return true; }
    setError("Не удалось загрузить данные. Проверьте подключение к серверу.");
    return false;
  };
  useEffect(() => { load(); }, []);
  // Sends one change, then reloads the lists. Resolves {ok, error?}.
  const act = async (path,method,body) => {
    const r = await apiAuthed(path,{method,body});
    if (r.status >= 200 && r.status < 300) { await load(); adminAuditChanged(); return {ok:true,data:r.data}; }
    return {ok:false,error:(r.data && r.data.error) || "Не удалось сохранить. Проверьте подключение к серверу."};
  };
  return {data,error,load,act};
}

function AdminServices({page,services,onBack}) {
  const titles = {news:"Новости и объявления",certificates:"Заявки на справки",appeals:"Обращения"};
  return <section className="screen active admin-screen" aria-label={titles[page]}>
    <style>{registerCSS + adminServiceCSS}</style>
    <header className="topbar"><button className="back-btn" onClick={onBack}>← Назад</button><span className="admin-page-title">{titles[page]}</span></header>
    <main className="dash admin-body">
      <div className="greeting"><h1>{titles[page]}</h1></div>
      <p className="admin-subtitle">{page === "news" ? "Опубликованное объявление приходит пользователям в уведомления." : "Заявки и обращения пользователей. Статусы, комментарии и ответы сразу видны пользователю."}</p>
      {services.error && <p className="register-error" role="alert">{services.error}</p>}
      {page === "news" ? <AdminAnnouncements services={services} /> : page === "certificates" ? <AdminCertificates services={services} /> : <AdminAppeals services={services} />}
    </main>
  </section>;
}

function AdminAnnouncements({services}) {
  const empty = {title:"",body:"",audience:"all",group:"",pinned:false};
  const [draft,setDraft] = useState(empty);
  const [editing,setEditing] = useState(null);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");
  const [showArchived,setShowArchived] = useState(false);
  const [busy,setBusy] = useState(false);
  const update = (key,value) => {setDraft(previous => ({...previous,[key]:value}));setError("");setSuccess("");};
  const submit = async event => {
    event.preventDefault();setSuccess("");
    const title = draft.title.trim(), body = draft.body.trim(), group = draft.audience === "group" ? draft.group.trim().toUpperCase() : "";
    if(!title || !body || (draft.audience === "group" && !group)){setError("Заполните заголовок, текст и группу, если выбрана аудитория по группе.");return;}
    setBusy(true);
    const r = await services.act(editing ? `/admin/announcements/${editing}` : "/admin/announcements",editing ? "PATCH" : "POST",
      {title,body,audience:draft.audience,group,pinned:draft.pinned,status:"published"});
    setBusy(false);
    if(r.ok){setDraft(empty);setEditing(null);setError("");setSuccess("Объявление сохранено и отправлено пользователям.");}
    else setError(r.error);
  };
  const audienceLabel = item => ({all:"Все пользователи",student:"Студенты",teacher:"Преподаватели",group:`Группа ${item.group}`})[item.audience];
  const items = services.data.announcements.filter(item => showArchived || item.status === "published").slice().sort((a,b) => Number(b.pinned)-Number(a.pinned) || String(b.createdAt).localeCompare(String(a.createdAt)));
  return <>
    <form className="register-card" onSubmit={submit} noValidate>
      <h2 className="admin-service-title">{editing ? "Редактирование объявления" : "Новое объявление"}</h2>
      <label className="register-field" htmlFor="admin-news-title">Заголовок</label>
      <input className="register-input" id="admin-news-title" value={draft.title} onChange={event => update("title",event.target.value)} maxLength={120} required />
      <label className="register-field admin-filter-label" htmlFor="admin-news-body">Текст</label>
      <textarea className="register-input admin-service-textarea" id="admin-news-body" value={draft.body} onChange={event => update("body",event.target.value)} maxLength={4000} required />
      <label className="register-field admin-filter-label" htmlFor="admin-news-audience">Аудитория</label>
      <select className="register-input" id="admin-news-audience" value={draft.audience} onChange={event => update("audience",event.target.value)}>
        <option value="all">Все пользователи</option><option value="student">Студенты</option><option value="teacher">Преподаватели</option><option value="group">Конкретная группа</option>
      </select>
      {draft.audience === "group" && <><label className="register-field admin-filter-label" htmlFor="admin-news-group">Группа</label><input className="register-input" id="admin-news-group" value={draft.group} onChange={event => update("group",event.target.value)} maxLength={40} /></>}
      <label className="admin-service-check"><input type="checkbox" checked={draft.pinned} onChange={event => update("pinned",event.target.checked)} />Закрепить объявление</label>
      {error && <p className="register-error" role="alert">{error}</p>}{success && <p className="admin-service-success" role="status">{success}</p>}
      <button className="register-submit" type="submit" disabled={busy}>{editing ? "Сохранить объявление" : "Опубликовать"}</button>
      {editing && <button className="admin-service-secondary" type="button" onClick={() => {setDraft(empty);setEditing(null);setError("");}}>Отменить редактирование</button>}
    </form>
    <label className="admin-service-check"><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} />Показать снятые с публикации</label>
    {items.map(item => <article className="register-card" aria-label={`Объявление ${item.title}`} key={item.id}>
      <span className="admin-service-badge">{item.status === "archived" ? "Снято с публикации" : item.pinned ? "Закреплено" : "Опубликовано"}</span>
      <h2 className="admin-service-title">{item.title}</h2><p className="admin-service-message">{item.body}</p><p className="register-hint">{audienceLabel(item)}</p>
      <div className="admin-service-buttons"><button className="admin-service-secondary" onClick={() => {setEditing(item.id);setDraft({title:item.title,body:item.body,audience:item.audience,group:item.group,pinned:item.pinned});setSuccess("");}}>Редактировать</button>
        <button className="admin-service-secondary" onClick={() => services.act(`/admin/announcements/${item.id}`,"PATCH",{status:item.status === "published" ? "archived" : "published"})}>{item.status === "published" ? "Снять с публикации" : "Опубликовать снова"}</button></div>
    </article>)}
    {!items.length && <p className="register-empty">Объявлений пока нет</p>}
  </>;
}

function AdminCertificates({services}) {
  const [filter,setFilter] = useState("pending");
  const [notes,setNotes] = useState({});
  const [saved,setSaved] = useState("");
  const items = services.data.certificates.filter(item => filter === "all" || (filter === "pending" ? item.status !== "ready" : item.status === filter));
  return <>
    <label className="register-field" htmlFor="admin-certificate-filter">Статус заявки</label>
    <select className="register-input" id="admin-certificate-filter" value={filter} onChange={event => setFilter(event.target.value)}><option value="pending">Ожидают обработки</option><option value="all">Все заявки</option>{Object.entries(ADMIN_CERT_STATUSES).map(([value,title]) => <option key={value} value={value}>{title}</option>)}</select>
    {saved && <p className="admin-service-success" role="status">{saved}</p>}
    {items.map(item => <article key={item.id} className="register-card" aria-label={`Заявка ${item.name}`}>
      <span className="admin-service-badge">{ADMIN_CERT_STATUSES[item.status]}</span><h2 className="admin-service-title">{item.type}</h2>
      <p className="admin-service-message">{item.name} · {item.group}</p><p className="register-hint">{item.purpose}</p>
      <label className="register-field admin-filter-label" htmlFor={`status-${item.id}`}>Статус</label>
      <select className="register-input" id={`status-${item.id}`} value={item.status} onChange={async event => {
        setSaved("");
        const r = await services.act(`/admin/certificates/${item.id}`,"PATCH",{status:event.target.value});
        setSaved(r.ok ? "Статус заявки сохранён." : r.error);
      }}>{Object.entries(ADMIN_CERT_STATUSES).map(([value,title]) => <option key={value} value={value}>{title}</option>)}</select>
      <label className="register-field admin-filter-label" htmlFor={`note-${item.id}`}>Комментарий для студента</label>
      <textarea className="register-input admin-service-textarea" id={`note-${item.id}`} value={notes[item.id] ?? item.note} onChange={event => setNotes(previous => ({...previous,[item.id]:event.target.value}))} maxLength={1000} />
      <button className="admin-service-secondary" onClick={async () => {
        setSaved("");
        const r = await services.act(`/admin/certificates/${item.id}`,"PATCH",{note:(notes[item.id] ?? item.note).trim()});
        setSaved(r.ok ? "Комментарий сохранён, студент его увидит." : r.error);
      }}>Сохранить комментарий</button>
    </article>)}
    {!items.length && <p className="register-empty">Заявок с выбранным статусом нет</p>}
  </>;
}

function AdminAppeals({services}) {
  const [filter,setFilter] = useState("pending");
  const [replies,setReplies] = useState({});
  const [error,setError] = useState("");
  const [saved,setSaved] = useState("");
  const items = services.data.appeals.filter(item => filter === "all" || (filter === "pending" ? item.status !== "resolved" : item.status === filter));
  const reply = async (item,resolve) => {
    setSaved("");setError("");const text = (replies[item.id] ?? item.reply).trim();
    if(!text){setError("Напишите ответ перед сохранением или закрытием обращения.");return;}
    const r = await services.act(`/admin/appeals/${item.id}`,"PATCH",{reply:text,status:resolve ? "resolved" : item.status === "resolved" ? "resolved" : "working"});
    if(r.ok) setSaved(resolve ? "Обращение отмечено решённым." : "Ответ сохранён и отправлен пользователю."); else setError(r.error);
  };
  return <>
    <label className="register-field" htmlFor="admin-appeal-filter">Статус обращения</label>
    <select className="register-input" id="admin-appeal-filter" value={filter} onChange={event => setFilter(event.target.value)}><option value="pending">Открытые обращения</option><option value="all">Все обращения</option>{Object.entries(ADMIN_APPEAL_STATUSES).map(([value,title]) => <option key={value} value={value}>{title}</option>)}</select>
    {error && <p className="register-error" role="alert">{error}</p>}{saved && <p className="admin-service-success" role="status">{saved}</p>}
    {items.map(item => <article className="register-card" key={item.id} aria-label={`Обращение ${item.subject}`}>
      <span className="admin-service-badge">{ADMIN_APPEAL_STATUSES[item.status]}</span><h2 className="admin-service-title">{item.subject}</h2>
      <p className="register-hint">{item.name} · {item.group}</p><p className="admin-service-message">{item.message}</p>
      <label className="register-field admin-filter-label" htmlFor={`reply-${item.id}`}>Ответ пользователю</label>
      <textarea className="register-input admin-service-textarea" id={`reply-${item.id}`} value={replies[item.id] ?? item.reply} onChange={event => {setReplies(previous => ({...previous,[item.id]:event.target.value}));setError("");}} maxLength={2000} />
      <div className="admin-service-buttons"><button className="admin-service-secondary" onClick={() => reply(item,false)}>Сохранить ответ</button>
        {item.status !== "resolved" ? <button className="admin-service-secondary" onClick={() => reply(item,true)}>Отметить решённым</button> : <button className="admin-service-secondary" onClick={() => services.act(`/admin/appeals/${item.id}`,"PATCH",{status:"working"})}>Вернуть в работу</button>}</div>
    </article>)}
    {!items.length && <p className="register-empty">Обращений с выбранным статусом нет</p>}
  </>;
}

const adminServiceCSS = `
  .admin-service-queue { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
  .admin-service-queue button { background:${C.surface}; border:1px solid ${C.border}; border-radius:12px; padding:12px 4px; color:${C.text}; font:inherit; cursor:pointer; }
  .admin-service-queue strong { display:block; font-size:26px; margin-bottom:6px; }
  .admin-service-queue span { font-size:11px; color:${C.sub}; }
  .admin-service-title { font-size:16px; margin:10px 0; overflow-wrap:anywhere; }
  .admin-service-textarea { min-height:100px; resize:vertical; line-height:1.5; }
  .admin-service-check { display:flex; align-items:center; gap:10px; font-size:13px; line-height:1.5; padding:14px 0; }
  .admin-service-check input { width:18px; height:18px; flex-shrink:0; accent-color:${C.accent}; }
  .admin-service-message { white-space:pre-wrap; overflow-wrap:anywhere; font-size:14px; line-height:1.6; margin:10px 0; }
  .admin-service-badge { display:inline-block; background:#4A8FE722; color:${C.accentL}; border-radius:20px; padding:5px 10px; font-size:11px; }
  .admin-service-buttons { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
  .admin-service-secondary { background:${C.surface}; color:${C.text}; border:1px solid ${C.border}; border-radius:12px; min-height:44px; padding:10px 12px; cursor:pointer; font:inherit; font-size:12px; margin-top:10px; }
  .admin-service-buttons .admin-service-secondary { flex:1; margin-top:0; }
  .admin-service-success { color:#8ee8a6; font-size:13px; line-height:1.5; padding:12px; background:#4CAF6B18; border:1px solid #4CAF6B55; border-radius:12px; }
`;
