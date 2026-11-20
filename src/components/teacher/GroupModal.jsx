// GroupModal — group roster viewer, opened from the teacher dashboard. Data: GET /groups/:code.
// ── TEACHER MSG MODAL ────────────────────────────────────────────────────────
function GroupModal({ group, onClose }) {
  const { data: info, error, load } = useApi("/groups/" + encodeURIComponent(group), true);
  const students = info ? info.roster.map(r => r.name) : [];
  const [search, setSearch] = useState("");
  const filtered = students.filter(s => s.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#4CAF6B,#2d8050)"}}><Icon name="users" size={18} color="#FFFFFF" /></div>
          <div>
            <div className="lk-name">Группа {group}</div>
            <div className="lk-meta">{students.length} студентов</div>
          </div>
          <button className="lk-edit-btn" onClick={onClose}>✕ Закрыть</button>
        </div>
        <div style={{padding:"12px 20px 8px"}}>
          <input
            style={{width:"100%",padding:"10px 14px",background:"#142240",border:"1px solid #1E3560",borderRadius:12,color:"#fff",fontFamily:"inherit",fontSize:"0.875rem",outline:"none"}}
            placeholder="Поиск по фамилии..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
        </div>
        <div className="lk-body" style={{paddingTop:8}}>
          {filtered.map((s,i)=>(
            <div key={i} style={{
              display:"flex",alignItems:"center",gap:12,
              padding:"10px 14px",background:"#142240",borderRadius:12,}}>
              <div style={{
                width:34,height:34,borderRadius:"50%",flexShrink:0,
                background:`hsl(${(i*47)%360},40%,35%)`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"0.8125rem",fontWeight:700,color:"#fff"}}>
                {s.split(" ").map(w=>w[0]).join("").slice(0,2)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.875rem",fontWeight:500}}>{s}</div>
                <div style={{fontSize:"0.6875rem",color:"#7B9DBF"}}>студент · {group}</div>
              </div>
              <span style={{color:"#7B9DBF",fontSize:"0.875rem"}}>›</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{textAlign:"center",color:"#7B9DBF",fontSize:"0.8125rem",padding:20}}>Не найдено</div>
          )}
        </div>
      </div>
    </>
  );
}


// NEXT CLASS MODAL

// TeacherRosterModal — opened from the two cards on the teacher's main screen.
//   mode "groups":   the teacher's groups with student counts; a tap opens that group's list (GroupModal)
//   mode "students": every student of every group of the teacher, with a search box
function TeacherRosterModal({ mode, groups, onClose, onPickGroup, onOpenTeaching }) {
  const { data: counts } = useApi("/groups", mode === "groups");
  const [all, setAll] = useState(null);       // [{ group, name }]
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (mode !== "students") return;
    let live = true;
    Promise.all(groups.map(g => apiAuthed("/groups/" + encodeURIComponent(g)))).then(rs => {
      if (!live) return;
      if (rs.some(r => r.status !== 200)) { setFailed(true); return; }
      setAll(rs.flatMap((r, i) => r.data.roster.map(s => ({ group: groups[i], name: s.name }))));
    });
    return () => { live = false; };
  }, [mode, groups.join("|")]);
  const needle = search.trim().toLowerCase();
  const students = (all || []).filter(s => !needle || s.name.toLowerCase().includes(needle) || s.group.toLowerCase().includes(needle));
  const countOf = code => ((counts || []).find(c => c.code === code) || {}).count;
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#4CAF6B,#2d8050)"}}><Icon name={mode === "groups" ? "users" : "graduation-cap"} size={18} color="#FFFFFF" /></div>
          <div>
            <div className="lk-name">{mode === "groups" ? "Мои группы" : "Мои студенты"}</div>
            <div className="lk-meta">{mode === "groups" ? `${groups.length} групп` : all ? `${all.length} студентов в ${groups.length} группах` : "Загрузка…"}</div>
          </div>
          <button className="lk-edit-btn" onClick={onClose}>✕ Закрыть</button>
        </div>
        {mode === "students" && <div style={{padding:"12px 20px 8px"}}>
          <input style={{width:"100%",padding:"10px 14px",background:"#142240",border:"1px solid #1E3560",borderRadius:12,color:"#fff",fontFamily:"inherit",fontSize:"0.875rem",outline:"none",boxSizing:"border-box"}}
            placeholder="Поиск по фамилии или группе..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>}
        <div className="lk-body" style={{paddingTop:8}}>
          {mode === "groups" && <>
            {groups.length === 0 && <div style={{textAlign:"center",color:"#7B9DBF",fontSize:"0.8125rem",padding:20,lineHeight:1.6}}>Вы ещё не выбрали группы.<br/><button className="btn-blue" style={{marginTop:12,borderRadius:50,padding:"10px 24px"}} onClick={onOpenTeaching}>Выбрать группы и предметы</button></div>}
            {groups.map(code => (
              <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={code} onClick={() => onPickGroup(code)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#142240",borderRadius:12,cursor:"pointer"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.9375rem",fontWeight:600}}>{code}</div>
                  <div style={{fontSize:"0.6875rem",color:"#7B9DBF"}}>{countOf(code) === undefined ? "…" : `${countOf(code)} студентов`}</div>
                </div>
                <span style={{color:"#7B9DBF",fontSize:"1rem"}}>›</span>
              </div>
            ))}
          </>}
          {mode === "students" && <>
            {failed && <div role="alert" style={{textAlign:"center",color:"#ff7e7e",fontSize:"0.8125rem",padding:20}}>Не удалось загрузить списки. Проверьте подключение к серверу.</div>}
            {!all && !failed && <div style={{textAlign:"center",color:"#7B9DBF",fontSize:"0.8125rem",padding:20}}>Загрузка…</div>}
            {all && groups.length === 0 && <div style={{textAlign:"center",color:"#7B9DBF",fontSize:"0.8125rem",padding:20}}>Вы ещё не выбрали группы.</div>}
            {students.map((s, i) => (
              <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={s.group + s.name + i} onClick={() => onPickGroup(s.group)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#142240",borderRadius:12,cursor:"pointer"}}>
                <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,background:`hsl(${(i*47)%360},40%,35%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8125rem",fontWeight:700,color:"#fff"}}>
                  {s.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.875rem",fontWeight:500}}>{s.name}</div>
                  <div style={{fontSize:"0.6875rem",color:"#7B9DBF"}}>студент · {s.group}</div>
                </div>
                <span style={{color:"#7B9DBF",fontSize:"0.875rem"}}>›</span>
              </div>
            ))}
            {all && students.length === 0 && groups.length > 0 && <div style={{textAlign:"center",color:"#7B9DBF",fontSize:"0.8125rem",padding:20}}>Не найдено</div>}
          </>}
        </div>
      </div>
    </>
  );
}
