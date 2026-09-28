// TeacherDocuments — "Документы" screen in the teacher personal account.
// Two flows: Служебная записка (built through the "Кому приходит записка"
// review step — sending/approval isn't wired up yet, per design) and Приказ
// (built all the way through to a signed, formatted document). Data:
// MOCK_DOC_GROUP / MOCK_DOC_TEACHER / MOCK_DOC_STUDENTS / MOCK_DOC_RECIPIENTS /
// MOCK_DOC_ORDER / MOCK_DOC_DISTRIBUTION (src/data/mockData.js).
const docInputStyle = {
  width:"100%", background:"#0d1830", border:"1px solid #1E3560", borderRadius:8,
  color:"#fff", fontFamily:"inherit", fontSize:"0.8125rem", padding:8, marginTop:4,
};

function TeacherDocuments({ open, onClose }) {
  const [view, setView] = useState(null); // null | "memo" | "order"
  const titles = { memo:"Служебная записка", order:"Приказ" };
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={view ? () => setView(null) : onClose} title="Личный кабинет" tag={titles[view] || "Документы"} />
      <div className="inner-body">
        {!view && (
          <>
            <div style={{fontSize:"0.8125rem",color:"#7B9DBF"}}>Документы по закреплению тем курсовых работ</div>
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="fac-card" onClick={()=>setView("memo")}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <Icon name="send" size={20} color="#4A8FE7" />
                <div style={{flex:1}}>
                  <div className="fac-title" style={{marginBottom:2}}>Служебная записка</div>
                  <div style={{fontSize:"0.75rem",color:"#7B9DBF"}}>Закрепить темы курсовых за студентами группы</div>
                </div>
                <span style={{color:"#7B9DBF",fontSize:"1.125rem"}}>›</span>
              </div>
            </div>
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="fac-card" onClick={()=>setView("order")}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <Icon name="file-text" size={20} color="#F5A623" />
                <div style={{flex:1}}>
                  <div className="fac-title" style={{marginBottom:2}}>Приказ</div>
                  <div style={{fontSize:"0.75rem",color:"#7B9DBF"}}>Сформировать приказ об утверждении тем</div>
                </div>
                <span style={{color:"#7B9DBF",fontSize:"1.125rem"}}>›</span>
              </div>
            </div>
          </>
        )}
        {view==="memo" && <MemoWizard onClose={()=>setView(null)} />}
        {view==="order" && <OrderWizard onClose={()=>setView(null)} />}
      </div>
    </div>
  );
}

