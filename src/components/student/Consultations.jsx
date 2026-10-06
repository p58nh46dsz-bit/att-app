// LKConsultations — "Консультации" screen in the student personal account.
function LKConsultations({ open, onClose }) {
  const [step, setStep] = useState(0);
  const [selType, setSelType] = useState(null);
  const [selTime, setSelTime] = useState(null);
  useEffect(() => {
    if (open) { setStep(0); setSelType(null); setSelTime(null); }
  }, [open]);
  const types = CONTENT.consultation_types;
  const slots = CONTENT.consultation_slots;
  // Consultations are booked for the next working day; a slot can be taken by one student only.
  const dayDate = (() => { const d = new Date(); do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6); return d; })();
  const fmtIso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const day = fmtIso(dayDate);
  const dayLabel = dayDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const { data: mine, load: loadMine } = useApi("/me/consultations", open);
  const [taken, setTaken] = useState([]);
  const [bookError, setBookError] = useState("");
  const [booking, setBooking] = useState(false);
  const loadTaken = async () => { const r = await apiAuthed("/consultations/taken?day=" + day); if (r.status === 200) setTaken(r.data); };
  useEffect(() => { if (open) { loadTaken(); setBookError(""); } }, [open]);
  const book = async () => {
    if (booking) return;
    setBooking(true); setBookError("");
    const r = await apiAuthed("/me/consultations", { method: "POST", body: { type: types[selType].title, day, slot: selTime } });
    setBooking(false);
    if (r.status === 201) { setStep(2); loadMine(); loadTaken(); }
    else if (r.status === 409) { setBookError("Это время уже заняли. Выберите другое."); setSelTime(null); loadTaken(); }
    else setBookError(r.status === 0 ? "Нет связи с сервером. Попробуйте позже." : "Не удалось записаться. Попробуйте ещё раз.");
  };
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Консультации" />
      <div className="inner-body">
        <div className="section-card" >
          <div className="section-head"><Icon name="check-circle-2" size={12} color="#5ec97a" style={{verticalAlign:-2,marginRight:4}} />МОИ ЗАПИСИ</div>
          {!mine || mine.length === 0
            ? <div style={{padding:"8px 0",fontSize:"0.8125rem",color:"#7B9DBF"}}>{mine ? "Записей пока нет" : "Загрузка…"}</div>
            : mine.map(c => (
              <div key={c.id} style={{padding:"8px 0",fontSize:"0.8125rem"}}>
                <div style={{fontWeight:600,marginBottom:2}}>{c.type}</div>
                <div style={{color:"#7B9DBF",fontSize:"0.75rem",display:"flex",alignItems:"center",gap:4}}><Icon name="calendar" size={12} color="#7B9DBF" />{new Date(c.day + "T00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"long"})} · <Icon name="clock" size={12} color="#7B9DBF" />{c.slot}</div>
                <div style={{color:"#4CAF6B",fontSize:"0.6875rem",marginTop:2}}>● подтверждено</div>
              </div>
            ))}
        </div>
        {step===0 && (
          <>
            <div className="section-head">ТИП КОНСУЛЬТАЦИИ</div>
            {types.map((t,i)=>(
              <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={i}
                style={{background:selType===i?"#1F5CB822":"#142240",border:`1px solid ${selType===i?"#1F5CB8":"#1E3560"}`,borderRadius:14,padding:14,cursor:"pointer",transition:"all .2s"}}
                onClick={()=>setSelType(i)}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <Icon name={t.icon} size={20} color="#4A8FE7" />
                  <div>
                    <div style={{fontSize:"0.875rem",fontWeight:600}}>{t.title}</div>
                    <div style={{fontSize:"0.75rem",color:"#7B9DBF"}}>{t.sub}</div>
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
              <div style={{fontSize:"0.6875rem",color:"#7B9DBF",marginBottom:4,letterSpacing:1}}>ВЫБРАННЫЙ ТИП</div>
              <div style={{fontSize:"0.875rem",fontWeight:600,display:"flex",alignItems:"center",gap:8}}>{types[selType] && <Icon name={types[selType].icon} size={16} color="#4A8FE7" />} {types[selType]?.title}</div>
            </div>
            <div className="section-head"><Icon name="calendar" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:4}} />ДОСТУПНОЕ ВРЕМЯ — {dayLabel.toUpperCase()}</div>
            <div className="time-grid" >
              {slots.map(s=>(
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={s} className={`time-slot${taken.includes(s)?" taken":selTime===s?" selected":""}`}
                  onClick={()=>!taken.includes(s)&&setSelTime(s)}>{s}</div>
              ))}
            </div>
            <div style={{fontSize:"0.6875rem",color:"#7B9DBF",textAlign:"center"}}>Серые слоты заняты</div>
            {selTime && <button className="btn-blue" style={{borderRadius:14,padding:14}} disabled={booking} onClick={book}>{booking ? "Записываем…" : `Записаться на ${selTime} ✓`}</button>}
            {bookError && <div style={{color:"#ff7e7e",fontSize:"0.8125rem",textAlign:"center"}}>{bookError}</div>}
            <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:"0.8125rem"}} onClick={()=>setStep(0)}>← Изменить тип</button>
          </>
        )}
        {step===2 && (
          <div style={{textAlign:"center",padding:"20px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            <Icon name="check-circle-2" size={52} color="#5ec97a" />
            <h2>Запись подтверждена!</h2>
            <p style={{fontSize:"0.8125rem",color:"#7B9DBF",lineHeight:1.6}}>{types[selType]?.title}<br/>{dayLabel} в {selTime}</p>
            <button className="btn-blue" style={{borderRadius:50,padding:"12px 32px"}} onClick={()=>{setStep(0);setSelType(null);setSelTime(null);}}>Отлично</button>
          </div>
        )}
      </div>
    </div>
  );
}

// LK SPRAVKI
