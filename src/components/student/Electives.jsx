// LKFaculty — "Факультативы" screen in the student personal account.
function LKFaculty({ open, onClose }) {
  const [tab, setTab] = useState("ДПО");
  const dpo = [
    {paid:true,title:"AutoCAD 2024",price:"4 900 руб.",duration:"2 мес.",slots:12},
    {paid:true,title:"1С: Бухгалтерия",price:"3 500 руб.",duration:"1.5 мес.",slots:8},
    {paid:false,title:"Волонтёрский центр АТТ",price:"Бесплатно",duration:"Постоянно",slots:20},
  ];
  const circles = [
    {paid:false,title:"Спортивная секция (футбол)",price:"Бесплатно",duration:"Вт, Чт 18:00",slots:15},
    {paid:false,title:"Научный кружок «Техника»",price:"Бесплатно",duration:"Ср 16:00",slots:10},
    {paid:false,title:"Творческая студия",price:"Бесплатно",duration:"Пт 17:00",slots:18},
    {paid:true,title:"Курс английского языка",price:"2 200 руб./мес.",duration:"Пн, Ср 19:00",slots:6},
  ];
  const items = tab==="ДПО"?dpo:circles;
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Факультативы" />
      <div className="inner-body">
        <div style={{display:"flex",gap:8}}>
          {["ДПО","Кружки"].map(t=>(
            <div key={t} className={`week-tab${tab===t?" active":""}`} onClick={()=>setTab(t)}>{t}</div>
          ))}
        </div>
        <div style={{fontSize:13,color:"#7B9DBF"}}>
          {tab==="ДПО"?"Платные курсы доп. профессионального образования":"Кружки и секции академии"}
        </div>
        {items.map((it,i)=>(
          <div key={i} className="fac-card" >
            <span className={it.paid?"fac-paid":"fac-free"}>{it.paid?"Платно":"Бесплатно"}</span>
            <div className="fac-title">{it.title}</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <span className="fac-stat">💰 {it.price}</span>
              <span className="fac-stat">⏱ {it.duration}</span>
              <span className="fac-stat">👤 Мест: {it.slots}</span>
            </div>
            <button className="btn-blue" style={{width:"100%",borderRadius:10,padding:"9px 0",marginTop:10,fontSize:13}}>
              {it.paid?"Записаться / Оплатить":"Записаться →"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── LK ABOUT APP ──────────────────────────────────────────────────────────────
