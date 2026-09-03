// ApplyScreen — applicant's 4-step application form.
function ApplyScreen({ open, onClose, preSpec }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ edu: "очная", spec: preSpec||"", method: "", consent: false });
  const [docs, setDocs] = useState({});
  const [showDocErr, setShowDocErr] = useState(false);
  const [showStepErr, setShowStepErr] = useState(false);

  // Sync preSpec when screen opens
  useEffect(() => {
    if (open) {
      setStep(0);
      setDocs({});
      setShowDocErr(false);
      setShowStepErr(false);
      setForm({ edu:"очная", spec: preSpec||"", method:"", consent:false });
    }
  }, [open, preSpec]);

  const specs = ATT_SPEC_GROUPS.flatMap(g => g.specs.map(s => `${s.code} — ${s.name}`));
  const steps = ["Форма", "Подача", "Документы", "Готово"];

  const docItems = [
    { key:"attestat", name:"Аттестат / диплом",        required:true,  icon:"diploma", color:"#1F5CB8" },
    { key:"passport", name:"Паспорт (скан стр. 2–3)",  required:true,  icon:"passport",color:"#2456A8" },
    { key:"photo",    name:"Фото 3×4 (3 штуки)",       required:true,  icon:"photo",   color:"#4A8FE7" },
    { key:"snils",    name:"СНИЛС",                    required:true,  icon:"snils",   color:"#0d6e6e" },
    { key:"lgota",    name:"Льготные документы",       required:false, icon:"lgota",   color:"#7B9DBF" },
  ];

  const requiredKeys = docItems.filter(d => d.required).map(d => d.key);
  const allDocsUploaded = requiredKeys.every(k => docs[k]);

  const handleNext = () => {
    if (step === 0 && !form.spec) { setShowStepErr(true); return; }
    if (step === 1 && (!form.method || !form.consent)) { setShowStepErr(true); return; }
    setShowDocErr(false); setShowStepErr(false);
    setStep(s => s + 1);
  };
  const handleSubmit = () => {
    if (!allDocsUploaded) { setShowDocErr(true); return; }
    setShowDocErr(false);
    setStep(3);
  };

  return (
    <div className={`inner-screen${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Экран абитуриента" tag="Заявление" tagClass="applicant" />
      <div className="inner-body">
        {/* Step indicator */}
        <div className="step-indicator">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`step-dot${i < step ? " done" : i === step ? " active" : ""}`}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`step-line${i < step ? " done" : ""}`} />}
            </React.Fragment>
          ))}
        </div>
        <div style={{ fontSize: 13, color: C.sub, textAlign: "center" }}>
          Шаг {step + 1} из {steps.length}: {steps[step]}
        </div>

        {/* ── STEP 0: Форма ── */}
        {step === 0 && (
          <div className="apply-card" style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <div className="apply-label">ФОРМА ОБУЧЕНИЯ</div>
              <div className="radio-row">
                {["очная","заочная"].map(o => (
                  <div key={o} className={`radio-opt${form.edu===o?" selected":""}`}
                    onClick={()=>setForm(f=>({...f,edu:o}))}>{o}</div>
                ))}
              </div>
            </div>
            <div>
              <div className="apply-label">СПЕЦИАЛЬНОСТЬ <span style={{color:"#E84C4C"}}>*</span></div>
              <select className="apply-select" value={form.spec}
                onChange={e=>{setForm(f=>({...f,spec:e.target.value}));setShowStepErr(false);}}>
                <option value="">Выберите специальность...</option>
                {specs.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              {showStepErr && !form.spec && (
                <div style={{fontSize:12,color:"#E84C4C",marginTop:6,display:"flex",alignItems:"center",gap:5}}><Icon name="alert-triangle" size={13} color="#f5c067" />Выберите специальность для продолжения</div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Документы ── */}
        {step === 2 && (
          <div className="apply-card">
            <div className="apply-label" style={{marginBottom:4}}>ЗАГРУЗИТЕ ДОКУМЕНТЫ</div>
            <div style={{fontSize:12,color:C.sub,marginBottom:14}}>
              Обязательные документы отмечены <span style={{color:"#E84C4C"}}>*</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {docItems.map(d => (
                <div key={d.key} style={{
                  display:"flex", alignItems:"center", gap:12,
                  padding:"12px 14px",
                  background: docs[d.key] ? "#0d2a18" : C.card,
                  border: `1px solid ${docs[d.key] ? "#2d6a3f" : C.border}`,
                  borderRadius:14, transition:"all .2s",
                }}>
                  {/* Doc icon */}
                  <div style={{flexShrink:0, opacity: docs[d.key] ? 0.5 : 1, transition:"opacity .2s"}}>
                    <DocIcon type={d.icon} size={44} />
                  </div>
                  {/* Name + status */}
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600}}>
                      {d.name}
                      {d.required && <span style={{color:"#E84C4C"}}> *</span>}
                    </div>
                    {docs[d.key]
                      ? <div style={{fontSize:11,color:"#4CAF6B",marginTop:2}}>✔ Загружен</div>
                      : <div style={{fontSize:11,color:C.sub,marginTop:2}}>Нажмите «Загрузить»</div>
                    }
                  </div>
                  {/* Upload button */}
                  <button
                    onClick={()=>{setDocs(p=>({...p,[d.key]:true}));setShowDocErr(false);}}
                    style={{
                      padding:"7px 14px", borderRadius:20, border:"none", cursor:"pointer",
                      fontSize:11, fontWeight:700, letterSpacing:0.5,
                      background: docs[d.key] ? "#142240" : C.accent,
                      color: docs[d.key] ? C.sub : "#fff",
                      flexShrink:0, transition:"all .2s",
                    }}>
                    {docs[d.key] ? "Заменить" : "Загрузить"}
                  </button>
                </div>
              ))}
            </div>
            {showDocErr && !allDocsUploaded && (
              <div style={{marginTop:12,padding:"10px 14px",background:"#E84C4C22",border:"1px solid #E84C4C44",borderRadius:10,fontSize:12,color:"#ff7e7e",display:"flex",alignItems:"center",gap:6}}>
                <Icon name="alert-triangle" size={14} color="#f5c067" />Загрузите все обязательные документы, чтобы продолжить
              </div>
            )}
          </div>
        )}

        {/* ── STEP 1: Подача ── */}
        {step === 1 && (
          <div className="apply-card" style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <div className="apply-label">СПОСОБ ПОДАЧИ <span style={{color:"#E84C4C"}}>*</span></div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
                {[
                  {val:"лично",    icon:"building-2", desc:"Приёмная комиссия, ул. Салова 65"},
                  {val:"онлайн",   icon:"laptop",      desc:"Через личный кабинет на сайте АТТ"},
                  {val:"по почте", icon:"mail",         desc:"Заказным письмом с описью вложения"},
                ].map(o=>(
                  <div key={o.val}
                    onClick={()=>{setForm(f=>({...f,method:o.val}));setShowStepErr(false);}}
                    style={{
                      display:"flex", alignItems:"center", gap:12,
                      padding:"12px 14px",
                      background: form.method===o.val ? "#0d1e48" : C.card,
                      border: `1px solid ${form.method===o.val ? C.accent : C.border}`,
                      borderRadius:12, cursor:"pointer", transition:"all .15s",
                    }}>
                    <Icon name={o.icon} size={20} color="#4A8FE7" />
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color: form.method===o.val ? "#fff" : C.sub}}>
                        {o.val.charAt(0).toUpperCase()+o.val.slice(1)}
                        {form.method===o.val && <span style={{marginLeft:8,fontSize:11,color:C.accentL}}>✔ выбрано</span>}
                      </div>
                      <div style={{fontSize:11,color:C.sub,marginTop:1}}>{o.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              {showStepErr && !form.method && (
                <div style={{fontSize:12,color:"#E84C4C",marginTop:6,display:"flex",alignItems:"center",gap:5}}><Icon name="alert-triangle" size={13} color="#f5c067" />Выберите способ подачи</div>
              )}
            </div>

            <div style={{padding:"14px",background:C.card,borderRadius:12,border:`1px solid ${form.consent?C.accent:C.border}`,cursor:"pointer",transition:"all .15s"}}
              onClick={()=>{setForm(f=>({...f,consent:!f.consent}));setShowStepErr(false);}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{
                  width:22,height:22,borderRadius:6,flexShrink:0,marginTop:1,
                  background: form.consent ? C.accent : "transparent",
                  border:`2px solid ${form.consent ? C.accent : C.sub}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:13,color:"#fff",transition:"all .15s",
                }}>
                  {form.consent && "✓"}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>Согласие на обработку персональных данных</div>
                  <div style={{fontSize:11,color:C.sub,marginTop:3,lineHeight:1.5}}>
                    В соответствии с ФЗ №152 «О персональных данных» даю согласие на обработку предоставленных сведений
                  </div>
                </div>
              </div>
            </div>

            {showStepErr && (!form.method || !form.consent) && (
              <div style={{padding:"10px 14px",background:"#E84C4C22",border:"1px solid #E84C4C44",borderRadius:10,fontSize:12,color:"#ff7e7e",display:"flex",alignItems:"center",gap:6}}>
                <Icon name="alert-triangle" size={14} color="#f5c067" />{!form.method ? "Выберите способ подачи" : "Поставьте галочку согласия на обработку данных"}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Успех ── */}
        {step === 3 && (
          <div style={{textAlign:"center",padding:"20px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
            <Icon name="party-popper" size={56} color="#F5A623" />
            <h2 style={{fontSize:22}}>Заявление подано!</h2>
            <p style={{fontSize:13,color:C.sub,lineHeight:1.6}}>
              Вы можете отслеживать статус в приёмной комиссии.<br/>
              Ожидайте звонка или письма на email.
            </p>
            <div className="section-card" style={{width:"100%",textAlign:"left"}}>
              <div className="section-head"><Icon name="clipboard-list" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:4}} />ВАШИ ДАННЫЕ</div>
              <div style={{fontSize:13,color:C.sub,lineHeight:2}}>
                <div>Форма: <span style={{color:C.text}}>{form.edu}</span></div>
                <div>Специальность: <span style={{color:C.text,fontSize:12}}>{form.spec||"—"}</span></div>
                <div>Способ подачи: <span style={{color:C.text}}>{form.method}</span></div>
                <div>Документы: <span style={{color:"#4CAF6B"}}>✔ загружены</span></div>
              </div>
            </div>
          </div>
        )}

        <div className="apply-nav">
          {step > 0 && step < 3 && <button className="btn-sec" onClick={()=>{setShowDocErr(false);setShowStepErr(false);setStep(s=>s-1);}}>← Назад</button>}
          {step < 2 && <button className="btn-blue" onClick={handleNext}>Далее →</button>}
          {step === 2 && (
            <button className="btn-blue"
              style={{opacity: allDocsUploaded ? 1 : 0.45}}
              onClick={handleSubmit}>
              Отправить ✓
            </button>
          )}
          {step === 3 && <button className="btn-blue" onClick={onClose}>На главную</button>}
        </div>
      </div>
    </div>
  );
}
