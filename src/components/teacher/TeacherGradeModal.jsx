// TeacherGradeModal — "Выставить оценки" modal.
function TeacherGradeModal({ open, onClose }) {
  const [group, setGroup] = useState("ДВ-41");
  const [saved, setSaved] = useState(false);
  const [grades, setGrades] = useState({});
  const vals = [5,4,3,2,"н"];
  const colMap = {5:"#4CAF6B",4:"#4A8FE7",3:"#F5A623",2:"#E84C4C","н":"#E84C4C"};
  const clsMap = {5:"g5",4:"g4",3:"g3",2:"g2","н":"gn"};
  const setG = (key,v) => setGrades(g => ({...g,[key]: g[key]===v ? undefined : v}));
  const filled = Object.values(grades).filter(Boolean).length;
  if (!open) return null;
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#4CAF6B,#2d8050)",fontSize:20}}>✏️</div>
          <div>
            <div className="lk-name">Выставить оценки</div>
            <div className="lk-meta">Экономика · Контрольная работа</div>
          </div>
          <button className="lk-edit-btn" aria-label="Закрыть" onClick={()=>{setSaved(false);setGrades({});onClose();}}>✕</button>
        </div>
        {saved ? (
          <div className="lk-body" style={{textAlign:"center",paddingTop:20,display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            <div style={{fontSize:52}}>✅</div>
            <div style={{fontSize:18,fontWeight:700}}>Оценки сохранены!</div>
            <div style={{fontSize:13,color:"#7B9DBF"}}>Группа {group} · {filled} оценок выставлено</div>
            <button className="btn-blue" style={{borderRadius:50,padding:"12px 32px"}} onClick={()=>{setSaved(false);setGrades({});onClose();}}>Готово</button>
          </div>
        ) : (
          <div className="lk-body">
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["ДВ-41","ДВ-31","ДВ-11"].map(g=>(
                <div key={g} className={`week-tab${group===g?" active":""}`} onClick={()=>setGroup(g)}>{g}</div>
              ))}
            </div>
            <div style={{fontSize:11,color:"#7B9DBF",display:"flex",gap:12,flexWrap:"wrap"}}>
              {vals.map(v=>(
                <span key={v} style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{width:16,height:16,borderRadius:4,background:colMap[v]+"33",display:"inline-block",border:`1px solid ${colMap[v]}55`}}/>
                  {v === "н" ? "Не явился" : `${v} — ${["","","","удовл.","хорошо","отлично"][v]}`}
                </span>
              ))}
            </div>
            {(STUDENTS[group]||[]).map((s,i)=>{
              const key = s+group;
              const gv = grades[key];
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #1E356022"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:`hsl(${i*53%360},38%,33%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0,color:"#fff"}}>
                    {s[0]}{(s.split(" ")[1]||"")[0]||""}
                  </div>
                  <span style={{flex:1,fontSize:13}}>{s}</span>
                  <div style={{display:"flex",gap:4}}>
                    {vals.map(v=>(
                      <div key={v} className={`grade-cell${gv===v?" "+clsMap[v]:""}`} onClick={()=>setG(key,v)}>{v}</div>
                    ))}
                  </div>
                </div>
              );
            })}
            <button className="btn-blue" style={{borderRadius:14,padding:14,marginTop:4}} onClick={()=>setSaved(true)}>
              Сохранить оценки ✓ {filled > 0 && `(${filled})`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════

// TEACHER GROUP MODAL
