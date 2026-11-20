// TeachingScreen — "Мои группы и предметы" in the teacher's personal account.
// The teacher picks their groups from the college's list (kept by the administrator), then for every group types
// the name of each subject they teach to it, or taps a suggestion (subjects already known in the database,
// the ones this teacher already teaches first). A name that isn't known yet is added to the database.
const teachChip = (active) => ({
  padding:"7px 14px", borderRadius:20, fontSize:"0.8125rem", cursor:"pointer", userSelect:"none",
  background: active ? "#1F5CB8" : "var(--surface)", border:`1px solid ${active ? "var(--link)" : "var(--line)"}`, color:"#fff",
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
      <TopBar plain onBack={onClose} title="Назад" tag="Группы и предметы" />
      <div className="inner-body tq-sched-body">
        {!data ? (
          error ? <TQEmpty kind="calendar" title="Не удалось загрузить" text="Проверьте подключение и попробуйте ещё раз."><button className="tq-btn" style={{marginTop:6}} onClick={load}>Повторить</button></TQEmpty> : <TQSkeleton rows={4} avatar={false} />
        ) : (
          <>
            <div className="tq-note" style={{textAlign:"left",padding:"0 4px"}}>Оценки и отметки можно ставить только по предметам, указанным здесь.</div>
            {data.groups.map(g => {
              const typed = (text[g.code] || "").trim().toLowerCase();
              const sugg = data.suggestions.filter(x => !g.subjects.includes(x) && (!typed || x.toLowerCase().includes(typed))).slice(0, 8);
              return (
                <div key={g.code} className="tq-card" style={{padding:14,display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div className="tq-ava" style={{borderRadius:12}}><Icon name="users" size={17} /></div>
                    <div style={{flex:1}}>
                      <div className="tq-item-title">{g.code}</div>
                      <div className="tq-item-sub">{g.subjects.length ? `${g.subjects.length} ${rusPlural(g.subjects.length, "предмет", "предмета", "предметов")}` : "Предметы не указаны"}</div>
                    </div>
                    <button className="tq-round" aria-label={`Убрать группу ${g.code}`} onClick={() => removeGroup(g.code)}><Icon name="x" size={16} /></button>
                  </div>
                  {g.subjects.length > 0 && <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {g.subjects.map(x => (
                      <button key={x} className="tq-chip on" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 10px 7px 14px"}} aria-label={`Убрать ${x}`} onClick={() => removeSubject(g.code, x)}>
                        {x}<Icon name="x" size={14} />
                      </button>
                    ))}
                  </div>}
                  <div style={{display:"flex",gap:8}}>
                    <input className="tq-field" value={text[g.code] || ""} maxLength={120} placeholder="Добавить предмет"
                      onChange={e=>setText(t => ({ ...t, [g.code]: e.target.value }))} onKeyDown={e=>{ if (e.key === "Enter") addSubject(g.code); }} style={{padding:"10px 12px"}} />
                    <button className="tq-round" style={{width:44,height:44,background:"var(--accent)",color:"#fff",border:"none",opacity:(text[g.code]||"").trim()&&!busy?1:.4}} aria-label="Добавить" disabled={!(text[g.code]||"").trim()||busy} onClick={()=>addSubject(g.code)}><Icon name="plus" size={20} /></button>
                  </div>
                  {sugg.length > 0 && <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {sugg.map(x => <button key={x} className="tq-chip" style={{padding:"6px 12px",fontSize:"0.75rem"}} onClick={()=>apply("/me/teaching/subjects",{method:"POST",body:{group:g.code,subject:x}})}>+ {x.length > 30 ? x.slice(0, 28) + "…" : x}</button>)}
                  </div>}
                </div>
              );
            })}
            <div className="tq-sec">Добавить группу</div>
            {data.availableGroups.length === 0 ? (
              <div className="tq-note" style={{textAlign:"left",padding:"0 4px"}}>{data.groups.length ? "Все группы колледжа уже добавлены." : "Групп в списке пока нет. Их добавляет администратор."}</div>
            ) : (
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {data.availableGroups.map(code => <button key={code} className="tq-chip" onClick={()=>addGroup(code)}>+ {code}</button>)}
              </div>
            )}
            {problem && <div role="alert" className="tq-note" style={{color:"var(--bad)"}}>{problem}</div>}
          </>
        )}
      </div>
    </div>
  );
}
