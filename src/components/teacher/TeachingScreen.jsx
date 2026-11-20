// TeachingScreen — "Мои группы и предметы" in the teacher's personal account.
// The teacher picks their groups from the college's list (kept by the administrator), then for every group types
// the name of each subject they teach to it, or taps a suggestion (subjects already known in the database,
// the ones this teacher already teaches first). A name that isn't known yet is added to the database.
const teachChip = (active) => ({
  padding:"7px 14px", borderRadius:20, fontSize:"0.8125rem", cursor:"pointer", userSelect:"none",
  background: active ? "#1F5CB8" : "#101C33", border:`1px solid ${active ? "#4A8FE7" : "#1E3560"}`, color:"#fff",
});

function TeachingScreen({ open, onClose, onChanged }) {
  const { data, error, load, setData } = useApi("/me/teaching", open);
  const [text, setText] = useState({});   // subject being typed, per group
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const apply = async (path, opts) => {
    if (busy) return;
    setBusy(true); setProblem("");
    const r = await apiAuthed(path, opts);
    setBusy(false);
    if (r.status === 200 || r.status === 201) { setData(r.data); if (onChanged) onChanged(); }
    else setProblem((r.data && r.data.error) || "Не удалось сохранить. Попробуйте ещё раз.");
    return r.status < 300;
  };
  const addGroup = code => apply("/me/teaching/groups", { method: "POST", body: { code } });
  const removeGroup = code => { if (window.confirm(`Убрать группу ${code} из ваших? Предметы этой группы тоже уберутся.`)) apply("/me/teaching/groups/" + encodeURIComponent(code), { method: "DELETE" }); };
  const addSubject = async code => {
    const subject = (text[code] || "").trim();
    if (!subject) return;
    if (await apply("/me/teaching/subjects", { method: "POST", body: { group: code, subject } })) setText(t => ({ ...t, [code]: "" }));
  };
  const removeSubject = (code, subject) => apply(`/me/teaching/subjects?group=${encodeURIComponent(code)}&subject=${encodeURIComponent(subject)}`, { method: "DELETE" });
  return (
    <div className={`inner-screen lk-inner tq-screen${open ? " open" : ""}`}>
      <TopBar plain onBack={onClose} title="Личный кабинет" tag="Мои группы" />
      <div className="inner-body">
        {!data ? (
          <div style={{textAlign:"center",padding:"32px 12px",color:"#7B9DBF",fontSize:"0.8125rem",lineHeight:1.6}}>
            {error ? <>Не удалось загрузить данные.<br/><button className="btn-blue" style={{marginTop:14,borderRadius:10,padding:"10px 28px"}} onClick={load}>Повторить</button></> : <TQSkeleton rows={4} avatar={false} />}
          </div>
        ) : (
          <>
            <div style={{fontSize:"0.8125rem",color:"#7B9DBF",lineHeight:1.6}}>Выберите группы, в которых вы преподаёте, и укажите предметы, которые ведёте у каждой. Оценки можно выставлять только по этим предметам.</div>
            <div className="section-card">
              <div className="section-head tq-head">Группы колледжа</div>
              {data.groups.length === 0 && data.availableGroups.length === 0 && (
                <div style={{fontSize:"0.8125rem",color:"#7B9DBF",padding:"6px 0"}}>В списке пока нет групп. Их добавляет администратор.</div>
              )}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {data.groups.map(g => <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={g.code} style={teachChip(true)} title="Нажмите, чтобы убрать" onClick={()=>removeGroup(g.code)}>{g.code} <span style={{opacity:0.6,fontSize:"0.6875rem",marginLeft:4}}>убрать</span></div>)}
                {data.availableGroups.map(code => <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={code} style={teachChip(false)} onClick={()=>addGroup(code)}>+ {code}</div>)}
              </div>
            </div>
            {data.groups.map(g => (
              <div key={g.code} className="section-card">
                <div className="section-head tq-head">Группа {g.code}, предметы</div>
                {g.subjects.length === 0 && <div style={{fontSize:"0.8125rem",color:"#f5c067",padding:"2px 0 8px"}}>Предметы пока не указаны</div>}
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:g.subjects.length ? 10 : 0}}>
                  {g.subjects.map(s => <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={s} style={teachChip(true)} title="Нажмите, чтобы убрать" onClick={()=>removeSubject(g.code, s)}>{s} <span style={{opacity:0.6,fontSize:"0.6875rem",marginLeft:4}}>убрать</span></div>)}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <input value={text[g.code] || ""} maxLength={120} placeholder="Название предмета"
                    onChange={e=>setText(t => ({ ...t, [g.code]: e.target.value }))} onKeyDown={e=>{ if (e.key === "Enter") addSubject(g.code); }}
                    style={{flex:1,minWidth:0,background:"#0d1830",border:"1px solid #1E3560",borderRadius:10,color:"#fff",fontFamily:"inherit",fontSize:"0.875rem",padding:"10px 12px"}} />
                  <button className="btn-blue" style={{borderRadius:10,padding:"10px 16px",opacity:(text[g.code]||"").trim()&&!busy?1:0.5}} disabled={!(text[g.code]||"").trim()||busy} onClick={()=>addSubject(g.code)}>Добавить</button>
                </div>
                {(() => {
                  const typed = (text[g.code] || "").trim().toLowerCase();
                  const list = data.suggestions.filter(s => !g.subjects.includes(s) && (!typed || s.toLowerCase().includes(typed))).slice(0, 8);
                  return list.length > 0 && (
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
                      {!typed && <div style={{width:"100%",fontSize:"0.6875rem",color:"#7B9DBF"}}>Подсказки (нажмите, чтобы добавить)</div>}
                      {list.map(s => (
                        <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={s} style={{...teachChip(false),fontSize:"0.75rem",padding:"5px 10px"}} onClick={()=>apply("/me/teaching/subjects",{method:"POST",body:{group:g.code,subject:s}})}>+ {s.length > 30 ? s.slice(0, 28) + "…" : s}</div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ))}
            {problem && <div role="alert" style={{color:"#ff7e7e",fontSize:"0.8125rem",textAlign:"center"}}>{problem}</div>}
          </>
        )}
      </div>
    </div>
  );
}
