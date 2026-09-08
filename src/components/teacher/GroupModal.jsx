// GroupModal — group roster viewer, opened from the teacher dashboard. Data: MOCK_STUDENTS_BY_GROUP (src/data/mockData.js).
// ── TEACHER MSG MODAL ────────────────────────────────────────────────────────
function GroupModal({ group, onClose }) {
  const students = MOCK_STUDENTS_BY_GROUP[group] || [];
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
