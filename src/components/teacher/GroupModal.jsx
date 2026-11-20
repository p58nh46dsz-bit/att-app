// GroupModal — group roster viewer, opened from the teacher dashboard. Data: GET /groups/:code.
// ── TEACHER MSG MODAL ────────────────────────────────────────────────────────
function GroupModal({ group, onClose }) {
  const { data: info, error, load } = useApi("/groups/" + encodeURIComponent(group), true);
  const students = info ? info.roster.map(r => r.fullName || r.name) : [];
  const [search, setSearch] = useState("");
  const filtered = students.filter(s => s.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open tq-sheet">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{...TQ_TILE,borderRadius:12}}><Icon name="users" size={18} color="#FFFFFF" /></div>
          <div>
            <div className="lk-name">Группа {group}</div>
            <div className="lk-meta">{students.length} {rusPlural(students.length, "студент", "студента", "студентов")}</div>
          </div>
          <button className="lk-edit-btn" onClick={onClose}>Закрыть</button>
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
          {!info && !error && <TQSkeleton rows={6} />}
          <div className="tq-list" style={{display: filtered.length ? "block" : "none"}}>
          {filtered.map((s,i)=>(
            <div key={i} className="tq-row" style={{cursor:"default"}}>
              <div style={{
                width:34,height:34,borderRadius:"50%",flexShrink:0,
                background:"#16233F",border:"1px solid #1E3560",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"0.8125rem",fontWeight:700,color:"#9fb4d1"}}>
                {s.split(" ").map(w=>w[0]).join("").slice(0,2)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.875rem",fontWeight:500}}>{s}</div>
                <div style={{fontSize:"0.6875rem",color:"#7B9DBF"}}>студент · {group}</div>
              </div>
            </div>
          ))}
          </div>
          {info && filtered.length === 0 && (
            <TQEmpty kind="people" title={search ? "Не найдено" : "В группе пока нет студентов"} />
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
      setAll(rs.flatMap((r, i) => r.data.roster.map(s => ({ group: groups[i], name: s.fullName || s.name }))));
    });
    return () => { live = false; };
  }, [mode, groups.join("|")]);
  const needle = search.trim().toLowerCase();
  const students = (all || []).filter(s => !needle || s.name.toLowerCase().includes(needle) || s.group.toLowerCase().includes(needle));
  const countOf = code => ((counts || []).find(c => c.code === code) || {}).count;
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open tq-sheet">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{...TQ_TILE,borderRadius:12}}><Icon name={mode === "groups" ? "users" : "graduation-cap"} size={18} color="#FFFFFF" /></div>
          <div>
            <div className="lk-name">{mode === "groups" ? "Мои группы" : "Мои студенты"}</div>
            <div className="lk-meta">{mode === "groups" ? `${groups.length} ${rusPlural(groups.length, "группа", "группы", "групп")}` : all ? `${all.length} ${rusPlural(all.length, "студент", "студента", "студентов")} в ${groups.length} ${rusPlural(groups.length, "группе", "группах", "группах")}` : "Загрузка…"}</div>
          </div>
          <button className="lk-edit-btn" onClick={onClose}>Закрыть</button>
        </div>
        {mode === "students" && <div style={{padding:"12px 20px 8px"}}>
          <input style={{width:"100%",padding:"10px 14px",background:"#142240",border:"1px solid #1E3560",borderRadius:12,color:"#fff",fontFamily:"inherit",fontSize:"0.875rem",outline:"none",boxSizing:"border-box"}}
            placeholder="Поиск по фамилии или группе..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>}
        <div className="lk-body" style={{paddingTop:8}}>
          {mode === "groups" && <>
            {groups.length === 0 && <TQEmpty kind="people" title="Групп пока нет" text="Выберите группы, в которых преподаёте, и укажите предметы.">
              <button className="btn-blue" style={{marginTop:6,borderRadius:10,padding:"10px 24px"}} onClick={onOpenTeaching}>Выбрать группы и предметы</button></TQEmpty>}
            {groups.length > 0 && <div className="tq-list">
              {groups.map(code => (
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={code} className="tq-row" onClick={() => onPickGroup(code)}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.9375rem",fontWeight:500}}>{code}</div>
                    <div style={{fontSize:"0.6875rem",color:"#7B9DBF"}}>{countOf(code) === undefined ? "…" : `${countOf(code)} ${rusPlural(countOf(code), "студент", "студента", "студентов")}`}</div>
                  </div>
                </div>
              ))}
            </div>}
          </>}
          {mode === "students" && <>
            {failed && <div role="alert" style={{textAlign:"center",color:"#ff7e7e",fontSize:"0.8125rem",padding:20}}>Не удалось загрузить списки. Проверьте подключение к серверу.</div>}
            {!all && !failed && <TQSkeleton rows={7} />}
            {all && groups.length === 0 && <TQEmpty kind="people" title="Групп пока нет" text="Выберите группы в «Мои группы и предметы»." />}
            {all && students.length > 0 && <div className="tq-list">
              {students.map((s, i) => (
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={s.group + s.name + i} className="tq-row" onClick={() => onPickGroup(s.group)}>
                  <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,background:"#16233F",border:"1px solid #1E3560",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8125rem",fontWeight:700,color:"#9fb4d1"}}>
                    {s.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.875rem",fontWeight:500}}>{s.name}</div>
                    <div style={{fontSize:"0.6875rem",color:"#7B9DBF"}}>студент · {s.group}</div>
                  </div>
                </div>
              ))}
            </div>}
            {all && students.length === 0 && groups.length > 0 && <TQEmpty kind="people" title="Не найдено" />}
          </>}
        </div>
      </div>
    </>
  );
}

// TeacherNoGroups — what a teacher sees in the grade sheet and the message screen before choosing any group.
function TeacherNoGroups({ title, onClose, onOpenTeaching }) {
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open tq-sheet">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{...TQ_TILE,borderRadius:12}}><Icon name="users" size={18} color="#FFFFFF" /></div>
          <div><div className="lk-name">{title}</div><div className="lk-meta">Сначала выберите группы</div></div>
          <button className="lk-edit-btn" onClick={onClose}>Закрыть</button>
        </div>
        <div className="lk-body">
          <TQEmpty kind="people" title="Групп пока нет" text="Выберите группы, в которых преподаёте, и укажите предметы, которые ведёте.">
            <button className="btn-blue" style={{marginTop:6,borderRadius:10,padding:"12px 24px"}} onClick={onOpenTeaching}>Выбрать группы и предметы</button>
          </TQEmpty>
        </div>
      </div>
    </>
  );
}

