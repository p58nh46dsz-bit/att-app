// ATT_SPEC_GROUPS data + SpecsScreen — applicant specialties inner screen.
const ATT_SPEC_GROUPS = [
  {
    id:"transport", icon:"car", title:"Автомобильный транспорт", color:"#1F5CB8",
    specs:[
      { code:"23.02.07", name:"Техническое обслуживание и ремонт автотранспортных средств", forms:["очная","заочная"], budget:25, paid:10, score:3.8, dur:"3 г. 10 мес." },
      { code:"23.02.01", name:"Организация перевозок и управление на транспорте (по видам)", forms:["очная","заочная"], budget:20, paid:10, score:3.7, dur:"2 г. 10 мес." },
      { code:"23.02.02", name:"Автомобиле- и тракторостроение",                             forms:["очная"],           budget:20, paid:10, score:4.0, dur:"3 г. 10 мес." },
      { code:"23.02.05", name:"Эксплуатация транспортного электрооборудования и автоматики", forms:["очная","заочная"], budget:20, paid:10, score:3.9, dur:"3 г. 10 мес." },
      { code:"23.01.17", name:"Мастер по ремонту и обслуживанию автомобилей",               forms:["очная"],           budget:25, paid:0,  score:3.5, dur:"2 г. 10 мес." },
      { code:"43.02.06", name:"Сервис на транспорте (по видам транспорта)",                 forms:["очная","заочная"], budget:15, paid:10, score:3.7, dur:"2 г. 10 мес." },
    ],
  },
  {
    id:"it", icon:"laptop", title:"Информационные технологии", color:"#4A8FE7",
    specs:[
      { code:"09.02.11", name:"Разработка и управление программным обеспечением", forms:["очная"], budget:20, paid:15, score:4.3, dur:"3 г. 10 мес." },
    ],
  },
  {
    id:"electro", icon:"zap", title:"Электротехника", color:"#F5A623",
    specs:[
      { code:"08.02.09", name:"Монтаж, наладка и эксплуатация электрооборудования промышленных и гражданских зданий", forms:["очная"], budget:20, paid:10, score:3.8, dur:"3 г. 10 мес." },
      { code:"13.02.13", name:"Эксплуатация и обслуживание электрического и электромеханического оборудования (по отраслям)", forms:["очная"], budget:20, paid:10, score:3.7, dur:"3 г. 10 мес." },
    ],
  },
  {
    id:"econ", icon:"briefcase", title:"Экономика", color:"#4CAF6B",
    specs:[
      { code:"38.02.01", name:"Экономика и бухгалтерский учёт (по отраслям)", forms:["очная","заочная"], budget:20, paid:15, score:3.9, dur:"2 г. 10 мес." },
    ],
  },
];
function SpecsScreen({ open, onClose, onApply }) {
  const [expanded, setExpanded] = useState({"transport":true});
  const toggle = id => setExpanded(e => ({...e, [id]: !e[id]}));

  return (
    <div className={`inner-screen${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Экран абитуриента" tag="Специальности" tagClass="applicant" />
      <div className="inner-body">
        <div style={{fontSize:13,color:C.sub,marginBottom:4}}>
          {ATT_SPEC_GROUPS.reduce((a,g)=>a+g.specs.length,0)} специальностей · нажмите группу для раскрытия
        </div>

        {ATT_SPEC_GROUPS.map(g => (
          <div key={g.id} style={{borderRadius:14,overflow:"hidden",border:`1px solid ${C.border}`,background:C.card,flexShrink:0}}>
            {/* Group header */}
            <div style={{
              display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer",
              background: expanded[g.id] ? `${g.color}18` : "transparent",
              borderBottom: expanded[g.id] ? `1px solid ${C.border}` : "none",
            }} onClick={()=>toggle(g.id)}>
              <Icon name={g.icon} size={20} color={g.color} />
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14}}>{g.title}</div>
                <div style={{fontSize:11,color:C.sub,marginTop:2}}>{g.specs.length} специальност{g.specs.length===1?"ь":"и"}</div>
              </div>
              <span style={{color:C.sub,fontSize:18,transition:"transform .2s",transform:expanded[g.id]?"rotate(90deg)":"none"}}>›</span>
            </div>

            {/* Specs list */}
            {expanded[g.id] && (
              <div style={{display:"flex",flexDirection:"column",gap:0}}>
                {g.specs.map((s,i) => (
                  <div key={s.code} style={{
                    padding:"14px 16px",
                    borderTop: i>0 ? `1px solid ${C.border}` : "none",
                  }}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
                      <span style={{
                        fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,flexShrink:0,marginTop:2,
                        background:`${g.color}22`,color:g.color,border:`1px solid ${g.color}44`,
                      }}>{s.code}</span>
                      <div style={{fontSize:13,fontWeight:600,lineHeight:1.4}}>{s.name}</div>
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                      {s.forms.map(f=>(
                        <span key={f} style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:C.surface,color:C.sub,border:`1px solid ${C.border}`}}>{f}</span>
                      ))}
                      {s.budget>0 && <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#0d3060",color:"#4A8FE7",border:"1px solid #1F5CB8"}}> бюджет: {s.budget} мест</span>}
                      {s.paid>0 && <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#1a1500",color:"#c8a020",border:"1px solid #604010"}}> платно: {s.paid} мест</span>}
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:C.surface,color:C.sub,border:`1px solid ${C.border}`,display:"inline-flex",alignItems:"center",gap:4}}><Icon name="clock" size={11} color={C.sub} />{s.dur}</span>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <div style={{flex:1,fontSize:11,color:C.sub}}>
                        Мин. балл аттестата: <b style={{color:C.text}}>{s.score}</b>
                      </div>
                      <button className="btn-blue"
                        style={{padding:"7px 16px",borderRadius:20,fontSize:12,fontWeight:700,flexShrink:0}}
                        onClick={()=>{ onApply(`${s.code} — ${s.name}`); }}>
                        Подать заявление →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
