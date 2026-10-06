// Local history of completed admin operations. Never pass account/password objects here.
const ADMIN_AUDIT_KEY = "att_admin_audit_v1";
const ADMIN_AUDIT_TYPES = {account:"Аккаунты",news:"Публикации",certificate:"Справки",appeal:"Обращения",event:"События"};
let adminAuditWarning = "";
function adminAuditRead() {
  const raw = localStorage.getItem(ADMIN_AUDIT_KEY);
  const items = raw === null ? [] : JSON.parse(raw);
  if(!Array.isArray(items) || items.some(item => !item || !Object.hasOwn(ADMIN_AUDIT_TYPES,item.type) ||
      !["id","at","actor","action","target"].every(key => typeof item[key] === "string") || !Number.isFinite(Date.parse(item.at)))) throw new Error("Некорректный журнал");
  return items;
}
function adminAuditRecord(type,action,target) {
  try {
    if(!Object.hasOwn(ADMIN_AUDIT_TYPES,type) || typeof action !== "string" || typeof target !== "string") throw new Error("Некорректная запись");
    const item = {id:crypto.randomUUID(),at:new Date().toISOString(),actor:"admin",type,action:action.slice(0,120),target:target.slice(0,200)};
    localStorage.setItem(ADMIN_AUDIT_KEY,JSON.stringify([item,...adminAuditRead()].slice(0,200)));
    adminAuditWarning = "";
  } catch(error) {adminAuditWarning = "Действие выполнено, но запись в журнал не сохранена. Проверьте хранилище браузера.";}
  window.dispatchEvent(new Event("att-admin-audit"));
}
function adminAuditServices(before,after) {
  for(const [key,type,labelField] of [["announcements","news","title"],["certificates","certificate","type"],["appeals","appeal","subject"]]) {
    for(const item of after[key]) {
      const previous = before[key].find(old => old.id === item.id);
      if(previous && JSON.stringify(previous) === JSON.stringify(item)) continue;
      const action = key === "announcements" ? !previous ? "Объявление опубликовано" : previous.status !== item.status ? item.status === "archived" ? "Объявление снято с публикации" : "Объявление опубликовано снова" : "Объявление изменено"
        : key === "certificates" ? "Заявка на справку обновлена" : "Обращение обновлено";
      adminAuditRecord(type,action,String(item[labelField] || item.id));
    }
  }
}
function useAdminAudit() {
  const [items,setItems] = useState([]), [error,setError] = useState("");
  useEffect(() => {
    const reload = () => {try {setItems(adminAuditRead());setError(adminAuditWarning);} catch(error){setError("Не удалось прочитать журнал. Сохранённые записи не изменены.");}};
    const storage = event => {if(event.key === ADMIN_AUDIT_KEY || event.key === null) reload();};
    reload();window.addEventListener("att-admin-audit",reload);window.addEventListener("storage",storage);
    return () => {window.removeEventListener("att-admin-audit",reload);window.removeEventListener("storage",storage);};
  },[]);
  return {items,error};
}
function AdminAudit({onBack}) {
  const {items,error} = useAdminAudit();
  const [type,setType] = useState("all"), [query,setQuery] = useState("");
  const filtered = items.filter(item => (type === "all" || item.type === type) && `${item.action} ${item.target}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="screen active admin-screen" aria-label="Журнал действий"><style>{registerCSS+adminServiceCSS}</style>
    <header className="topbar"><button className="back-btn" onClick={onBack}>← Назад</button><span className="admin-page-title">Журнал действий</span></header>
    <main className="dash admin-body"><div className="greeting"><h1>Журнал действий</h1></div><p className="admin-subtitle">Последние 200 действий администратора в этом браузере. Записи появляются с момента подключения журнала.</p>
      <div className="register-card"><label className="register-field" htmlFor="admin-audit-query">Поиск действий</label><input id="admin-audit-query" className="register-input" type="search" value={query} onChange={event => setQuery(event.target.value)} />
      <label className="register-field admin-filter-label" htmlFor="admin-audit-type">Раздел</label><select className="register-input" id="admin-audit-type" value={type} onChange={event => setType(event.target.value)}><option value="all">Все разделы</option>{Object.entries(ADMIN_AUDIT_TYPES).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      {error && <p role="alert" className="register-error">{error}</p>}
      <div className="register-card"><ul className="register-users">{filtered.map(item => <li key={item.id}><span className="admin-service-badge">{ADMIN_AUDIT_TYPES[item.type]}</span><h2 className="admin-service-title">{item.action}</h2><p className="admin-service-message">{item.target}</p><p className="register-hint">{new Date(item.at).toLocaleString("ru-RU")} · {item.actor}</p></li>)}</ul>{!filtered.length && !error && <p className="register-empty">{items.length ? "Ничего не найдено" : "Действий пока нет. Здесь появятся новые изменения."}</p>}</div>
    </main></section>;
}
