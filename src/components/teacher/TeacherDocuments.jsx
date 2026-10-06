// TeacherDocuments — "Документы" screen in the teacher personal account.
// Three blocks: Служебная записка and Приказ (both build a real formatted document and, on
// "Готово"/"Подписать и отправить", save an entry to История) and История itself. Everything
// comes from the database: the group, its roster with course-project topics (GET /groups/:code),
// the templates (CONTENT.doc_defaults) and the history (GET/POST /me/documents), which also
// keeps the full text of every formed document.
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
// Real St. Petersburg institutional crest, extracted from the actual приказ .doc
// letterhead (the round "АТТ 1945" badge used elsewhere in the app is a different,
// informal emblem — this is the one that belongs on an official order document).
const ORDER_EMBLEM_SRC = "data:image/jpeg;base64,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";

// История — saved in the database together with every field of the formed document.
async function pushDocHistory(entry) {
  const r = await apiAuthed("/me/documents", { method: "POST", body: entry });
  return r.status === 201;
}

function TeacherDocuments({ open, onClose }) {
  const [view, setView] = useState(null); // null | "memo" | "order" | "history"
  // The group the documents are about = the teacher's group that has a specialty (the course-project group).
  const { data: groups, error: groupsError, load: loadGroups } = useApi("/groups", open);
  const docGroup = groups && groups.find(g => g.specialtyCode);
  const { data: roster } = useApi(docGroup ? "/groups/" + encodeURIComponent(docGroup.code) : null, open && !!docGroup);
  const D = CONTENT.doc_defaults;
  const ctx = roster ? { group: roster, students: roster.roster, teacher: D.teacher, recipients: D.recipients, order: D.order, distribution: D.distribution } : null;
  const titles = { memo:"Служебная записка", order:"Приказ", history:"История" };
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
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="fac-card" onClick={()=>setView("history")}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <Icon name="clock" size={20} color="#5ec97a" />
                <div style={{flex:1}}>
                  <div className="fac-title" style={{marginBottom:2}}>История</div>
                  <div style={{fontSize:"0.75rem",color:"#7B9DBF"}}>Отправленные записки и подписанные приказы</div>
                </div>
                <span style={{color:"#7B9DBF",fontSize:"1.125rem"}}>›</span>
              </div>
            </div>
          </>
        )}
        {view==="memo" && ctx && <MemoWizard ctx={ctx} onClose={()=>setView(null)} />}
        {view==="order" && ctx && <OrderWizard ctx={ctx} onClose={()=>setView(null)} />}
        {(view==="memo" || view==="order") && !ctx && (
          <div style={{textAlign:"center",padding:"40px 12px",color:"#7B9DBF",fontSize:"0.8125rem",lineHeight:1.6}}>
            {groupsError ? <>Не удалось загрузить данные.<br/><button className="btn-blue" style={{marginTop:14,borderRadius:50,padding:"10px 28px"}} onClick={loadGroups}>Повторить</button></> : (groups && !docGroup ? "У вас нет группы с курсовыми работами." : "Загрузка…")}
          </div>
        )}
        {view==="history" && <HistoryView />}
      </div>
    </div>
  );
}

