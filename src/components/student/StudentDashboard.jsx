// Student dashboard screen (extracted from App's inline JSX) + NextClassModal (triggered from the next-class card here).
function StudentDashboard({ active, user, unreadCount, setNotifRole, setNotifOpen, setSearchOpen, setLkOpen, nextLesson, setNextClassOpen, setLkInner, schedule, scheduleStatus, realLessons, gradeStats }) {
  // On a weekend with no real classes of its own — whether nothing has been
  // checked yet, or the scraper already confirmed an empty day — preview the
  // next day that has real, non-empty lessons (usually Monday) so people can
  // plan ahead over the weekend. If the weekend itself gets real classes
  // (a makeup day), that takes priority and is shown as "today" above.
  const today = new Date();
  const todayRec = schedule && schedule.days ? schedule.days[isoDate(today)] : null;
  const todayHasRealLessons = !!(todayRec && todayRec.lessons && todayRec.lessons.length > 0);
  let weekendPreview = null;
  if (isWeekend(today) && !todayHasRealLessons) {
    for (let i = 1; i <= 7 && schedule && schedule.days; i++) {
      const d = addDays(today, i);
      const rec = schedule.days[isoDate(d)];
      if (rec && rec.lessons && rec.lessons.length > 0) { weekendPreview = { date: d, lessons: rec.lessons }; break; }
    }
  }
  // Долги bar: green when low, sliding toward red as the count climbs (capped at 5 debts = fully red).
  // Both numbers come from the student's real marks (computed in App); "—" while there are none.
  const debtsCount = gradeStats ? gradeStats.debts : 0, debtsMax = 5;
  const debtsPct = Math.min(debtsCount / debtsMax, 1) * 100;
  const debtsHue = 142 - 142 * (debtsPct / 100);
  const debtsColor = `hsl(${debtsHue}, 58%, 54%)`;
  const hasGrades = !!(gradeStats && gradeStats.avg !== null), gradeVal = hasGrades ? gradeStats.avg : 0, gradeMax = 5;
  return (
      <div className={`screen${active ? " active" : ""}`}>
        <div className="topbar">
          <div className="topbar-left">
            <button className="notif-btn" aria-label="Уведомления" onClick={()=>{setNotifRole("student");setNotifOpen(true);setSearchOpen(false);}}><Icon name="bell" size={19} color="#FFFFFF" style={{verticalAlign:-4}} />{unreadCount > 0 && <span className="badge">{unreadCount}</span>}</button>
            <button className="search-btn" aria-label="Поиск" onClick={()=>{setSearchOpen(true);setNotifOpen(false);}}><Icon name="search" size={17} color="var(--sub)" style={{verticalAlign:-3}} /></button>
          </div>
          <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="avatar-row" style={{cursor:"pointer"}} onClick={()=>setLkOpen(true)}>
            <div className="avatar" style={{boxShadow:"0 0 0 2px #1F5CB8",transition:"box-shadow .2s"}}>{user ? user.firstName.charAt(0) : ""}</div>
            <span className="avatar-name">{authShortName(user)}</span>
          </div>
        </div>
        <div className="dash">
          <div className="greeting anim-fadeup">
            <h1>Здравствуй, {user ? user.firstName : ""}</h1>
          </div>
          <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="next-class anim-fadeup" style={{cursor:"pointer"}} onClick={()=>setNextClassOpen(true)}>
            <div className="next-class-label">
              {nextLesson.label==="ИДЁТ ПАРА"
                ? <Icon name="circle-dot" size={11} color="var(--ok)" filled style={{verticalAlign:-1}} />
                : <Icon name="clock" size={12} color={nextLesson.label === "ОБЕД" ? "var(--warn)" : "var(--link)"} style={{verticalAlign:-2}} />} {nextLesson.label === "ОБЕД" ? `Обед · дальше в ${nextLesson.timeStr.split(" – ")[0]}` : tqSentence(nextLesson.label)}
            </div>
            <div className="next-class-row">
              <div>
                <div style={{ fontSize:"1.0625rem", fontWeight: 600 }}>{nextLesson.subj}</div>
                {nextLesson.timeStr !== "—" && <div style={{ fontSize:"0.8125rem", color: C.sub }}>{nextLesson.room}</div>}
                {nextLesson.online && <div className="link-tag"><Icon name="link-2" size={13} color="var(--link)" style={{verticalAlign:-2}} /> Ссылка на вход</div>}
              </div>
              {nextLesson.timeStr !== "—" && <div className="next-class-time">{nextLesson.timeStr}</div>}
            </div>
          </div>
          <div className="stats-row anim-fadeup">
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="stat-card" style={{cursor:"pointer"}} onClick={()=>setLkInner("grades")}>
              <div className="stat-label"><Icon name="book-open" size={17} color={C.green} style={{verticalAlign:-3}} /> Долги</div>
              <div className="stat-val">{hasGrades ? debtsCount : "—"}</div>
              <div className="bar-track"><div className="bar-fill" style={{width:`${debtsPct}%`,background:debtsColor}} /></div>
            </div>
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="stat-card" style={{cursor:"pointer"}} onClick={()=>setLkInner("grades")}>
              <div className="stat-label"><Icon name="bar-chart-3" size={17} color="var(--link)" style={{verticalAlign:-3}} /> Средний балл</div>
              <div className="stat-val">{hasGrades ? gradeVal : "—"}</div>
              <div className="bar-track"><div className="bar-fill blue" style={{width:`${(gradeVal/gradeMax)*100}%`}} /></div>
            </div>
          </div>
          <div className="qa-grid anim-fadeup">
            {[
              {icon:"calendar",       label:"Расписание",   lk:"schedule",     size:34, color:"var(--link)"},
              {icon:"bar-chart-3",    label:"Оценки",       lk:"grades",       size:34, color:"var(--ok)"},
              {icon:"message-circle", label:"Консультации", lk:"consult",      size:30, color:"var(--link)"},
              {icon:"file-text",      label:"Справки",      lk:"spravki",      size:34, color:"#F5A623"},
              {icon:"bell",           label:"Уведомления",  lk:"notifications",size:34, color:"var(--link)"},
              {icon:"clipboard-list", label:"Учебный план", lk:"curriculum",   size:34, color:"var(--link)"},
              {icon:"graduation-cap", label:"Факультативы", lk:"faculty",      size:32, color:"var(--link)"},
              {icon:"users",          label:"Преподаватели",lk:"teachers",     size:32, color:"#b78af0"},
              {icon:"help-circle",    label:"Помощь",       lk:"about-app",    size:34, color:"var(--link)"},
            ].map(b=>(
              <div key={b.label} className="qa-btn" onClick={()=>setLkInner(b.lk)} aria-label={b.label} role="button">
                <div className="qa-icon">
                  <Icon name={b.icon} size={b.size} color={b.color} strokeWidth={1.75} />
                </div>
              </div>
            ))}
          </div>
          <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="section-card anim-fadeup" style={{cursor:"pointer"}} onClick={()=>setLkInner("schedule")}>
            <div className="section-head">
              <Icon name="calendar" size={12} color="var(--sub)" style={{verticalAlign:-2,marginRight:4}} />
              {weekendPreview
                ? `Ближайшие пары · ${WD_FULL[(weekendPreview.date.getDay()+6)%7]}`
                : `Расписание на сегодня · ${WD_FULL[(new Date().getDay()+6)%7]}`}
            </div>
            {todayHasRealLessons ? (
              realLessons.map((l,i)=>(
                <div key={i} className="schedule-row">
                  <span className="sch-time">{fmt(...l.start)}</span>
                  <span className="sch-subj">{l.subj}</span>
                  <span className="sch-room">{l.room}</span>
                </div>
              ))
            ) : todayRec && !isWeekend(new Date()) ? (
              <div style={{fontSize:"0.8125rem",color:C.sub,padding:"6px 0"}}>Сегодня пар нет</div>
            ) : weekendPreview ? (
              weekendPreview.lessons.map((l,i)=>(
                <div key={i} className="schedule-row">
                  <span className="sch-time">{fmt(...l.start)}</span>
                  <span className="sch-subj">{l.subj}</span>
                  <span className="sch-room">{l.room}</span>
                </div>
              ))
            ) : isWeekend(new Date()) ? (
              <div style={{fontSize:"0.8125rem",color:C.sub,padding:"6px 0"}}>Сегодня выходной, занятий нет</div>
            ) : scheduleStatus === "loading" ? (
              <div style={{fontSize:"0.8125rem",color:C.sub,padding:"6px 0"}}>Загрузка расписания…</div>
            ) : (
              <>
                <div style={{fontSize:"0.8125rem",color:C.sub,padding:"6px 0",display:"flex",alignItems:"center",gap:6}}><Icon name="alert-triangle" size={14} color="var(--warn)" />Расписание на сегодня ещё не опубликовано.</div>
              </>
            )}
          </div>
          <div className="news-card anim-fadeup">
            <div className="section-head"><Icon name="megaphone" size={12} color="var(--sub)" style={{verticalAlign:-2,marginRight:4}} />Новости академии</div>
            {CONTENT.news.map((n,i)=>(
              <a key={i} className="news-item" href={n.href} target="_blank" rel="noopener">
                <div className="news-item-body">
                  <div className="news-date">{n.date}</div>
                  <div className="news-title">{n.title}</div>
                </div>
                <span className="news-chev"><Icon name="chevron-right" size={16} color="var(--sub)" /></span>
              </a>
            ))}
          </div>
        </div>

      </div>
  );
}
// Materials the teacher attached to this pair today; a tap opens the file in the phone's viewer.
function StudentPairFiles({ lesson }) {
  const { data } = useApi(`/me/lesson-materials?day=${isoDate(new Date())}`, lesson && lesson.period != null);
  const [err, setErr] = useState("");
  const files = (data || []).filter(m => m.period === lesson.period);
  if (!files.length) return null;
  return (
    <div className="tq-card" style={{ flexShrink: 0 }}>
      <div className="tq-item" style={{ cursor: "default", minHeight: 44, fontSize: "0.9375rem", fontWeight: 600 }}>
        <Icon name="paperclip" size={16} color="var(--link)" />Материалы к паре
      </div>
      {files.map(m => (
        <button key={m.id} className="tq-item" onClick={async () => { setErr(""); if (!(await openLessonFile(m.id))) setErr("Не удалось открыть файл"); }}>
          <div className="tp-file-ico" style={{ color: MOCK_MATERIAL_COLOR[m.type] || MOCK_MATERIAL_COLOR.other }}><Icon name={MOCK_MATERIAL_ICON[m.type] || "file"} size={19} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="tq-item-title tp-file-name">{m.name}</div>
            <div className="tq-item-sub">{m.bytes ? (m.bytes >= 1048576 ? (m.bytes / 1048576).toFixed(1) + " МБ" : Math.max(1, Math.round(m.bytes / 1024)) + " КБ") : m.size}</div>
          </div>
          <Icon name="chevron-right" size={18} style={{ color: "var(--sub)", opacity: .6, flexShrink: 0 }} />
        </button>
      ))}
      {err && <div className="tq-note" style={{ color: "var(--bad)", padding: "0 12px 10px" }}>{err}</div>}
    </div>
  );
}

