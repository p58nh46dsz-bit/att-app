// LKSpravki — "Справки" screen in the student personal account.
function LKSpravki({ open, onClose }) {
  const [ordered, setOrdered] = useState({});
  const spravki = [
    {icon:"🎓",title:"Справка об обучении",sub:"Подтверждение статуса студента",status:"ready"},
    {icon:"💰",title:"Справка о стипендии",sub:"Размер и период выплат",status:"process"},
    {icon:"🏛️",title:"Академическая справка",sub:"Сведения об успеваемости",status:null},
    {icon:"⚔️",title:"Справка для военкомата",sub:"Форма для военно-учётного стола",status:null},
  ];
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Справки" />
      <div className="inner-body">
        <div style={{background:"linear-gradient(135deg,#0f1c38,#12111a)",border:"1px solid #1E3560",borderRadius:16,padding:14,fontSize:13,color:"#7B9DBF"}}>
          💡 Готовые справки выдаются в учебном отделе (корп. А, каб. 5) в течение 3 рабочих дней
        </div>
        {spravki.map((s,i)=>(
          <div key={i} className="spravka-item" 
            onClick={()=>!s.status&&setOrdered(p=>({...p,[i]:true}))}>
            <span style={{fontSize:26,flexShrink:0}}>{s.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,marginBottom:3}}>{s.title}</div>
              <div style={{fontSize:12,color:"#7B9DBF"}}>{s.sub}</div>
            </div>
            {s.status==="ready" && <span className="spravka-status ready">Готова</span>}
            {s.status==="process" && <span className="spravka-status process">В обработке</span>}
            {!s.status && !ordered[i] && <span className="spravka-status new-s">Заказать</span>}
            {!s.status && ordered[i] && <span className="spravka-status process">Отправлено</span>}
          </div>
        ))}
        <div className="section-card" >
          <div className="section-head">📋 ИСТОРИЯ ЗАКАЗОВ</div>
          <div style={{fontSize:13,color:"#7B9DBF",padding:"6px 0"}}>Справка об обучении — выдана 10 апреля 2026</div>
          <div style={{fontSize:13,color:"#7B9DBF",padding:"6px 0"}}>Академическая справка — выдана 3 марта 2026</div>
        </div>
      </div>
    </div>
  );
}

// LK FACULTY
