// Progress ring of the day: pairs done out of pairs total. The arc grows from empty on mount.
function TQRing({ done, total, size = 84 }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 120); return () => clearTimeout(t); }, []);
  const r = (size - 10) / 2, c = 2 * Math.PI * r;
  const frac = total > 0 ? done / total : 0;
  const finished = total > 0 && done >= total;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="tq-ring" aria-hidden="true" style={{color:"var(--text)"}}>
      <defs>
        <linearGradient id="tqRingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--ring-a)" /><stop offset="1" stopColor="var(--ring-b)" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#tqRingGrad)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={on ? c * (1 - frac) : c} transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)" }} />
      {total > 0 && <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="currentColor" fontSize={size * 0.27} fontWeight="700" style={{fontVariantNumeric:"tabular-nums"}}>{finished ? "✓" : `${done}/${total}`}</text>}
    </svg>
  );
}
// A number that counts up to its value when the screen opens.
function TQCount({ value }) {
  const num = typeof value === "number" ? value : null;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (num === null) return;
    let raf, t0;
    const step = t => { t0 = t0 || t; const k = Math.min(1, (t - t0) / 700); setShown(Math.round(num * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [num]);
  return <>{num === null ? "—" : shown}</>;
}

// Teacher dashboard screen (extracted from App's inline JSX) — teacher role's main/landing screen.
function TeacherProfile({ active, avatar, user, teacherUnreadCount, setNotifRole, setNotifOpen, setScreen, setTeacherLkOpen, teacherLesson, teacherLessons, scheduleStatus, setGroupModal, setRosterModal, setJournalOpen, setNextClassOpen, setTeacherGradeOpen, setTeacherMsgOpen, setTeacherMaterialsOpen, setLkInner }) {
  const groups = user && user.groups ? user.groups : [];
  const [scrolled, setScrolled] = useState(false);
  const { data: groupList } = useApi("/groups", active && !!user);
  const plural = n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "студент" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "студента" : "студентов"}`;
  const groupCounts = Object.fromEntries((groupList || []).map(g => [g.code, plural(g.count)]));
  return (
      <div className={`screen tq-app${active ? " active" : ""}${scrolled ? " tq-scrolled" : ""}`}>
        <div className="tq-orbs" aria-hidden="true"><i /><i /><i /></div>
        <div className="tq-edge" aria-hidden="true" />
        <div className="dash tq-dash" onScroll={e => { const v = e.currentTarget.scrollTop > 8; if (v !== scrolled) setScrolled(v); }}>
        <div className="tq-masthead">
        <div className="tq-top">
            <button className="notif-btn" aria-label="Уведомления" onClick={()=>{setNotifRole("teacher");setNotifOpen(true);}}><Icon name="bell" size={22} color="#FFFFFF" style={{verticalAlign:-4}} />{teacherUnreadCount > 0 && <span className="badge">{teacherUnreadCount}</span>}</button>
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="tq-me" aria-label="Личный кабинет" onClick={()=>setTeacherLkOpen(true)}>
              <TQAvatar user={user} image={avatar} size={36} />
            </div>
          </div>
          <div className="tq-hello anim-fadeup">
            <div className="tq-hello-date">{new Date().toLocaleDateString("ru-RU", { weekday:"long", day:"numeric", month:"long" })}</div>
            <h1>{(() => { const h = new Date().getHours(); return h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер"; })()},<br/><span>{user ? user.firstName + " " + user.middleName : ""}</span></h1>
          </div>
          </div>
          {(() => {
            const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
            const total = teacherLessons.length;
            const done = teacherLessons.filter(l => l.end[0] * 60 + l.end[1] <= nowMin).length;
            const idle = teacherLesson.timeStr === "—";
            return (
              <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="tq-hero anim-fadeup" onClick={()=>setLkInner("tschedule")}>
                <TQRing done={done} total={total} />
                <div className="tq-hero-body">
                  {idle ? (
                    <div className="tq-hero-title">{teacherLesson.subj}</div>
                  ) : (<>
                    <div className="tq-hero-kicker">{teacherLesson.label === "ИДЁТ ПАРА" ? <><span className="tq-live" />Идёт сейчас</> : "Дальше"}</div>
                    <div className="tq-hero-title">{teacherLesson.subj}</div>
                    <div className="tq-hero-meta">{teacherLesson.timeStr}{teacherLesson.room ? ` · ауд. ${teacherLesson.room}` : ""}</div>
                  </>)}
                </div>
              </div>
            );
          })()}
          <div className="stats-row anim-fadeup">
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="stat-card" style={{cursor:"pointer"}} onClick={()=>setRosterModal("groups")}>
              <div className="stat-label"><Icon name="users" size={13} color="var(--link)" style={{verticalAlign:-2}} /> Мои группы</div>
              <div className="stat-val"><TQCount value={groups.length} /></div>
            </div>
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="stat-card" style={{cursor:"pointer"}} onClick={()=>setRosterModal("students")}>
              <div className="stat-label"><Icon name="graduation-cap" size={13} color="var(--link)" style={{verticalAlign:-2}} /> Студентов</div>
              <div className="stat-val"><TQCount value={groupList ? groupList.reduce((n, g) => n + g.count, 0) : null} /></div>
            </div>
          </div>
          <div className="quick-carousel anim-fadeup">
            {[
              {icon:"users",     label:"Журнал",    act:()=>setJournalOpen(true), bg:"var(--surface2)"},
              {icon:"pencil",    label:"Оценки", act:()=>setTeacherGradeOpen(true), bg:"var(--surface2)"},
              {icon:"calendar",  label:"Расписание", act:()=>setLkInner("tschedule"), bg:"var(--surface2)"},
              {icon:"megaphone", label:"Сообщение", act:()=>setTeacherMsgOpen(true), bg:"var(--surface2)"},
              {icon:"paperclip", label:"Материалы", act:()=>setTeacherMaterialsOpen(true), bg:"var(--surface2)"},
            ].map(b=>(
              <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={b.label} className="quick-btn" onClick={b.act||undefined}>
                <div className="quick-icon-box" style={{background:b.bg}}>
                  <Icon name={b.icon} size={32} color="var(--link2)" strokeWidth={1.6} />
                </div>
                <span className="quick-lbl">{b.label}</span>
              </div>
            ))}
          </div>
          <div className="section-card anim-fadeup">
            <div className="section-head tq-head">Мои группы</div>
            {groups.length === 0 && (
              <div style={{fontSize:"0.8125rem",color:C.sub,lineHeight:1.6,padding:"4px 0 8px"}}>
                Вы ещё не выбрали группы. Выберите их из списка и укажите предметы, которые ведёте.
              </div>
            )}
            {groups.length > 0 && <div className="tq-list" style={{background:"var(--surface)"}}>
              {groups.map(name=>({name,count:groupCounts[name]||"—"})).map(g=>(
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={g.name} className="tq-row" onClick={()=>setGroupModal(g.name)}>
                  <span style={{flex:1,fontSize:"0.9375rem",fontWeight:500}}>{g.name}</span>
                  <span style={{fontSize:"0.75rem",color:C.sub}}>{g.count}</span>
                </div>
              ))}
            </div>}
            <button className="btn-blue" style={{borderRadius:12,padding:"12px 16px",marginTop:12,width:"100%",minHeight:44}} onClick={()=>setLkInner("teaching")}>
              {groups.length === 0 ? "Выбрать группы и предметы" : "Группы и предметы"}
            </button>
          </div>
          <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="section-card anim-fadeup" style={{cursor:"pointer"}} onClick={()=>setLkInner("tschedule")}>
            <div className="section-head tq-head" style={{justifyContent:"space-between"}}><span>Расписание на сегодня</span><span style={{color:"var(--link)"}}>Вся неделя</span></div>
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
        </div>
</div>
  );
}