function NextClassModal({ lesson, group, onClose, isTeacher, onJournal }) {
  const [timeLeft, setTimeLeft] = useState("--:--");
  const inProgress = lesson.label === "ИДЁТ ПАРА";
  const hasTime = Array.isArray(lesson?.start) && (!inProgress || Array.isArray(lesson?.end));
  useEffect(() => {
    if (!hasTime) { setTimeLeft("--:--"); return; }
    const calc = () => {
      const now = new Date();
      const target = new Date();
      if (inProgress) {
        target.setHours(lesson.end[0], lesson.end[1], 0, 0);
      } else {
        target.setHours(lesson.start[0], lesson.start[1], 0, 0);
        if (now >= target) target.setDate(target.getDate() + 1);
      }
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      const p = n => String(n).padStart(2, "0");
      setTimeLeft(h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [hasTime, inProgress, lesson?.start?.[0], lesson?.start?.[1], lesson?.end?.[0], lesson?.end?.[1]]);

  const badgeText = lesson.label === "ИДЁТ ПАРА" ? (isTeacher ? "Идёт сейчас" : "● Идёт сейчас")
    : lesson.label === "СЛЕДУЮЩАЯ ПАРА" ? (isTeacher ? "Сегодня" : "● Сегодня")
    : lesson.label === "ОБЕД" ? "Обед"
    : lesson.label === "ВЫХОДНОЙ ДЕНЬ" ? "Выходной"
    : "На сегодня всё";

  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className={`lk-sheet open${isTeacher ? " tq-sheet" : ""}`}>
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#1F5CB8,#0d3585)"}}><Icon name={ICON_BY_SUBJ[lesson.subj] || "book-open"} size={22} color="#FFFFFF" /></div>
          <div>
            <div className="lk-name">{lesson.subj}</div>
            <div className="lk-meta">{tqSentence(lesson.label)}{hasTime ? ` · ${lesson.timeStr}` : ""}</div>
          </div>
          <button className="lk-edit-btn" aria-label="Закрыть" onClick={onClose}>{isTeacher ? "Закрыть" : "✕"}</button>
        </div>
        <div className="lk-body">

          {/* Основная инфо */}
          <div style={{background:"color-mix(in srgb, #8a5cf0 14%, var(--card))",border:"1px solid #1F5CB844",borderRadius:16,padding:16,display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"0.6875rem",letterSpacing:2,color:"var(--link)"}}>{isTeacher ? "Информация о паре" : "Информация о паре"}</span>
              <span style={{fontSize:"0.6875rem",background:"#4CAF6B22",color:"var(--ok)",padding:"3px 10px",borderRadius:20}}>{badgeText}</span>
            </div>
            {[
              {icon:"clock",        label:"Время", val: hasTime ? lesson.timeStr : "—"},
              {icon:"map-pin",      label:"Аудитория", val: lesson.room || "—"},
              ...(isTeacher ? [{icon:"users", label:"Группа", val: lesson.group || "—"}, {icon:"book-open", label:"Предмет", val: lesson.subject || "—"}]
                : [{icon:"presentation", label:"Преподаватель", val: lesson.teacher || "уточняется"}, {icon:"users", label:"Группа", val: group || "—"}]),
            ].map((r,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:"1px solid color-mix(in srgb, var(--line) 20%, transparent)"}}>
                <span style={{width:28,display:"flex",justifyContent:"center",flexShrink:0}}><Icon name={r.icon} size={16} color="var(--link)" /></span>
                <span style={{fontSize:"0.75rem",color:"var(--sub)",width:110,flexShrink:0}}>{r.label}</span>
                <span style={{fontSize:"0.875rem",fontWeight:500}}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* Таймер до пары */}
          {hasTime && (
            <div style={{background:"var(--surface)",border:"1px solid var(--line)",borderRadius:14,padding:14,textAlign:"center"}}>
              <div style={{fontSize:"0.6875rem",letterSpacing:2,color:"var(--sub)",marginBottom:6}}><Icon name="clock" size={12} color="var(--sub)" style={{verticalAlign:-2,marginRight:4}} />{inProgress ? (isTeacher ? "До конца пары" : "До конца пары") : (isTeacher ? "До начала пары" : "До начала пары")}</div>
              <div style={{fontSize:"2rem",fontWeight:800,color:"var(--link)",letterSpacing:2,fontVariantNumeric:"tabular-nums"}}>{timeLeft}</div>
              <div style={{fontSize:"0.6875rem",color:"var(--sub)",marginTop:4}}>{inProgress ? "до конца пары" : "до начала пары"}</div>
            </div>
          )}

          {!isTeacher && <StudentPairFiles lesson={lesson} />}

          {isTeacher && lesson.group && onJournal && (
            <button className="btn-blue" style={{borderRadius:14,padding:14,fontSize:"0.875rem"}} onClick={() => onJournal(lesson)}>Открыть журнал этой пары</button>
          )}
          <button
            className="btn-blue"
            style={{borderRadius:14,padding:14,fontSize:"0.875rem",...(isTeacher && lesson.group && onJournal ? {background:"var(--surface)",border:"1px solid var(--line)"} : {})}}
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </>
  );
}