// MemoWizard — Служебная записка: тема-на-студента форма → выбор адресата →
// "Кому приходит записка" review. Deliberately stops there (no "Отправить"):
// the approval/routing structure past this point isn't designed yet.
function MemoWizard({ onClose }) {
  const [step, setStep] = useState(0);
  const [topics, setTopics] = useState(() => MOCK_DOC_STUDENTS.map(s => s.topic));
  const [recipient, setRecipient] = useState(MOCK_DOC_RECIPIENTS[0].id);
  const rec = MOCK_DOC_RECIPIENTS.find(r => r.id === recipient);

  if (step === 0) return (
    <>
      <div className="section-card">
        <div className="section-head">ГРУППА</div>
        <div style={{fontSize:"0.9375rem",fontWeight:600}}>{MOCK_DOC_GROUP.code}</div>
        <div style={{fontSize:"0.75rem",color:"#7B9DBF",marginTop:6}}>{MOCK_DOC_GROUP.specialtyCode} {MOCK_DOC_GROUP.specialtyName}</div>
        <div style={{fontSize:"0.75rem",color:"#7B9DBF",marginTop:2}}>{MOCK_DOC_GROUP.mdkCode} «{MOCK_DOC_GROUP.mdkName}»</div>
      </div>
      <div className="section-head">ТЕМЫ КУРСОВЫХ РАБОТ — {MOCK_DOC_STUDENTS.length} СТУДЕНТОВ</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {MOCK_DOC_STUDENTS.map((s,i)=>(
          <div key={i} style={{background:"#142240",border:"1px solid #1E3560",borderRadius:12,padding:"10px 12px"}}>
            <div style={{fontSize:"0.8125rem",fontWeight:600,marginBottom:2}}>{i+1}. {s.name}</div>
            <textarea rows={2} style={{...docInputStyle,fontSize:"0.75rem",resize:"vertical"}}
              value={topics[i]} onChange={e=>{const v=e.target.value; setTopics(t=>t.map((x,j)=>j===i?v:x));}} />
          </div>
        ))}
      </div>
      <button className="btn-blue" style={{borderRadius:14,padding:14}} onClick={()=>setStep(1)}>Далее →</button>
    </>
  );

  if (step === 1) return (
    <>
      <div className="section-head">ВЫБОР АДРЕСАТОВ, КОМУ ОТПРАВИТЬСЯ</div>
      {MOCK_DOC_RECIPIENTS.map(r=>(
        <div key={r.id} role="button" tabIndex={0} onKeyDown={activateOnEnter}
          style={{background:recipient===r.id?"#1F5CB822":"#142240",border:`1px solid ${recipient===r.id?"#1F5CB8":"#1E3560"}`,borderRadius:14,padding:14,cursor:"pointer",transition:"all .2s"}}
          onClick={()=>setRecipient(r.id)}>
          <div style={{fontSize:"0.875rem",fontWeight:600}}>{r.position}</div>
          <div style={{fontSize:"0.75rem",color:"#7B9DBF"}}>{r.name}</div>
        </div>
      ))}
      <button className="btn-blue" style={{borderRadius:14,padding:14}} onClick={()=>setStep(2)}>Далее →</button>
      <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:"0.8125rem"}} onClick={()=>setStep(0)}>← Назад к темам</button>
    </>
  );

  return (
    <>
      <div style={{textAlign:"center",padding:"8px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
        <Icon name="send" size={36} color="#4A8FE7" />
        <h2 style={{fontSize:"1.0625rem"}}>Записка готова</h2>
      </div>
      <div className="section-card">
        <div className="section-head">КОМУ ПРИХОДИТ ЗАПИСКА</div>
        <div style={{fontSize:"0.875rem",fontWeight:600}}>{rec.position}</div>
        <div style={{fontSize:"0.8125rem",color:"#7B9DBF"}}>{rec.name}</div>
      </div>
      <div className="section-card">
        <div className="section-head">ОТ КОГО</div>
        <div style={{fontSize:"0.8125rem"}}>{MOCK_DOC_TEACHER.name}, {MOCK_DOC_TEACHER.role}</div>
      </div>
      <div className="section-card">
        <div className="section-head">СОДЕРЖАНИЕ</div>
        <p style={{fontSize:"0.8125rem",color:"#B9CBE0",lineHeight:1.6}}>
          Прошу закрепить темы курсовых работ за студентами группы {MOCK_DOC_GROUP.code} по специальности {MOCK_DOC_GROUP.specialtyCode} {MOCK_DOC_GROUP.specialtyName} по {MOCK_DOC_GROUP.mdkCode} «{MOCK_DOC_GROUP.mdkName}» согласно перечню тем ({MOCK_DOC_STUDENTS.length} студентов).
        </p>
      </div>
      <div style={{padding:"12px",background:"#F5A62322",border:"1px solid #F5A62344",borderRadius:12,fontSize:"0.75rem",color:"#F5A623",textAlign:"center",lineHeight:1.5}}>
        Отправка и согласование записки появятся в следующем обновлении
      </div>
      <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:"0.8125rem"}} onClick={()=>setStep(1)}>← Изменить адресата</button>
      <button className="btn-blue" style={{borderRadius:14,padding:14}} onClick={onClose}>Готово</button>
    </>
  );
}

