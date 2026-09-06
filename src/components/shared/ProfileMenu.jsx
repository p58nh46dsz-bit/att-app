// LKSheet (student profile sheet), TeacherLKSheet (teacher profile sheet), LKAboutApp ("about the app", shared by both).
function LKSheet({ open, onClose, onLogout, setLkInner, unreadCount, realLessons }) {
  const todayCount = (realLessons || []).length;
  const mainItems = [
    {key:"schedule",  icon:"calendar",       bg:"#0f2548", color:"#4A8FE7", title:"Расписание"},
    {key:"grades",    icon:"bar-chart-3",    bg:"#0f2a1e", color:"#5ec97a", title:"Успеваемость"},
    {key:"portfolio", icon:"trophy",         bg:"#2a1e40", color:"#F5A623", title:"Портфолио"},
    {key:"consult",   icon:"message-circle", bg:"#0f2548", color:"#4A8FE7", title:"Консультации"},
    {key:"spravki",   icon:"file-text",      bg:"#2a1e00", color:"#F5A623", title:"Справки"},
  ];
  const otherItems = [
    {key:"notifications", icon:"bell",        bg:"#0f2548", color:"#4A8FE7", title:"Уведомления", badge: unreadCount>0 ? String(unreadCount) : null},
    {key:"curriculum", icon:"clipboard-list", bg:"#0f2040", color:"#4A8FE7", title:"Учебный план"},
    {key:"faculty",    icon:"graduation-cap", bg:"#201a30", color:"#4A8FE7", title:"Факультативы"},
    {key:"teachers",   icon:"users",          bg:"#20163a", color:"#b78af0", title:"Преподаватели"},
    {key:"about-app",  icon:"help-circle",    bg:"#0f2548", color:"#4A8FE7", title:"Помощь"},
  ];
  const go = key => { onClose(); setLkInner(key); };
  return (
    <>
      <div className={`lk-overlay${open?" open":""}`} onClick={onClose} />
      <div className={`lk-sheet${open?" open":""}`}>
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big">ДВ</div>
          <div>
            <div className="lk-name">Даниил В.</div>
            <div className="lk-meta">Студент · Группа: ДВ-41</div>
          </div>
        </div>
        <div className="lk-body" style={{gap:14}}>
          <div className="lk-stats-row">
            <div className="lk-stat" onClick={()=>go("grades")}>
              <Icon name="graduation-cap" size={17} color="#4A8FE7" />
              <div className="lk-stat-label">Средний балл</div>
              <div className="lk-stat-val" style={{color:"#4A8FE7"}}>4.6</div>
            </div>
            <div className="lk-stat" onClick={()=>go("grades")}>
              <Icon name="book-open" size={17} color="#4A8FE7" />
              <div className="lk-stat-label">Долги</div>
              <div className="lk-stat-val" style={{color:"#5ec97a"}}>1</div>
            </div>
            <div className="lk-stat" onClick={()=>go("schedule")}>
              <Icon name="calendar" size={17} color="#4A8FE7" />
              <div className="lk-stat-label">Занятия</div>
              <div className="lk-stat-val">{todayCount}</div>
            </div>
          </div>
          <div className="lk-group">
            {mainItems.map(it=>(
              <div key={it.key} className="lk-row" onClick={()=>go(it.key)}>
                <div className="lk-row-icon" style={{background:it.bg}}><Icon name={it.icon} size={17} color={it.color} /></div>
                <div className="lk-row-title">{it.title}</div>
                <span className="lk-menu-arrow">›</span>
              </div>
            ))}
          </div>
          <div className="lk-group">
            {otherItems.map(it=>(
              <div key={it.key} className="lk-row" onClick={it.onClick || (()=>go(it.key))}>
                <div className="lk-row-icon" style={{background:it.bg}}><Icon name={it.icon} size={17} color={it.color} /></div>
                <div className="lk-row-title">{it.title}</div>
                {it.badge && <span className="lk-menu-badge">{it.badge}</span>}
                <span className="lk-menu-arrow">›</span>
              </div>
            ))}
          </div>
          <div className="lk-group">
            <div className="lk-row" onClick={()=>go("settings")}>
              <div className="lk-row-icon" style={{background:"#1c1c28"}}><Icon name="wrench" size={17} color="#7B9DBF" /></div>
              <div className="lk-row-title">Настройки</div>
              <span className="lk-menu-arrow">›</span>
            </div>
          </div>
          <div className="lk-logout" onClick={onLogout}>Выйти</div>
          <div style={{textAlign:"center",fontSize:11,color:C.sub,padding:"4px 0"}}>Версия 2.0 · АТТ</div>
        </div>
      </div>
    </>
  );
}

