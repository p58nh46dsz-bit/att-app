// LKFaculty — "Факультативы" screen in the student personal account.
// Tabs: ДПО (courses, with an interest survey + recommendations + detail/payment
// drill-down) · Кружки (unchanged simple list) · Мои ДПО (registered courses'
// schedule/materials/tests). Data: MOCK_ELECTIVES_DPO / MOCK_ELECTIVES_CIRCLES /
// MOCK_DPO_INTERESTS / MOCK_DPO_MATERIALS / MOCK_DPO_TESTS (src/data/mockData.js).
function LKFaculty({ open, onClose }) {
  const [tab, setTab] = useState("ДПО");
  const [registered, setRegistered] = useState({}); // Кружки — unchanged simple per-card flow
  const [dpoView, setDpoView] = useState(null);      // {id, mode?:"pay"} — ДПО detail drill-down
  const [dpoTab, setDpoTab] = useState("about");     // "about" | "schedule" inside ДПО detail
  const [myView, setMyView] = useState(null);        // {id, tab?} — Мои ДПО course cabinet
  const [testsState, setTestsState] = useState({});  // demo "Пройти" overrides, session-only
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyTags, setSurveyTags] = useState(() => loadJSON("att_dpo_survey", null)); // null = не пройдена
  const [dpoRegistered, setDpoRegistered] = useState(() => loadJSON("att_dpo_registered", []));

  useEffect(() => { saveJSON("att_dpo_survey", surveyTags); }, [surveyTags]);
  useEffect(() => { saveJSON("att_dpo_registered", dpoRegistered); }, [dpoRegistered]);
  useEffect(() => {
    if (open && tab === "ДПО" && surveyTags === null) setSurveyOpen(true);
  }, [open, tab, surveyTags]);

  const dpo = MOCK_ELECTIVES_DPO;
  const circles = MOCK_ELECTIVES_CIRCLES;
  const dpoSorted = [...dpo].sort((a, b) => {
    const am = surveyTags && a.tags.some(t => surveyTags.includes(t)) ? 1 : 0;
    const bm = surveyTags && b.tags.some(t => surveyTags.includes(t)) ? 1 : 0;
    return bm - am;
  });
  const activeCourse = dpoView && dpo.find(d => d.id === dpoView.id);
  const activeMy = myView && dpo.find(d => d.id === myView.id);

  let topTitle = "Личный кабинет", topTag = "Факультативы", topBack = onClose;
  if (dpoView && activeCourse) { topTag = activeCourse.title; topBack = () => setDpoView(null); }
  if (myView && activeMy)      { topTag = activeMy.title;      topBack = () => setMyView(null); }

  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={topBack} title={topTitle} tag={topTag} />
      <div className="inner-body">

        {!dpoView && !myView && (
          <>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["ДПО","Кружки","Мои ДПО"].map(t=>(
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={t} className={`week-tab${tab===t?" active":""}`} onClick={()=>setTab(t)}>{t}</div>
              ))}
            </div>

            {tab==="ДПО" && (
              <>
                <div style={{fontSize:"0.8125rem",color:"#7B9DBF"}}>Платные курсы доп. профессионального образования</div>
                {surveyTags && (
                  <div role="button" tabIndex={0} onKeyDown={activateOnEnter} style={{fontSize:"0.75rem",color:"#4A8FE7",cursor:"pointer"}} onClick={()=>setSurveyOpen(true)}>
                    ✎ Изменить анкету интересов
                  </div>
                )}
                {dpoSorted.map(it=>{
                  const matched = surveyTags && it.tags.some(t=>surveyTags.includes(t));
                  const isReg = dpoRegistered.includes(it.id);
                  return (
                    <div key={it.id} role="button" tabIndex={0} onKeyDown={activateOnEnter} className="fac-card"
                      onClick={()=>{setDpoView({id:it.id}); setDpoTab("about");}}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        <span className={it.paid?"fac-paid":"fac-free"}>{it.paid?"Платно":"Бесплатно"}</span>
                        {matched && <span className="fac-free" style={{background:"#4A8FE722",color:"#4A8FE7"}}>★ Рекомендовано</span>}
                        {isReg && <span className="fac-free">Вы записаны</span>}
                      </div>
                      <div className="fac-title">{it.title}</div>
                      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                        <span className="fac-stat"><Icon name="wallet" size={12} color="#F5A623" style={{verticalAlign:-2,marginRight:3}} />{it.price}</span>
                        <span className="fac-stat"><Icon name="clock" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{it.duration}</span>
                        <span className="fac-stat"><Icon name="user" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />Мест: {it.slots}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {tab==="Кружки" && (
              <>
                <div style={{fontSize:"0.8125rem",color:"#7B9DBF"}}>Кружки и секции академии</div>
                {circles.map((it,i)=>(
                  <div key={i} className="fac-card">
                    <span className={it.paid?"fac-paid":"fac-free"}>{it.paid?"Платно":"Бесплатно"}</span>
                    <div className="fac-title">{it.title}</div>
                    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                      <span className="fac-stat"><Icon name="wallet" size={12} color="#F5A623" style={{verticalAlign:-2,marginRight:3}} />{it.price}</span>
                      <span className="fac-stat"><Icon name="clock" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{it.duration}</span>
                      <span className="fac-stat"><Icon name="user" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />Мест: {it.slots}</span>
                    </div>
                    <button className="btn-blue" disabled={!!registered["circ"+i]}
                      style={{width:"100%",borderRadius:10,padding:"9px 0",marginTop:10,fontSize:"0.8125rem",opacity:registered["circ"+i]?0.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
                      onClick={()=>setRegistered(r=>({...r,["circ"+i]:true}))}>
                      {registered["circ"+i] ? <><SuccessCheck size={15} />Вы записаны</> : (it.paid?"Записаться / Оплатить":"Записаться →")}
                    </button>
                  </div>
                ))}
              </>
            )}

            {tab==="Мои ДПО" && (
              dpoRegistered.length===0 ? (
                <div style={{textAlign:"center",padding:"32px 12px",color:"#7B9DBF",fontSize:"0.8125rem",lineHeight:1.6}}>
                  Вы пока не записаны ни на один курс ДПО.<br/>Загляните во вкладку «ДПО», чтобы выбрать курс.
                </div>
              ) : dpoRegistered.map(id=>{
                const c = dpo.find(d=>d.id===id);
                if (!c) return null;
                return (
                  <div key={id} role="button" tabIndex={0} onKeyDown={activateOnEnter} className="fac-card" onClick={()=>setMyView({id})}>
                    <div className="fac-title">{c.title}</div>
                    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                      <span className="fac-stat"><Icon name="calendar" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{c.schedule[0]?.day}</span>
                      <span className="fac-stat"><Icon name="clock" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{c.schedule[0]?.time}</span>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {dpoView && activeCourse && (
          <>
            <div style={{display:"flex",gap:8}}>
              {[{k:"about",l:"О чём"},{k:"schedule",l:"Расписание"}].map(t=>(
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={t.k} className={`week-tab${dpoTab===t.k?" active":""}`} onClick={()=>setDpoTab(t.k)}>{t.l}</div>
              ))}
            </div>

            {dpoTab==="about" && (
              <div className="section-card">
                <div className="fac-title">{activeCourse.title}</div>
                <p style={{fontSize:"0.8125rem",color:"#B9CBE0",lineHeight:1.6}}>{activeCourse.desc}</p>
                <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:10}}>
                  <span className="fac-stat"><Icon name="wallet" size={12} color="#F5A623" style={{verticalAlign:-2,marginRight:3}} />{activeCourse.price}</span>
                  <span className="fac-stat"><Icon name="clock" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{activeCourse.duration}</span>
                  <span className="fac-stat"><Icon name="user" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />Мест: {activeCourse.slots}</span>
                </div>
              </div>
            )}

            {dpoTab==="schedule" && (
              <div className="section-card">
                <div className="section-head">РАСПИСАНИЕ ЗАНЯТИЙ</div>
                {activeCourse.schedule.map((s,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontSize:"0.8125rem",borderTop:i?"1px solid #1E3560":"none"}}>
                    <span>{s.day}</span><span style={{color:"#7B9DBF"}}>{s.time}</span>
                  </div>
                ))}
              </div>
            )}

            {dpoRegistered.includes(activeCourse.id) ? (
              <>
                <div style={{padding:"14px",background:"#4CAF6B22",borderRadius:12,textAlign:"center",color:"#5ec97a",border:"1px solid #4CAF6B44",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <SuccessCheck size={18} />Вы записаны на этот курс
                </div>
                <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:"0.8125rem"}}
                  onClick={()=>{setDpoView(null); setTab("Мои ДПО");}}>
                  Перейти в «Мои ДПО» →
                </button>
              </>
            ) : dpoView.mode==="pay" ? (
              <div style={{background:"#142240",border:"1px solid #1E3560",borderRadius:14,padding:14,display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <Icon name="wallet" size={20} color="#F5A623" style={{flexShrink:0,marginTop:2}} />
                  <div>
                    <div style={{fontWeight:600,fontSize:"0.875rem",marginBottom:2}}>Оплата — через отделение академии</div>
                    <div style={{fontSize:"0.75rem",color:"#7B9DBF",lineHeight:1.5}}>Онлайн-оплата в приложении пока недоступна. Внесите оплату наличными или картой в учебном отделении — менеджер подскажет реквизиты.</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button className="btn-sec" style={{flex:1,borderRadius:14,padding:14,fontSize:"0.8125rem"}} onClick={()=>setDpoView({id:activeCourse.id})}>← Назад</button>
                  <button className="btn-blue" style={{flex:2,borderRadius:14,padding:14}}
                    onClick={()=>{setDpoRegistered(r=>[...r,activeCourse.id]); setDpoView({id:activeCourse.id});}}>
                    Понятно, записать меня →
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn-blue" style={{borderRadius:14,padding:14}}
                onClick={()=>{
                  if (activeCourse.paid) setDpoView({id:activeCourse.id, mode:"pay"});
                  else setDpoRegistered(r=>[...r,activeCourse.id]);
                }}>
                {activeCourse.paid ? "Записаться / Оплатить" : "Записаться →"}
              </button>
            )}
          </>
        )}

        {myView && activeMy && (
          <>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[{k:"schedule",l:"Расписание"},{k:"materials",l:"Материалы"},{k:"tests",l:"Тесты"}].map(t=>(
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={t.k} className={`week-tab${(myView.tab||"schedule")===t.k?" active":""}`} onClick={()=>setMyView(v=>({...v,tab:t.k}))}>{t.l}</div>
              ))}
            </div>

            {(myView.tab||"schedule")==="schedule" && (
              <div className="section-card">
                <div className="section-head">РАСПИСАНИЕ ЗАНЯТИЙ</div>
                {activeMy.schedule.map((s,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontSize:"0.8125rem",borderTop:i?"1px solid #1E3560":"none"}}>
                    <span>{s.day}</span><span style={{color:"#7B9DBF"}}>{s.time}</span>
                  </div>
                ))}
              </div>
            )}

            {myView.tab==="materials" && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {(MOCK_DPO_MATERIALS[activeMy.id]||[]).map((f,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#142240",borderRadius:14,border:"1px solid #1E3560"}}>
                    <div style={{width:40,height:40,borderRadius:10,background:(MOCK_MATERIAL_COLOR[f.type]||MOCK_MATERIAL_COLOR.other)+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Icon name={MOCK_MATERIAL_ICON[f.type]||"file"} size={19} color={MOCK_MATERIAL_COLOR[f.type]||MOCK_MATERIAL_COLOR.other} />
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"0.75rem",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                      <div style={{fontSize:"0.6875rem",color:"#7B9DBF",marginTop:2}}>{f.date} · {f.size}</div>
                    </div>
                    <span style={{color:"#7B9DBF",fontSize:"1.125rem"}}>›</span>
                  </div>
                ))}
                {(MOCK_DPO_MATERIALS[activeMy.id]||[]).length===0 && <div style={{textAlign:"center",padding:"20px 0",color:"#7B9DBF",fontSize:"0.8125rem"}}>Материалов пока нет</div>}
              </div>
            )}

            {myView.tab==="tests" && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {(MOCK_DPO_TESTS[activeMy.id]||[]).map((t,i)=>{
                  const key = `${activeMy.id}:${i}`;
                  const status = testsState[key] || t.status;
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#142240",borderRadius:14,border:"1px solid #1E3560"}}>
                      <Icon name={status==="passed"?"check-circle-2":status==="locked"?"lock":"clipboard-list"} size={19} color={status==="passed"?"#5ec97a":status==="locked"?"#7B9DBF":"#4A8FE7"} />
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"0.8125rem",fontWeight:600}}>{t.title}</div>
                        <div style={{fontSize:"0.6875rem",color:"#7B9DBF",marginTop:2}}>
                          {status==="passed" ? `Пройден${t.score?" · "+t.score:""}` : status==="locked" ? "Откроется позже" : "Доступен"}
                        </div>
                      </div>
                      {status==="available" && (
                        <button className="btn-blue" style={{borderRadius:10,padding:"7px 14px",fontSize:"0.75rem",flexShrink:0}}
                          onClick={()=>setTestsState(s=>({...s,[key]:"passed"}))}>Пройти →</button>
                      )}
                    </div>
                  );
                })}
                {(MOCK_DPO_TESTS[activeMy.id]||[]).length===0 && <div style={{textAlign:"center",padding:"20px 0",color:"#7B9DBF",fontSize:"0.8125rem"}}>Тестов пока нет</div>}
              </div>
            )}
          </>
        )}

      </div>
      <DpoSurveyModal open={surveyOpen} initial={surveyTags} onClose={()=>setSurveyOpen(false)}
        onSubmit={(tags)=>{setSurveyTags(tags); setSurveyOpen(false);}} />
    </div>
  );
}

// DpoSurveyModal — "Анкета студента" popup: interest checkboxes used to compute
// the "Рекомендовано" recommendation on the ДПО list. Shown automatically by
// LKFaculty on first open of the ДПО tab (or while unfinished, since dismissing
// via "Напомнить позже" leaves att_dpo_survey unset).
function DpoSurveyModal({ open, initial, onClose, onSubmit }) {
  const [sel, setSel] = useState(initial || []);
  useEffect(() => { if (open) setSel(initial || []); }, [open, initial]);
  if (!open) return null;
  const toggle = (id) => setSel(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#1F5CB8,#0d2060)"}}><Icon name="clipboard-list" size={20} color="#FFFFFF" /></div>
          <div>
            <div className="lk-name">Анкета студента</div>
            <div className="lk-meta">Поможет подобрать подходящие курсы ДПО</div>
          </div>
          <button className="lk-edit-btn" aria-label="Закрыть" onClick={onClose}>✕</button>
        </div>
        <div className="lk-body">
          <div style={{fontSize:"0.8125rem",color:"#7B9DBF"}}>Какие направления вам интересны? Можно выбрать несколько.</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {MOCK_DPO_INTERESTS.map(opt=>(
              <div key={opt.id} role="button" tabIndex={0} onKeyDown={activateOnEnter} className="checkbox-row" onClick={()=>toggle(opt.id)}>
                <div className={`checkbox${sel.includes(opt.id)?" checked":""}`}>{sel.includes(opt.id) && <span style={{color:"#fff",fontSize:"0.6875rem",lineHeight:1}}>✓</span>}</div>
                <div style={{fontSize:"0.8125rem"}}>{opt.label}</div>
              </div>
            ))}
          </div>
          <button className="btn-blue" disabled={sel.length===0} style={{borderRadius:14,padding:14,opacity:sel.length===0?0.5:1}} onClick={()=>onSubmit(sel)}>
            Продолжить →
          </button>
          <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:"0.8125rem"}} onClick={onClose}>
            Напомнить позже
          </button>
        </div>
      </div>
    </>
  );
}


// ── LK ABOUT APP ──────────────────────────────────────────────────────────────
