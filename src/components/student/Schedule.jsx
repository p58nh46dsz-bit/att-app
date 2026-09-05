// LKSchedule — "Расписание" screen in the student personal account.
function LKSchedule({ open, onClose, schedule, scheduleStatus }) {
  const [day, setDay] = useState(0);

  // Tabs are built from the real calendar, starting at today: Сегодня, Завтра,
  // then the next school days in true chronological order (weekends skipped).
  const today = new Date();
  const tabDates = [today, addDays(today, 1)];
  for (let cursor = addDays(today, 2); tabDates.length < 7; cursor = addDays(cursor, 1)) {
    if (!isWeekend(cursor)) tabDates.push(cursor);
  }
  const days = tabDates.map((d, i) => i === 0 ? "Сегодня" : i === 1 ? "Завтра" : WD_SHORT[(d.getDay()+6)%7]);

  const activeDate = tabDates[day];
  const activeIsWeekend = isWeekend(activeDate);
  const hasRealDataForActive = !!(schedule && schedule.date === isoDate(activeDate));
  const todayItems = hasRealDataForActive ? (schedule.lessons || []).map(l => ({
    start: fmt(...l.start), end: fmt(...l.end), subj: l.subj, room: l.room, teacher: l.teacher,
  })) : [];
  const borderColors = ["#1F5CB8","#4A8FE7","#4CAF6B","#F5A623","#E84C4C"];
  const bells = hasRealDataForActive ? (BELLS_BY_CORPUS[schedule.corpus] || null) : null;
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag={`Расписание · ${WD_FULL[(activeDate.getDay()+6)%7]}`} />
      <div className="inner-body">
        <div className="week-tabs" >
          {days.map((d,i)=>(
            <div key={i} className={`week-tab${day===i?" active":""}`} onClick={()=>setDay(i)}>{d}</div>
          ))}
        </div>
        {activeIsWeekend && (
          <div style={{textAlign:"center",color:C.sub,fontSize:13,padding:"24px 0"}}>
            Выходной день, занятий нет
          </div>
        )}
        {!activeIsWeekend && day === 0 && scheduleStatus === "loading" && (
          <div style={{textAlign:"center",color:C.sub,fontSize:13,padding:"24px 0"}}>Загрузка расписания…</div>
        )}
        {!activeIsWeekend && day === 0 && scheduleStatus === "error" && (
          <div style={{textAlign:"center",color:C.sub,fontSize:13,padding:"24px 0",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Icon name="alert-triangle" size={14} color="#f5c067" />Расписание временно недоступно</div>
        )}
        {!activeIsWeekend && scheduleStatus !== "loading" && !hasRealDataForActive && (
          <div style={{textAlign:"center",color:C.sub,fontSize:13,padding:"24px 0"}}>
            {day === 0
              ? "Расписание на сегодня ещё не обновилось"
              : "Расписание на этот день появится на сайте АТТ вечером накануне"}
          </div>
        )}
        {!activeIsWeekend && hasRealDataForActive && todayItems.length === 0 && (
          <div style={{textAlign:"center",color:C.sub,fontSize:13,padding:"24px 0"}}>Пар нет</div>
        )}
        {!activeIsWeekend && hasRealDataForActive && todayItems.map((it,i)=>(
          <div key={i} className="sched-item" style={{borderLeftColor:borderColors[i%5]}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:48,gap:2}}>
              <span className="sched-time-start">{it.start}</span>
              <div style={{width:2,flex:1,minHeight:12,background:borderColors[i%5]+"44"}}/>
              <span className="sched-time-end">{it.end}</span>
            </div>
            <div style={{flex:1}}>
              <div className="sched-subj">{it.subj}</div>
              <div className="sched-meta">
                {it.room && <span style={{display:"inline-flex",alignItems:"center",gap:3}}><Icon name="map-pin" size={12} color="#7B9DBF" />{it.room}</span>}
                {it.teacher && <span style={{display:"inline-flex",alignItems:"center",gap:3}}><Icon name="user" size={12} color="#7B9DBF" />{it.teacher}</span>}
              </div>
            </div>
          </div>
        ))}
        <div className="section-card" >
          <div className="section-head"><Icon name="bell" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:4}} />РАСПИСАНИЕ ЗВОНКОВ{hasRealDataForActive && schedule.corpus ? ` (${schedule.corpus} корпус)` : ""}</div>
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
