// LKSchedule — "Расписание" screen in the student personal account.
function LKSchedule({ open, onClose, schedule, scheduleStatus }) {
  const [day, setDay] = useState("Сегодня");
  const days = ["Сегодня", "Завтра", "Ср", "Чт", "Пт", "Пн", "Вт"];
  const todayItems = (schedule && schedule.lessons ? schedule.lessons : []).map(l => ({
    start: fmt(...l.start), end: fmt(...l.end), subj: l.subj, room: l.room, teacher: l.teacher,
  }));
  const borderColors = ["#1F5CB8","#4A8FE7","#4CAF6B","#F5A623","#E84C4C"];
  const bells = BELLS_BY_CORPUS[schedule && schedule.corpus] || null;
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag={`Расписание${schedule && schedule.weekday ? " · "+schedule.weekday : ""}`} />
      <div className="inner-body">
        <div className="week-tabs" >
          {days.map(d=>(
            <div key={d} className={`week-tab${day===d?" active":""}`} onClick={()=>setDay(d)}>{d}</div>
          ))}
        </div>
        {day !== "Сегодня" && (
          <div style={{textAlign:"center",color:C.sub,fontSize:13,padding:"24px 0"}}>
            Расписание на этот день появится на сайте АТТ вечером накануне
          </div>
        )}
        {day === "Сегодня" && scheduleStatus === "loading" && (
          <div style={{textAlign:"center",color:C.sub,fontSize:13,padding:"24px 0"}}>Загрузка расписания…</div>
        )}
        {day === "Сегодня" && scheduleStatus === "error" && (
          <div style={{textAlign:"center",color:C.sub,fontSize:13,padding:"24px 0"}}>⚠ Расписание временно недоступно</div>
        )}
        {day === "Сегодня" && scheduleStatus === "ok" && todayItems.length === 0 && (
          <div style={{textAlign:"center",color:C.sub,fontSize:13,padding:"24px 0"}}>Сегодня пар нет</div>
        )}
        {day === "Сегодня" && todayItems.map((it,i)=>(
          <div key={i} className="sched-item" style={{borderLeftColor:borderColors[i%5]}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:48,gap:2}}>
              <span className="sched-time-start">{it.start}</span>
              <div style={{width:2,flex:1,minHeight:12,background:borderColors[i%5]+"44"}}/>
              <span className="sched-time-end">{it.end}</span>
            </div>
            <div style={{flex:1}}>
              <div className="sched-subj">{it.subj}</div>
              <div className="sched-meta">
                {it.room && <span>📍 {it.room}</span>}
                {it.teacher && <span>👤 {it.teacher}</span>}
              </div>
            </div>
          </div>
        ))}
        <div className="section-card" >
          <div className="section-head">🔔 РАСПИСАНИЕ ЗВОНКОВ{schedule && schedule.corpus ? ` (${schedule.corpus} корпус)` : ""}</div>
          {(bells || [["1 пара","09:00–10:30"],["2 пара","10:40–12:10"],["3 пара","12:55–14:25"],["4 пара","14:35–15:55"]]).map(([p,t])=>(
            <div key={p} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #1E356022",fontSize:13}}>
              <span style={{color:"#7B9DBF"}}>{p}</span><span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// LK GRADES
