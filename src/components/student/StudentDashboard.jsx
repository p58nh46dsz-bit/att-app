// Student dashboard screen (extracted from App's inline JSX) + NextClassModal (triggered from the next-class card here).
function StudentDashboard({ active, unreadCount, setNotifRole, setNotifOpen, setSearchOpen, setLkOpen, nextLesson, setNextClassOpen, setLkInner, schedule, scheduleStatus, realLessons }) {
  return (
      <div className={`screen${active ? " active" : ""}`}>
        <div className="topbar">
          <div className="topbar-left">
            <button className="notif-btn" aria-label="Уведомления" onClick={()=>{setNotifRole("student");setNotifOpen(true);setSearchOpen(false);}}>🔔{unreadCount > 0 && <span className="badge">{unreadCount}</span>}</button>
            <button className="search-btn" aria-label="Поиск" onClick={()=>{setSearchOpen(true);setNotifOpen(false);}}>🔍</button>
          </div>
          <div className="avatar-row" style={{cursor:"pointer"}} onClick={()=>setLkOpen(true)}>
            <div className="avatar" style={{boxShadow:"0 0 0 2px #1F5CB8",transition:"box-shadow .2s"}}>Д</div>
            <span className="avatar-name">Даниил В.</span>
            <span className="tag-role">студент</span>
          </div>
        </div>
        <div className="dash">
          <div className="greeting anim-fadeup">
            <h1>Здравствуй, Даниил</h1>
            <span className="group-tag">Группа: ДВ-41</span>
          </div>
          <div className="next-class anim-fadeup" style={{cursor:"pointer"}} onClick={()=>setNextClassOpen(true)}>
            <div className="next-class-label">
              {nextLesson.label==="ИДЁТ ПАРА"?"🟢":"⏰"} {nextLesson.label}
            </div>
            <div className="next-class-row">
              <div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{nextLesson.subj}</div>
                <div style={{ fontSize: 13, color: C.sub }}>{nextLesson.room}</div>
                {nextLesson.online && <div className="link-tag">🔗 Ссылка на вход</div>}
              </div>
              <div className="next-class-time">{nextLesson.timeStr}</div>
            </div>
          </div>
          <div className="stats-row anim-fadeup">
            <div className="stat-card" style={{cursor:"pointer"}} onClick={()=>setLkInner("grades")}>
              <div className="stat-label"><span style={{color:C.green}}>●</span> Долги</div>
              <div className="stat-val">1</div>
              <div className="bar-track"><div className="bar-fill" style={{width:"20%"}} /></div>
              <div style={{fontSize:10,color:"#7B9DBF",marginTop:6}}>Нажми, чтобы посмотреть →</div>
            </div>
            <div className="stat-card" style={{cursor:"pointer"}} onClick={()=>setLkInner("grades")}>
              <div className="stat-label">📊 Средний балл</div>
              <div className="stat-val">4.6 ↑</div>
              <div className="bar-track"><div className="bar-fill accent" style={{width:"80%"}} /></div>
              <div style={{fontSize:10,color:"#7B9DBF",marginTop:6}}>Нажми, чтобы посмотреть →</div>
            </div>
          </div>
          <div className="quick-grid anim-fadeup">
            {[
              {icon:"🗓", label:"Расписание",   lk:"schedule", bg:"#0d1e48"},
              {icon:"📊", label:"Оценки",       lk:"grades",   bg:"#0d2244"},
              {icon:"💬", label:"Консультации", lk:"consult",  bg:"#0d1e3a"},
              {icon:"📋", label:"Справки",      lk:"spravki",  bg:"#0d1e3a"},
            ].map(b=>(
              <div key={b.label} className="quick-btn" onClick={()=>setLkInner(b.lk)}>
                <div className="quick-icon-box" style={{background:b.bg}}>
                  <span>{b.icon}</span>
                </div>
                <span className="quick-lbl">{b.label}</span>
              </div>
            ))}
          </div>
          <div className="section-card anim-fadeup">
            <div className="section-head">
              📅 РАСПИСАНИЕ НА СЕГОДНЯ{schedule && schedule.weekday ? ` · ${schedule.weekday}` : ""}
            </div>
            {scheduleStatus === "loading" && (
              <div style={{fontSize:13,color:C.sub,padding:"6px 0"}}>Загрузка расписания…</div>
            )}
            {scheduleStatus === "error" && (
              <div style={{fontSize:13,color:C.sub,padding:"6px 0"}}>⚠ Расписание временно недоступно. Показаны примерные данные.</div>
            )}
            {scheduleStatus === "ok" && realLessons.length === 0 && (
              <div style={{fontSize:13,color:C.sub,padding:"6px 0"}}>Сегодня пар нет</div>
            )}
            {(scheduleStatus === "ok" ? realLessons : STUDENT_LESSONS_FALLBACK).map((l,i)=>(
              <div key={i} className="schedule-row">
                <span className="sch-time">{fmt(...l.start)}</span>
                <span className="sch-subj">{l.subj}</span>
                <span className="sch-room">{l.room}</span>
              </div>
            ))}
          </div>
          <div className="deadline-card anim-fadeup">
            <span style={{fontSize:20}}>⚠️</span>
            <div>
              <div className="section-head" style={{margin:0}}>БЛИЖАЙШИЙ ДЕДЛАЙН</div>
              <div style={{fontSize:13}}>Курсовая по физике</div>
              <div style={{fontSize:11,color:C.amber,marginTop:2}}>15 мая</div>
            </div>
          </div>
          <div className="news-card anim-fadeup">
            <div className="section-head">📢 НОВОСТИ АКАДЕМИИ</div>
            <div className="news-item">• Изменение расписания на 20 мая</div>
            <div className="news-item">• Студенческий форум — 22 мая</div>
            <div className="news-item">• Сдача зачётной книжки до 1 июня</div>
          </div>
        </div>

      </div>
  );
}
function NextClassModal({ lesson, onClose }) {
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

  const badgeText = lesson.label === "ИДЁТ ПАРА" ? "● Идёт сейчас"
    : lesson.label === "СЛЕДУЮЩАЯ ПАРА" ? "● Сегодня"
    : lesson.label === "ВЫХОДНОЙ ДЕНЬ" ? "Выходной"
    : "На сегодня всё";

  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#1F5CB8,#0d3585)",fontSize:20}}>{ICON_BY_SUBJ[lesson.subj] || "📚"}</div>
          <div>
            <div className="lk-name">{lesson.subj}</div>
            <div className="lk-meta">{lesson.label}{hasTime ? ` · ${lesson.timeStr}` : ""}</div>
          </div>
          <button className="lk-edit-btn" aria-label="Закрыть" onClick={onClose}>✕</button>
        </div>
        <div className="lk-body">

          {/* Основная инфо */}
          <div style={{background:"linear-gradient(135deg,#2a2050,#1e1a3a)",border:"1px solid #1F5CB844",borderRadius:16,padding:16,display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,letterSpacing:2,color:"#4A8FE7"}}>ИНФОРМАЦИЯ О ПАРЕ</span>
              <span style={{fontSize:11,background:"#4CAF6B22",color:"#5ec97a",padding:"3px 10px",borderRadius:20}}>{badgeText}</span>
            </div>
            {[
              {icon:"🕐", label:"Время", val: hasTime ? lesson.timeStr : "—"},
              {icon:"📍", label:"Аудитория", val: lesson.room || "—"},
              {icon:"👩‍🏫", label:"Преподаватель", val: lesson.teacher || TEACHER_BY_SUBJ[lesson.subj] || "уточняется"},
              {icon:"👥", label:"Группа", val:"ДВ-41"},
            ].map((r,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:"1px solid #1E356033"}}>
                <span style={{fontSize:18,width:28,textAlign:"center",flexShrink:0}}>{r.icon}</span>
                <span style={{fontSize:12,color:"#7B9DBF",width:110,flexShrink:0}}>{r.label}</span>
                <span style={{fontSize:14,fontWeight:500}}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* Ссылка на онлайн */}
          {lesson.online && (
            <div style={{background:"#0f2040",border:"1px solid #4A8FE733",borderRadius:14,padding:14,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
              <span style={{fontSize:22}}>🔗</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Ссылка на онлайн-занятие</div>
                <div style={{fontSize:11,color:"#6fb3f5"}}>meet.att-academy.ru/dv41</div>
              </div>
              <span style={{fontSize:12,color:"#6fb3f5",fontWeight:600}}>Войти →</span>
            </div>
          )}

          {/* Материалы */}
          <div style={{background:"#142240",borderRadius:14,padding:14}}>
            <div style={{fontSize:10,letterSpacing:2,color:"#7B9DBF",marginBottom:10}}>📎 МАТЕРИАЛЫ К ПАРЕ</div>
            {[
              {icon:"📄", name:`Лекция_${lesson.subj}.pdf`, size:"1.2 МБ"},
              {icon:"📊", name:"Задачи_практика.docx", size:"340 КБ"},
            ].map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #1E356022",cursor:"pointer"}}>
                <span style={{fontSize:20}}>{f.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13}}>{f.name}</div>
                  <div style={{fontSize:11,color:"#7B9DBF"}}>{f.size}</div>
                </div>
                <span style={{fontSize:12,color:"#4A8FE7"}}>↓</span>
              </div>
            ))}
          </div>

          {/* Таймер до пары */}
          {hasTime && (
            <div style={{background:"#0f1c35",border:"1px solid #1E3560",borderRadius:14,padding:14,textAlign:"center"}}>
              <div style={{fontSize:11,letterSpacing:2,color:"#7B9DBF",marginBottom:6}}>{inProgress ? "⏱ ДО КОНЦА ПАРЫ" : "⏱ ДО НАЧАЛА ПАРЫ"}</div>
              <div style={{fontSize:32,fontWeight:800,color:"#4A8FE7",letterSpacing:2,fontVariantNumeric:"tabular-nums"}}>{timeLeft}</div>
              <div style={{fontSize:11,color:"#7B9DBF",marginTop:4}}>{inProgress ? "до конца пары" : "до начала пары"}</div>
            </div>
          )}

          <button
            className="btn-blue"
            style={{borderRadius:14,padding:14,fontSize:14}}
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </>
  );
}