// ── LK TEACHERS — real teacher names/subjects pulled from the scraped ДВ-41 schedule ──
function LKTeachers({ open, onClose }) {
  const teachers = [
    { name:"Кошкин В.А.",    subjects:["Л/ОрППФКС","Л/АдмОпС"] },
    { name:"Каргу И.Ю.",     subjects:["Л/ОрППФКС"] },
    { name:"Федин С.В.",     subjects:["Л/АдмОпС"] },
    { name:"Кадирова В.А.",  subjects:["КомпСети"] },
    { name:"Торгашина Л.Л.", subjects:["ОРГАДКС"] },
    { name:"Боднар Е.М.",    subjects:["ОРГАДКС","Физкультура"] },
    { name:"Соколов Р.А.",   subjects:["Физкультура"] },
    { name:"Газизуллин Т.Н.",subjects:["Иняз"] },
    { name:"Русинова А.Б.",  subjects:["ОРГАДКС"] },
  ];
  return (
    <div className={`inner-screen lk-inner${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Преподаватели" />
      <div className="inner-body">
        <div style={{fontSize:13,color:C.sub,marginBottom:4}}>Группа ДВ-41 · по данным расписания</div>
        <div className="lk-group">
          {teachers.map((t,i)=>(
            <div key={i} className="lk-row" style={{cursor:"default"}}>
              <div className="lk-row-icon" style={{background:`hsl(${(i*47)%360},40%,22%)`}}>
                <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{t.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</span>
              </div>
              <div style={{flex:1}}>
                <div className="lk-row-title" style={{marginBottom:2}}>{t.name}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {t.subjects.map(s=>(
                    <span key={s} style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:C.surface,color:C.sub,border:`1px solid ${C.border}`}}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── LK SETTINGS — simple, visual-only settings screen ──
function LKSettings({ open, onClose }) {
  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  return (
    <div className={`inner-screen lk-inner${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Настройки" />
      <div className="inner-body">
        <div className="lk-section-title">УВЕДОМЛЕНИЯ</div>
        <div className="lk-group">
          <div className="lk-row" style={{cursor:"default"}} onClick={()=>setPushNotif(v=>!v)}>
            <div className="lk-row-icon" style={{background:"#0f2548"}}><Icon name="bell" size={17} color="#4A8FE7" /></div>
            <div className="lk-row-title">Push-уведомления</div>
            <div style={{width:40,height:24,borderRadius:20,background:pushNotif?C.accent:C.border,position:"relative",transition:"background .2s"}}>
              <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:pushNotif?19:3,transition:"left .2s"}} />
            </div>
          </div>
          <div className="lk-row" style={{cursor:"default"}} onClick={()=>setEmailNotif(v=>!v)}>
            <div className="lk-row-icon" style={{background:"#0f2040"}}><Icon name="mail" size={17} color="#4A8FE7" /></div>
            <div className="lk-row-title">Уведомления на email</div>
            <div style={{width:40,height:24,borderRadius:20,background:emailNotif?C.accent:C.border,position:"relative",transition:"background .2s"}}>
              <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:emailNotif?19:3,transition:"left .2s"}} />
            </div>
          </div>
        </div>
        <div className="lk-section-title">ОБЩЕЕ</div>
        <div className="lk-group">
          <div className="lk-row" style={{cursor:"default"}}>
            <div className="lk-row-icon" style={{background:"#1c1c28"}}><Icon name="globe" size={17} color="#7B9DBF" /></div>
            <div className="lk-row-title">Язык</div>
            <span style={{fontSize:13,color:C.sub}}>Русский</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TEACHER LK SHEET ──────────────────────────────────────────────────────────
