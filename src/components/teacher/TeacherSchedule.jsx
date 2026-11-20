// TeacherSchedule — "Расписание" of the teacher: one day (tabs Пн–Сб of the current week, today preselected) or the
// whole week at once. The pairs are the teacher's own, from the academy's teachers' timetable (GET /schedule).
// A tap on a pair opens the journal of its group.
function TeacherSchedule({ open, onClose, schedule, scheduleStatus, onOpenPair }) {
  const [view, setView] = useState("day");   // "day" | "week"
  const today = new Date();
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const week = Array.from({ length: 6 }, (_, i) => addDays(monday, i));            // Пн–Сб
  const todayIdx = week.findIndex(d => isoDate(d) === isoDate(today));
  const [picked, setPicked] = useState(null);
  const day = picked !== null ? picked : (todayIdx >= 0 ? todayIdx : 0);
  const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const recordOf = d => (schedule && schedule.days ? schedule.days[isoDate(d)] : null);
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const stateOf = (d, l) => {
    if (isoDate(d) !== isoDate(today)) return "";
    const s = l.start[0] * 60 + l.start[1], e = l.end[0] * 60 + l.end[1];
    return nowMin >= s && nowMin < e ? "now" : nowMin < s ? "next" : "past";
  };
  const colors = ["#1F5CB8"];   // one accent for every pair; colour is not used to tell pairs apart
  const empty = (d, rec) => {
    if (rec) return "Пар нет";
    if (scheduleStatus === "loading") return "Загрузка расписания…";
    if (scheduleStatus === "error") return "Расписание сейчас недоступно";
    return isoDate(d) > isoDate(today) ? "Расписание на этот день появится на сайте АТТ накануне вечером" : isWeekend(d) ? "Обычно в этот день занятий нет" : "Расписание на этот день не сохранено";
  };
  const pairRow = (d, l, i) => {
    const st = stateOf(d, l);
    const firstNext = ((recordOf(d) || { lessons: [] }).lessons).findIndex(x => stateOf(d, x) === "next");   // only the nearest pair is "следующая"
    return (
      <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={i} className="sched-item" style={{borderLeftColor:colors[0],cursor:"pointer",opacity:st === "past" ? 0.6 : 1,outline:st === "now" ? "1px solid #4CAF6B" : "none"}} onClick={() => onOpenPair(l)}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:48,gap:2}}>
          <span className="sched-time-start">{fmt(...l.start)}</span>
          <div style={{width:2,flex:1,minHeight:12,background:colors[0] + "44"}}/>
          <span className="sched-time-end">{fmt(...l.end)}</span>
        </div>
        <div style={{flex:1}}>
          <div className="sched-subj">{l.group || "Группа не указана"}{l.subject ? ` · ${l.subject}` : ""}</div>
          <div className="sched-meta">
            <span>{l.period} пара</span>
            {l.room && <span style={{display:"inline-flex",alignItems:"center",gap:3}}><Icon name="map-pin" size={12} color="#7B9DBF" />{l.room}</span>}
            <span>{l.corpus === "3" ? "3 корпус" : "1–2 корпус"}</span>
            {st === "now" && <span style={{color:"#5ec97a",display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:"#5ec97a"}}/>идёт сейчас</span>}
            {st === "next" && i === firstNext && <span style={{color:"#4A8FE7"}}>следующая</span>}
          </div>
        </div>
      </div>
    );
  };
  const total = week.reduce((n, d) => n + ((recordOf(d) || { lessons: [] }).lessons.length), 0);
  const active = week[day];
  const rec = recordOf(active);
  return (
    <div className={`inner-screen lk-inner tq-screen${open ? " open" : ""}`}>
      <TopBar plain onBack={onClose} title="Личный кабинет" tag={view === "week" ? "Расписание · неделя" : `Расписание · ${WD_FULL[(active.getDay() + 6) % 7]}`} />
      <div className="inner-body">
        <div className="tq-seg" role="tablist" aria-label="Вид расписания">
          {[["day","День"],["week","Неделя"]].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={view === k} className={view === k ? "active" : ""} onClick={() => { tqTap(); setView(k); }}>{label}</button>
          ))}
        </div>
        {view === "day" ? <>
          <div className="week-tabs">
            {week.map((d, i) => (
              <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={i} className={`week-tab${day === i ? " active" : ""}`} onClick={() => setPicked(i)}>
                {i === todayIdx ? "Сегодня" : WD_SHORT[i]} {d.getDate()}
              </div>
            ))}
          </div>
          <div style={{fontSize:"0.75rem",color:C.sub}}>{WD_FULL[(active.getDay() + 6) % 7]}, {active.getDate()} {MONTHS[active.getMonth()]}{rec && rec.lessons.length ? ` · пар: ${rec.lessons.length}` : ""}</div>
          {rec && rec.lessons.length > 0 ? rec.lessons.map((l, i) => pairRow(active, l, i)) : (
            scheduleStatus === "loading" ? <TQSkeleton rows={3} avatar={false} /> : <TQEmpty kind="calendar" title={rec ? "Пар нет" : empty(active, rec)} text={rec ? "В этот день у вас нет занятий" : null} />
          )}
        </> : <>
          <div style={{fontSize:"0.75rem",color:C.sub}}>{week[0].getDate()} {MONTHS[week[0].getMonth()]} – {week[5].getDate()} {MONTHS[week[5].getMonth()]} · всего пар: {total}</div>
          {week.map((d, di) => {
            const r = recordOf(d);
            return (
              <div key={di} className="section-card">
                <div className="section-head tq-head" style={isoDate(d) === isoDate(today) ? {color:"#5ec97a"} : undefined}>
                  {WD_FULL[di]}, {d.getDate()} {MONTHS[d.getMonth()]}{isoDate(d) === isoDate(today) ? ", сегодня" : ""}
                </div>
                {r && r.lessons.length > 0 ? r.lessons.map((l, i) => pairRow(d, l, i)) : <div style={{fontSize:"0.8125rem",color:C.sub,padding:"4px 0"}}>{empty(d, r)}</div>}
              </div>
            );
          })}
        </>}
        <div className="section-card">
          <div className="section-head tq-head">Расписание звонков</div>
          {[["1–2 корпус", [["1 пара","09:00–10:30"],["2 пара","10:50–12:20"],["3 пара","13:25–14:45"],["4 пара","15:00–16:20"],["5 пара","16:30–17:50"]]],
            ["3 корпус", [["1 пара","09:00–10:30"],["2 пара","10:40–12:10"],["3 пара","12:55–14:25"],["4 пара","14:35–15:55"],["5 пара","16:05–17:25"]]]].map(([name, rows]) => (
            <div key={name} style={{marginBottom:8}}>
              <div style={{fontSize:"0.6875rem",color:"#6fb3f5",padding:"4px 0"}}>{name}</div>
              {rows.map(([p, t]) => (
                <div key={name + p} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #1E356022",fontSize:"0.8125rem"}}>
                  <span style={{color:"#7B9DBF"}}>{p}</span><span>{t}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