// HistoryView — read-only log of everything saved by pushDocHistory, loaded from the database.
function HistoryView() {
  const { data: items, error, load } = useApi("/me/documents", true);
  if (!items) return (
    <div style={{textAlign:"center",padding:"32px 12px",color:"#7B9DBF",fontSize:"0.8125rem",lineHeight:1.6}}>
      {error ? <>Не удалось загрузить историю.<br/><button className="btn-blue" style={{marginTop:14,borderRadius:50,padding:"10px 28px"}} onClick={load}>Повторить</button></> : "Загрузка…"}
    </div>
  );
  if (items.length === 0) return (
    <div style={{textAlign:"center",padding:"32px 12px",color:"#7B9DBF",fontSize:"0.8125rem",lineHeight:1.6}}>
      История пока пуста.<br/>Здесь появятся отправленные служебные записки и подписанные приказы.
    </div>
  );
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {items.map(it=>(
        <div key={it.id} className="fac-card">
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <Icon name={it.type==="order"?"file-text":"send"} size={18} color={it.type==="order"?"#F5A623":"#4A8FE7"} style={{marginTop:2,flexShrink:0}} />
            <div style={{flex:1,minWidth:0}}>
              <div className="fac-title" style={{marginBottom:2,fontSize:"0.875rem"}}>{it.title}</div>
              <div style={{fontSize:"0.75rem",color:"#7B9DBF"}}>{it.meta}</div>
              <div style={{fontSize:"0.6875rem",color:"#5a7a99",marginTop:4}}>{it.savedAt}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// MemoWizard — Служебная записка: тема-на-студента форма → выбор адресата →
// "Кому приходит записка" review. Deliberately stops there (no "Отправить"):
// the approval/routing structure past this point isn't designed yet.
function MemoWizard({ ctx, onClose }) {
  const { group: docGroup, students: docStudents, teacher: docTeacher, recipients: docRecipients } = ctx;
  const [step, setStep] = useState(0);
  const [topics, setTopics] = useState(() => docStudents.map(s => s.topic));
  const [recipient, setRecipient] = useState(docRecipients[0].id);
  const rec = docRecipients.find(r => r.id === recipient);
  // Editable straight in the final document (step 2) — depend on the teacher/group, not fixed content.
  const [teacherName, setTeacherName] = useState(docTeacher.name);
  const [ckNumber, setCkNumber] = useState("8");
  const [groupCode, setGroupCode] = useState(docGroup.code);
  const [specCode, setSpecCode] = useState(docGroup.specialtyCode);
  const [specName, setSpecName] = useState(docGroup.specialtyName);
  const [mdkCode, setMdkCode] = useState((docGroup.mdkCode || "").replace(/^МДК\s*/,""));
  const [mdkName, setMdkName] = useState(docGroup.mdkName);
  const [saved, setSaved] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [docError, setDocError] = useState("");

  if (saved) return (
    <div style={{textAlign:"center",padding:"20px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
      <SuccessCheck size={52} />
      <h2>Записка сохранена в истории</h2>
      <p style={{fontSize:"0.8125rem",color:"#7B9DBF",lineHeight:1.6}}>
        {rec.position} {rec.name}<br/>Группа {groupCode} · {docStudents.length} тем
      </p>
      <button className="btn-blue" style={{borderRadius:50,padding:"12px 32px"}} onClick={onClose}>Готово</button>
    </div>
  );

  if (step === 0) return (
    <>
      <div className="section-card">
        <div className="section-head">ГРУППА</div>
        <div style={{fontSize:"0.9375rem",fontWeight:600}}>{groupCode}</div>
        <div style={{fontSize:"0.75rem",color:"#7B9DBF",marginTop:6}}>{specCode} {specName}</div>
        <div style={{fontSize:"0.75rem",color:"#7B9DBF",marginTop:2}}>МДК {mdkCode} «{mdkName}»</div>
      </div>
      <div className="section-head">ТЕМЫ КУРСОВЫХ РАБОТ — {docStudents.length} СТУДЕНТОВ</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {docStudents.map((s,i)=>(
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
      {docRecipients.map(r=>(
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
            {docStudents.map((s,i)=>(
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
      {docError && <div style={{color:"#ff7e7e",fontSize:"0.8125rem",textAlign:"center"}}>{docError}</div>}
      <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:"0.8125rem"}} onClick={()=>setStep(1)}>← Изменить адресата</button>
      <button className="btn-blue" style={{borderRadius:14,padding:14}}
        disabled={savingDoc}
        onClick={async()=>{
          setSavingDoc(true); setDocError("");
          const ok = await pushDocHistory({
            type: "memo",
            title: "Служебная записка",
            meta: `Группа ${groupCode} · ${rec.position}, ${rec.name} · ${docStudents.length} тем`,
            payload: { recipient: rec, teacherName, ckNumber, groupCode, specCode, specName, mdkCode, mdkName,
              rows: docStudents.map((st, i) => ({ student: st.name, topic: topics[i] })) },
          });
          setSavingDoc(false);
          if (ok) setSaved(true); else setDocError("Не удалось сохранить в историю. Попробуйте ещё раз.");
        }}>
        {savingDoc ? "Сохраняем…" : "Готово"}
      </button>
    </>
  );
}

// OrderWizard — Приказ: тема-на-студента форма → лист рассылки → сформированный
// документ (реальная структура: ПРИКАЗЫВАЮ, таблица, основание, подписи, лист
// рассылки) → подпись и подтверждение. Built through to completion.
function OrderWizard({ ctx, onClose }) {
  const { students: docStudents, order: docOrder, distribution: docDistribution } = ctx;
  const [step, setStep] = useState(0);
  const [number, setNumber] = useState(docOrder.number);
  const [date, setDate] = useState(docOrder.date);
  const [basis, setBasis] = useState(docOrder.basis);
  const [topics, setTopics] = useState(() => docStudents.map(s => s.topic));
  const [distribution, setDistribution] = useState(() => docDistribution.filter(d=>d.default).map(d=>d.id));
  const [signed, setSigned] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [docError, setDocError] = useState("");
  // Every named person in the final document is editable, same as the служебка.
  const [signerName, setSignerName] = useState(docOrder.signer);
  const [executorRole, setExecutorRole] = useState(docOrder.executorRole);
  const [executorName, setExecutorName] = useState(docOrder.executorName);
  const [clerkName, setClerkName] = useState(docOrder.clerkName);
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
      <div className="section-head">ТЕМЫ КУРСОВЫХ РАБОТ — {docStudents.length} СТУДЕНТОВ</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {docStudents.map((s,i)=>(
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
      {docDistribution.map(d=>{
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
        № {number} от «{date}»<br/>Разослан по {distribution.length} адрес{distribution.length===1?"у":distribution.length<5?"ам":"ам"}<br/>Сохранён в истории
      </p>
      <button className="btn-blue" style={{borderRadius:50,padding:"12px 32px"}} onClick={onClose}>Готово</button>
    </div>
  );

  return (
    <>
      <div style={{fontSize:"0.75rem",color:"#7B9DBF",textAlign:"center"}}>✎ Готовый документ — каждое поле с пунктиром можно изменить</div>
      <div style={docPageStyle}>
        <div style={{textAlign:"center",marginBottom:18}}>
          <img src={ORDER_EMBLEM_SRC} alt="" style={{width:72,height:"auto",display:"block",margin:"0 auto"}} />
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
            {docStudents.map((s,i)=>(
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
          {docDistribution.filter(d=>distribution.includes(d.id)).map(d=>(
            <div key={d.id} style={{padding:"3px 0"}}>{d.title}</div>
          ))}
        </div>
      </div>
      {docError && <div style={{color:"#ff7e7e",fontSize:"0.8125rem",textAlign:"center"}}>{docError}</div>}
      <button className="btn-blue" style={{borderRadius:14,padding:14}}
        disabled={savingDoc}
        onClick={async()=>{
          setSavingDoc(true); setDocError("");
          const ok = await pushDocHistory({
            type: "order",
            title: `Приказ № ${number}`,
            meta: `от «${date}» · ${docStudents.length} тем · рассылка: ${docDistribution.filter(d=>distribution.includes(d.id)).map(d=>d.title).join(", ")}`,
            payload: { number, date, basis, signerName, executorRole, executorName, clerkName,
              distribution: docDistribution.filter(d=>distribution.includes(d.id)).map(d=>d.title),
              rows: docStudents.map((st, i) => ({ student: st.name, topic: topics[i] })) },
          });
          setSavingDoc(false);
          if (ok) setSigned(true); else setDocError("Не удалось сохранить в историю. Попробуйте ещё раз.");
        }}>
        Подписать и отправить →
      </button>
      <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:"0.8125rem"}} onClick={()=>setStep(1)}>← Изменить рассылку</button>
    </>
  );
}
