// College overview uses existing news and the shared, read-only schedule cache.
const ADMIN_EVENTS_KEY = "att_admin_events_v1";
function adminPublicationFeed(announcements) {
  const academy = MOCK_ACADEMY_NEWS.map((item,index) => {
    const [day,month,year] = item.date.split('.');
    return {...item,id:`academy-${index}`,publishedAt:`${year}-${month}-${day}`,source:"Новости академии"};
  });
  return [...academy,...announcements.filter(item => item.status === "published").map(item =>
    ({...item,publishedAt:item.createdAt || item.updatedAt || "",source:"Объявление"}))]
    .sort((a,b) => b.publishedAt.localeCompare(a.publishedAt));
}
function adminEventsRead() {
  const raw = localStorage.getItem(ADMIN_EVENTS_KEY);
  const items = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(items) || items.some(item => !item || !["id","title","date","place","body"].every(key => typeof item[key] === "string") || !Number.isFinite(new Date(item.date).getTime()))) throw new Error("Некорректные события");
  return items;
}
function AdminCollege({page="overview",services,schedule,scheduleStatus,onOpen,onBack}) {
  const [events,setEvents] = useState([]);
  const [error,setError] = useState("");
  const [query,setQuery] = useState("");
  const [date,setDate] = useState(isoDate(new Date()));
  const [draft,setDraft] = useState({title:"",date:"",place:"",body:""});
  const [success,setSuccess] = useState("");
  useEffect(() => {
    const reload = () => {try {setEvents(adminEventsRead());setError("");} catch(e){setError("Не удалось прочитать события. Сохранённые данные не изменены.");}};
    reload();
    const listener = event => {if(event.key === ADMIN_EVENTS_KEY || event.key === null) reload();};
    window.addEventListener("storage",listener);
    return () => window.removeEventListener("storage",listener);
  },[]);
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
  const record = schedule?.days?.[date];
  const lessons = record?.lessons || [];
  const scheduleList = limit => <>
    <p className="register-hint">Группа {schedule?.group || "ДВ-41"} · {new Date(date+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"long",weekday:"long"})}</p>
    {scheduleStatus === "loading" ? <p className="register-hint">Загрузка расписания…</p> : scheduleStatus === "error" ? <p role="alert" className="register-error">Расписание временно недоступно</p> : !record ? <p className="register-hint">На эту дату расписание ещё не опубликовано.</p> : !lessons.length ? <p className="register-hint">На эту дату занятий нет.</p> : lessons.slice(0,limit).map((item,index) => <article className="admin-college-item" key={index}>
      <span className="admin-service-badge">{fmt(...item.start)}–{fmt(...item.end)}</span><h3>{item.subj}</h3><p className="register-hint">{[item.teacher,item.room && `Кабинет ${item.room}`].filter(Boolean).join(" · ")}</p>
    </article>)}
  </>;
  const submitEvent = event => {
    event.preventDefault();setSuccess("");
    if(!draft.title.trim() || !Number.isFinite(new Date(draft.date).getTime()) || new Date(draft.date).getTime() <= Date.now()) {setError("Укажите название и будущую дату события.");return;}
    try {
      const item = {...draft,title:draft.title.trim(),place:draft.place.trim(),body:draft.body.trim(),id:crypto.randomUUID()};
      const next = [...adminEventsRead(),item];
      localStorage.setItem(ADMIN_EVENTS_KEY,JSON.stringify(next));setEvents(next);setDraft({title:"",date:"",place:"",body:""});setError("");setSuccess("Событие добавлено.");
    } catch(e){setError("Событие не сохранено. Проверьте хранилище браузера.");}
  };
  const currentRecord = schedule?.days?.[isoDate(new Date())];
  const next = currentRecord ? getNextLesson(currentRecord.lessons || [],true) : null;
  const latest = feed[0], nearest = upcoming[0];
  const overview = <div className="admin-widget-grid">
    <button className="next-class admin-widget admin-widget-wide anim-fadeup" onClick={() => onOpen("schedule")} aria-label="Открыть расписание">
      <span className="next-class-label"><Icon name="clock" size={12} color={C.accentL}/>{next?.label || "РАСПИСАНИЕ"} · {schedule?.group || "ДВ-41"}</span>
      <span className="next-class-row"><span className="admin-widget-title">{scheduleStatus === "loading" ? "Загрузка…" : scheduleStatus === "error" ? "Расписание недоступно" : next?.subj || "Расписание ещё не опубликовано"}</span><span className="next-class-time">{next?.timeStr || "→"}</span></span>
      <span className="admin-widget-meta">{next?.room || "Занятия на сегодня и выбор даты"}</span>
    </button>
    <button className="section-card admin-widget anim-fadeup" onClick={() => onOpen("publications")} aria-label="Открыть новости и объявления"><span className="section-head"><Icon name="megaphone" size={13} color={C.accentL}/> ПОСЛЕДНЯЯ НОВОСТЬ</span><span className="admin-widget-title admin-widget-clamp">{latest?.title || "Публикаций пока нет"}</span><span className="admin-widget-meta">{latest?.date || (latest?.publishedAt ? new Date(latest.publishedAt).toLocaleDateString("ru-RU") : "Все публикации")} →</span></button>
    <button className="section-card admin-widget anim-fadeup" onClick={() => onOpen("events")} aria-label="Открыть ближайшие события"><span className="section-head"><Icon name="calendar" size={13} color={C.amber}/> СОБЫТИЯ</span><span className="admin-widget-title admin-widget-clamp">{error ? "Не удалось загрузить" : nearest?.title || "Пока нет событий"}</span><span className="admin-widget-meta">{nearest ? new Date(nearest.date).toLocaleDateString("ru-RU",{day:"numeric",month:"short"}) : "Открыть календарь"} →</span></button>
  </div>;
  if(page === "overview") return <><style>{adminCollegeCSS}</style>{overview}</>;
  const title = {publications:"Новости и объявления",schedule:"Расписание",events:"Ближайшие события"}[page];
  return <section className="screen active admin-screen" aria-label={title}><style>{registerCSS+adminServiceCSS+adminCollegeCSS}</style><header className="topbar"><button className="back-btn" onClick={onBack}>← Назад</button><span className="admin-page-title">{title}</span></header><main className="dash admin-body"><div className="greeting"><h1>{title}</h1></div>
    {page === "publications" ? <><p className="admin-subtitle">Последние публикации из списка академии и локальные объявления. Статьи академии открываются на её сайте.</p><label className="register-field" htmlFor="admin-publication-search">Поиск публикаций</label><input className="register-input" id="admin-publication-search" type="search" value={query} onChange={event => setQuery(event.target.value)} /><section className="register-card">{newsList(feed.filter(item => `${item.title} ${item.body || ""}`.toLowerCase().includes(query.toLowerCase())))}{!feed.some(item => `${item.title} ${item.body || ""}`.toLowerCase().includes(query.toLowerCase())) && <p className="register-hint">Ничего не найдено</p>}</section><button className="register-submit" onClick={() => onOpen("news")}>Управлять объявлениями</button></> : page === "schedule" ? <><p className="admin-subtitle">В приложении подключено расписание только группы {schedule?.group || "ДВ-41"}.</p><label className="register-field" htmlFor="admin-schedule-date">Дата занятий</label><input className="register-input" id="admin-schedule-date" type="date" value={date} onInput={event => {if(event.target.value) setDate(event.target.value);}} onChange={event => {if(event.target.value) setDate(event.target.value);}}/><section className="register-card">{scheduleList(Infinity)}</section></> : <>
      <p className="admin-subtitle">События сохраняются локально в этом браузере.</p><form className="register-card" onSubmit={submitEvent}><h2 className="admin-service-title">Новое событие</h2>{[["title","Название","text"],["date","Дата и время","datetime-local"],["place","Место","text"]].map(([key,label,type]) => <div className="register-field" key={key}><label htmlFor={`admin-event-${key}`}>{label}</label><input className="register-input" id={`admin-event-${key}`} type={type} required={key !== "place"} maxLength={120} value={draft[key]} onInput={event => setDraft(previous => ({...previous,[key]:event.target.value}))} onChange={event => setDraft(previous => ({...previous,[key]:event.target.value}))}/></div>)}<label className="register-field" htmlFor="admin-event-body">Описание</label><textarea className="register-input admin-service-textarea" id="admin-event-body" maxLength={2000} value={draft.body} onChange={event => setDraft({...draft,body:event.target.value})}/>{error && <p className="register-error" role="alert">{error}</p>}{success && <p role="status" className="admin-service-success">{success}</p>}<button className="register-submit">Добавить событие</button></form><section className="register-card">{eventList(upcoming)}{!upcoming.length && <p className="register-hint">Предстоящих событий пока нет</p>}</section>
    </>}{services.error && <p className="register-error" role="alert">{services.error}</p>}</main></section>;
}
const adminCollegeCSS = `
 .admin-widget-grid {display:grid;grid-template-columns:1fr 1fr;gap:12px;}
 .admin-widget {min-width:0;color:inherit;font:inherit;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:8px;padding:15px;margin:0;border:1px solid ${C.border};}
 .admin-widget-wide {grid-column:1/-1;}
 .admin-widget .section-head {font-size:9px;margin:0;}
 .admin-widget .next-class-label {margin:0;}
 .admin-widget-title {font-size:14px;font-weight:600;line-height:1.5;}
 .admin-widget-clamp {display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
 .admin-widget-meta {font-size:11px;color:${C.sub};margin-top:auto;}
 .admin-widget .next-class-row {gap:10px;width:100%;}
 .admin-widget .next-class-time {font-size:12px;flex-shrink:0;}
 .admin-college-item {padding:14px 0;border-bottom:1px solid ${C.border};overflow-wrap:anywhere;}
 .admin-college-item:last-child {border-bottom:0;}
 .admin-college-item h3,.admin-college-item summary {font-size:14px;line-height:1.6;margin-top:6px;}
 .admin-college-item summary {cursor:pointer;}
 .admin-college-link {display:block;color:${C.text};font-size:14px;line-height:1.6;margin-top:6px;text-decoration:none;}
 .admin-college-link:hover {color:${C.accentL};}
 .admin-college-grid .admin-service-secondary {margin-top:12px;width:100%;}
`;
