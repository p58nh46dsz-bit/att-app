// LKGrades — "Оценки" screen in the student personal account.
function LKGrades({ open, onClose }) {
  const [openSubj, setOpenSubj] = useState(null);
  const { data: subjects, error, load } = useApi("/me/grades", open);
  const { data: attendance } = useApi("/me/attendance", open);
  if (!subjects) return <ApiShell open={open} onClose={onClose} tag="Оценки" error={error} onRetry={load} />;
  // Everything below is computed from the student's real marks: a debt is a subject whose average is below 3.
  const allMarks = subjects.flatMap(s => s.grades.map(g => g.val));
  const overall = allMarks.length ? Math.round(allMarks.reduce((a, b) => a + b, 0) / allMarks.length * 10) / 10 : null;
  const debts = subjects.filter(s => s.avg !== null && s.avg < 3);
  const grCls = v => v===5?"grade-5":v===4?"grade-4":v===3?"grade-3":"grade-2";
  const dateRu = d => d ? d.split("-").reverse().join(".") : "";
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Оценки" />
      <div className="inner-body">
        <div className="stats-row" >
          <div className="stat-card">
            <div className="stat-label"><Icon name="bar-chart-3" size={13} color="var(--link)" style={{verticalAlign:-2}} /> Средний балл</div>
            <div className="stat-val" style={{color:"var(--link)"}}>{overall !== null ? overall : "—"}</div>
            <div className="bar-track"><div className="bar-fill accent" style={{width:`${overall !== null ? overall / 5 * 100 : 0}%`}}/></div>
          </div>
          <div className="stat-card">
            <div className="stat-label"><Icon name="alert-triangle" size={13} color="var(--warn)" style={{verticalAlign:-2}} /> Долги</div>
            <div className="stat-val" style={{color:debts.length ? "#E84C4C" : "var(--ok)"}}>{allMarks.length ? debts.length : "—"}</div>
            <div className="bar-track"><div className="bar-fill" style={{width:`${Math.min(debts.length / 5, 1) * 100}%`,background:"#E84C4C"}}/></div>
          </div>
        </div>
        {debts.map(d=>(
          <div key={d.name} className="debt-row" >
            <span style={{display:"flex",alignItems:"center",gap:5}}><Icon name="alert-triangle" size={13} color="var(--warn)" />Долг: {d.name}</span>
            <span style={{color:"#E84C4C",fontWeight:700}}>{d.avg}</span>
          </div>
        ))}
        <div className="section-head"><Icon name="book-open" size={12} color="var(--sub)" style={{verticalAlign:-2,marginRight:4}} />По предметам</div>
        {subjects.length === 0 && <div style={{textAlign:"center",padding:"20px 12px",color:"var(--sub)",fontSize:"0.8125rem",lineHeight:1.6}}>Оценок пока нет.<br/>Они появятся, когда преподаватель выставит их в приложении.</div>}
        {subjects.map((s,i)=>(
          <div key={s.name} className="grade-subject" >
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="grade-subj-header" onClick={()=>setOpenSubj(openSubj===i?null:i)}>
              <span className="grade-subj-name">{s.name}</span>
              <span className={`grade-avg ${s.cls}`}>{s.avg} {openSubj===i?"▲":"▼"}</span>
            </div>
            {openSubj===i && (
              <div className="grade-list">
                {s.grades.map((g,j)=>(
                  <div key={j} className="grade-row">
                    <span className="grade-type">{g.type || "Оценка"}{g.date ? <span style={{color:"var(--sub)",marginLeft:8,fontSize:"0.6875rem"}}>{dateRu(g.date)}</span> : null}</span>
                    <span className={`grade-val ${grCls(g.val)}`}>{g.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="section-card" >
          <div className="section-head"><Icon name="trending-up" size={12} color="var(--sub)" style={{verticalAlign:-2,marginRight:4}} />Пропуски</div>
          {attendance && attendance.missed > 0 ? <>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.875rem",fontWeight:600,marginBottom:8}}>
              <span>Пропущено занятий</span><span style={{color:"#E84C4C"}}>{attendance.missed}</span>
            </div>
            {attendance.bySubject.map(b => <div key={b.name} style={{display:"flex",justifyContent:"space-between",fontSize:"0.75rem",color:"var(--sub)",padding:"3px 0"}}><span>{b.name}</span><span>{b.missed}</span></div>)}
          </> : <div style={{fontSize:"0.8125rem",color:"var(--sub)"}}>Пропусков не отмечено.</div>}
        </div>
      </div>
    </div>
  );
}

// LK PORTFOLIO
