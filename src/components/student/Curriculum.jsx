// LKCurriculum — "Учебный план" screen in the student personal account.
function LKCurriculum({ user, open, onClose }) {
  const [openYear, setOpenYear] = useState(1);
  const years = CONTENT.curriculum;
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Учебный план" />
      <div className="inner-body">
        <div style={{background:"color-mix(in srgb, var(--link) 13%, var(--card))",border:"1px solid color-mix(in srgb, var(--link) 20%, transparent)",borderRadius:16,padding:16}}>
          <div style={{fontSize:"0.6875rem",letterSpacing:2,color:"var(--link2)",marginBottom:6}}>Учебный план</div>
          <div style={{fontSize:"0.75rem",color:"var(--sub)"}}>Группа {user && user.group ? user.group : "—"}</div>
        </div>
        {years.length === 0 && <div style={{textAlign:"center",padding:"28px 12px",color:"var(--sub)",fontSize:"0.8125rem",lineHeight:1.6}}>Учебный план вашей группы ещё не загружен.<br/>Он появится после публикации колледжем.</div>}
        {years.map((yr,i)=>(
          <div key={yr.year} className="course-year" >
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="course-year-header" onClick={()=>setOpenYear(openYear===yr.year?null:yr.year)}>
              <span>{yr.year} курс</span>
              <span style={{color:"var(--sub)",fontSize:"0.75rem"}}>{yr.subjects.length} предметов {openYear===yr.year?"▲":"▼"}</span>
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
