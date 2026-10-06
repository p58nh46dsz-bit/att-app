function AdminMenu({onClose,onOpen,onLogout,usersCount}) {
  const menu = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    menu.current.querySelector("button").focus();
    const keys = event => {
      if(event.key === "Escape") {event.preventDefault();onClose();}
      if(event.key !== "Tab") return;
      const buttons = [...menu.current.querySelectorAll("button")];
      const first = buttons[0], last = buttons[buttons.length-1];
      if(event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
    };
    document.addEventListener("keydown",keys);
    return () => {document.removeEventListener("keydown",keys);previous?.focus();};
  },[]);
  const groups = [
    [{page:"users",icon:"users",title:"Пользователи"},{page:"create",icon:"users",title:"Создать учётную запись"}],
    [{page:"publications",icon:"megaphone",title:"Новости и объявления"},{page:"news",icon:"file-text",title:"Управлять объявлениями"},{page:"schedule",icon:"calendar",title:"Расписание"},{page:"events",icon:"calendar",title:"События"}],
    [{page:"certificates",icon:"file-text",title:"Заявки на справки"},{page:"appeals",icon:"message-circle",title:"Обращения"}],
  ];
  return <><div className="lk-overlay open admin-menu-overlay" onClick={onClose} aria-hidden="true"/>
    <aside ref={menu} className="lk-sheet open admin-menu" role="dialog" aria-modal="true" aria-label="Меню администратора">
      <div className="admin-menu-top"><span>Личный кабинет</span><button className="back-btn" aria-label="Закрыть меню" onClick={onClose}>×</button></div>
      <div className="lk-header"><div className="lk-avatar-big">А</div><div><div className="lk-name">Администратор</div><div className="lk-meta">Логин: admin · {usersCount} пользователей</div></div></div>
      <div className="lk-body">{groups.map((items,index) => <div className="lk-group" key={index}>{items.map(item => <button className="lk-row admin-menu-row" key={item.page} onClick={() => onOpen(item.page)}><span className="lk-row-icon" style={{background:"#0f2548"}}><Icon name={item.icon} size={17} color={C.accentL}/></span><span className="lk-row-title">{item.title}</span><span className="lk-menu-arrow">›</span></button>)}</div>)}
        <button className="lk-logout admin-menu-row" onClick={onLogout}>Выйти</button><p className="register-hint">Локальный кабинет · АТТ Академия</p>
      </div>
    </aside></>;
}
const adminMenuCSS = `
 .admin-menu-overlay {z-index:1000;}
 .admin-menu.lk-sheet {z-index:1001;top:0;bottom:0;left:auto;right:0;width:340px;max-width:calc(100% - 24px);height:100%;max-height:100%;border-radius:20px 0 0 20px;transform:none;}
 .admin-menu-top {display:flex;align-items:center;justify-content:space-between;padding:16px 20px;color:${C.sub};font-size:12px;}
 .admin-menu-top button {font-size:24px;min-width:40px;min-height:40px;}
 .admin-menu .lk-header {padding-top:0;}
 .admin-menu-row {width:100%;font:inherit;text-align:left;color:${C.text};background:none;border:0;cursor:pointer;}
 .admin-menu .lk-row-title {font-size:13px;}
 .admin-home {gap:14px;padding-top:18px;}
 .admin-home .greeting h1 {font-size:22px;}
 .admin-home .admin-subtitle {margin-top:4px;font-size:12px;}
 .admin-home-stats {display:grid;grid-template-columns:1fr 1fr;gap:12px;}
 .admin-home-stats .stat-card {padding:14px;}
 .admin-home-stats .stat-val {font-size:26px;}
 .admin-home-note {font-size:11px;color:${C.sub};}
`;
