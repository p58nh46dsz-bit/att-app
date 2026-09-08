// LKPortfolio — "Портфолио" screen in the student personal account.
function LKPortfolio({ open, onClose }) {
  const [cat, setCat] = useState(null);
  const cats = MOCK_PORTFOLIO_CATEGORIES;
  const data = MOCK_PORTFOLIO_ITEMS;
  const cur = cats.find(c=>c.key===cat);
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={cat?()=>setCat(null):onClose} title="Личный кабинет" tag={cur?cur.title:"Портфолио"} />
      <div className="inner-body">
        {!cat && (
          <>
            {cats.map(c=>(
              <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={c.key} className="portfolio-item" style={{cursor:"pointer",alignItems:"center"}} onClick={()=>setCat(c.key)}>
                <span style={{flexShrink:0,width:42,height:42,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:12,background:c.color+"22",border:`1px solid ${c.color}44`}}><Icon name={c.icon} size={20} color={c.color} /></span>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.875rem",fontWeight:600,marginBottom:3}}>{c.title}</div>
                  <div style={{fontSize:"0.75rem",color:"#7B9DBF"}}>{c.sub}</div>
                </div>
                <span style={{color:"#7B9DBF",fontSize:"1.125rem",flexShrink:0}}>›</span>
              </div>
            ))}
          </>
        )}
        {cat && (
          <>
            {(data[cat]||[]).length===0 ? (
              <div className="section-card" style={{textAlign:"center",padding:"28px 16px"}}>
                <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><Icon name={cat==="penalty"?"check-circle-2":"inbox"} size={32} color={cat==="penalty"?"#5ec97a":"#4A8FE7"} /></div>
                <div style={{fontSize:"0.875rem",fontWeight:600,marginBottom:4}}>{cat==="penalty"?"Взысканий нет":"Пока пусто"}</div>
                <div style={{fontSize:"0.75rem",color:"#7B9DBF"}}>{cat==="penalty"?"Дисциплинарных взысканий не зафиксировано":"Здесь появятся ваши достижения"}</div>
              </div>
            ) : (data[cat]||[]).map((it,i)=>(
              <div key={i} className="portfolio-item">
                <Icon name={it.icon} size={22} color="#4A8FE7" style={{flexShrink:0}} />
                <div>
                  <div style={{fontSize:"0.875rem",fontWeight:600,marginBottom:3}}>{it.title}</div>
                  <div style={{fontSize:"0.75rem",color:"#7B9DBF"}}>{it.meta}</div>
                  <span className="portfolio-tag">{it.tag}</span>
                </div>
              </div>
            ))}
            {cat!=="penalty" && cat!=="academic" && (
              <button className="btn-blue" style={{borderRadius:14,padding:14,marginTop:4}}>+ Добавить достижение</button>
            )}
          </>
        )}
        {!cat && (
          <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:"0.8125rem",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Icon name="file-text" size={14} color="#7B9DBF" />Экспорт в PDF</button>
        )}
      </div>
    </div>
  );
}

// LK CURRICULUM
