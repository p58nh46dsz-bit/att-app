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
// "Printed page" look for a formed document (служебка/приказ) — paper background,
// serif font, dashed-underline inputs standing in for handwritten blanks.
const docPageStyle = {
  background:"#f7f4ea", color:"#1a1a1a", fontFamily:"'Times New Roman', Georgia, serif",
  borderRadius:4, padding:"20px 16px", boxShadow:"0 10px 28px rgba(0,0,0,0.4)", lineHeight:1.55,
};
const docFieldStyle = {
  border:"none", borderBottom:"1px dashed #8a8270", background:"transparent",
  color:"#1a1a1a", fontFamily:"inherit", fontSize:"inherit", padding:"0 2px", verticalAlign:"baseline",
};
const docThStyle = { border:"1px solid #4a4636", padding:"6px 7px", fontWeight:700, background:"#eae4cf", textAlign:"left" };
const docTdStyle  = { border:"1px solid #4a4636", padding:"6px 7px", verticalAlign:"top", wordBreak:"break-word" };

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
  // Editable straight in the final document (step 2) — depend on the teacher/group, not fixed content.
  const [teacherName, setTeacherName] = useState(MOCK_DOC_TEACHER.name);
  const [ckNumber, setCkNumber] = useState("8");
  const [groupCode, setGroupCode] = useState(MOCK_DOC_GROUP.code);
  const [specCode, setSpecCode] = useState(MOCK_DOC_GROUP.specialtyCode);
  const [specName, setSpecName] = useState(MOCK_DOC_GROUP.specialtyName);
  const [mdkCode, setMdkCode] = useState(MOCK_DOC_GROUP.mdkCode.replace(/^МДК\s*/,""));
  const [mdkName, setMdkName] = useState(MOCK_DOC_GROUP.mdkName);

  if (step === 0) return (
    <>
      <div className="section-card">
        <div className="section-head">ГРУППА</div>
        <div style={{fontSize:"0.9375rem",fontWeight:600}}>{groupCode}</div>
        <div style={{fontSize:"0.75rem",color:"#7B9DBF",marginTop:6}}>{specCode} {specName}</div>
        <div style={{fontSize:"0.75rem",color:"#7B9DBF",marginTop:2}}>МДК {mdkCode} «{mdkName}»</div>
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
      <div style={{fontSize:"0.75rem",color:"#7B9DBF",textAlign:"center"}}>✎ Готовый документ — поля с пунктирным подчёркиванием можно редактировать</div>
      <div style={docPageStyle}>
        <div style={{textAlign:"right"}}>
          <div>{rec.position} СПб ГБПОУ «АТТ имени Героя Социалистического Труда И.Г. Зубкова»</div>
          <div>{rec.name} от</div>
          <div>руководителя курсовой работы,</div>
          <div>
            преподавателя ЦК №<input style={{...docFieldStyle,width:"2.2em",textAlign:"center"}} value={ckNumber} onChange={e=>setCkNumber(e.target.value)} />
          </div>
          <div>
            <input style={{...docFieldStyle,width:"13em",textAlign:"right"}} value={teacherName} onChange={e=>setTeacherName(e.target.value)} />
          </div>
        </div>

        <div style={{textAlign:"center",fontWeight:700,margin:"22px 0 14px",fontSize:"1.05em"}}>Служебная записка</div>

        <p style={{textAlign:"justify",textIndent:"2em",margin:0}}>
          Прошу закрепить темы курсовых работ за студентами группы{" "}
          <input style={{...docFieldStyle,width:"4.5em"}} value={groupCode} onChange={e=>setGroupCode(e.target.value)} />,
          {" "}по специальности{" "}
          <input style={{...docFieldStyle,width:"5.5em"}} value={specCode} onChange={e=>setSpecCode(e.target.value)} />
        </p>
        <textarea rows={2} style={{...docFieldStyle,width:"100%",display:"block",resize:"vertical",margin:"4px 0",textAlign:"left"}}
          value={specName} onChange={e=>setSpecName(e.target.value)} />
        <p style={{textAlign:"justify",margin:0}}>
          по МДК{" "}
          <input style={{...docFieldStyle,width:"4.5em"}} value={mdkCode} onChange={e=>setMdkCode(e.target.value)} />
          {" "}«
        </p>
        <textarea rows={2} style={{...docFieldStyle,width:"100%",display:"block",resize:"vertical",margin:"4px 0",textAlign:"left"}}
          value={mdkName} onChange={e=>setMdkName(e.target.value)} />
        <p style={{textAlign:"justify",margin:0}}>
          » согласно следующему перечню тем.
        </p>

        <table style={{width:"100%",borderCollapse:"collapse",marginTop:16,fontSize:"0.8em",tableLayout:"fixed"}}>
          <colgroup><col style={{width:"10%"}} /><col style={{width:"62%"}} /><col style={{width:"28%"}} /></colgroup>
          <thead><tr><th style={docThStyle}>№ п/п</th><th style={docThStyle}>Название темы</th><th style={docThStyle}>Ф.И.О. студента</th></tr></thead>
          <tbody>
            {MOCK_DOC_STUDENTS.map((s,i)=>(
              <tr key={i}><td style={docTdStyle}>{i+1}</td><td style={docTdStyle}>{topics[i]}</td><td style={docTdStyle}>{s.name}</td></tr>
            ))}
          </tbody>
        </table>

        <div style={{textAlign:"right",marginTop:20}}>
          Преподаватель ______________ / {teacherName} /
        </div>
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
  // Every named person in the final document is editable, same as the служебка.
  const [signerName, setSignerName] = useState(MOCK_DOC_ORDER.signer);
  const [executorRole, setExecutorRole] = useState(MOCK_DOC_ORDER.executorRole);
  const [executorName, setExecutorName] = useState(MOCK_DOC_ORDER.executorName);
  const [clerkName, setClerkName] = useState(MOCK_DOC_ORDER.clerkName);
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
      <div style={{fontSize:"0.75rem",color:"#7B9DBF",textAlign:"center"}}>✎ Готовый документ — каждое поле с пунктиром можно изменить</div>
      <div style={docPageStyle}>
        <div style={{textAlign:"center",marginBottom:18}}>
          <AttLogo size={56} circular />
          <div style={{marginTop:8,fontSize:"0.82em"}}>
            Санкт-Петербургское государственное<br/>бюджетное профессиональное образовательное учреждение<br/>
            <b>«АКАДЕМИЯ ТРАНСПОРТНЫХ ТЕХНОЛОГИЙ<br/>имени Героя Социалистического Труда И.Г. Зубкова»</b>
          </div>
        </div>

        <div style={{textAlign:"center",fontWeight:700,letterSpacing:1,marginBottom:4,fontSize:"1.05em"}}>ПРИКАЗ</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"0.85em",marginBottom:14}}>
          <span>«<input style={{...docFieldStyle,width:"6em",textAlign:"center"}} value={date} onChange={e=>setDate(e.target.value)} />»</span>
          <span>№ <input style={{...docFieldStyle,width:"6em"}} value={number} onChange={e=>setNumber(e.target.value)} /></span>
        </div>
        <div style={{fontWeight:700,marginBottom:10}}>ПРИКАЗЫВАЮ:</div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.8em",tableLayout:"fixed"}}>
          <colgroup><col style={{width:"10%"}} /><col style={{width:"62%"}} /><col style={{width:"28%"}} /></colgroup>
          <thead><tr><th style={docThStyle}>№ п/п</th><th style={docThStyle}>Название темы</th><th style={docThStyle}>Ф.И.О. студента</th></tr></thead>
          <tbody>
            {MOCK_DOC_STUDENTS.map((s,i)=>(
              <tr key={i}><td style={docTdStyle}>{i+1}</td><td style={docTdStyle}>{topics[i]}</td><td style={docTdStyle}>{s.name}</td></tr>
            ))}
          </tbody>
        </table>
        <div style={{fontSize:"0.85em",marginTop:14}}>Основание:</div>
        <textarea rows={2} style={{...docFieldStyle,width:"100%",display:"block",resize:"vertical",fontSize:"0.85em",margin:"2px 0"}}
          value={basis} onChange={e=>setBasis(e.target.value)} />
        <div style={{marginTop:18,fontSize:"0.85em",display:"flex",flexDirection:"column",gap:8}}>
          <div>И.о. директора _________________ <input style={{...docFieldStyle,width:"11em"}} value={signerName} onChange={e=>setSignerName(e.target.value)} /></div>
          <div>
            Исполнитель <input style={{...docFieldStyle,width:"9em"}} value={executorRole} onChange={e=>setExecutorRole(e.target.value)} /> _____
            {" "}<input style={{...docFieldStyle,width:"9em"}} value={executorName} onChange={e=>setExecutorName(e.target.value)} />
          </div>
          <div>Печать документовед <input style={{...docFieldStyle,width:"9em"}} value={clerkName} onChange={e=>setClerkName(e.target.value)} /> _____</div>
          <div>Согласовано: ОК _____</div>
        </div>
        <div style={{borderTop:"2px solid #1a1a1a",marginTop:20,paddingTop:14,fontSize:"0.85em"}}>
          <div style={{fontWeight:700,marginBottom:8}}>ЛИСТ РАССЫЛКИ К ПРИКАЗУ ОТ «{date}» №{number}</div>
          {MOCK_DOC_DISTRIBUTION.filter(d=>distribution.includes(d.id)).map(d=>(
            <div key={d.id} style={{padding:"3px 0"}}>{d.title}</div>
          ))}
        </div>
      </div>
      <button className="btn-blue" style={{borderRadius:14,padding:14}} onClick={()=>setSigned(true)}>Подписать и отправить →</button>
      <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:"0.8125rem"}} onClick={()=>setStep(1)}>← Изменить рассылку</button>
    </>
  );
}