// TQSkeleton — grey placeholder rows while a list loads (instead of a "Загрузка…" line).
function TQSkeleton({ rows = 5, avatar = true }) {
  return (
    <div className="tq-list" aria-busy="true" aria-label="Загрузка">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="tq-row" style={{cursor:"default"}}>
          {avatar && <div className="tq-skel" style={{width:32,height:32,borderRadius:"50%",flexShrink:0}} />}
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:7}}>
            <div className="tq-skel" style={{width:`${55 + (i * 13) % 35}%`}} />
            <div className="tq-skel" style={{width:`${25 + (i * 7) % 20}%`,height:10}} />
          </div>
        </div>
      ))}
    </div>
  );
}

// TQEmpty — an empty state with a small line drawing, a title and one sentence. kind: calendar | people | files
function TQEmpty({ kind = "calendar", title, text, children }) {
  const stroke = "#2f4a7d";
  return (
    <div className="tq-empty">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {kind === "calendar" && <><rect x="12" y="16" width="48" height="44" rx="8" /><path d="M12 28h48M24 10v10M48 10v10" /><circle cx="36" cy="44" r="4" stroke="#4A8FE7" /></>}
        {kind === "people" && <><circle cx="28" cy="26" r="9" /><path d="M10 58c0-10 8-16 18-16s18 6 18 16" /><circle cx="50" cy="30" r="7" stroke="#4A8FE7" /><path d="M48 44c8 0 14 5 14 14" stroke="#4A8FE7" /></>}
        {kind === "files" && <><path d="M18 10h24l12 12v38a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2z" /><path d="M42 10v12h12" /><path d="M26 38h20M26 46h14" stroke="#4A8FE7" /></>}
      </svg>
      {title && <strong>{title}</strong>}
      {text && <div>{text}</div>}
      {children}
    </div>
  );
}
