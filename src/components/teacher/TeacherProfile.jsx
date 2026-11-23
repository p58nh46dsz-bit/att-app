// Progress ring of the current pair: the arc fills as the pair goes, the percentage sits inside.
// tone: "live" (teaching), "lunch" (the pair's lunch break), "wait" (before the pair: minutes to it inside), "done".
function TQRing({ frac = 0, tone = "wait", waitText = "", size = 84 }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 120); return () => clearTimeout(t); }, []);
  const sw = 7, r = (size - sw - 4) / 2, cx = size / 2;
  const f = tone === "done" ? 1 : Math.min(1, Math.max(0, frac));
  const shown = on ? f : 0;
  const pct = Math.round(f * 100);
  // The ring is drawn as a path that starts at 12 o'clock and runs clockwise, so it fills like a clock face.
  const ring = `M ${cx} ${cx - r} A ${r} ${r} 0 1 1 ${cx} ${cx + r} A ${r} ${r} 0 1 1 ${cx} ${cx - r}`;
  return (
    <div className={`tq-ring2 ${tone}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="tqRingLive" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--ring-a)" /><stop offset="1" stopColor="var(--ring-b)" /></linearGradient>
          <linearGradient id="tqRingLunch" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F5B547" /><stop offset="1" stopColor="#E07B22" /></linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" className="tq-ring2-track" strokeWidth={sw} />
        <path d={ring} fill="none" stroke={tone === "lunch" ? "url(#tqRingLunch)" : "url(#tqRingLive)"} strokeWidth={sw} strokeLinecap="round"
          pathLength="100" strokeDasharray="100 100" strokeDashoffset={100 - shown * 100} className="tq-ring2-arc" style={{ opacity: shown > 0.002 ? 1 : 0 }} />
      </svg>
      <div className="tq-ring2-center">
        {tone === "done" ? <Icon name="check" size={size * 0.3} strokeWidth={2.6} />
          : tone === "wait" ? <><small>через</small><b className="w">{waitText}</b></>
          : <><b>{pct}<i>%</i></b>{tone === "lunch" && <small>обед</small>}</>}
      </div>
    </div>
  );
}
const waitShort = sec => { const m = Math.ceil(sec / 60); return m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч${m % 60 ? " " + (m % 60) : ""}`; };
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
function TeacherProfile({ active, avatar, user, teacherUnreadCount, setNotifRole, setNotifOpen, setScreen, setTeacherLkOpen, teacherLesson, teacherLessons, scheduleStatus, setGroupModal, setRosterModal, setJournalOpen, setNextClassOpen, setTeacherGradeOpen, setTeacherMsgOpen, setTeacherMaterialsOpen, setLkInner, onJournalPair, lunchToday, setLunchChoice }) {
  const groups = user && user.groups ? user.groups : [];
  const [scrolled, setScrolled] = useState(false);
  const { data: groupList } = useApi("/groups", active && !!user);
  const plural = n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "студент" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "студента" : "студентов"}`;
  const groupCounts = Object.fromEntries((groupList || []).map(g => [g.code, plural(g.count)]));
  // The ring follows the pair; a light tick keeps it moving between the app's 30-second schedule refreshes.
  const [, setTick] = useState(0);
  useEffect(() => { if (!active) return; const id = setInterval(() => setTick(t => t + 1), 15000); return () => clearInterval(id); }, [active]);
  const today = isoDate(new Date());
  // Lunch of the 1st–2nd buildings: today's choice lives on the server (the group's students follow it);
  // the last answer for this weekday and group is remembered here as a hint for next time.
  const [lunchHints, setLunchHints] = useState(() => (loadJSON("att_lunch", {}) || {}).last || {});
  const lunchKey = l => `${new Date().getDay()}|${l.group || ""}`;
  const answerLunch = (value, pair) => {
    if (!pair || !pair.group) return;
    tqTap();
    setLunchChoice(pair.group, value);
    const last = { ...lunchHints, [lunchKey(pair)]: value };
    setLunchHints(last);
    saveJSON("att_lunch", { last });
  };
  // The pair's sheet (tap on the widget) and today's materials attached to pairs.
  const [pairOpen, setPairOpen] = useState(false);
  const { data: pairMaterials, load: reloadPairMaterials } = useApi(`/me/lesson-materials?day=${today}`, active && !!user);
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
          <div className="tq-dash-body">{/* everything under the header, on the page colour (see constants.js) */}
          {(() => {
            const now = new Date();
            const nowMin = now.getHours() * 60 + now.getMinutes();
            const nowSec = nowMin * 60 + now.getSeconds();
            const idle = teacherLesson.timeStr === "—";
            // Lunch in the 1st–2nd buildings: the teacher says whether the 2nd pair breaks for it today.
            const p2 = lunchPair(teacherLessons);
            const choice = p2 && lunchToday ? lunchToday[p2.group] : undefined;
            const split = !!p2 && choice === "split";
            const ask = !!p2 && !choice && nowMin >= 10 * 60 + 30 && nowMin < 11 * 60 + 30;
            const segs = lunchSegments(teacherLessons, split);
            const lesson = idle ? teacherLesson : getNextLesson(segs, true);
            const prog = idle ? null : pairProgress(lesson, segs, nowSec);
            const live = !!prog && prog.state === "live";
            const hint = p2 ? lunchHints[lunchKey(p2)] : null;
            const clips = idle ? 0 : (pairMaterials || []).filter(m => m.group === lesson.group && m.period === lesson.period).length;
            return (<>
              <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="tq-hero anim-fadeup" onClick={() => idle ? setLkInner("tschedule") : setPairOpen(true)}>
                {idle ? <TQRing tone="done" />
                  : <TQRing tone={prog.state} frac={prog.frac} waitText={waitShort(prog.left)} />}
                <div className="tq-hero-body">
                  {idle ? (
                    <div className="tq-hero-title">{lesson.subj}</div>
                  ) : (<>
                    <div className="tq-hero-title">{live && <span className="tq-live" title="Идёт сейчас" />}{lesson.group || lesson.subj}</div>
                    {(lesson.subject || (lesson.group && lesson.subj)) && <div className="tq-hero-sub">{lesson.subject || String(lesson.subj).replace(lesson.group + " · ", "")}</div>}
                    <div className="tq-hero-chips">
                      <span>{lesson.timeStr}</span>
                      {lesson.room ? <span>ауд. {lesson.room}</span> : null}
                      {ask && <span className="tq-chip-ask"><Icon name="clock" size={12} strokeWidth={2.4} />Обед?</span>}
                      {clips > 0 && <span className="tq-chip-clip" aria-label={`Прикреплено файлов: ${clips}`}><Icon name="paperclip" size={12} strokeWidth={2.4} />{clips}</span>}
                    </div>
                  </>)}
                </div>
              </div>
              {pairOpen && !idle && (
                <TeacherPairSheet lessons={teacherLessons} split={split} choice={choice} hint={hint}
                  onLunch={v => answerLunch(v, p2)} materials={pairMaterials} reloadMaterials={reloadPairMaterials}
                  onJournal={l => { setPairOpen(false); onJournalPair && onJournalPair(l); }} onClose={() => setPairOpen(false)} />
              )}
            </>);
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
</div>
  );
}
