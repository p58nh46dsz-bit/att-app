// ATT_SPEC_GROUPS data + SpecsScreen — applicant specialties inner screen.
// Sourced from the real site: атт.спб.рф/abiturientu/spetsialnosti (program
// list, groups, qualifications, forms/duration) and .../abiturientu/min-bal
// (2025 minimum average-certificate scores, matched here by code — a code
// with no matching row there has no published score, shown as "уточняется"
// rather than invented).
const ATT_SPEC_GROUPS = [
  {
    id:"stroy", code:"08.00.00", icon:"building-2", title:"Техника и технологии строительства", color:"#F5A623",
    specs:[
      { code:"08.02.09", name:"Монтаж, наладка и эксплуатация электрооборудования промышленных и гражданских зданий", qualification:"техник",
        tracks:[ { base:"9 кл.", form:"очная", dur:"2 г. 10 мес.", budget:true, paid:true, score:3.75 } ] },
    ],
  },
  {
    id:"it", code:"09.00.00", icon:"laptop", title:"Информатика и вычислительная техника", color:"#4A8FE7",
    specs:[
      { code:"09.02.11", name:"Разработка и управление программным обеспечением", qualification:"программист",
        tracks:[
          { base:"9 кл.",  form:"очная", dur:"3 г. 10 мес.", budget:true, paid:true, score:null },
          { base:"11 кл.", form:"очная", dur:"2 г. 10 мес.", budget:true, paid:true, score:null },
        ] },
    ],
  },
  {
    id:"energy", code:"13.00.00", icon:"zap", title:"Электро- и теплоэнергетика", color:"#0d6e6e",
    specs:[
      { code:"13.02.13", name:"Эксплуатация и обслуживание электрического и электромеханического оборудования (по отраслям)", qualification:"техник",
        tracks:[ { base:"9 кл.", form:"очная", dur:"3 г. 10 мес.", budget:true, paid:true, score:3.8853 } ] },
    ],
  },
  {
    id:"transport", code:"23.00.00", icon:"car", title:"Техника и технологии наземного транспорта", color:"#1F5CB8",
    specs:[
      { code:"23.01.17", name:"Мастер по ремонту и обслуживанию автомобилей", qualification:"мастер по ремонту и обслуживанию автомобилей",
        tracks:[ { base:"9 кл.", form:"очная", dur:"1 г. 10 мес.", budget:true, paid:false, score:3.7084 } ] },
      { code:"23.02.01", name:"Организация перевозок и управление на транспорте (по видам)", qualification:"техник",
        tracks:[
          { base:"9 кл.",  form:"очная",  dur:"3 г. 10 мес.", budget:true, paid:true,  score:4.1905 },
          { base:"11 кл.", form:"очная",  dur:"2 г. 10 мес.", budget:true, paid:false, score:4.0667 },
          { base:"11 кл.", form:"заочная",dur:"2 г. 10 мес.", budget:true, paid:false, score:4.0667 },
        ] },
      { code:"23.02.02", name:"Автомобиле- и тракторостроение", qualification:"техник",
        tracks:[ { base:"9 кл.", form:"очная", dur:"2 г. 10 мес.", budget:true, paid:true, score:3.7810 } ] },
      { code:"23.02.05", name:"Эксплуатация транспортного электрооборудования и автоматики (по видам транспорта, за исключением водного)", qualification:"техник-электромеханик",
        tracks:[
          { base:"9 кл.",  form:"очная",  dur:"3 г. 10 мес.", budget:true, paid:true,  score:4.0 },
          { base:"11 кл.", form:"заочная",dur:"2 г. 10 мес.", budget:true, paid:false, score:null },
        ] },
      { code:"23.02.07", name:"Техническое обслуживание и ремонт автотранспортных средств", qualification:"специалист по техническому обслуживанию и ремонту автотранспортных средств",
        tracks:[
          { base:"9 кл.",  form:"очная",  dur:"3 г. 10 мес.", budget:true, paid:true, score:4.1880 },
          { base:"11 кл.", form:"очная",  dur:"2 г. 10 мес.", budget:true, paid:true, score:4.0580 },
          { base:"11 кл.", form:"заочная",dur:"2 г. 10 мес.", budget:true, paid:true, score:4.0580 },
        ] },
    ],
  },
  {
    id:"econ", code:"38.00.00", icon:"briefcase", title:"Экономика и управление", color:"#4CAF6B",
    specs:[
      { code:"38.02.01", name:"Экономика и бухгалтерский учёт (по отраслям)", qualification:"бухгалтер",
        tracks:[
          { base:"9 кл.",  form:"очная",  dur:"2 г. 10 мес.", budget:true, paid:true,  score:4.35 },
          { base:"11 кл.", form:"заочная",dur:"1 г. 10 мес.", budget:true, paid:false, score:null },
        ] },
    ],
  },
  {
    id:"service", code:"43.00.00", icon:"map", title:"Сервис и туризм", color:"#7B9DBF",
    specs:[
      { code:"43.02.06", name:"Сервис на транспорте (по видам транспорта)", qualification:"специалист по сервису на транспорте",
        tracks:[
          { base:"9 кл.",  form:"очная",  dur:"2 г. 10 мес.", budget:true, paid:true,  score:4.0104 },
          { base:"11 кл.", form:"заочная",dur:"1 г. 10 мес.", budget:true, paid:false, score:null },
        ] },
    ],
  },
];
function SpecsScreen({ open, onClose, onApply }) {
  const [expanded, setExpanded] = useState({});
  const toggle = id => setExpanded(e => ({...e, [id]: !e[id]}));

  return (
    <div className={`inner-screen${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Экран абитуриента" tag="Специальности" tagClass="applicant" />
      <div className="inner-body">
        <div style={{fontSize:"0.8125rem",color:C.sub,marginBottom:4}}>
          {ATT_SPEC_GROUPS.reduce((a,g)=>a+g.specs.length,0)} специальностей · нажмите группу для раскрытия
        </div>

        {ATT_SPEC_GROUPS.map(g => (
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
