// College overview for the administrator: academy news + announcements and upcoming events (server).
function adminPublicationFeed(announcements) {
  const academy = CONTENT.news.map((item,index) => {
    const [day,month,year] = item.date.split('.');
    return {...item,id:`academy-${index}`,publishedAt:`${year}-${month}-${day}`,source:"Новости академии"};
  });
  return [...academy,...announcements.filter(item => item.status === "published").map(item =>
    ({...item,publishedAt:item.createdAt || item.updatedAt || "",source:"Объявление"}))]
    .sort((a,b) => b.publishedAt.localeCompare(a.publishedAt));
}
function AdminCollege({page="overview",services,onOpen,onBack}) {
  const events = services.data.events;
  const [error,setError] = useState("");
  const [query,setQuery] = useState("");
  const [draft,setDraft] = useState({title:"",date:"",place:"",body:""});
  const [success,setSuccess] = useState("");
  const feed = adminPublicationFeed(services.data.announcements);
  const upcoming = events.filter(item => new Date(item.date).getTime() >= Date.now()).sort((a,b) => a.date.localeCompare(b.date));
  const dateLabel = value => new Date(value).toLocaleString("ru-RU",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});
  const newsList = items => items.map(item => <article className="admin-college-item" key={item.id}>
    <span className="register-hint">{item.source} · {item.date || (item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("ru-RU") : "Дата не указана")}</span>
    {item.href ? <a className="admin-college-link" href={item.href} target="_blank" rel="noopener noreferrer">{item.title} ↗</a> : <details><summary>{item.title}</summary><p className="admin-service-message">{item.body}</p><p className="register-hint">{({all:"Все пользователи",student:"Студенты",teacher:"Преподаватели",group:`Группа ${item.group}`})[item.audience]}</p></details>}
  </article>);
  const eventList = items => items.map(item => <article className="admin-college-item" key={item.id}>
    <span className="admin-service-badge">{dateLabel(item.date)}</span><h3>{item.title}</h3>
    {item.place && <p className="register-hint">{item.place}</p>}{item.body && <p className="admin-service-message">{item.body}</p>}
  </article>);
  const submitEvent = async event => {
    event.preventDefault();setSuccess("");
    if(!draft.title.trim() || !Number.isFinite(new Date(draft.date).getTime()) || new Date(draft.date).getTime() <= Date.now()) {setError("Укажите название и будущую дату события.");return;}
    const r = await services.act("/admin/events","POST",{...draft,date:new Date(draft.date).toISOString()});
    if(r.ok){setDraft({title:"",date:"",place:"",body:""});setError("");setSuccess("Событие добавлено.");} else setError(r.error);
  };
  const latest = feed[0], nearest = upcoming[0];
  const overview = <div className="admin-widget-grid">
    <button className="section-card admin-widget admin-news-widget anim-fadeup" onClick={() => onOpen("publications")} aria-label="Открыть новости и объявления"><span className="section-head"><Icon name="megaphone" size={13} color={C.accentL}/> ПОСЛЕДНЯЯ НОВОСТЬ</span><span className="admin-widget-title admin-widget-clamp">{latest?.title || "Публикаций пока нет"}</span><span className="admin-widget-meta">{latest?.date || (latest?.publishedAt ? new Date(latest.publishedAt).toLocaleDateString("ru-RU") : "Все публикации")} →</span></button>
    <button className="section-card admin-widget admin-event-widget anim-fadeup" onClick={() => onOpen("events")} aria-label="Открыть ближайшие события"><span className="section-head"><Icon name="calendar" size={13} color={C.amber}/> СОБЫТИЯ</span><span className="admin-widget-title admin-widget-clamp">{services.error ? "Не удалось загрузить" : nearest?.title || "Пока нет событий"}</span><span className="admin-widget-meta">{nearest ? new Date(nearest.date).toLocaleDateString("ru-RU",{day:"numeric",month:"short"}) : "Открыть календарь"} →</span></button>
  </div>;
  if(page === "overview") return <><style>{adminCollegeCSS}</style>{overview}</>;
  const title = {publications:"Новости и объявления",events:"Ближайшие события"}[page];
  return <section className="screen active admin-screen" aria-label={title}><style>{registerCSS+adminServiceCSS+adminCollegeCSS}</style><header className="topbar"><button className="back-btn" onClick={onBack}>← Назад</button><span className="admin-page-title">{title}</span></header><main className="dash admin-body"><div className="greeting"><h1>{title}</h1></div>
    {page === "publications" ? <><p className="admin-subtitle">Последние публикации из списка академии и объявления администратора. Статьи академии открываются на её сайте.</p><label className="register-field" htmlFor="admin-publication-search">Поиск публикаций</label><input className="register-input" id="admin-publication-search" type="search" value={query} onChange={event => setQuery(event.target.value)} /><section className="register-card">{newsList(feed.filter(item => `${item.title} ${item.body || ""}`.toLowerCase().includes(query.toLowerCase())))}{!feed.some(item => `${item.title} ${item.body || ""}`.toLowerCase().includes(query.toLowerCase())) && <p className="register-hint">Ничего не найдено</p>}</section><button className="register-submit" onClick={() => onOpen("news")}>Управлять объявлениями</button></> : <>
      <p className="admin-subtitle">События сохраняются на сервере.</p><form className="register-card" onSubmit={submitEvent}><h2 className="admin-service-title">Новое событие</h2>{[["title","Название","text"],["date","Дата и время","datetime-local"],["place","Место","text"]].map(([key,label,type]) => <div className="register-field" key={key}><label htmlFor={`admin-event-${key}`}>{label}</label><input className="register-input" id={`admin-event-${key}`} type={type} required={key !== "place"} maxLength={120} value={draft[key]} onInput={event => setDraft(previous => ({...previous,[key]:event.target.value}))} onChange={event => setDraft(previous => ({...previous,[key]:event.target.value}))}/></div>)}<label className="register-field" htmlFor="admin-event-body">Описание</label><textarea className="register-input admin-service-textarea" id="admin-event-body" maxLength={2000} value={draft.body} onChange={event => setDraft({...draft,body:event.target.value})}/>{error && <p className="register-error" role="alert">{error}</p>}{success && <p role="status" className="admin-service-success">{success}</p>}<button className="register-submit">Добавить событие</button></form><section className="register-card">{eventList(upcoming)}{!upcoming.length && <p className="register-hint">Предстоящих событий пока нет</p>}</section>
    </>}{services.error && <p className="register-error" role="alert">{services.error}</p>}</main></section>;
}
const adminCollegeCSS = `
 .admin-widget-grid {display:grid;grid-template-columns:3fr 2fr;gap:16px;}
 .admin-widget {min-width:0;color:inherit;font:inherit;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:8px;padding:16px;margin:0;border:1px solid ${C.border};}
 .admin-widget-wide {grid-column:1/-1;}
 .admin-widget .section-head {font-size:11px;margin:0;}
 .admin-widget .next-class-label {margin:0;}
 .admin-widget-title {font-size:14px;font-weight:600;line-height:1.5;}
 .admin-widget-clamp {display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
 .admin-widget-meta {font-size:12px;color:${C.sub};margin-top:auto;}
 .admin-widget .next-class-row {gap:10px;width:100%;}
 .admin-widget .next-class-time {font-size:15px;flex-shrink:0;}
 .admin-widget-wide .admin-widget-title {font-size:17px;}
 .admin-news-widget .admin-widget-clamp {display:block;overflow:visible;}
 @media(max-width:699px) {.admin-widget-grid {grid-template-columns:1fr;gap:12px;}.admin-widget-wide {grid-column:auto;}.admin-event-widget {gap:4px;}.admin-widget .section-head {font-size:10px;}}
 .admin-college-item {padding:14px 0;border-bottom:1px solid ${C.border};overflow-wrap:anywhere;}
 .admin-college-item:last-child {border-bottom:0;}
 .admin-college-item h3,.admin-college-item summary {font-size:14px;line-height:1.6;margin-top:6px;}
 .admin-college-item summary {cursor:pointer;}
 .admin-college-link {display:block;color:${C.text};font-size:14px;line-height:1.6;margin-top:6px;text-decoration:none;}
 .admin-college-link:hover {color:${C.accentL};}
 .admin-college-grid .admin-service-secondary {margin-top:12px;width:100%;}
`;