// OrderWizard — Приказ: тема-на-студента форма → лист рассылки → сформированный
// документ (реальная структура: ПРИКАЗЫВАЮ, таблица, основание, подписи, лист
// рассылки) → подпись и подтверждение. Built through to completion.
function OrderWizard({ onClose }) {
  const [step, setStep] = useState(0);
  const [number, setNumber] = useState(MOCK_DOC_ORDER.number);
  const [date, setDate] = useState(MOCK_DOC_ORDER.date);
  const [basis, setBasis] = useState(MOCK_DOC_ORDER.basis);
  const [topics, setTopics] = useState(() => MOCK_DOC_STUDENTS.map(s => s.topic));
  const [distribution, setDistribution] = useState(() => MOCK_DOC_DISTRIBUTION.filter(d=>d.default).map(d=>d.id));
  const [signed, setSigned] = useState(false);
  const toggleDist = id => setDistribution(d => d.includes(id) ? d.filter(x=>x!==id) : [...d, id]);

  if (step === 0) return (
    <>
      <div className="section-card">
        <div className="section-head">РЕКВИЗИТЫ ПРИКАЗА</div>
        <label style={{fontSize:"0.75rem",color:"#7B9DBF"}}>Номер приказа</label>
        <input style={docInputStyle} value={number} onChange={e=>setNumber(e.target.value)} />
        <label style={{fontSize:"0.75rem",color:"#7B9DBF",display:"block",marginTop:10}}>Дата</label>
        <input style={docInputStyle} value={date} onChange={e=>setDate(e.target.value)} />
        <label style={{fontSize:"0.75rem",color:"#7B9DBF",display:"block",marginTop:10}}>Основание</label>
        <textarea rows={2} style={{...docInputStyle,resize:"vertical"}} value={basis} onChange={e=>setBasis(e.target.value)} />
      </div>
      <div className="section-head">ТЕМЫ КУРСОВЫХ РАБОТ — {MOCK_DOC_STUDENTS.length} СТУДЕНТОВ</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {MOCK_DOC_STUDENTS.map((s,i)=>(
          <div key={i} style={{background:"#142240",border:"1px solid #1E3560",borderRadius:12,padding:"10px 12px"}}>
            <div style={{fontSize:"0.8125rem",fontWeight:600,marginBottom:2}}>{i+1}. {s.name}</div>
            <textarea rows={2} style={{...docInputStyle,fontSize:"0.75rem",resize:"vertical"}}
              value={topics[i]} onChange={e=>{const v=e.target.value; setTopics(t=>t.map((x,j)=>j===i?v:x));}} />
          </div>
        ))}
      </div>
      <button className="btn-blue" style={{borderRadius:14,padding:14}} onClick={()=>setStep(1)}>Далее →</button>
    </>
  );

  if (step === 1) return (
    <>
      <div className="section-head">ВЫБОР АДРЕСАТОВ — ЛИСТ РАССЫЛКИ ПРИКАЗА</div>
      {MOCK_DOC_DISTRIBUTION.map(d=>{
        const checked = distribution.includes(d.id);
        return (
          <div key={d.id} role="button" tabIndex={0} onKeyDown={activateOnEnter} className="checkbox-row" onClick={()=>toggleDist(d.id)}>
            <div className={`checkbox${checked?" checked":""}`}>{checked && <span style={{color:"#fff",fontSize:"0.6875rem",lineHeight:1}}>✓</span>}</div>
            <div>
              <div style={{fontSize:"0.8125rem",fontWeight:600}}>{d.title}</div>
              <div style={{fontSize:"0.75rem",color:"#7B9DBF"}}>{d.sub}</div>
            </div>
          </div>
        );
      })}
      <button className="btn-blue" disabled={distribution.length===0} style={{borderRadius:14,padding:14,opacity:distribution.length===0?0.5:1}} onClick={()=>setStep(2)}>Сформировать приказ →</button>
      <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:"0.8125rem"}} onClick={()=>setStep(0)}>← Назад к темам</button>
    </>
  );

  if (signed) return (
    <div style={{textAlign:"center",padding:"20px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
      <SuccessCheck size={52} />
      <h2>Приказ подписан!</h2>
      <p style={{fontSize:"0.8125rem",color:"#7B9DBF",lineHeight:1.6}}>
        № {number} от «{date}»<br/>Разослан по {distribution.length} адрес{distribution.length===1?"у":distribution.length<5?"ам":"ам"}
      </p>
      <button className="btn-blue" style={{borderRadius:50,padding:"12px 32px"}} onClick={onClose}>Готово</button>
    </div>
  );

  return (
    <>
      <div className="section-card" style={{fontSize:"0.8125rem",lineHeight:1.7}}>
        <div style={{textAlign:"center",fontWeight:700,letterSpacing:1,marginBottom:4}}>ПРИКАЗ</div>
        <div style={{display:"flex",justifyContent:"space-between",color:"#7B9DBF",fontSize:"0.75rem",marginBottom:10}}>
          <span>«{date}»</span><span>№ {number}</span>
        </div>
        <div style={{fontWeight:600,marginBottom:8}}>ПРИКАЗЫВАЮ:</div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
          {MOCK_DOC_STUDENTS.map((s,i)=>(
            <div key={i} style={{fontSize:"0.75rem",borderTop:i?"1px solid #1E3560":"none",paddingTop:6}}>
              <div style={{color:"#B9CBE0"}}>{i+1}. {topics[i]}</div>
              <div style={{color:"#7B9DBF",marginTop:2}}>{s.name}</div>
            </div>
          ))}
        </div>
        <div style={{color:"#7B9DBF",fontSize:"0.75rem",marginBottom:10}}>Основание: {basis}</div>
        <div style={{borderTop:"1px solid #1E3560",paddingTop:10,fontSize:"0.75rem",color:"#B9CBE0",display:"flex",flexDirection:"column",gap:4}}>
          <div>И.о. директора _________________ {MOCK_DOC_ORDER.signer}</div>
          <div>Исполнитель {MOCK_DOC_ORDER.executorRole} _____ {MOCK_DOC_ORDER.executorName}</div>
          <div>Печать документовед {MOCK_DOC_ORDER.clerkName} _____</div>
          <div>Согласовано: ОК _____</div>
        </div>
      </div>
      <div className="section-card">
        <div className="section-head">ЛИСТ РАССЫЛКИ К ПРИКАЗУ ОТ «{date}» №{number}</div>
        {MOCK_DOC_DISTRIBUTION.filter(d=>distribution.includes(d.id)).map(d=>(
          <div key={d.id} style={{fontSize:"0.8125rem",padding:"8px 0",borderTop:"1px solid #1E356044"}}>{d.title}</div>
        ))}
      </div>
      <button className="btn-blue" style={{borderRadius:14,padding:14}} onClick={()=>setSigned(true)}>Подписать и отправить →</button>
      <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:"0.8125rem"}} onClick={()=>setStep(1)}>← Изменить рассылку</button>
    </>
  );
}
