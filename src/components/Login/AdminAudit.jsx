// The journal of administrator actions. The server writes every entry itself (never with passwords);
// this screen only reads the latest 200 (GET /admin/audit) and reloads when an admin action finishes.
const ADMIN_AUDIT_TYPES = {account:"Аккаунты",news:"Публикации",certificate:"Справки",appeal:"Обращения",event:"События"};
function useAdminAudit() {
  const [items,setItems] = useState([]), [error,setError] = useState("");
  useEffect(() => {
    let alive = true;
    const reload = async () => {
      const r = await apiAuthed("/admin/audit");
      if (!alive) return;
      if (r.status === 200) { setItems(r.data); setError(""); } else setError("Не удалось загрузить журнал. Проверьте подключение к серверу.");
    };
    reload(); window.addEventListener("att-admin-audit",reload);
    return () => { alive = false; window.removeEventListener("att-admin-audit",reload); };
  },[]);
  return {items,error};
}
function AdminAudit({onBack}) {
  const {items,error} = useAdminAudit();
  const [type,setType] = useState("all"), [query,setQuery] = useState("");
  const filtered = items.filter(item => (type === "all" || item.type === type) && `${item.action} ${item.target}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="screen active admin-screen" aria-label="Журнал действий"><style>{registerCSS+adminServiceCSS}</style>
    <header className="topbar"><button className="back-btn" onClick={onBack}>← Назад</button><span className="admin-page-title">Журнал действий</span></header>
    <main className="dash admin-body"><div className="greeting"><h1>Журнал действий</h1></div><p className="admin-subtitle">Последние 200 действий администратора. Пароли в журнал не попадают.</p>
      <div className="register-card"><label className="register-field" htmlFor="admin-audit-query">Поиск действий</label><input id="admin-audit-query" className="register-input" type="search" value={query} onChange={event => setQuery(event.target.value)} />
      <label className="register-field admin-filter-label" htmlFor="admin-audit-type">Раздел</label><select className="register-input" id="admin-audit-type" value={type} onChange={event => setType(event.target.value)}><option value="all">Все разделы</option>{Object.entries(ADMIN_AUDIT_TYPES).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      {error && <p role="alert" className="register-error">{error}</p>}
      <div className="register-card"><ul className="register-users">{filtered.map(item => <li key={item.id}><span className="admin-service-badge">{ADMIN_AUDIT_TYPES[item.type]}</span><h2 className="admin-service-title">{item.action}</h2><p className="admin-service-message">{item.target}</p><p className="register-hint">{new Date(item.at).toLocaleString("ru-RU")} · {item.actor}</p></li>)}</ul>{!filtered.length && !error && <p className="register-empty">{items.length ? "Ничего не найдено" : "Действий пока нет. Здесь появятся новые изменения."}</p>}</div>
    </main></section>;
}
