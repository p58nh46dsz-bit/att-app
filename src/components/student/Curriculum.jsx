// LKCurriculum — "Учебный план" screen in the student personal account.
function LKCurriculum({ open, onClose }) {
  const [openYear, setOpenYear] = useState(1);
  const years = [
    { year:1, subjects:[{name:"Математика",type:"экзамен"},{name:"Физика",type:"экзамен"},{name:"Информатика",type:"зачёт"},{name:"История",type:"зачёт"},{name:"Учебная практика",type:"практика"}] },
    { year:2, subjects:[{name:"Сопромат",type:"экзамен"},{name:"Программирование",type:"экзамен"},{name:"Электротехника",type:"зачёт"},{name:"Производственная практика",type:"практика"}] },
    { year:3, subjects:[{name:"ТО автомобилей",type:"экзамен"},{name:"Диагностика",type:"экзамен"},{name:"Преддипломная практика",type:"практика"}] },
    { year:4, subjects:[{name:"Дипломная работа",type:"диплом"},{name:"Производственная практика",type:"практика"}] },
  ];
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Учебный план" />
      <div className="inner-body">
        <div style={{background:"linear-gradient(135deg,#1a2050,#0e1530)",border:"1px solid #4A8FE733",borderRadius:16,padding:16}}>
          <div style={{fontSize:11,letterSpacing:2,color:"#6fb3f5",marginBottom:6}}>СПЕЦИАЛЬНОСТЬ</div>
          <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>23.02.07 — Техническое обслуживание</div>
          <div style={{fontSize:12,color:"#7B9DBF"}}>Группа ДВ-41 · Очная форма · 4 года</div>
        </div>
        {years.map((yr,i)=>(
          <div key={yr.year} className="course-year" >
            <div className="course-year-header" onClick={()=>setOpenYear(openYear===yr.year?null:yr.year)}>
              <span>{yr.year} курс</span>
              <span style={{color:"#7B9DBF",fontSize:12}}>{yr.subjects.length} предметов {openYear===yr.year?"▲":"▼"}</span>
            </div>
            {openYear===yr.year && (
              <div className="course-subjects">
                {yr.subjects.map((s,j)=>(
                  <div key={j} className="course-subj-row">
                    <span>{s.name}</span>
                    <span className="course-subj-type">{s.type}</span>
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

// LK CONSULTATIONS
