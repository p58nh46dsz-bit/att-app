// TeacherMsgModal — "Сообщение группе" modal.
function TeacherMsgModal({ open, onClose }) {
  const [group, setGroup] = useState("ДВ-41");
  const [msg, setMsg]   = useState("");
  const [sent, setSent] = useState(false);
  const quickMsgs = [
    "Пара переносится в ауд. 210",
    "Занятие сегодня отменяется",
    "Сдать работы до конца недели",
    "Напоминаю о домашнем задании",
  ];
  if (!open) return null;
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#F5A623,#b07010)"}}><Icon name="megaphone" size={20} color="#FFFFFF" /></div>
          <div>
            <div className="lk-name">Сообщение группе</div>
            <div className="lk-meta">Отправить уведомление студентам</div>
          </div>
          <button className="lk-edit-btn" aria-label="Закрыть" onClick={()=>{setSent(false);setMsg("");onClose();}}>✕</button>
        </div>
        {sent ? (
          <div className="lk-body" style={{textAlign:"center",paddingTop:20,display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            <Icon name="check-circle-2" size={48} color="#5ec97a" />
            <div style={{fontSize:18,fontWeight:700}}>Отправлено!</div>
            <div style={{fontSize:13,color:"#7B9DBF"}}>Группа {group} получила уведомление</div>
            <button className="btn-blue" style={{borderRadius:50,padding:"12px 32px"}} onClick={()=>{setSent(false);setMsg("");onClose();}}>Готово</button>
          </div>
        ) : (
          <div className="lk-body">
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["ДВ-41","ДВ-31","ДВ-11"].map(g=>(
                <div key={g} className={`week-tab${group===g?" active":""}`} onClick={()=>setGroup(g)}>{g}</div>
              ))}
            </div>
            <div style={{fontSize:11,color:"#7B9DBF",fontWeight:600,letterSpacing:0.5,textTransform:"uppercase"}}>Быстрые сообщения</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {quickMsgs.map((qm,i)=>(
                <div key={i}
                  style={{padding:"10px 14px",background: msg===qm?"#1F5CB822":"#142240",borderRadius:12,
                    cursor:"pointer",fontSize:13,border: msg===qm?"1px solid #1F5CB866":"1px solid #1E3560",transition:"all .15s"}}
                  onClick={()=>setMsg(qm)}>
                  {qm}
                </div>
              ))}
            </div>
            <div style={{fontSize:11,color:"#7B9DBF",fontWeight:600,letterSpacing:0.5,textTransform:"uppercase"}}>Или написать своё</div>
            <textarea value={msg} onChange={e=>setMsg(e.target.value)}
              placeholder="Введите сообщение для группы..."
              rows={3}
              style={{width:"100%",background:"#142240",border:"1px solid #1E3560",
                borderRadius:12,color:"#fff",fontFamily:"inherit",fontSize:14,
                padding:"12px 14px",resize:"none",outline:"none"}} />
            <button className="btn-blue" style={{borderRadius:14,padding:14,opacity:msg.trim()?1:0.45}} disabled={!msg.trim()}
              onClick={()=>setSent(true)}>
              Отправить → {group}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── TEACHER MATERIALS MODAL ───────────────────────────────────────────────────
