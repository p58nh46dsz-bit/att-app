// TeacherJournal — "Журнал группы". Step 1: the teacher's groups; step 2: the group's students, marked as
// present / absent / late for a subject and a day. Marks are kept in the database (attendance_records): opening the
// same group, subject and day again shows them, saving again updates them.
function TeacherJournal({ user, initialPair, lessons = [], scheduleStatus, onGroupsChanged, onClose, onOpenTeaching }) {
  const groups = user && user.groups ? user.groups : [];
  const [group, setGroup] = useState(null);             // null = choosing a group
  const [pickedSubject, setSubject] = useState(null);
  const [date, setDate] = useState(() => isoDate(new Date()));
  const { data: counts } = useApi("/groups", !group);   // student counts for the list of groups
  const { data: info } = useApi(group ? "/groups/" + encodeURIComponent(group) : null, !!group);
  const { data: teaching, setData: setTeaching } = useApi("/me/teaching", true);
  const [pairBusy, setPairBusy] = useState(null);       // index of the pair being opened
  const [pairError, setPairError] = useState("");
  const roster = info ? info.roster : [];
  const subjects = (group && teaching && teaching.groups.find(g => g.code === group) || { subjects: [] }).subjects;
  const subject = subjects.includes(pickedSubject) ? pickedSubject : (subjects.length === 1 ? subjects[0] : null);
  const [marks, setMarks] = useState({});               // place id -> present | absent | late
  const [loadState, setLoadState] = useState("idle");   // idle | loading | ok | error
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(null);
  const STATUS = [
    { key: "present", label: "был", color: "#4CAF6B", short: "✓" },
    { key: "late", label: "опоздал", color: "#F5A623", short: "оп" },
    { key: "absent", label: "не был", color: "#E84C4C", short: "н" },
  ];
  useEffect(() => {
    if (!group || !subject || !date) { setMarks({}); setLoadState("idle"); return; }
    let live = true;
    setLoadState("loading"); setSaveError(""); setSaved(null);
    apiAuthed(`/me/journal?group=${encodeURIComponent(group)}&subject=${encodeURIComponent(subject)}&date=${date}`).then(r => {
      if (!live) return;
      if (r.status === 200) { setMarks(r.data.marks || {}); setLoadState("ok"); } else { setMarks({}); setLoadState("error"); }
    });
    return () => { live = false; };
  }, [group, subject, date]);
  const mark = (id, status) => { setSaved(null); setMarks(m => { const n = { ...m }; if (n[id] === status) delete n[id]; else n[id] = status; return n; }); };
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
  const back = () => { setGroup(null); setSubject(null); setMarks({}); setSaved(null); setSaveError(""); };
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#4CAF6B,#2d8050)"}}><Icon name="users" size={18} color="#FFFFFF" /></div>
          <div>
            <div className="lk-name">{group ? `Журнал · ${group}` : "Журнал группы"}</div>
            <div className="lk-meta">{group ? (subject ? subject : "Выберите предмет") : "Выберите группу"}</div>
          </div>
          <button className="lk-edit-btn" onClick={group ? back : onClose}>{group ? "← Группы" : "✕ Закрыть"}</button>
        </div>
        <div className="lk-body" style={{paddingTop:8}}>
          {!group && <>
            <div style={{fontSize:"0.6875rem",color:"#7B9DBF",letterSpacing:1}}>РАСПИСАНИЕ НА СЕГОДНЯ · ВЫБЕРИТЕ ПАРУ</div>
            {lessons.length === 0 && <div style={{fontSize:"0.8125rem",color:"#7B9DBF",padding:"2px 0 6px",lineHeight:1.5}}>
              {scheduleStatus === "loading" ? "Загрузка расписания…" : scheduleStatus === "error" ? "Расписание сейчас недоступно." : "На сегодня в расписании пар нет."} Выберите группу ниже.
            </div>}
            {lessons.map((l, i) => {
              const st = pairState(l);
              return (
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={i} onClick={() => openPair(l, i)}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:st === "now" ? "#12365c" : "#142240",border:`1px solid ${st === "now" ? "#4CAF6B" : i === firstNext ? "#4A8FE7" : "transparent"}`,borderRadius:12,cursor:"pointer",opacity:st === "past" ? 0.55 : 1}}>
                  <div style={{minWidth:54,textAlign:"center"}}>
                    <div style={{fontSize:"0.6875rem",color:"#7B9DBF"}}>{l.period} пара</div>
                    <div style={{fontSize:"0.8125rem",fontWeight:700}}>{fmt(...l.start)}</div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"0.875rem",fontWeight:600}}>{l.group || "Группа не указана"}{l.subject ? ` · ${l.subject}` : ""}</div>
                    <div style={{fontSize:"0.6875rem",color:"#7B9DBF"}}>{l.room ? `ауд. ${l.room} · ` : ""}{fmt(...l.start)}–{fmt(...l.end)}{st === "now" ? " · идёт сейчас" : i === firstNext ? " · следующая" : ""}</div>
                  </div>
                  <span style={{color:"#7B9DBF",fontSize:"1rem"}}>{pairBusy === i ? "…" : "›"}</span>
                </div>
              );
            })}
            {pairError && <div role="alert" style={{color:"#f5c067",fontSize:"0.8125rem",lineHeight:1.5}}>{pairError}</div>}
            <div style={{fontSize:"0.6875rem",color:"#7B9DBF",letterSpacing:1,marginTop:6}}>ДРУГАЯ ГРУППА</div>
            {groups.length === 0 && <div style={{textAlign:"center",color:"#7B9DBF",fontSize:"0.8125rem",padding:20,lineHeight:1.6}}>Вы ещё не выбрали группы.<br/><button className="btn-blue" style={{marginTop:12,borderRadius:50,padding:"10px 24px"}} onClick={onOpenTeaching}>Выбрать группы и предметы</button></div>}
            {groups.map(code => {
              const c = (counts || []).find(x => x.code === code);
              return (
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={code} onClick={() => setGroup(code)}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"14px",background:"#142240",borderRadius:12,cursor:"pointer"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.9375rem",fontWeight:600}}>{code}</div>
                    <div style={{fontSize:"0.6875rem",color:"#7B9DBF"}}>{c ? `${c.count} студентов` : "…"}</div>
                  </div>
                  <span style={{color:"#7B9DBF",fontSize:"1rem"}}>›</span>
                </div>
              );
            })}
          </>}
          {group && <>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              {subjects.map(sj => (
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={sj} className={`week-tab${subject===sj?" active":""}`} onClick={()=>setSubject(sj)}>{sj.length > 26 ? sj.slice(0,24)+"…" : sj}</div>
              ))}
              <input aria-label="Дата" type="date" value={date} max={isoDate(new Date())} onChange={e=>{ if (e.target.value) setDate(e.target.value); }}
                style={{...docInputStyle,marginTop:0,boxSizing:"border-box",width:150,colorScheme:"dark",marginLeft:"auto"}} />
            </div>
            {subjects.length === 0 && (
              <div style={{fontSize:"0.8125rem",color:"#f5c067",lineHeight:1.6}}>
                Вы не указали, какие предметы ведёте у группы {group}.{" "}
                <span role="button" tabIndex={0} onKeyDown={activateOnEnter} style={{color:"#4A8FE7",textDecoration:"underline",cursor:"pointer"}} onClick={onOpenTeaching}>Указать предметы</span>
              </div>
            )}
            {subject && <>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",fontSize:"0.75rem",color:"#7B9DBF"}}>
                <button style={{padding:"6px 12px",borderRadius:20,background:"#101C33",border:"1px solid #1E3560",color:"#fff",cursor:"pointer",fontSize:"0.75rem",fontFamily:"inherit"}} onClick={()=>markAll("present")}>Все были</button>
                <span>был: {tally("present")} · опоздал: {tally("late")} · не был: {tally("absent")} · без отметки: {roster.length - tally("present") - tally("late") - tally("absent")}</span>
              </div>
              <div style={{fontSize:"0.6875rem",color:loadState==="error"?"#ff7e7e":"#7B9DBF"}}>
                {loadState === "loading" ? "Загружаем сохранённые отметки…" : loadState === "error" ? "Не удалось загрузить сохранённые отметки" : "Нажмите на отметку ещё раз, чтобы снять её"}
              </div>
              {roster.length === 0 && info && <div style={{fontSize:"0.8125rem",color:"#7B9DBF",padding:"8px 0"}}>В этой группе пока нет студентов.</div>}
              {roster.map((r, i) => (
                <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #1E356022"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:`hsl(${i*53%360},38%,33%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6875rem",fontWeight:700,flexShrink:0,color:"#fff"}}>
                    {(r.fullName||r.name)[0]}{((r.fullName||r.name).split(" ")[1]||"")[0]||""}
                  </div>
                  <span style={{flex:1,minWidth:0,fontSize:"0.8125rem",lineHeight:1.3}}>{r.fullName || r.name}</span>
                  <div style={{display:"flex",gap:4}}>
                    {STATUS.map(st => (
                      <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={st.key} title={st.label} aria-label={`${r.fullName || r.name}: ${st.label}`} aria-pressed={marks[r.id] === st.key}
                        onClick={()=>mark(r.id, st.key)}
                        style={{minWidth:34,height:32,padding:"0 6px",boxSizing:"border-box",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8125rem",fontWeight:700,cursor:"pointer",
                          background: marks[r.id] === st.key ? st.color : "#101C33", border:`1px solid ${marks[r.id] === st.key ? st.color : "#1E3560"}`, color: marks[r.id] === st.key ? "#fff" : "#7B9DBF"}}>{st.short}</div>
                    ))}
                  </div>
                </div>
              ))}
              {saveError && <div role="alert" style={{color:"#ff7e7e",fontSize:"0.8125rem",textAlign:"center"}}>{saveError}</div>}
              {saved && <div role="status" style={{color:"#5ec97a",fontSize:"0.8125rem",textAlign:"center"}}>Сохранено в базе: был {saved.present}, опоздал {saved.late}, не был {saved.absent}{saved.cleared ? `, без отметки ${saved.cleared}` : ""}</div>}
              <button className="btn-blue" style={{borderRadius:14,padding:14,marginTop:4,opacity:roster.length&&loadState!=="loading"&&!saving?1:0.5}}
                disabled={!roster.length||loadState==="loading"||saving} onClick={save}>
                {saving ? "Сохраняем…" : "Сохранить в базу ✓"}
              </button>
            </>}
          </>}
        </div>
      </div>
    </>
  );
}
