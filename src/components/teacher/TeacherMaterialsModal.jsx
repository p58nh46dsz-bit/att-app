// MAT_DATA/MAT_ICON/MAT_COLOR data + TeacherMaterialsModal — "Материалы к паре" modal.
const MAT_DATA = {
  "Экономика": [
    {name:"Лекция 8 — Рыночные механизмы.pdf", type:"pdf", date:"20 мая", size:"1.4 МБ"},
    {name:"Практическое задание №4.docx",       type:"doc", date:"18 мая", size:"420 КБ"},
    {name:"Тест по теме 7 (ответы).xlsx",       type:"xls", date:"15 мая", size:"88 КБ"},
  ],
  "Физика": [
    {name:"Конспект — Законы Ньютона.pdf",      type:"pdf", date:"17 мая", size:"980 КБ"},
    {name:"Задачи для самостоятельной.pdf",      type:"pdf", date:"14 мая", size:"560 КБ"},
  ],
  "Консультация": [
    {name:"Вопросы к экзамену.pdf",             type:"pdf", date:"16 мая", size:"320 КБ"},
  ],
};
const MAT_ICON  = {pdf:"📕",doc:"📘",xls:"📗",other:"📄"};
const MAT_COLOR = {pdf:"#E84C4C",doc:"#4A8FE7",xls:"#4CAF6B",other:"#F5A623"};
function TeacherMaterialsModal({ open, onClose }) {
  const [subject,   setSubject]   = useState("Экономика");
  const [uploading, setUploading] = useState(false);
  const [uploaded,  setUploaded]  = useState(false);
  const files = MAT_DATA[subject] || [];
  if (!open) return null;
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#4A8FE7,#1a4a80)",fontSize:20}}>📎</div>
          <div>
            <div className="lk-name">Материалы к паре</div>
            <div className="lk-meta">Файлы и задания для студентов</div>
          </div>
          <button className="lk-edit-btn" aria-label="Закрыть" onClick={onClose}>✕</button>
        </div>
        <div className="lk-body">
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {Object.keys(MAT_DATA).map(s=>(
              <div key={s} className={`week-tab${subject===s?" active":""}`} onClick={()=>{setSubject(s);setUploaded(false);}}>{s}</div>
            ))}
          </div>
          {files.length === 0 ? (
            <div style={{textAlign:"center",padding:"28px 0",color:"#7B9DBF",fontSize:13}}>Нет материалов</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {files.map((f,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
                  background:"#142240",borderRadius:14,border:"1px solid #1E3560"}}>
                  <div style={{width:40,height:40,borderRadius:10,background:(MAT_COLOR[f.type]||MAT_COLOR.other)+"22",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                    {MAT_ICON[f.type]||"📄"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                    <div style={{fontSize:11,color:"#7B9DBF",marginTop:2}}>{f.date} · {f.size}</div>
                  </div>
                  <span style={{color:"#7B9DBF",fontSize:18}}>›</span>
                </div>
              ))}
            </div>
          )}
          {uploaded ? (
            <div style={{padding:"14px",background:"#4CAF6B22",borderRadius:12,textAlign:"center",color:"#5ec97a",border:"1px solid #4CAF6B44"}}>
              ✅ Файл добавлен!
            </div>
          ) : (
            <button className="btn-blue"
              style={{borderRadius:14,padding:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
              onClick={()=>{
                setUploading(true);
                setTimeout(()=>{setUploading(false);setUploaded(true);setTimeout(()=>setUploaded(false),2500);},1400);
              }}>
              {uploading ? "⏳ Загрузка..." : "＋ Загрузить файл"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
