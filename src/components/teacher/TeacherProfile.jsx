// Teacher dashboard screen (extracted from App's inline JSX) — teacher role's main/landing screen.
function TeacherProfile({ active, teacherUnreadCount, setNotifRole, setNotifOpen, setScreen, setTeacherLkOpen, teacherLesson, setGroupModal, setTeacherGradeOpen, setTeacherMsgOpen, setTeacherMaterialsOpen }) {
  return (
      <div className={`screen${active ? " active" : ""}`}>
        <div className="topbar">
          <div className="topbar-left">
            <button className="back-btn" onClick={() => setScreen("login")}>← Выход</button>
            <button className="notif-btn" style={{color:"#5ec97a"}} aria-label="Уведомления" onClick={()=>{setNotifRole("teacher");setNotifOpen(true);}}>🔔{teacherUnreadCount > 0 && <span className="badge">{teacherUnreadCount}</span>}</button>
          </div>
          <div className="avatar-row" style={{cursor:"pointer"}} onClick={()=>setTeacherLkOpen(true)}>
            <div className="avatar" style={{background:C.green,boxShadow:"0 0 0 2px #4CAF6B"}}>Н</div>
            <span className="avatar-name">Наталья С.</span>
            <span className="tag-role teacher">препод.</span>
          </div>
        </div>
        <div className="dash">
          <div className="greeting anim-fadeup"><h1>Здравствуйте, Наталья С.</h1></div>
          <div style={{fontSize:13,color:C.sub,marginTop:-8}}>Наталья Сергеевна · Преподаватель</div>
          <div className="teacher-next anim-fadeup">
            <div className="next-class-label" style={{color:"#5ec97a"}}>
              {teacherLesson.label==="ИДЁТ ПАРА"?"🟢":"⏰"} {teacherLesson.label}
            </div>
            <div className="next-class-row">
              <div>
                <div style={{fontSize:17,fontWeight:600}}>{teacherLesson.subj}</div>
                <div style={{fontSize:13,color:C.sub}}>{teacherLesson.room}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15,fontWeight:600,color:"#5ec97a"}}>{teacherLesson.timeStr}</div>
              </div>
            </div>
            <div className="teacher-meta-row">
              <span>👥 Группа ДВ-41 · 22 студ.</span>
              <span>✏️ Непроверенных: 8</span>
            </div>
          </div>
          <div className="stats-row anim-fadeup">
            <div className="stat-card">
              <div className="stat-label">👥 Мои группы</div>
              <div className="stat-val">3</div>
              <div className="bar-track"><div className="bar-fill" style={{width:"100%"}} /></div>
            </div>
            <div className="stat-card">
              <div className="stat-label">📊 ДВ-41 балл</div>
              <div className="stat-val">4.2</div>
              <div className="bar-track"><div className="bar-fill accent" style={{width:"70%"}} /></div>
            </div>
          </div>
          <div className="quick-grid anim-fadeup">
            {[
              {icon:"👥", label:"Журнал группы",    act:()=>setGroupModal("ДВ-41"), bg:"#0d2244"},
              {icon:"✏️", label:"Выставить оценки", act:()=>setTeacherGradeOpen(true), bg:"#0d1e48"},
              {icon:"📢", label:"Сообщение группе", act:()=>setTeacherMsgOpen(true), bg:"#0d1e3a"},
              {icon:"📎", label:"Материалы к паре", act:()=>setTeacherMaterialsOpen(true), bg:"#0d1e3a"},
            ].map(b=>(
              <div key={b.label} className="quick-btn" onClick={b.act||undefined}>
                <div className="quick-icon-box" style={{background:b.bg}}>
                  <span>{b.icon}</span>
                </div>
                <span className="quick-lbl">{b.label}</span>
              </div>
            ))}
          </div>
          <div className="section-card anim-fadeup">
            <div className="section-head">👥 МОИ ГРУППЫ</div>
            <div className="group-list">
              {[{name:"ДВ-41",count:"22 студента"},{name:"ДВ-31",count:"19 студентов"},{name:"ДВ-11",count:"24 студента"}].map(g=>(
                <div key={g.name} className="group-row" onClick={()=>setGroupModal(g.name)}>
                  <span className="group-name">{g.name}</span>
                  <span className="group-count">{g.count}</span>
                  <span style={{color:C.sub}}>›</span>
                </div>
              ))}
            </div>
          </div>
          <div className="section-card anim-fadeup">
            <div className="section-head">📅 РАСПИСАНИЕ НА СЕГОДНЯ</div>
            {TEACHER_LESSONS.map((l,i)=>(
              <div key={i} className="schedule-row">
                <span className="sch-time">{fmt(...l.start)}</span>
                <span className="sch-subj">{l.subj}</span>
                <span className="sch-room">{l.room}</span>
              </div>
            ))}
          </div>
          <div className="news-card anim-fadeup">
            <div className="section-head">📢 НОВОСТИ АКАДЕМИИ</div>
            <div className="news-item">• Заседание кафедры — 21 мая, 14:00</div>
            <div className="news-item">• Сдача ведомостей до 5 июня</div>
          </div>
        </div></div>
  );
}
