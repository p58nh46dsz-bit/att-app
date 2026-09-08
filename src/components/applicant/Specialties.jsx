// SpecsScreen — applicant specialties inner screen. Data: MOCK_SPEC_GROUPS (src/data/mockData.js).
function SpecsScreen({ open, onClose, onApply }) {
  const [expanded, setExpanded] = useState({});
  const toggle = id => setExpanded(e => ({...e, [id]: !e[id]}));

  return (
    <div className={`inner-screen${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Экран абитуриента" tag="Специальности" tagClass="applicant" />
      <div className="inner-body">
        <div style={{fontSize:"0.8125rem",color:C.sub,marginBottom:4}}>
          {MOCK_SPEC_GROUPS.reduce((a,g)=>a+g.specs.length,0)} специальностей · нажмите группу для раскрытия
        </div>

        {MOCK_SPEC_GROUPS.map(g => (
          <div key={g.id} style={{borderRadius:14,overflow:"hidden",border:`1px solid ${C.border}`,background:C.card,flexShrink:0}}>
            {/* Group header */}
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} style={{
              display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer",
              background: expanded[g.id] ? `${g.color}18` : "transparent",
              borderBottom: expanded[g.id] ? `1px solid ${C.border}` : "none",
            }} onClick={()=>toggle(g.id)}>
              <Icon name={g.icon} size={20} color={g.color} />
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:"0.875rem"}}>{g.title}</div>
                <div style={{fontSize:"0.6875rem",color:C.sub,marginTop:2}}>{g.specs.length} специальност{g.specs.length===1?"ь":"и"}</div>
              </div>
              <span style={{color:C.sub,fontSize:"1.125rem",transition:"transform .2s",transform:expanded[g.id]?"rotate(90deg)":"none"}}>›</span>
            </div>

            {/* Specs list */}
            {expanded[g.id] && (
              <div style={{display:"flex",flexDirection:"column",gap:0}}>
                {g.specs.map((s,i) => {
                  const main = s.tracks[0];
                  const extra = s.tracks.slice(1);
                  const extraForms = [...new Set(extra.map(t=>t.form))].join("/");
                  return (
                  <div key={s.code} style={{
                    padding:"14px 16px",
                    borderTop: i>0 ? `1px solid ${C.border}` : "none",
                  }}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:6}}>
                      <span style={{
                        fontSize:"0.625rem",fontWeight:700,padding:"3px 8px",borderRadius:20,flexShrink:0,marginTop:2,
                        background:`${g.color}22`,color:g.color,border:`1px solid ${g.color}44`,
                      }}>{s.code}</span>
                      <div style={{fontSize:"0.8125rem",fontWeight:600,lineHeight:1.4}}>{s.name}</div>
                    </div>
                    <div style={{fontSize:"0.6875rem",color:C.sub,marginBottom:8}}>Квалификация: {s.qualification}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                      <span style={{fontSize:"0.6875rem",padding:"2px 8px",borderRadius:20,background:C.surface,color:C.sub,border:`1px solid ${C.border}`}}>{main.form} · {main.base}</span>
                      {main.budget && <span style={{fontSize:"0.6875rem",padding:"2px 8px",borderRadius:20,background:"#0d3060",color:"#4A8FE7",border:"1px solid #1F5CB8"}}>бюджетная</span>}
                      {main.paid && <span style={{fontSize:"0.6875rem",padding:"2px 8px",borderRadius:20,background:"#1a1500",color:"#c8a020",border:"1px solid #604010"}}>платная</span>}
                      <span style={{fontSize:"0.6875rem",padding:"2px 8px",borderRadius:20,background:C.surface,color:C.sub,border:`1px solid ${C.border}`,display:"inline-flex",alignItems:"center",gap:4}}><Icon name="clock" size={11} color={C.sub} />{main.dur}</span>
                    </div>
                    {extra.length > 0 && (
                      <div style={{fontSize:"0.6875rem",color:C.sub,marginBottom:10}}>
                        Также: {extra[0].base} — {extraForms}, {extra[0].dur}
                      </div>
                    )}
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <div style={{flex:1,fontSize:"0.6875rem",color:C.sub}}>
                        Мин. балл аттестата: <b style={{color:C.text}}>{main.score != null ? main.score : "уточняется"}</b>
                      </div>
                      <button className="btn-blue"
                        style={{padding:"7px 16px",borderRadius:20,fontSize:"0.75rem",fontWeight:700,flexShrink:0}}
                        onClick={()=>{ onApply(`${s.code} — ${s.name}`); }}>
                        Подать заявление →
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
