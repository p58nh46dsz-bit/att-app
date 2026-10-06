// LKSpravki — "Справки" screen in the student personal account.
function LKSpravki({ open, onClose }) {
  const { data: requests, error, load, setData } = useApi("/me/certificates", open);   // {key: "process"|"ready"}
  const [orderError, setOrderError] = useState(false);
  if (!requests) return <ApiShell open={open} onClose={onClose} tag="Справки" error={error} onRetry={load} />;
  const spravki = CONTENT.certificates.map(c => ({ ...c, status: requests[c.key] || null }));
  const order = async key => {
    setOrderError(false);
    const r = await apiAuthed("/me/certificates", { method: "POST", body: { key } });
    if (r.status === 201) setData(d => ({ ...d, [key]: "process" })); else setOrderError(true);
  };
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Справки" />
      <div className="inner-body">
        <div style={{background:"linear-gradient(135deg,#0f1c38,#12111a)",border:"1px solid #1E3560",borderRadius:16,padding:14,fontSize:"0.8125rem",color:"#7B9DBF",display:"flex",alignItems:"flex-start",gap:8}}>
          <Icon name="lightbulb" size={16} color="#4A8FE7" style={{flexShrink:0,marginTop:1}} />Готовые справки выдаются в учебном отделе (корп. А, каб. 5) в течение 3 рабочих дней
        </div>
        {orderError && <div style={{color:"#ff7e7e",fontSize:"0.8125rem",textAlign:"center"}}>Не удалось отправить заказ. Попробуйте ещё раз.</div>}
        {spravki.map((s,i)=>(
          <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={i} className="spravka-item"
            onClick={()=>!s.status&&order(s.key)}>
            <Icon name={s.icon} size={22} color="#4A8FE7" style={{flexShrink:0}} />
            <div style={{flex:1}}>
              <div style={{fontSize:"0.875rem",fontWeight:600,marginBottom:3}}>{s.title}</div>
              <div style={{fontSize:"0.75rem",color:"#7B9DBF"}}>{s.sub}</div>
            </div>
            {s.status==="ready" && <span className="spravka-status ready">Готова</span>}
            {s.status==="process" && <span className="spravka-status process">В обработке</span>}
            {!s.status && <span className="spravka-status new-s">Заказать</span>}
          </div>
        ))}
        <div className="section-card" >
          <div className="section-head"><Icon name="clipboard-list" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:4}} />ИСТОРИЯ ЗАКАЗОВ</div>
          {spravki.filter(c => c.status).length === 0
            ? <div style={{fontSize:"0.8125rem",color:"#7B9DBF",padding:"6px 0"}}>Заказов пока нет</div>
            : spravki.filter(c => c.status).map(c => (
                <div key={c.key} style={{fontSize:"0.8125rem",color:"#7B9DBF",padding:"6px 0"}}>{c.title} — {c.status === "ready" ? "готова" : "в обработке"}</div>
              ))}
        </div>
      </div>
    </div>
  );
}

// LK FACULTY
