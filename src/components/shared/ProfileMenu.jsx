// LKSheet (student profile sheet), TeacherLKSheet (teacher profile sheet), LKAboutApp ("about the app", shared by both).
function LKSheet({ open, onClose, onLogout, setLkInner }) {
  const menuGroups = [
    { title:"УЧЁБА", items:[
      {key:"schedule",  icon:"📅",bg:"#0f2548",title:"Расписание",      sub:"Сегодня / завтра / неделя"},
      {key:"grades",    icon:"📊",bg:"#1e3040",title:"Успеваемость",    sub:"Оценки, долги, посещаемость", badge:"1"},
      {key:"curriculum",icon:"📋",bg:"#0f2040",title:"Учебный план",    sub:"Предметы и практики по курсам"},
      {key:"portfolio", icon:"🏆",bg:"#2a1e40",title:"Портфолио",       sub:"Проекты, навыки, сертификаты"},
    ]},
    { title:"СЕРВИСЫ", items:[
      {key:"consult",icon:"💬",bg:"#0f2548",title:"Запись на консультацию",sub:"Тип, время, преподаватель"},
      {key:"spravki",icon:"📄",bg:"#0f2040",title:"Заказ справок",        sub:"Об обучении, стипендии, военкомат"},
      {key:"faculty",icon:"🎓",bg:"#201a30",title:"Факультативы",         sub:"ДПО, кружки, секции"},
    ]},
    { title:"АККАУНТ", items:[
      {key:"about-app",icon:"ℹ️",bg:"#0f1c35",title:"О приложении",sub:"Версия 2.0 · АТТ"},
    ]},
  ];
  return (
    <>
      <div className={`lk-overlay${open?" open":""}`} onClick={onClose} />
      <div className={`lk-sheet${open?" open":""}`}>
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big">Д</div>
          <div>
            <div className="lk-name">Даниил Владленович</div>
            <div className="lk-meta">Группа ДВ-41 · Студент · 2 курс</div>
          </div>
          <button className="lk-edit-btn">✏️ Изменить</button>
        </div>
        <div className="lk-body">
          {menuGroups.map(grp=>(
            <div key={grp.title}>
              <div className="lk-section-title">{grp.title}</div>
              {grp.items.map(it=>(
                <div key={it.key} className="lk-menu-item" onClick={()=>{onClose();setLkInner(it.key);}}>
                  <div className="lk-menu-icon" style={{background:it.bg}}>{it.icon}</div>
                  <div className="lk-menu-text">
                    <div className="lk-menu-title">{it.title}</div>
                    <div className="lk-menu-sub">{it.sub}</div>
                  </div>
                  {it.badge && <span className="lk-menu-badge">{it.badge}</span>}
                  <span className="lk-menu-arrow">›</span>
                </div>
              ))}
              <div className="lk-divider" />
            </div>
          ))}
          <div className="lk-logout" onClick={onLogout}>
            <span>🚪</span> Выйти из аккаунта
          </div>
        </div>
      </div>
    </>
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
          <button className="lk-edit-btn">✏️ Изменить</button>
        </div>
        <div className="lk-body">
          <div className="lk-section-title">ПРОФИЛЬ</div>
          {[
            {icon:"🏫",bg:"#0f2040",title:"Кафедра",sub:"Экономика"},
            {icon:"📅",bg:"#0f2548",title:"Стаж преподавания",sub:"14 лет"},
            {icon:"👥",bg:"#0f2548",title:"Мои группы",sub:"ДВ-41, ДВ-31, ДВ-11"},
            {icon:"📋",bg:"#0f2040",title:"Учебная нагрузка",sub:"18 часов в неделю"},
          ].map((it,i)=>(
            <div key={i} className="lk-menu-item">
              <div className="lk-menu-icon" style={{background:it.bg}}>{it.icon}</div>
              <div className="lk-menu-text">
                <div className="lk-menu-title">{it.title}</div>
                <div className="lk-menu-sub">{it.sub}</div>
              </div>
            </div>
          ))}
          <div className="lk-divider" />
          <div className="lk-section-title">КОНТАКТЫ</div>
          {[
            {icon:"📧",bg:"#0f2040",title:"Email",sub:"n.smirnova@att-academy.ru"},
            {icon:"✈️",bg:"#0f2548",title:"Telegram",sub:"@n_smirnova_att"},
            {icon:"📱",bg:"#2a1a30",title:"Телефон",sub:"+7 (985) 000-00-01"},
          ].map((it,i)=>(
            <div key={i} className="lk-menu-item">
              <div className="lk-menu-icon" style={{background:it.bg}}>{it.icon}</div>
              <div className="lk-menu-text">
                <div className="lk-menu-title">{it.title}</div>
                <div className="lk-menu-sub">{it.sub}</div>
              </div>
              <span className="lk-menu-arrow">›</span>
            </div>
          ))}
          <div className="lk-divider" />
          <div className="lk-section-title">ПРОЧЕЕ</div>
          <div className="lk-menu-item" onClick={()=>{onClose();setLkInner("about-app");}}>
            <div className="lk-menu-icon" style={{background:"#0f1c35"}}>ℹ️</div>
            <div className="lk-menu-text">
              <div className="lk-menu-title">О приложении</div>
              <div className="lk-menu-sub">Версия 2.0 · АТТ</div>
            </div>
            <span className="lk-menu-arrow">›</span>
          </div>
          <div className="lk-divider" />
          <div className="lk-logout" onClick={onLogout}><span>🚪</span> Выйти из аккаунта</div>
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
          <AttLogo size={76} />
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
          {[{icon:"🌐",label:"Сайт",val:"att-academy.ru"},{icon:"📧",label:"Email",val:"info@att-academy.ru"},{icon:"📞",label:"Телефон",val:"+7 (495) 123-45-67"},{icon:"📍",label:"Адрес",val:"СПб, ул. Салова, д. 65"}].map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0"}}>
              <span style={{fontSize:18,width:28,textAlign:"center"}}>{r.icon}</span>
              <div><div style={{fontSize:11,color:"#6fb3f5"}}>{r.label}</div><div style={{fontSize:13}}>{r.val}</div></div>
            </div>
          ))}
        </div>
        <div style={{background:"#142240",borderRadius:14,padding:14}}>
          <div style={{fontSize:11,letterSpacing:2,color:"#7B9DBF",marginBottom:10}}>СОЦСЕТИ</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[{icon:"💬",name:"ВКонтакте"},{icon:"✈️",name:"Telegram"},{icon:"▶️",name:"YouTube"},{icon:"🎵",name:"VK Max"}].map((s,i)=>(
              <div key={i} style={{background:"#101C33",border:"1px solid #1E3560",borderRadius:10,padding:"8px 14px",fontSize:12,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                <span>{s.icon}</span>{s.name}
              </div>
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
