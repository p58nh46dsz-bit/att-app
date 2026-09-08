// TeacherMaterialsModal — "Материалы к паре" modal. Data: MOCK_MATERIALS_BY_SUBJECT/MOCK_MATERIAL_ICON/MOCK_MATERIAL_COLOR (src/data/mockData.js).
function TeacherMaterialsModal({ open, onClose }) {
  const [subject,   setSubject]   = useState("Экономика");
  const [uploading, setUploading] = useState(false);
  const [uploaded,  setUploaded]  = useState(false);
  const files = MOCK_MATERIALS_BY_SUBJECT[subject] || [];
  if (!open) return null;
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#4A8FE7,#1a4a80)"}}><Icon name="paperclip" size={20} color="#FFFFFF" /></div>
          <div>
            <div className="lk-name">Материалы к паре</div>
            <div className="lk-meta">Файлы и задания для студентов</div>
          </div>
          <button className="lk-edit-btn" aria-label="Закрыть" onClick={onClose}>✕</button>
        </div>
        <div className="lk-body">
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {Object.keys(MOCK_MATERIALS_BY_SUBJECT).map(s=>(
              <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={s} className={`week-tab${subject===s?" active":""}`} onClick={()=>{setSubject(s);setUploaded(false);}}>{s}</div>
            ))}
          </div>
          {files.length === 0 ? (
            <div style={{textAlign:"center",padding:"28px 0",color:"#7B9DBF",fontSize:"0.8125rem"}}>Нет материалов</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {files.map((f,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
                  background:"#142240",borderRadius:14,border:"1px solid #1E3560"}}>
                  <div style={{width:40,height:40,borderRadius:10,background:(MOCK_MATERIAL_COLOR[f.type]||MOCK_MATERIAL_COLOR.other)+"22",
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Icon name={MOCK_MATERIAL_ICON[f.type]||"file"} size={19} color={MOCK_MATERIAL_COLOR[f.type]||MOCK_MATERIAL_COLOR.other} />
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"0.75rem",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                    <div style={{fontSize:"0.6875rem",color:"#7B9DBF",marginTop:2}}>{f.date} · {f.size}</div>
                  </div>
                  <span style={{color:"#7B9DBF",fontSize:"1.125rem"}}>›</span>
                </div>
              ))}
            </div>
          )}
          {uploaded ? (
            <div style={{padding:"14px",background:"#4CAF6B22",borderRadius:12,textAlign:"center",color:"#5ec97a",border:"1px solid #4CAF6B44",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <SuccessCheck size={18} />Файл добавлен!
            </div>
          ) : (
            <button className="btn-blue"
              style={{borderRadius:14,padding:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
              onClick={()=>{
                setUploading(true);
                setTimeout(()=>{setUploading(false);setUploaded(true);setTimeout(()=>setUploaded(false),2500);},1400);
              }}>
              {uploading ? <><Icon name="hourglass" size={15} color="#FFFFFF" />Загрузка...</> : "＋ Загрузить файл"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
