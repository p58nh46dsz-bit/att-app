// Teacher dashboard screen (extracted from App's inline JSX) — teacher role's main/landing screen.
function TeacherProfile({ active, user, teacherUnreadCount, setNotifRole, setNotifOpen, setScreen, setTeacherLkOpen, teacherLesson, teacherLessons, scheduleStatus, setGroupModal, setRosterModal, setJournalOpen, setNextClassOpen, setTeacherGradeOpen, setTeacherMsgOpen, setTeacherMaterialsOpen, setLkInner }) {
  const groups = user && user.groups ? user.groups : [];
  const { data: groupList } = useApi("/groups", active && !!user);
  const plural = n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "студент" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "студента" : "студентов"}`;
  const groupCounts = Object.fromEntries((groupList || []).map(g => [g.code, plural(g.count)]));
  return (
      <div className={`screen${active ? " active" : ""}`}>
        <div className="topbar">
          <div className="topbar-left">
            <button className="back-btn" onClick={() => setScreen("login")}>← Выход</button>
            <button className="notif-btn" style={{color:"#5ec97a"}} aria-label="Уведомления" onClick={()=>{setNotifRole("teacher");setNotifOpen(true);}}><Icon name="bell" size={19} color="#5ec97a" style={{verticalAlign:-4}} />{teacherUnreadCount > 0 && <span className="badge">{teacherUnreadCount}</span>}</button>
          </div>
          <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="avatar-row" style={{cursor:"pointer"}} onClick={()=>setTeacherLkOpen(true)}>
            <div className="avatar" style={{background:C.green,boxShadow:"0 0 0 2px #4CAF6B"}}>{user ? user.firstName.charAt(0) : ""}</div>
            <span className="avatar-name">{authShortName(user)}</span>
            <span className="tag-role teacher">препод.</span>
          </div>
        </div>
        <div className="dash">
          <div className="greeting anim-fadeup"><h1>Здравствуйте, {user ? user.firstName + " " + user.middleName : ""}</h1></div>
          <div style={{fontSize:"0.8125rem",color:C.sub}}>{authFullName(user)} · {user ? user.position : ""}</div>
          <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="next-class anim-fadeup" style={{cursor:"pointer"}} onClick={()=>setNextClassOpen(true)}>
            <div className="next-class-label">
              {teacherLesson.label==="ИДЁТ ПАРА"
                ? <Icon name="circle-dot" size={11} color="#5ec97a" filled style={{verticalAlign:-1}} />
                : <Icon name="clock" size={12} color="#4A8FE7" style={{verticalAlign:-2}} />} {teacherLesson.label}
            </div>
            <div className="next-class-row">
              <div>
                <div style={{ fontSize:"1.0625rem", fontWeight: 600 }}>{teacherLesson.subj}</div>
                <div style={{ fontSize:"0.8125rem", color: C.sub }}>{teacherLesson.room ? `ауд. ${teacherLesson.room}` : ""}</div>
              </div>
              <div className="next-class-time">{teacherLesson.timeStr}</div>
            </div>
          </div>
          <div className="stats-row anim-fadeup">
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="stat-card" style={{cursor:"pointer"}} onClick={()=>setRosterModal("groups")}>
              <div className="stat-label"><Icon name="users" size={13} color="#4A8FE7" style={{verticalAlign:-2}} /> Мои группы</div>
              <div className="stat-val">{groups.length}</div>
              <div className="bar-track"><div className="bar-fill" style={{width:"100%"}} /></div>
            </div>
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="stat-card" style={{cursor:"pointer"}} onClick={()=>setRosterModal("students")}>
              <div className="stat-label"><Icon name="graduation-cap" size={13} color="#4A8FE7" style={{verticalAlign:-2}} /> Студентов</div>
              <div className="stat-val">{groupList ? groupList.reduce((n, g) => n + g.count, 0) : "—"}</div>
              <div className="bar-track"><div className="bar-fill accent" style={{width:"100%"}} /></div>
            </div>
          </div>
          <div className="quick-carousel anim-fadeup">
            {[
              {icon:"users",     label:"Журнал группы",    act:()=>setJournalOpen(true), bg:"#0d2244"},
              {icon:"pencil",    label:"Выставить оценки", act:()=>setTeacherGradeOpen(true), bg:"#0d1e48"},
              {icon:"megaphone", label:"Сообщение группе", act:()=>setTeacherMsgOpen(true), bg:"#0d1e3a"},
              {icon:"paperclip", label:"Материалы к паре", act:()=>setTeacherMaterialsOpen(true), bg:"#0d1e3a"},
              {icon:"calendar",  label:"Расписание", act:()=>setLkInner("tschedule"), bg:"#0d2a44"},
            ].map(b=>(
              <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={b.label} className="quick-btn" onClick={b.act||undefined}>
                <div className="quick-icon-box" style={{background:b.bg}}>
                  <Icon name={b.icon} size={20} color="#FFFFFF" />
                </div>
                <span className="quick-lbl">{b.label}</span>
              </div>
            ))}
          </div>
          <div className="section-card anim-fadeup">
            <div className="section-head"><Icon name="users" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:4}} />МОИ ГРУППЫ</div>
            {groups.length === 0 && (
              <div style={{fontSize:"0.8125rem",color:C.sub,lineHeight:1.6,padding:"4px 0 8px"}}>
                Вы ещё не выбрали группы. Выберите их из списка и укажите предметы, которые ведёте.
              </div>
            )}
            <div className="group-list">
              {groups.map(name=>({name,count:groupCounts[name]||"—"})).map(g=>(
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={g.name} className="group-row" onClick={()=>setGroupModal(g.name)}>
                  <span className="group-name">{g.name}</span>
                  <span className="group-count">{g.count}</span>
                  <span style={{color:C.sub}}>›</span>
                </div>
              ))}
            </div>
            <button className="btn-blue" style={{borderRadius:12,padding:"10px 16px",marginTop:10,width:"100%"}} onClick={()=>setLkInner("teaching")}>
              {groups.length === 0 ? "Выбрать группы и предметы" : "Группы и предметы"}
            </button>
          </div>
          <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="section-card anim-fadeup" style={{cursor:"pointer"}} onClick={()=>setLkInner("tschedule")}>
            <div className="section-head"><Icon name="calendar" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:4}} />РАСПИСАНИЕ НА СЕГОДНЯ · ВСЯ НЕДЕЛЯ →</div>
            {teacherLessons.length > 0 ? teacherLessons.map((l,i)=>(
              <div key={i} className="schedule-row">
                <span className="sch-time">{fmt(...l.start)}</span>
                <span className="sch-subj">{l.subj}</span>
                <span className="sch-room">{l.room}</span>
              </div>
            )) : (
              <div style={{fontSize:"0.8125rem",color:C.sub,padding:"6px 0"}}>
                {scheduleStatus === "loading" ? "Загрузка расписания…" : "На сегодня в загруженном расписании пар нет"}
              </div>
            )}
          </div>
        </div></div>
  );
}
