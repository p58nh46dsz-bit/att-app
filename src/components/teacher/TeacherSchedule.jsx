// TeacherSchedule — the teacher's timetable. The controls (День / Неделя and the strip of days) stay pinned under the
// header; the pairs scroll below them. A tap on a pair opens the journal of its group.
function TeacherSchedule({ open, onClose, schedule, scheduleStatus, onOpenPair, lunchToday }) {
  const [view, setView] = useState("day");   // "day" | "week"
  const [corpus, setCorpus] = useState("12");
  const today = new Date();
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const week = Array.from({ length: 6 }, (_, i) => addDays(monday, i));            // Пн–Сб
  const todayIdx = week.findIndex(d => isoDate(d) === isoDate(today));
  const [picked, setPicked] = useState(null);
  const day = picked !== null ? picked : (todayIdx >= 0 ? todayIdx : 0);
  const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const recordOf = d => (schedule && schedule.days ? schedule.days[isoDate(d)] : null);
  // Today's lunch (chosen on the dashboard, kept on the server): with a break, the 2nd pair of the 1st–2nd buildings
  // is shown in two parts.
  const rawOf = d => (recordOf(d) || { lessons: [] }).lessons;
  const splitOn = d => {
    if (isoDate(d) !== isoDate(today) || !lunchToday) return false;
    const p2 = lunchPair(rawOf(d));
    return !!p2 && lunchToday[p2.group] === "split";
  };
  const lessonsOf = d => lunchSegments(rawOf(d), splitOn(d));
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const stateOf = (d, l) => {
    const k = isoDate(d), t = isoDate(today);
    if (k < t) return "past";
    if (k > t) return "";
    const s = l.start[0] * 60 + l.start[1], e = l.end[0] * 60 + l.end[1];
    return nowMin >= s && nowMin < e ? "now" : nowMin < s ? "next" : "past";
  };
  const emptyText = (d, rec) => {
    if (rec) return "В этот день у вас нет пар";
    if (scheduleStatus === "error") return "Расписание сейчас недоступно";
    return isoDate(d) > isoDate(today) ? "Расписание появится на сайте АТТ накануне вечером" : "Расписание на этот день не сохранено";
  };
  const hm = (h, m) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const weekRow = (d, l, i) => {
    const st = stateOf(d, l);
    return (
      <button key={i} className="tq-item" style={{opacity:st === "past" ? 0.6 : 1}} onClick={() => onOpenPair(l)}>
        <div style={{width:46,flexShrink:0,fontVariantNumeric:"tabular-nums"}}>
          <div style={{fontSize:"0.9375rem",fontWeight:700}}>{hm(...l.start)}</div>
          <div style={{fontSize:"0.6875rem",color:"var(--sub)"}}>{hm(...l.end)}</div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div className="tq-item-title">{l.group || "Группа не указана"}</div>
          <div className="tq-item-sub" style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.subject || "Предмет не указан"}{l.room ? ` · ауд. ${l.room}` : ""}</div>
        </div>
        {st === "now" && <span className="tq-pill now">Идёт</span>}
      </button>
    );
  };
  const pairCard = (d, l, i, firstNext) => {
    const st = stateOf(d, l);
    return (
      <button key={i} className={`tq-pair${st === "past" ? " past" : ""}${st === "now" ? " now" : ""}`} onClick={() => onOpenPair(l)}>
        <div className="tq-pair-time">
          <b>{hm(...l.start)}</b>
          <span>{hm(...l.end)}</span>
        </div>
        <div className="tq-pair-body">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div className="tq-item-title" style={{flex:1,minWidth:0}}>{l.group || "Группа не указана"}</div>
            {st === "now" ? <span className="tq-pill now">Идёт</span> : st === "next" && i === firstNext ? <span className="tq-pill next">Далее</span> : null}
          </div>
          <div className="tq-item-sub" style={{fontSize:"0.8125rem"}}>{l.subject || "Предмет не указан"}</div>
          <div className="tq-pair-meta">
            <span>{l.period} пара{l.part ? (l.part === 1 ? " · до обеда" : " · после обеда") : ""}</span>
            {l.room && <span><Icon name="map-pin" size={12} />{l.room}</span>}
            <span>{l.corpus === "3" ? "3 корпус" : "1–2 корпус"}</span>
          </div>
        </div>
      </button>
    );
  };
  const dayList = d => {
    const ls = lessonsOf(d);
    const firstNext = ls.findIndex(x => stateOf(d, x) === "next");
    return ls.flatMap((l, i) => l.part === 1 ? [pairCard(d, l, i, firstNext),
      <div key={`lunch${i}`} className="tq-lunch-gap"><Icon name="clock" size={14} strokeWidth={2.2} />Обед 11:30 – 12:20</div>]
      : [pairCard(d, l, i, firstNext)]);
  };
  const active = week[day];
  const rec = recordOf(active);
  const total = week.reduce((n, d) => n + lessonsOf(d).length, 0);
  const splitToday = splitOn(today);
  const BELLS = {
    "12": splitToday
      ? [["1 пара","09:00 – 10:30"],["2 пара","10:50 – 11:30"],["Обед","11:30 – 12:20"],["2 пара","12:20 – 13:10"],["3 пара","13:25 – 14:45"],["4 пара","15:00 – 16:20"],["5 пара","16:30 – 17:50"]]
      : [["1 пара","09:00 – 10:30"],["2 пара","10:50 – 12:20"],["Обед","12:20 – 13:25"],["3 пара","13:25 – 14:45"],["4 пара","15:00 – 16:20"],["5 пара","16:30 – 17:50"]],
    "3":  [["1 пара","09:00 – 10:30"],["2 пара","10:40 – 12:10"],["Обед","12:10 – 12:55"],["3 пара","12:55 – 14:25"],["4 пара","14:35 – 15:55"],["5 пара","16:05 – 17:25"]],
  };
  return (
    <div className={`inner-screen lk-inner tq-screen${open ? " open" : ""}`}>
      <TopBar plain onBack={onClose} title="Назад" tag="Расписание" />
      <div className="tq-sched-ctrls">
        <div className="tq-seg" role="tablist" aria-label="Вид расписания">
          {[["day","День"],["week","Неделя"]].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={view === k} className={view === k ? "active" : ""} onClick={() => { tqTap(); setView(k); }}>{label}</button>
          ))}
        </div>
        {view === "day" && <div className="tq-days" role="tablist" aria-label="День недели">
          {week.map((d, i) => (
            <button key={i} role="tab" aria-selected={day === i} className={`tq-day${day === i ? " on" : ""}${i === todayIdx ? " today" : ""}`} onClick={() => { tqTap(); setPicked(i); }}>
              <span>{WD_SHORT[i]}</span>
              <b>{d.getDate()}</b>
              <i className={lessonsOf(d).length ? "has" : ""} />
            </button>
          ))}
        </div>}
      </div>
      <div className="inner-body tq-sched-body">
        {view === "day" ? <>
          <div className="tq-sched-title">
            <span>{day === todayIdx ? "Сегодня" : WD_FULL[day]}, {active.getDate()} {MONTHS[active.getMonth()]}</span>
            {rec && rec.lessons.length > 0 && <span className="tq-pill">{rec.lessons.length} {rusPlural(rec.lessons.length, "пара", "пары", "пар")}</span>}
          </div>
          {rec && rec.lessons.length > 0 ? dayList(active) : (
            scheduleStatus === "loading" ? <TQSkeleton rows={3} avatar={false} /> : <TQEmpty kind="calendar" title={rec ? "Пар нет" : "Нет данных"} text={emptyText(active, rec)} />
          )}
        </> : <>
          <div className="tq-sched-title">
            <span>{week[0].getDate()} – {week[5].getDate()} {MONTHS[week[5].getMonth()]}</span>
            <span className="tq-pill">{total} {rusPlural(total, "пара", "пары", "пар")}</span>
          </div>
          {week.map((d, di) => {
            const ls = lessonsOf(d);
            return (
              <div key={di} style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
                <div className="tq-sec" style={{padding:"8px 4px 0",color:di === todayIdx ? "var(--link)" : "var(--sub)"}}>
                  {WD_FULL[di]}, {d.getDate()} {MONTHS[d.getMonth()]}{di === todayIdx ? " · сегодня" : ""}
                </div>
                {ls.length > 0 ? <div className="tq-card">{ls.map((l, i) => weekRow(d, l, i))}</div> : <div className="tq-card"><div className="tq-item" style={{cursor:"default",minHeight:44,color:"var(--sub)",fontSize:"0.8125rem"}}>{emptyText(d, recordOf(d))}</div></div>}
              </div>
            );
          })}
        </>}
        <div className="tq-sec" style={{paddingTop:18}}>Звонки</div>
        <div className="tq-seg" role="tablist" aria-label="Корпус">
          {[["12","1–2 корпус"],["3","3 корпус"]].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={corpus === k} className={corpus === k ? "active" : ""} onClick={() => { tqTap(); setCorpus(k); }}>{label}</button>
          ))}
        </div>
        <div className="tq-card">
          {BELLS[corpus].map(([name, time], i) => (
            <div key={i} className={`tq-item${name === "Обед" ? " tq-bell-lunch" : ""}`} style={{cursor:"default",minHeight:46}}>
              <span style={{flex:1,fontSize:"0.875rem",color:"var(--sub)"}}>{name}</span>
              <span style={{fontSize:"0.9375rem",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{time}</span>
            </div>
          ))}
        </div>
        <div style={{height:8,flexShrink:0}} />
      </div>
    </div>
  );
}
