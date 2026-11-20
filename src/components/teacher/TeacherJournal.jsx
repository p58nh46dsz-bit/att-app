// TeacherJournal — "Журнал группы". Step 1: the teacher's groups; step 2: the group's students, marked as
// present / absent for a subject and a day. Marks are kept in the database (attendance_records): opening the
// same group, subject and day again shows them, saving again updates them.
function TeacherJournal({ user, initialPair, lessons = [], scheduleStatus, onGroupsChanged, onClose, onOpenTeaching }) {
  const groups = user && user.groups ? user.groups : [];
  const [group, setGroup] = useState(null);             // null = choosing a group
  const [pickedSubject, setSubject] = useState(null);
  const [date, setDate] = useState(() => isoDate(new Date()));
  const { data: counts } = useApi("/groups", !group);   // student counts for the list of groups
  const { data: info } = useApi(group ? "/groups/" + encodeURIComponent(group) : null, !!group);
  const { data: teaching, setData: setTeaching } = useApi("/me/teaching", true);
  const [tab, setTab] = useState("marks");             // "marks" | "history"
  const [pairBusy, setPairBusy] = useState(null);       // index of the pair being opened
  const [pairError, setPairError] = useState("");
  const roster = info ? info.roster : [];
  const subjects = (group && teaching && teaching.groups.find(g => g.code === group) || { subjects: [] }).subjects;
  const subject = subjects.includes(pickedSubject) ? pickedSubject : (subjects[0] || null);
  const histPath = group && subject && tab === "history" ? `/me/journal/history?group=${encodeURIComponent(group)}&subject=${encodeURIComponent(subject)}` : null;
  const { data: hist, error: histError } = useApi(histPath, !!histPath);
  const [marks, setMarks] = useState({});               // place id -> present | absent
  const [loadState, setLoadState] = useState("idle");   // idle | loading | ok | error
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(null);
  const STATUS = [
    { key: "present", label: "был", color: "#4CAF6B", short: "был" },
    { key: "absent", label: "не был", color: "#E84C4C", short: "не был" },
  ];
  useEffect(() => {
    if (!group || !subject || !date) { setMarks({}); setLoadState("idle"); return; }
    let live = true;
    setLoadState("loading"); setSaveError(""); setSaved(null);
    apiAuthed(`/me/journal?group=${encodeURIComponent(group)}&subject=${encodeURIComponent(subject)}&date=${date}`).then(r => {
      if (!live) return;
      if (r.status === 200) { setMarks(Object.fromEntries(Object.entries(r.data.marks || {}).map(([id, st]) => [id, st === "late" ? "present" : st]))); setLoadState("ok"); }   // "late" is no longer offered: an old one counts as present else { setMarks({}); setLoadState("error"); }
    });
    return () => { live = false; };
  }, [group, subject, date]);
  const mark = (id, status) => { tqTap(); setSaved(null); setMarks(m => { const n = { ...m }; if (n[id] === status) delete n[id]; else n[id] = status; return n; }); };
  const markAll = status => { setSaved(null); setMarks(Object.fromEntries(roster.map(r => [r.id, status]))); };
  const tally = key => roster.filter(r => marks[r.id] === key).length;
  const save = async () => {
    setSaving(true); setSaveError(""); setSaved(null);
    const entries = roster.map(r => ({ studentId: r.id, status: marks[r.id] || null }));
    const r = await apiAuthed("/me/journal", { method: "PUT", body: { groupCode: group, subject, date, entries } });
    setSaving(false);
    if (r.status === 200) setSaved(r.data);
    else setSaveError(r.status === 0 ? "Нет связи с сервером. Отметки не сохранены." : (r.data && r.data.error) || "Не удалось сохранить отметки. Попробуйте ещё раз.");
  };
  // A pair of today's timetable: its group and subject are taken as the ones the teacher has (added to "Мои группы и
  // предметы" if they weren't there yet), and the journal of that group opens with the subject chosen.
  const openPair = async (l, i) => {
    if (pairBusy !== null) return;
    setPairError("");
    if (!l.group) { setPairError("В расписании для этой пары не указана группа: выберите группу из списка ниже."); return; }
    setPairBusy(i);
    let state = teaching;
    if (!groups.includes(l.group)) {
      const r = await apiAuthed("/me/teaching/groups", { method: "POST", body: { code: l.group } });
      if (r.status !== 201) { setPairBusy(null); setPairError((r.data && r.data.error === "Такой группы нет в списке.") ? `Группы ${l.group} ещё нет в списке колледжа. Её должен добавить администратор.` : "Не удалось открыть группу. Попробуйте ещё раз."); return; }
      state = r.data;
    }
    if (l.subject && !((state && state.groups.find(g => g.code === l.group) || { subjects: [] }).subjects || []).some(x => x.toLowerCase() === l.subject.toLowerCase())) {
      const r = await apiAuthed("/me/teaching/subjects", { method: "POST", body: { group: l.group, subject: l.subject } });
      if (r.status === 201) state = r.data;
    }
    if (state) setTeaching(state);
    if (onGroupsChanged) onGroupsChanged();
    const exact = state && (state.groups.find(g => g.code === l.group) || { subjects: [] }).subjects.find(x => l.subject && x.toLowerCase() === l.subject.toLowerCase());
    setSubject(exact || null); setDate(isoDate(new Date())); setGroup(l.group); setPairBusy(null);
  };
  useEffect(() => { if (initialPair) openPair(initialPair, -1); }, []);   // opened for one pair (from the timetable)
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const pairState = l => { const s = l.start[0] * 60 + l.start[1], e = l.end[0] * 60 + l.end[1]; return nowMin >= s && nowMin < e ? "now" : nowMin < s ? "next" : "past"; };
  const firstNext = lessons.findIndex(l => pairState(l) !== "past");
  const back = () => { setTab("marks"); setGroup(null); setSubject(null); setMarks({}); setSaved(null); setSaveError(""); };
  const unmarked = roster.length - tally("present") - tally("absent");
  const dateLabel = date === isoDate(new Date()) ? "Сегодня" : date.split("-").reverse().join(".");
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open tq-sheet">
        <div className="lk-handle" />
        <TQSheetHead title={group ? group : "Журнал"} sub={group ? (subject ? `${subject} · ${dateLabel}` : "Выберите предмет") : "Отметьте, кто был на паре"} onClose={onClose} onBack={group ? back : null} />
        <div className="tq-sh-body">
          {!group && <>
            <div className="tq-sec">Пары сегодня</div>
            {lessons.length === 0 && <div className="tq-card"><div className="tq-item" style={{cursor:"default"}}><div className="tq-item-sub" style={{marginTop:0}}>
              {scheduleStatus === "loading" ? "Загружаем расписание…" : scheduleStatus === "error" ? "Расписание сейчас недоступно" : "Сегодня пар нет"}
            </div></div></div>}
            {lessons.length > 0 && <div className="tq-card">
              {lessons.map((l, i) => {
                const st = pairState(l);
                return (
                  <button key={i} className="tq-item" onClick={() => openPair(l, i)} style={{opacity:st === "past" ? 0.55 : 1}}>
                    <div style={{width:46,flexShrink:0}}>
                      <div style={{fontSize:"0.9375rem",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{fmt(...l.start)}</div>
                      <div style={{fontSize:"0.6875rem",color:"var(--sub)",fontVariantNumeric:"tabular-nums"}}>{fmt(...l.end)}</div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="tq-item-title">{l.group || "Группа не указана"}</div>
                      <div className="tq-item-sub" style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.subject || "Предмет не указан"}{l.room ? ` · ауд. ${l.room}` : ""}</div>
                    </div>
                    {pairBusy === i ? <span className="tq-pill">Открываем…</span> : st === "now" ? <span className="tq-pill now">Идёт</span> : i === firstNext ? <span className="tq-pill next">Далее</span> : st === "past" ? <span className="tq-pill">Прошла</span> : null}
                    <Icon name="chevron-right" size={18} className="tq-chev" style={{color:"var(--sub)",opacity:.6,flexShrink:0}} />
                  </button>
                );
              })}
            </div>}
            {pairError && <div role="alert" className="tq-note" style={{color:"var(--warn)"}}>{pairError}</div>}
            <div className="tq-sec">Все группы</div>
            {groups.length === 0 && <TQEmpty kind="people" title="Групп пока нет" text="Выберите группы, в которых преподаёте."><button className="tq-btn" style={{marginTop:6}} onClick={onOpenTeaching}>Выбрать группы и предметы</button></TQEmpty>}
            {groups.length > 0 && <div className="tq-card">
              {groups.map(code => {
                const c = (counts || []).find(x => x.code === code);
                return (
                  <button key={code} className="tq-item" onClick={() => setGroup(code)}>
                    <div className="tq-ava" style={{borderRadius:12}}><Icon name="users" size={17} /></div>
                    <div style={{flex:1}}>
                      <div className="tq-item-title">{code}</div>
                      <div className="tq-item-sub">{c ? `${c.count} ${rusPlural(c.count, "студент", "студента", "студентов")}` : "…"}</div>
                    </div>
                    <Icon name="chevron-right" size={18} style={{color:"var(--sub)",opacity:.6,flexShrink:0}} />
                  </button>
                );
              })}
            </div>}
            <div style={{height:20,flexShrink:0}} />
          </>}
          {group && <>
            {subjects.length > 1 && <><div className="tq-sec">Предмет</div><TQChips label="Предмет" items={subjects} value={subject} onPick={setSubject} /></>}
            {subjects.length === 0 && (
              <div className="tq-card"><div style={{padding:16,fontSize:"0.875rem",lineHeight:1.5}}>
                Для группы {group} не указаны предметы.
                <button className="tq-btn ghost" style={{marginTop:12,minHeight:44}} onClick={onOpenTeaching}>Указать предметы</button>
              </div></div>
            )}
            {subject && <div className="tq-seg" role="tablist" aria-label="Раздел" style={{marginTop:6}}>
              {[["marks","Отметки"],["history","История"]].map(([k, label]) => (
                <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "active" : ""} onClick={() => { tqTap(); setTab(k); }}>{label}</button>
              ))}
            </div>}
            {subject && tab === "history" && <JournalHistory hist={hist} error={histError}
              onOpenDay={d => { setDate(d); setTab("marks"); }} />}
            {tab === "marks" && subjects.length > 0 && <div className="tq-sec">Дата</div>}
            {tab === "marks" && subjects.length > 0 && <input aria-label="Дата" className="tq-field" type="date" value={date} max={isoDate(new Date())} onChange={e=>{ if (e.target.value) setDate(e.target.value); }} />}
            {subject && tab === "marks" && <>
              <div className="tq-card tq-stats" style={{marginTop:8}}>
                <div><b style={{color:"var(--ok)"}}>{tally("present")}</b><span>были</span></div>
                <div><b style={{color:"var(--bad)"}}>{tally("absent")}</b><span>не были</span></div>
                <div><b>{unmarked}</b><span>без отметки</span></div>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 4px 2px"}}>
                <span style={{fontSize:"0.8125rem",fontWeight:600,color:"var(--sub)"}}>{loadState === "loading" ? "Загружаем отметки…" : loadState === "error" ? "Отметки не загрузились" : "Студенты"}</span>
                <button className="tq-chip" style={{padding:"6px 12px"}} onClick={()=>{ tqTap(); markAll("present"); }}>Все были</button>
              </div>
              {!info && <TQSkeleton rows={6} />}
              {roster.length === 0 && info && <TQEmpty kind="people" title="Студентов нет" text="В этой группе пока нет студентов." />}
              {roster.length > 0 && <div className="tq-card">
                {roster.map(r => {
                  const m = marks[r.id];
                  return (
                    <div key={r.id} className="tq-item" style={{cursor:"default"}}>
                      <div className="tq-ava">{tqInitials(r.fullName || r.name)}</div>
                      <div style={{flex:1,minWidth:0,fontSize:"0.875rem",fontWeight:500,lineHeight:1.3}}>{r.fullName || r.name}</div>
                      <div className="tq-yn" role="group" aria-label={r.fullName || r.name}>
                        <button aria-pressed={m === "present"} aria-label="Был" className={m === "present" ? "yes" : ""} onClick={()=>mark(r.id, "present")}><Icon name="check" size={16} strokeWidth={2.5} /></button>
                        <button aria-pressed={m === "absent"} aria-label="Не был" className={m === "absent" ? "no" : ""} onClick={()=>mark(r.id, "absent")}><Icon name="x" size={16} strokeWidth={2.5} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>}
              <div className="tq-foot">
                {saveError && <div role="alert" className="tq-note" style={{color:"var(--bad)"}}>{saveError}</div>}
                {saved && <div role="status" className="tq-note" style={{color:"var(--ok)"}}>Сохранено: были {saved.present}, не были {saved.absent}{saved.cleared ? `, без отметки ${saved.cleared}` : ""}</div>}
                <button className="tq-btn" disabled={!roster.length||loadState==="loading"||saving} onClick={save}>{saving ? "Сохраняем…" : "Сохранить"}</button>
              </div>
            </>}
            {!subject && <div style={{height:20,flexShrink:0}} />}
          </>}
        </div>
      </div>
    </>
  );
}

// "История" of a journal: attendance day by day, and the share of lessons each student attended.
function JournalHistory({ hist, error, onOpenDay }) {
  if (error) return <div className="tq-note" style={{color:"var(--bad)"}}>Не удалось загрузить историю.</div>;
  if (!hist) return <TQSkeleton rows={4} />;
  const WD = ["вс","пн","вт","ср","чт","пт","сб"];
  const label = d => { const x = new Date(d + "T12:00:00"); return `${String(x.getDate()).padStart(2, "0")}.${String(x.getMonth() + 1).padStart(2, "0")}, ${WD[x.getDay()]}`; };
  const tone = p => p === null ? "var(--sub)" : p >= 85 ? "var(--ok)" : p >= 70 ? "var(--warn)" : "var(--bad)";
  if (hist.days.length === 0) return <TQEmpty kind="calendar" title="Пока нет отметок" text="Отметьте, кто был на паре, и здесь появится история." />;
  return <>
    <div className="tq-sec">По дням</div>
    <div className="tq-card">
      {hist.days.slice(0, 40).map(d => {
        const n = d.present + d.absent, pct = n ? Math.round(d.present * 100 / n) : 0;
        return (
          <button key={d.date} className="tq-item" onClick={() => onOpenDay(d.date)}>
            <div style={{flex:1,minWidth:0}}>
              <div className="tq-item-title" style={{fontSize:"0.875rem"}}>{label(d.date)}</div>
              <div className="tq-meter"><i style={{width:pct + "%"}} /></div>
            </div>
            <div style={{textAlign:"right",fontSize:"0.8125rem",fontVariantNumeric:"tabular-nums"}}>
              <b>{d.present}</b><span style={{color:"var(--sub)"}}> из {n}</span>
              {d.absent > 0 && <div style={{color:"var(--bad)",fontSize:"0.6875rem"}}>не было {d.absent}</div>}
            </div>
            <Icon name="chevron-right" size={18} style={{color:"var(--sub)",opacity:.6,flexShrink:0}} />
          </button>
        );
      })}
    </div>
    <div className="tq-sec">Посещаемость студентов</div>
    <div className="tq-card">
      {[...hist.students].sort((a, b) => (a.pct === null) - (b.pct === null) || (a.pct ?? 0) - (b.pct ?? 0)).map(st => (
        <div key={st.id} className="tq-item" style={{cursor:"default"}}>
          <div className="tq-ava">{tqInitials(st.name)}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"0.875rem",fontWeight:500,lineHeight:1.3}}>{st.name}</div>
            <div className="tq-item-sub">{st.absent ? `Пропусков: ${st.absent}` : "Без пропусков"}</div>
          </div>
          <span className="tq-pill" style={{color:tone(st.pct),background:`color-mix(in srgb, ${tone(st.pct)} 12%, var(--card))`}}>{st.pct === null ? "—" : st.pct + "%"}</span>
        </div>
      ))}
    </div>
    <div style={{height:20,flexShrink:0}} />
  </>;
}
