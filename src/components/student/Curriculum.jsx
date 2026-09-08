// LKCurriculum — "Учебный план" screen in the student personal account.
function LKCurriculum({ open, onClose }) {
  const [openYear, setOpenYear] = useState(1);
  const years = MOCK_CURRICULUM_YEARS;
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Учебный план" />
      <div className="inner-body">
        <div style={{background:"linear-gradient(135deg,#1a2050,#0e1530)",border:"1px solid #4A8FE733",borderRadius:16,padding:16}}>
          <div style={{fontSize:"0.6875rem",letterSpacing:2,color:"#6fb3f5",marginBottom:6}}>СПЕЦИАЛЬНОСТЬ</div>
          <div style={{fontSize:"1rem",fontWeight:700,marginBottom:4}}>23.02.07 — Техническое обслуживание</div>
          <div style={{fontSize:"0.75rem",color:"#7B9DBF"}}>Группа ДВ-41 · Очная форма · 4 года</div>
        </div>
        {years.map((yr,i)=>(
          <div key={yr.year} className="course-year" >
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="course-year-header" onClick={()=>setOpenYear(openYear===yr.year?null:yr.year)}>
              <span>{yr.year} курс</span>
              <span style={{color:"#7B9DBF",fontSize:"0.75rem"}}>{yr.subjects.length} предметов {openYear===yr.year?"▲":"▼"}</span>
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