function TeacherLKSheet({ open, onClose, onLogout, setLkInner }) {
  return (
    <>
      <div className={`lk-overlay${open?" open":""}`} onClick={onClose} />
      <div className={`lk-sheet${open?" open":""}`}>
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#4CAF6B,#2d8050)"}}>Н</div>
          <div>
            <div className="lk-name">Наталья Сергеевна</div>
            <div className="lk-meta">Преподаватель · Кафедра экономики</div>
          </div>
          <button className="lk-edit-btn"><Icon name="pencil" size={13} color="#4A8FE7" style={{marginRight:4,verticalAlign:-2}} />Изменить</button>
        </div>
        <div className="lk-body">
          <div className="lk-section-title">ПРОФИЛЬ</div>
          {[
            {icon:"school",bg:"#0f2040",title:"Кафедра",sub:"Экономика"},
            {icon:"calendar",bg:"#0f2548",title:"Стаж преподавания",sub:"14 лет"},
            {icon:"users",bg:"#0f2548",title:"Мои группы",sub:"ДВ-41, ДВ-31, ДВ-11"},
            {icon:"clipboard-list",bg:"#0f2040",title:"Учебная нагрузка",sub:"18 часов в неделю"},
          ].map((it,i)=>(
            <div key={i} className="lk-menu-item">
              <div className="lk-menu-icon" style={{background:it.bg}}><Icon name={it.icon} color="#FFFFFF" /></div>
              <div className="lk-menu-text">
                <div className="lk-menu-title">{it.title}</div>
                <div className="lk-menu-sub">{it.sub}</div>
              </div>
            </div>
          ))}
          <div className="lk-divider" />
          <div className="lk-section-title">КОНТАКТЫ</div>
          {[
            {icon:"mail",bg:"#0f2040",title:"Email",sub:"n.smirnova@att-academy.ru"},
            {icon:"send",bg:"#0f2548",title:"Telegram",sub:"@n_smirnova_att"},
            {icon:"smartphone",bg:"#2a1a30",title:"Телефон",sub:"+7 (985) 000-00-01"},
          ].map((it,i)=>(
            <div key={i} className="lk-menu-item" style={{cursor:"default"}}>
              <div className="lk-menu-icon" style={{background:it.bg}}><Icon name={it.icon} color="#FFFFFF" /></div>
              <div className="lk-menu-text">
                <div className="lk-menu-title">{it.title}</div>
                <div className="lk-menu-sub">{it.sub}</div>
              </div>
            </div>
          ))}
          <div className="lk-divider" />
          <div className="lk-section-title">ПРОЧЕЕ</div>
          <div className="lk-menu-item" onClick={()=>{onClose();setLkInner("about-app");}}>
            <div className="lk-menu-icon" style={{background:"#0f1c35"}}><Icon name="info" color="#FFFFFF" /></div>
            <div className="lk-menu-text">
              <div className="lk-menu-title">О приложении</div>
              <div className="lk-menu-sub">Версия 2.0 · АТТ</div>
            </div>
            <span className="lk-menu-arrow">›</span>
          </div>
          <div className="lk-divider" />
          <div className="lk-logout" onClick={onLogout}>Выйти</div>
        </div>
      </div>
    </>
  );
}

