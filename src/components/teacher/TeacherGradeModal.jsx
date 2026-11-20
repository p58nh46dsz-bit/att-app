// TeacherGradeModal — "Выставить оценки": a grade sheet for one group, subject, kind of work and day.
// The marks are kept in the database. Opening the same sheet again shows what was saved, and saving it again
// updates those marks (a mark can also be cleared by tapping it once more).
function TeacherGradeModal({ open, onClose, user, onOpenTeaching }) {
  const groups = user && user.groups ? user.groups : [];
  const [pickedGroup, setGroup] = useState(null);
  const group = pickedGroup || groups[0] || "";
  const { data: info } = useApi(group ? "/groups/" + encodeURIComponent(group) : null, open && !!group);
  const roster = info ? info.roster : [];   // [{ id, name, topic }]
  // The subjects are the ones this teacher teaches to the chosen group (set in "Мои группы и предметы").
  const { data: teaching } = useApi("/me/teaching", open);
  const subjects = (teaching && teaching.groups.find(g => g.code === group) || { subjects: [] }).subjects;
  const [pickedSubject, setSubject] = useState(null);
  const subject = subjects.includes(pickedSubject) ? pickedSubject : (subjects.length === 1 ? subjects[0] : null);
  const [kind, setKind] = useState("Контрольная работа");
  const [date, setDate] = useState(() => isoDate(new Date()));
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);   // answer of the last save
  const [marks, setMarks] = useState({});       // place id -> 5 | 4 | 3 | 2 | "н"
  const [loadState, setLoadState] = useState("idle"); // idle | loading | ok | error
  const vals = [5,4,3,2,"н"];
  const colMap = {5:"#4CAF6B",4:"#4A8FE7",3:"#F5A623",2:"#E84C4C","н":"#E84C4C"};
  const clsMap = {5:"g5",4:"g4",3:"g3",2:"g2","н":"gn"};
  // load what is already saved for this sheet whenever the sheet changes
  useEffect(() => {
    if (!open || !group || !subject || !date) { setMarks({}); setLoadState("idle"); return; }
    let live = true;
    setLoadState("loading"); setSaveError("");
    apiAuthed(`/me/grade-sheet?group=${encodeURIComponent(group)}&subject=${encodeURIComponent(subject)}&kind=${encodeURIComponent(kind.trim())}&date=${date}`).then(r => {
      if (!live) return;
      if (r.status === 200) { setMarks(r.data.marks || {}); setLoadState("ok"); } else { setMarks({}); setLoadState("error"); }
    });
    return () => { live = false; };
  }, [open, group, subject, kind, date]);
  const setG = (id, v) => setMarks(m => { const n = { ...m }; if (n[id] === v) delete n[id]; else n[id] = v; return n; });
  const filled = roster.filter(r => marks[r.id] !== undefined).length;
  const reset = () => { setResult(null); setMarks({}); };
  const save = async () => {
    setSaving(true); setSaveError("");
    const entries = roster.map(r => ({ studentId: r.id, value: marks[r.id] === undefined ? null : marks[r.id] }));
    const r = await apiAuthed("/me/grade-sheet", { method: "PUT", body: { groupCode: group, subject, kind: kind.trim(), date, entries } });
    setSaving(false);
    if (r.status === 200) setResult(r.data);
    else setSaveError(r.status === 0 ? "Нет связи с сервером. Оценки не сохранены." : (r.data && r.data.error) || "Не удалось сохранить оценки. Попробуйте ещё раз.");
  };
  if (!open) return null;
  if (groups.length === 0) return <TeacherNoGroups title="Выставить оценки" onClose={onClose} onOpenTeaching={onOpenTeaching} />;
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{...TQ_TILE,borderRadius:12}}><Icon name="pencil" size={20} color="#FFFFFF" /></div>
          <div>
            <div className="lk-name">Выставить оценки</div>
            <div className="lk-meta">{subject ? `${subject} · ${kind.trim() || "оценка"}` : "Выберите предмет"}</div>
          </div>
          <button className="lk-edit-btn" aria-label="Закрыть" onClick={()=>{reset();onClose();}}>Закрыть</button>
        </div>
        {result ? (
          <div className="lk-body" style={{textAlign:"center",paddingTop:20,display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            <SuccessCheck size={48} />
            <div style={{fontSize:"1.125rem",fontWeight:700}}>Сохранено в базе</div>
            <div style={{fontSize:"0.8125rem",color:"#7B9DBF",lineHeight:1.6}}>
              Группа {group} · {subject} · {date.split("-").reverse().join(".")}<br/>
              Записано: {result.saved}{result.cleared ? ` · снято оценок: ${result.cleared}` : ""}
              {result.accountsCreated ? <><br/>Студентам без аккаунта созданы учётные записи: {result.accountsCreated}. Их увидит администратор.</> : null}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn-blue" style={{borderRadius:10,padding:"12px 24px",background:"#101C33",border:"1px solid #1E3560"}} onClick={()=>setResult(null)}>Вернуться к ведомости</button>
              <button className="btn-blue" style={{borderRadius:10,padding:"12px 28px"}} onClick={()=>{reset();onClose();}}>Готово</button>
            </div>
          </div>
        ) : (
          <div className="lk-body">
            <div style={{fontSize:"0.6875rem",color:"#7B9DBF"}}>Предмет</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {subjects.length === 0 && (
                <div style={{fontSize:"0.8125rem",color:"#f5c067",lineHeight:1.6}}>
                  Вы не указали, какие предметы ведёте у группы {group || "—"}.{" "}
                  <span role="button" tabIndex={0} onKeyDown={activateOnEnter} style={{color:"#4A8FE7",textDecoration:"underline",cursor:"pointer"}} onClick={onOpenTeaching}>Указать предметы</span>
                </div>
              )}
              {subjects.map(sj=>(
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={sj} className={`week-tab${subject===sj?" active":""}`} onClick={()=>setSubject(sj)}>{sj.length > 28 ? sj.slice(0,26)+"…" : sj}</div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input aria-label="Вид работы" maxLength={60} value={kind} onChange={e=>setKind(e.target.value)} placeholder="Вид работы, например Контрольная №1" style={{...docInputStyle,marginTop:0,boxSizing:"border-box",flex:1,minWidth:0}} />
              <input aria-label="Дата" type="date" value={date} max={isoDate(new Date())} onChange={e=>{ if (e.target.value) setDate(e.target.value); }} style={{...docInputStyle,marginTop:0,boxSizing:"border-box",width:150,colorScheme:"dark"}} />
            </div>
            <div style={{fontSize:"0.6875rem",color:"#7B9DBF"}}>Группа</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {groups.map(g=>(
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={g} className={`week-tab${group===g?" active":""}`} onClick={()=>{setGroup(g);setSubject(null);}}>{g}</div>
              ))}
            </div>
            <div style={{fontSize:"0.6875rem",color:"#7B9DBF",display:"flex",gap:12,flexWrap:"wrap"}}>
              {vals.map(v=>(
                <span key={v} style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{width:16,height:16,borderRadius:4,background:colMap[v]+"33",display:"inline-block",border:`1px solid ${colMap[v]}55`}}/>
                  {v === "н" ? "Не явился" : `${v} — ${["","","","удовл.","хорошо","отлично"][v]}`}
                </span>
              ))}
            </div>
            {subject && <div style={{fontSize:"0.75rem",color:loadState==="error"?"#ff7e7e":"#7B9DBF"}}>
              {loadState === "loading" ? "Загружаем сохранённые оценки…" : loadState === "error" ? "Не удалось загрузить сохранённые оценки" : filled ? `Оценок в ведомости: ${filled} (нажмите на оценку ещё раз, чтобы снять её)` : "Ведомость пока пустая"}
            </div>}
            {roster.length === 0 && info && <div style={{fontSize:"0.8125rem",color:"#7B9DBF",padding:"8px 0"}}>В этой группе пока нет студентов.</div>}
            {roster.map((r,i)=>{
              const gv = marks[r.id];
              return (
                <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #1E356022"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:"#16233F",border:"1px solid #1E3560",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6875rem",fontWeight:700,flexShrink:0,color:"#9fb4d1"}}>
                    {(r.fullName||r.name)[0]}{((r.fullName||r.name).split(" ")[1]||"")[0]||""}
                  </div>
                  <span style={{flex:1,minWidth:0,fontSize:"0.8125rem",lineHeight:1.3}}>{r.fullName || r.name}</span>
                  <div style={{display:"flex",gap:4}}>
                    {vals.map(v=>(
                      <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={v} className={`grade-cell${gv===v?" "+clsMap[v]:""}`} onClick={()=>setG(r.id,v)}>{v}</div>
                    ))}
                  </div>
                </div>
              );
            })}
            {saveError && <div role="alert" style={{color:"#ff7e7e",fontSize:"0.8125rem",textAlign:"center"}}>{saveError}</div>}
            <button className="btn-blue" style={{borderRadius:14,padding:14,marginTop:4,opacity:subject&&roster.length&&loadState!=="loading"&&!saving?1:0.5}} disabled={!subject||!roster.length||loadState==="loading"||saving}
              onClick={save}>
              {saving ? "Сохраняем…" : <>Сохранить в базу{filled > 0 && ` (${filled})`}</>}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════

// TEACHER GROUP MODAL
