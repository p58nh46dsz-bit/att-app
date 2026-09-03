// LKGrades — "Оценки" screen in the student personal account.
function LKGrades({ open, onClose }) {
  const [openSubj, setOpenSubj] = useState(null);
  const subjects = [
    { name:"Математика", avg:4.8, cls:"good", grades:[{type:"Контрольная №1",val:5},{type:"Практика №2",val:5},{type:"Тест",val:4}] },
    { name:"Физика", avg:3.5, cls:"ok", grades:[{type:"Лабораторная №1",val:4},{type:"Контрольная",val:3},{type:"Тест",val:3}] },
    { name:"Программирование", avg:5.0, cls:"good", grades:[{type:"Проект",val:5},{type:"Зачёт",val:5}] },
    { name:"История", avg:4.0, cls:"ok", grades:[{type:"Доклад",val:4},{type:"Тест",val:4}] },
    { name:"Английский", avg:2.8, cls:"bad", grades:[{type:"Диктант",val:3},{type:"Лексика",val:2},{type:"Грамматика",val:3}] },
  ];
  const debts = subjects.filter(s=>s.avg<3.5);
  const grCls = v => v===5?"grade-5":v===4?"grade-4":v===3?"grade-3":"grade-2";
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Оценки" />
      <div className="inner-body">
        <div className="stats-row" >
          <div className="stat-card">
            <div className="stat-label">📊 Средний балл</div>
            <div className="stat-val" style={{color:"#4A8FE7"}}>4.6</div>
            <div className="bar-track"><div className="bar-fill accent" style={{width:"80%"}}/></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">⚠️ Долги</div>
            <div className="stat-val" style={{color:"#E84C4C"}}>1</div>
            <div className="bar-track"><div className="bar-fill" style={{width:"20%",background:"#E84C4C"}}/></div>
          </div>
        </div>
        {debts.map(d=>(
          <div key={d.name} className="debt-row" >
            <span>⚠️ Долг: {d.name}</span>
            <span style={{color:"#E84C4C",fontWeight:700}}>{d.avg}</span>
          </div>
        ))}
        <div className="section-head">📚 ПО ПРЕДМЕТАМ</div>
        {subjects.map((s,i)=>(
          <div key={s.name} className="grade-subject" >
            <div className="grade-subj-header" onClick={()=>setOpenSubj(openSubj===i?null:i)}>
              <span className="grade-subj-name">{s.name}</span>
              <span className={`grade-avg ${s.cls}`}>{s.avg} {openSubj===i?"▲":"▼"}</span>
            </div>
            {openSubj===i && (
              <div className="grade-list">
                {s.grades.map((g,j)=>(
                  <div key={j} className="grade-row">
                    <span className="grade-type">{g.type}</span>
                    <span className={`grade-val ${grCls(g.val)}`}>{g.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="section-card" >
          <div className="section-head">🏆 ПРОГНОЗ СТИПЕНДИИ</div>
          <div style={{fontSize:14,fontWeight:600,color:"#4CAF6B",marginBottom:6}}>Повышенная ✓</div>
          <div style={{fontSize:12,color:"#7B9DBF"}}>При среднем балле 4.6 и отсутствии задолженностей</div>
        </div>
        <div className="section-card" >
          <div className="section-head">📊 ПОСЕЩАЕМОСТЬ</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:600,marginBottom:8}}>
            <span>Общая</span><span style={{color:"#4CAF6B"}}>87%</span>
          </div>
          <div className="bar-track"><div className="bar-fill" style={{width:"87%"}}/></div>
          <div style={{fontSize:11,color:"#7B9DBF",marginTop:8}}>Пропущено 14 из 108 занятий</div>
        </div>
      </div>
    </div>
  );
}

// LK PORTFOLIO
