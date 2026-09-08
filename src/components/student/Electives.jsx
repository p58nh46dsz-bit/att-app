// LKFaculty — "Факультативы" screen in the student personal account.
function LKFaculty({ open, onClose }) {
  const [tab, setTab] = useState("ДПО");
  const [registered, setRegistered] = useState({});
  const dpo = MOCK_ELECTIVES_DPO;
  const circles = MOCK_ELECTIVES_CIRCLES;
  const items = tab==="ДПО"?dpo:circles;
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Факультативы" />
      <div className="inner-body">
        <div style={{display:"flex",gap:8}}>
          {["ДПО","Кружки"].map(t=>(
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={t} className={`week-tab${tab===t?" active":""}`} onClick={()=>setTab(t)}>{t}</div>
          ))}
        </div>
        <div style={{fontSize:"0.8125rem",color:"#7B9DBF"}}>
          {tab==="ДПО"?"Платные курсы доп. профессионального образования":"Кружки и секции академии"}
        </div>
        {items.map((it,i)=>(
          <div key={i} className="fac-card" >
            <span className={it.paid?"fac-paid":"fac-free"}>{it.paid?"Платно":"Бесплатно"}</span>
            <div className="fac-title">{it.title}</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <span className="fac-stat"><Icon name="wallet" size={12} color="#F5A623" style={{verticalAlign:-2,marginRight:3}} />{it.price}</span>
              <span className="fac-stat"><Icon name="clock" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{it.duration}</span>
              <span className="fac-stat"><Icon name="user" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />Мест: {it.slots}</span>
            </div>
            <button className="btn-blue" disabled={!!registered[tab+i]}
              style={{width:"100%",borderRadius:10,padding:"9px 0",marginTop:10,fontSize:"0.8125rem",opacity:registered[tab+i]?0.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
              onClick={()=>setRegistered(r=>({...r,[tab+i]:true}))}>
              {registered[tab+i] ? <><SuccessCheck size={15} />Вы записаны</> : (it.paid?"Записаться / Оплатить":"Записаться →")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── LK ABOUT APP ──────────────────────────────────────────────────────────────
