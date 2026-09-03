// LKConsultations — "Консультации" screen in the student personal account.
function LKConsultations({ open, onClose }) {
  const [step, setStep] = useState(0);
  const [selType, setSelType] = useState(null);
  const [selTime, setSelTime] = useState(null);
  useEffect(() => {
    if (open) { setStep(0); setSelType(null); setSelTime(null); }
  }, [open]);
  const types = [
    {icon:"📊",title:"Академическая",sub:"По предмету, задолженности"},
    {icon:"💼",title:"Карьерная",sub:"Практика, трудоустройство"},
    {icon:"📋",title:"Административная",sub:"Документы, справки"},
    {icon:"🧠",title:"Психологическая",sub:"Поддержка, стресс"},
  ];
  const slots = ["09:00","10:00","11:00","13:00","14:00","15:00"];
  const taken = ["10:00","14:00"];
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Консультации" />
      <div className="inner-body">
        <div className="section-card" >
          <div className="section-head">✅ МОИ ЗАПИСИ</div>
          <div style={{padding:"8px 0",fontSize:13}}>
            <div style={{fontWeight:600,marginBottom:2}}>Математика — Иванов А.А.</div>
            <div style={{color:"#7B9DBF",fontSize:12}}>📅 22 мая · 🕐 11:00</div>
            <div style={{color:"#4CAF6B",fontSize:11,marginTop:2}}>● подтверждено</div>
          </div>
        </div>
        {step===0 && (
          <>
            <div className="section-head">ТИП КОНСУЛЬТАЦИИ</div>
            {types.map((t,i)=>(
              <div key={i}
                style={{background:selType===i?"#1F5CB822":"#142240",border:`1px solid ${selType===i?"#1F5CB8":"#1E3560"}`,borderRadius:14,padding:14,cursor:"pointer",transition:"all .2s"}}
                onClick={()=>setSelType(i)}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:22}}>{t.icon}</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:600}}>{t.title}</div>
                    <div style={{fontSize:12,color:"#7B9DBF"}}>{t.sub}</div>
                  </div>
                </div>
              </div>
            ))}
            {selType!==null && (
              <button className="btn-blue" style={{borderRadius:14,padding:14}} onClick={()=>setStep(1)}>Выбрать время →</button>
            )}
          </>
        )}
        {step===1 && (
          <>
            <div style={{background:"#142240",borderRadius:14,padding:14}}>
              <div style={{fontSize:11,color:"#7B9DBF",marginBottom:4,letterSpacing:1}}>ВЫБРАННЫЙ ТИП</div>
              <div style={{fontSize:14,fontWeight:600}}>{types[selType]?.icon} {types[selType]?.title}</div>
            </div>
            <div className="section-head">📅 ДОСТУПНОЕ ВРЕМЯ — 22 МАЯ</div>
            <div className="time-grid" >
              {slots.map(s=>(
                <div key={s} className={`time-slot${taken.includes(s)?" taken":selTime===s?" selected":""}`}
                  onClick={()=>!taken.includes(s)&&setSelTime(s)}>{s}</div>
              ))}
            </div>
            <div style={{fontSize:11,color:"#7B9DBF",textAlign:"center"}}>Серые слоты заняты</div>
            {selTime && <button className="btn-blue" style={{borderRadius:14,padding:14}} onClick={()=>setStep(2)}>Записаться на {selTime} ✓</button>}
            <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:13}} onClick={()=>setStep(0)}>← Изменить тип</button>
          </>
        )}
        {step===2 && (
          <div style={{textAlign:"center",padding:"20px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            <div style={{fontSize:56}}>✅</div>
            <h2>Запись подтверждена!</h2>
            <p style={{fontSize:13,color:"#7B9DBF",lineHeight:1.6}}>{types[selType]?.title}<br/>22 мая в {selTime}</p>
            <button className="btn-blue" style={{borderRadius:50,padding:"12px 32px"}} onClick={()=>{setStep(0);setSelType(null);setSelTime(null);}}>Отлично</button>
          </div>
        )}
      </div>
    </div>
  );
}

// LK SPRAVKI