// ── TEACHER GRADE MODAL ────────────────────────────────────────────────────────
function LKAboutApp({ open, onClose }) {
  return (
    <div className={`inner-screen lk-inner${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="О приложении" />
      <div className="inner-body">
        <div style={{textAlign:"center",padding:"10px 0 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <AttLogo size={90} circular />
          <div style={{fontSize:22,fontWeight:800,letterSpacing:2}}>АТТ</div>
          <div style={{fontSize:11,color:"#7B9DBF",letterSpacing:3}}>АКАДЕМИЯ ТРАНСПОРТНЫХ ТЕХНОЛОГИЙ</div>
          <div style={{background:"#142240",borderRadius:20,padding:"4px 14px",fontSize:11,color:"#4A8FE7"}}>Версия 2.0</div>
        </div>
        <div style={{background:"#142240",borderRadius:16,padding:16,display:"flex",flexDirection:"column",gap:0}}>
          {[{label:"Основана",val:"1945 год"},{label:"Студентов",val:"более 3 000"},{label:"Специальностей",val:"12"},{label:"Преподавателей",val:"85"}].map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #1E356022",fontSize:13}}>
              <span style={{color:"#7B9DBF"}}>{r.label}</span>
              <span style={{fontWeight:600}}>{r.val}</span>
            </div>
          ))}
        </div>
        <div style={{background:"#1a2050",border:"1px solid #4A8FE733",borderRadius:16,padding:16,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:11,letterSpacing:2,color:"#6fb3f5",marginBottom:2}}>КОНТАКТЫ</div>
          {[
            {icon:"globe", label:"Сайт",    val:"атт.спб.рф",              href:"http://xn--80a0ba.xn--90a1af.xn--p1ai"},
            {icon:"mail",  label:"Email",   val:"att@nvsh.gugov.spb.ru",   href:"mailto:att@nvsh.gugov.spb.ru"},
            {icon:"phone", label:"Телефон", val:"+7 (812) 766-24-52"},
            {icon:"map-pin", label:"Адрес", val:"СПб, ул. Салова, д. 65"},
          ].map((r,i)=>{
            const Tag = r.href ? "a" : "div";
            return (
              <Tag key={i} href={r.href} target={r.href ? "_blank" : undefined} rel={r.href ? "noopener" : undefined}
                style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0",textDecoration:"none",color:"inherit",cursor:r.href?"pointer":"default"}}>
                <span style={{width:28,display:"flex",justifyContent:"center"}}><Icon name={r.icon} size={18} color="#4A8FE7" /></span>
                <div><div style={{fontSize:11,color:"#6fb3f5"}}>{r.label}</div><div style={{fontSize:13,textDecoration:r.href?"underline":"none",textDecorationColor:"#4A8FE755"}}>{r.val}</div></div>
              </Tag>
            );
          })}
        </div>
        <div style={{background:"#142240",borderRadius:14,padding:14}}>
          <div style={{fontSize:11,letterSpacing:2,color:"#7B9DBF",marginBottom:10}}>СОЦСЕТИ</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[
              {icon:"message-circle", name:"ВКонтакте", href:"https://vk.com/att_college"},
              {icon:"send",           name:"MAX",       href:"https://max.ru/att_college"},
            ].map((s,i)=>(
              <a key={i} href={s.href} target="_blank" rel="noopener"
                style={{background:"#101C33",border:"1px solid #1E3560",borderRadius:10,padding:"8px 14px",fontSize:12,display:"flex",alignItems:"center",gap:6,cursor:"pointer",textDecoration:"none",color:"inherit"}}>
                <Icon name={s.icon} size={15} color="#4A8FE7" />{s.name}
              </a>
            ))}
          </div>
        </div>
        <div style={{textAlign:"center",fontSize:11,color:"#7B9DBF",lineHeight:1.9,padding:"2px 0 8px"}}>
          © 2026 АТТ — Академия Транспортных Технологий<br/>Все права защищены
        </div>
      </div>
    </div>
  );
}

// ── FORGOT PASSWORD MODAL ──────────────────────────────────────────────────────
