// LKFaculty — "Факультативы" screen in the student personal account.
// Tabs: ДПО (real programs from атт.спб.рф/att/dpo, each with its own detail
// screen before registering) · Кружки (real clubs/sections from приказ
// №1800/403а, same click-to-open-detail pattern as ДПО) · Мои ДПО (registered
// courses' info/materials/tests, incl. a real multiple-choice quiz). Both ДПО
// and Кружки share ONE interest survey (MOCK_INTEREST_OPTIONS), shown once
// before the student picks either tab, whose tags drive "Рекомендовано" on
// both lists. Data: MOCK_ELECTIVES_DPO / MOCK_ELECTIVES_CIRCLES /
// MOCK_INTEREST_OPTIONS / MOCK_DPO_MATERIALS / MOCK_DPO_TESTS /
// MOCK_DPO_CONTACT (src/data/mockData.js).
function LKFaculty({ open, onClose }) {
  const [tab, setTab] = useState("ДПО");
  const [registered, setRegistered] = useState({}); // Кружки — {circleId: true}
  const [dpoView, setDpoView] = useState(null);      // {id, mode?:"pay"} — ДПО detail drill-down
  const [dpoTab, setDpoTab] = useState("about");     // "about" | "enroll" inside ДПО detail
  const [circleView, setCircleView] = useState(null); // {id} — Кружки detail drill-down
  const [myView, setMyView] = useState(null);        // {id, tab?} — Мои ДПО course cabinet
  const [testsState, setTestsState] = useState({});  // {courseId:idx -> {status,score}}, session-only
  const [quizOpen, setQuizOpen] = useState(null);     // {courseId, idx} — active quiz
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyTags, setSurveyTags] = useState(() => loadJSON("att_interest_survey", null)); // null = не пройдена
  const [dpoRegistered, setDpoRegistered] = useState(() => loadJSON("att_dpo_registered", []));

  useEffect(() => { saveJSON("att_interest_survey", surveyTags); }, [surveyTags]);
  useEffect(() => { saveJSON("att_dpo_registered", dpoRegistered); }, [dpoRegistered]);
  useEffect(() => {
    // Shown once before the student picks either ДПО or Кружки — not gated to a tab.
    if (open && surveyTags === null) setSurveyOpen(true);
  }, [open, surveyTags]);

  const dpo = MOCK_ELECTIVES_DPO;
  const circles = MOCK_ELECTIVES_CIRCLES;
  const dpoSorted = [...dpo].sort((a, b) => {
    const am = surveyTags && a.tags.some(t => surveyTags.includes(t)) ? 1 : 0;
    const bm = surveyTags && b.tags.some(t => surveyTags.includes(t)) ? 1 : 0;
    return bm - am;
  });
  const circlesSorted = [...circles].sort((a, b) => {
    const am = surveyTags && a.tags.some(t => surveyTags.includes(t)) ? 1 : 0;
    const bm = surveyTags && b.tags.some(t => surveyTags.includes(t)) ? 1 : 0;
    return bm - am;
  });
  const activeCourse = dpoView && dpo.find(d => d.id === dpoView.id);
  const activeMy = myView && dpo.find(d => d.id === myView.id);
  const activeCircle = circleView && circles.find(c => c.id === circleView.id);
  const activeQuizTest = quizOpen && MOCK_DPO_TESTS[quizOpen.courseId]?.[quizOpen.idx];

  let topTitle = "Личный кабинет", topTag = "Факультативы", topBack = onClose;
  if (dpoView && activeCourse)       { topTag = activeCourse.title; topBack = () => setDpoView(null); }
  if (myView && activeMy)            { topTag = activeMy.title;      topBack = () => setMyView(null); }
  if (circleView && activeCircle)    { topTag = activeCircle.title;  topBack = () => setCircleView(null); }

  const contactBlock = (
    <div className="section-card">
      <div className="section-head">КАК ЗАПИСАТЬСЯ</div>
      <div style={{fontSize:"0.8125rem",color:"#B9CBE0",lineHeight:1.7}}>
        <div style={{display:"flex",gap:8,marginBottom:6}}><Icon name="map-pin" size={14} color="#7B9DBF" style={{flexShrink:0,marginTop:2}} />{MOCK_DPO_CONTACT.address}</div>
        <div style={{display:"flex",gap:8,marginBottom:6}}><Icon name="phone" size={14} color="#7B9DBF" style={{flexShrink:0,marginTop:2}} />{MOCK_DPO_CONTACT.phones.join(", ")}</div>
        <div style={{display:"flex",gap:8}}><Icon name="mail" size={14} color="#7B9DBF" style={{flexShrink:0,marginTop:2}} />{MOCK_DPO_CONTACT.email}</div>
      </div>
    </div>
  );

  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={topBack} title={topTitle} tag={topTag} />
      <div className="inner-body">

        {!dpoView && !myView && !circleView && (
          <>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["ДПО","Кружки","Мои ДПО"].map(t=>(
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={t} className={`week-tab${tab===t?" active":""}`} onClick={()=>setTab(t)}>{t}</div>
              ))}
            </div>

            {tab!=="Мои ДПО" && surveyTags && (
              <div role="button" tabIndex={0} onKeyDown={activateOnEnter} style={{fontSize:"0.75rem",color:"#4A8FE7",cursor:"pointer"}} onClick={()=>setSurveyOpen(true)}>
                ✎ Изменить анкету интересов
              </div>
            )}

            {tab==="ДПО" && (
              <>
                <div style={{fontSize:"0.8125rem",color:"#7B9DBF"}}>Программы дополнительного профессионального образования (повышение квалификации)</div>
                {dpoSorted.map(it=>{
                  const matched = surveyTags && it.tags.some(t=>surveyTags.includes(t));
                  const isReg = dpoRegistered.includes(it.id);
                  return (
                    <div key={it.id} role="button" tabIndex={0} onKeyDown={activateOnEnter} className="fac-card"
                      onClick={()=>{setDpoView({id:it.id}); setDpoTab("about");}}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        <span className="fac-paid">Платно</span>
                        {matched && <span className="fac-free" style={{background:"#4A8FE722",color:"#4A8FE7"}}>★ Рекомендовано</span>}
                        {isReg && <span className="fac-free">Вы записаны</span>}
                      </div>
                      <div className="fac-title">{it.title}</div>
                      <div style={{fontSize:"0.6875rem",color:"#7B9DBF",marginBottom:6}}>{it.category}</div>
                      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                        <span className="fac-stat"><Icon name="wallet" size={12} color="#F5A623" style={{verticalAlign:-2,marginRight:3}} />{it.price}</span>
                        <span className="fac-stat"><Icon name="clock" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{it.hours}</span>
                        <span className="fac-stat"><Icon name="calendar" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{it.term}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {tab==="Кружки" && (
              <>
                <div style={{fontSize:"0.8125rem",color:"#7B9DBF"}}>Кружки, клубы и спортивные секции академии — 1 семестр 2026/2027 уч. года</div>
                {circlesSorted.map(it=>{
                  const matched = surveyTags && it.tags.some(t=>surveyTags.includes(t));
                  const isReg = !!registered[it.id];
                  return (
                    <div key={it.id} role="button" tabIndex={0} onKeyDown={activateOnEnter} className="fac-card"
                      onClick={()=>setCircleView({id:it.id})}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        <span className="fac-free">Бесплатно</span>
                        {matched && <span className="fac-free" style={{background:"#4A8FE722",color:"#4A8FE7"}}>★ Рекомендовано</span>}
                        {isReg && <span className="fac-free">Вы записаны</span>}
                      </div>
                      <div className="fac-title">{it.title}</div>
                      <div style={{fontSize:"0.6875rem",color:"#7B9DBF",marginBottom:6}}>{it.category}</div>
                      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                        <span className="fac-stat"><Icon name="calendar" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{it.schedule}</span>
                        {it.ageRange && <span className="fac-stat"><Icon name="user" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{it.ageRange} лет</span>}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {tab==="Мои ДПО" && (
              dpoRegistered.length===0 ? (
                <div style={{textAlign:"center",padding:"32px 12px",color:"#7B9DBF",fontSize:"0.8125rem",lineHeight:1.6}}>
                  Вы пока не записаны ни на одну программу ДПО.<br/>Загляните во вкладку «ДПО», чтобы выбрать программу.
                </div>
              ) : dpoRegistered.map(id=>{
                const c = dpo.find(d=>d.id===id);
                if (!c) return null;
                return (
                  <div key={id} role="button" tabIndex={0} onKeyDown={activateOnEnter} className="fac-card" onClick={()=>setMyView({id})}>
                    <div className="fac-title">{c.title}</div>
                    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                      <span className="fac-stat"><Icon name="clock" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{c.hours}</span>
                      <span className="fac-stat"><Icon name="calendar" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{c.term}</span>
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
              {[{k:"about",l:"О программе"},{k:"enroll",l:"Как записаться"}].map(t=>(
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={t.k} className={`week-tab${dpoTab===t.k?" active":""}`} onClick={()=>setDpoTab(t.k)}>{t.l}</div>
              ))}
            </div>

            {dpoTab==="about" && (
              <div className="section-card">
                <div style={{fontSize:"0.6875rem",color:"#7B9DBF",marginBottom:4}}>{activeCourse.category}</div>
                <div className="fac-title">{activeCourse.title}</div>
                <p style={{fontSize:"0.8125rem",color:"#B9CBE0",lineHeight:1.6}}>{activeCourse.desc}</p>
                <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:10}}>
                  <span className="fac-stat"><Icon name="wallet" size={12} color="#F5A623" style={{verticalAlign:-2,marginRight:3}} />{activeCourse.price}</span>
                  <span className="fac-stat"><Icon name="clock" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{activeCourse.hours}</span>
                  <span className="fac-stat"><Icon name="calendar" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{activeCourse.term}</span>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginTop:10,fontSize:"0.75rem",color:"#7B9DBF"}}>
                  <Icon name="graduation-cap" size={14} color="#7B9DBF" />{activeCourse.doc}
                </div>
              </div>
            )}

            {dpoTab==="enroll" && contactBlock}

            {dpoRegistered.includes(activeCourse.id) ? (
              <>
                <div style={{padding:"14px",background:"#4CAF6B22",borderRadius:12,textAlign:"center",color:"#5ec97a",border:"1px solid #4CAF6B44",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <SuccessCheck size={18} />Вы записаны на эту программу
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
                    <div style={{fontSize:"0.75rem",color:"#7B9DBF",lineHeight:1.5}}>Онлайн-оплата в приложении пока недоступна. Обратитесь в приёмную комиссию — {MOCK_DPO_CONTACT.address}, тел. {MOCK_DPO_CONTACT.phones[0]} — там подскажут реквизиты для оплаты наличными или картой.</div>
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
                onClick={()=>setDpoView({id:activeCourse.id, mode:"pay"})}>
                Записаться / Оплатить
              </button>
            )}
          </>
        )}

        {circleView && activeCircle && (
          <>
            <div className="section-card">
              <div style={{fontSize:"0.6875rem",color:"#7B9DBF",marginBottom:4}}>{activeCircle.category}</div>
              <div className="fac-title">{activeCircle.title}</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:6,fontSize:"0.8125rem",color:"#B9CBE0"}}>
                <div style={{display:"flex",gap:8}}><Icon name="user" size={14} color="#7B9DBF" style={{flexShrink:0,marginTop:2}} />Руководитель: {activeCircle.leader}</div>
                <div style={{display:"flex",gap:8}}><Icon name="calendar" size={14} color="#7B9DBF" style={{flexShrink:0,marginTop:2}} />{activeCircle.schedule}</div>
                {activeCircle.ageRange && <div style={{display:"flex",gap:8}}><Icon name="users" size={14} color="#7B9DBF" style={{flexShrink:0,marginTop:2}} />Возраст: {activeCircle.ageRange} лет</div>}
                {activeCircle.hours && <div style={{display:"flex",gap:8}}><Icon name="clock" size={14} color="#7B9DBF" style={{flexShrink:0,marginTop:2}} />Часы по программе / за 1 семестр: {activeCircle.hours}</div>}
              </div>
            </div>

            {registered[activeCircle.id] ? (
              <div style={{padding:"14px",background:"#4CAF6B22",borderRadius:12,textAlign:"center",color:"#5ec97a",border:"1px solid #4CAF6B44",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <SuccessCheck size={18} />Вы записаны
              </div>
            ) : (
              <button className="btn-blue" style={{borderRadius:14,padding:14}}
                onClick={()=>setRegistered(r=>({...r,[activeCircle.id]:true}))}>
                Записаться →
              </button>
            )}
          </>
        )}

        {myView && activeMy && (
          <>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[{k:"info",l:"Инфо"},{k:"materials",l:"Материалы"},{k:"tests",l:"Тесты"}].map(t=>(
                <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={t.k} className={`week-tab${(myView.tab||"info")===t.k?" active":""}`} onClick={()=>setMyView(v=>({...v,tab:t.k}))}>{t.l}</div>
              ))}
            </div>

            {(myView.tab||"info")==="info" && (
              <>
                <div className="section-card">
                  <div className="section-head">О ПРОГРАММЕ</div>
                  <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                    <span className="fac-stat"><Icon name="clock" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{activeMy.hours}</span>
                    <span className="fac-stat"><Icon name="calendar" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{activeMy.term}</span>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginTop:8,fontSize:"0.75rem",color:"#7B9DBF"}}>
                    <Icon name="graduation-cap" size={14} color="#7B9DBF" />{activeMy.doc}
                  </div>
                </div>
                {contactBlock}
              </>
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
                  const override = testsState[key];
                  const status = override ? override.status : t.status;
                  const score = override ? override.score : t.score;
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#142240",borderRadius:14,border:"1px solid #1E3560"}}>
                      <Icon name={status==="passed"?"check-circle-2":status==="locked"?"lock":"clipboard-list"} size={19} color={status==="passed"?"#5ec97a":status==="locked"?"#7B9DBF":"#4A8FE7"} />
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"0.8125rem",fontWeight:600}}>{t.title}</div>
                        <div style={{fontSize:"0.6875rem",color:"#7B9DBF",marginTop:2}}>
                          {status==="passed" ? `Пройден${score?" · "+score:""}` : status==="locked" ? "Откроется позже" : `Доступен${t.questions?" · "+t.questions.length+" вопр.":""}`}
                        </div>
                      </div>
                      {status==="available" && (
                        <button className="btn-blue" style={{borderRadius:10,padding:"7px 14px",fontSize:"0.75rem",flexShrink:0}}
                          onClick={()=>t.questions ? setQuizOpen({courseId:activeMy.id, idx:i}) : setTestsState(s=>({...s,[key]:{status:"passed"}}))}>
                          Пройти →
                        </button>
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
      <DpoQuizModal open={!!quizOpen} test={activeQuizTest} onClose={()=>setQuizOpen(null)}
        onFinish={(score)=>{
          if (quizOpen) setTestsState(s=>({...s,[`${quizOpen.courseId}:${quizOpen.idx}`]:{status:"passed",score}}));
          setQuizOpen(null);
        }} />
    </div>
  );
}

// DpoSurveyModal — shared "Анкета студента" popup: interest checkboxes used to
// compute the "Рекомендовано" recommendation on BOTH the ДПО and Кружки lists.
// Shown automatically by LKFaculty on first open of "Факультативы" (or while
// unfinished, since dismissing via "Напомнить позже" leaves att_interest_survey
// unset), before the student has picked either tab.
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
            <div className="lk-meta">Поможет подобрать подходящие ДПО и кружки</div>
          </div>
          <button className="lk-edit-btn" aria-label="Закрыть" onClick={onClose}>✕</button>
        </div>
        <div className="lk-body">
          <div style={{fontSize:"0.8125rem",color:"#7B9DBF"}}>Какие направления вам интересны? Можно выбрать несколько.</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {MOCK_INTEREST_OPTIONS.map(opt=>(
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

// DpoQuizModal — real multiple-choice quiz for a "Мои ДПО" course's final test
// module (MOCK_DPO_TESTS[id][i].questions). Single-select per question; grading
// and correct/incorrect highlighting happen after "Завершить тест".
function DpoQuizModal({ open, test, onClose, onFinish }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => { if (open) { setAnswers({}); setSubmitted(false); } }, [open, test]);
  if (!open || !test) return null;
  const qs = test.questions || [];
  const allAnswered = qs.every((_,i)=>answers[i]!==undefined);
  const correctCount = qs.filter((q,i)=>answers[i]===q.correct).length;
  return (
    <>
      <div className="lk-overlay open" onClick={submitted?onClose:undefined} />
      <div className="lk-sheet open">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#4A8FE7,#1a4a80)"}}><Icon name="clipboard-list" size={20} color="#FFFFFF" /></div>
          <div>
            <div className="lk-name">{test.title}</div>
            <div className="lk-meta">{qs.length} вопроса</div>
          </div>
          <button className="lk-edit-btn" aria-label="Закрыть" onClick={onClose}>✕</button>
        </div>
        <div className="lk-body">
          {qs.map((q,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:"0.8125rem",fontWeight:600}}>{i+1}. {q.q}</div>
              {q.options.map((opt,oi)=>{
                const picked = answers[i]===oi;
                const isCorrect = oi===q.correct;
                let bg="#142240", border="#1E3560", color="#fff";
                if (submitted && isCorrect)            { bg="#4CAF6B22"; border="#4CAF6B"; color="#5ec97a"; }
                else if (submitted && picked)           { bg="#E84C4C22"; border="#E84C4C"; color="#f08080"; }
                else if (!submitted && picked)          { bg="#1F5CB822"; border="#1F5CB8"; }
                return (
                  <div key={oi} role="button" tabIndex={0} onKeyDown={activateOnEnter}
                    style={{background:bg,border:`1px solid ${border}`,borderRadius:12,padding:"10px 12px",fontSize:"0.8125rem",color,cursor:submitted?"default":"pointer"}}
                    onClick={()=>!submitted && setAnswers(a=>({...a,[i]:oi}))}>
                    {opt}
                  </div>
                );
              })}
            </div>
          ))}
          {!submitted ? (
            <button className="btn-blue" disabled={!allAnswered} style={{borderRadius:14,padding:14,opacity:allAnswered?1:0.5}} onClick={()=>setSubmitted(true)}>
              Завершить тест →
            </button>
          ) : (
            <>
              <div style={{padding:"14px",background:correctCount===qs.length?"#4CAF6B22":"#F5A62322",borderRadius:12,textAlign:"center",
                color:correctCount===qs.length?"#5ec97a":"#F5A623",border:`1px solid ${correctCount===qs.length?"#4CAF6B44":"#F5A62344"}`}}>
                Результат: {correctCount} из {qs.length}
              </div>
              <button className="btn-blue" style={{borderRadius:14,padding:14}} onClick={()=>onFinish(`${correctCount}/${qs.length}`)}>
                Готово
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}


// ── LK ABOUT APP ──────────────────────────────────────────────────────────────
