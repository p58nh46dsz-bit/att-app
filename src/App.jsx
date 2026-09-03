// Top-level state, routing between screens/roles, and all modal/panel wiring.
function App() {
  const [screen, setScreen] = useState("splash");
  const [splashHiding, setSplashHiding] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [login, setLogin] = useState("student@academy.ru");
  const [pass, setPass] = useState("/Daniel6752");
  const [inner, setInner] = useState(null);
  const [applyPreSpec, setApplyPreSpec] = useState("");
  const [lkOpen, setLkOpen] = useState(false);
  const [lkInner, setLkInner] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifRole, setNotifRole] = useState("student");


  const [unreadCount, setUnreadCount] = useState(3);
  const [teacherUnreadCount, setTeacherUnreadCount] = useState(2);
  const [groupModal, setGroupModal] = useState(null);
  const [nextClassOpen, setNextClassOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [teacherLkOpen, setTeacherLkOpen] = useState(false);
  const [teacherGradeOpen, setTeacherGradeOpen] = useState(false);
  const [teacherMsgOpen, setTeacherMsgOpen]           = useState(false);
  const [teacherMaterialsOpen, setTeacherMaterialsOpen] = useState(false);
  // Real schedule for ДВ-41, scraped from att.spb.ru — see schedule.json / .github/workflows/update-schedule.yml
  const [schedule, setSchedule] = useState(null);
  const [scheduleStatus, setScheduleStatus] = useState("loading"); // "loading" | "ok" | "error"
  useEffect(() => {
    fetch("./schedule.json", { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(data => { setSchedule(data); setScheduleStatus("ok"); })
      .catch(() => setScheduleStatus("error"));
  }, []);
  const realLessons = (schedule && schedule.lessons ? schedule.lessons : []).map(l => ({
    start: l.start, end: l.end, subj: l.subj, room: l.room, teacher: l.teacher, online: false,
  }));

  const [nextLesson, setNextLesson] = useState(() => getNextLesson(STUDENT_LESSONS_FALLBACK));
  const [teacherLesson, setTeacherLesson] = useState(() => getNextLesson(TEACHER_LESSONS));
  useEffect(() => {
    const calc = () => {
      const lessons = scheduleStatus === "ok" ? realLessons : STUDENT_LESSONS_FALLBACK;
      setNextLesson(getNextLesson(lessons));
      setTeacherLesson(getNextLesson(TEACHER_LESSONS));
    };
    calc();
    const id = setInterval(calc, 30000);
    return () => clearInterval(id);
  }, [scheduleStatus, schedule]);

  useEffect(() => {
    const t1 = setTimeout(() => setSplashHiding(true), 2800);
    const t2 = setTimeout(() => setScreen("login"), 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      <style>{css}</style>

      {/* ═══ SPLASH ═══ */}
      {!splashDone && (screen === "splash" || splashHiding) && (
        <div className={`splash${splashHiding ? " hiding" : ""}`}
          onAnimationEnd={() => { if (splashHiding) setSplashDone(true); }}>
          {/* ambient blobs */}
          <div className="splash-blob" style={{width:300,height:300,background:"#1F5CB8",top:"-10%",left:"-10%",animationDuration:"6s"}} />
          <div className="splash-blob" style={{width:250,height:250,background:"#4A8FE7",bottom:"-8%",right:"-8%",animationDuration:"7s",animationDelay:"1s"}} />
          <div className="splash-blob" style={{width:180,height:180,background:"#4A8FE7",top:"60%",left:"5%",animationDuration:"8s",animationDelay:".5s"}} />

          <div className="splash-logo-wrap">
            <AttLogo size={120} circular />
            <div className="splash-drip" />
          </div>
          <div className="splash-texts">
            <div className="splash-title">АТТ</div>
            <div className="splash-sub">АКАДЕМИЯ ТРАНСПОРТНЫХ ТЕХНОЛОГИЙ</div>
          </div>
          <div className="splash-dots">
            <div className="splash-dot" />
            <div className="splash-dot" />
            <div className="splash-dot" />
          </div>
        </div>
      )}

      <Login
        active={screen === "login"}
        login={login} setLogin={setLogin}
        pass={pass} setPass={setPass}
        showPass={showPass} setShowPass={setShowPass}
        loginError={loginError} setLoginError={setLoginError}
        setScreen={setScreen}
        setForgotOpen={setForgotOpen}
      />

      <StudentDashboard
        active={screen === "student"}
        unreadCount={unreadCount}
        setNotifRole={setNotifRole}
        setNotifOpen={setNotifOpen}
        setSearchOpen={setSearchOpen}
        setLkOpen={setLkOpen}
        nextLesson={nextLesson}
        setNextClassOpen={setNextClassOpen}
        setLkInner={setLkInner}
        schedule={schedule}
        scheduleStatus={scheduleStatus}
        realLessons={realLessons}
      />

      <TeacherProfile
        active={screen === "teacher"}
        teacherUnreadCount={teacherUnreadCount}
        setNotifRole={setNotifRole}
        setNotifOpen={setNotifOpen}
        setScreen={setScreen}
        setTeacherLkOpen={setTeacherLkOpen}
        teacherLesson={teacherLesson}
        setGroupModal={setGroupModal}
        setTeacherGradeOpen={setTeacherGradeOpen}
        setTeacherMsgOpen={setTeacherMsgOpen}
        setTeacherMaterialsOpen={setTeacherMaterialsOpen}
      />

      <ApplicantMain
        active={screen === "applicant"}
        setScreen={setScreen}
        setInner={setInner}
      />

      {/* ═══ INNER SCREENS ═══ */}
      <FAQScreen        open={inner === "faq"}        onClose={() => setInner(null)} />
      <ApplyScreen      open={inner === "apply"}      onClose={() => setInner(null)} preSpec={applyPreSpec} />
      <SpecsScreen      open={inner === "specs"}      onClose={() => setInner(null)}
        onApply={spec => { setApplyPreSpec(spec); setInner("apply"); }} />
      <AdmissionsScreen open={inner === "admissions"} onClose={() => setInner(null)} />
      <AboutScreen      open={inner === "about"}      onClose={() => setInner(null)} />
      <OpenDaysScreen   open={inner === "opendays"}   onClose={() => setInner(null)} />

      {/* ═══ LK SHEET + INNER SCREENS ═══ */}
      {groupModal && <GroupModal group={groupModal} onClose={()=>setGroupModal(null)} />}
      {nextClassOpen && <NextClassModal lesson={nextLesson} onClose={()=>setNextClassOpen(false)} />}
      <NotifPanel open={notifOpen} role={notifRole} onClose={()=>setNotifOpen(false)} onCountChange={notifRole==="teacher" ? setTeacherUnreadCount : setUnreadCount} />
      <SearchPanel open={searchOpen} onClose={()=>setSearchOpen(false)} setLkInner={setLkInner} />
      <LKSheet open={lkOpen} onClose={()=>setLkOpen(false)} onLogout={()=>{setLkOpen(false);setScreen("login");}} setLkInner={setLkInner} />
      <LKSchedule     open={lkInner==="schedule"}   onClose={()=>setLkInner(null)} schedule={schedule} scheduleStatus={scheduleStatus} />
      <LKGrades       open={lkInner==="grades"}      onClose={()=>setLkInner(null)} />
      <LKPortfolio    open={lkInner==="portfolio"}   onClose={()=>setLkInner(null)} />
      <LKCurriculum   open={lkInner==="curriculum"}  onClose={()=>setLkInner(null)} />
      <LKConsultations open={lkInner==="consult"}   onClose={()=>setLkInner(null)} />
      <LKSpravki      open={lkInner==="spravki"}     onClose={()=>setLkInner(null)} />
      <LKFaculty      open={lkInner==="faculty"}     onClose={()=>setLkInner(null)} />
      <LKAboutApp     open={lkInner==="about-app"}   onClose={()=>setLkInner(null)} />
      <ForgotModal    open={forgotOpen}              onClose={()=>setForgotOpen(false)} />
      <TeacherLKSheet open={teacherLkOpen}           onClose={()=>setTeacherLkOpen(false)} onLogout={()=>{setTeacherLkOpen(false);setScreen("login");}} setLkInner={setLkInner} />
      <TeacherGradeModal     open={teacherGradeOpen}         onClose={()=>setTeacherGradeOpen(false)} />
      <TeacherMsgModal       open={teacherMsgOpen}           onClose={()=>setTeacherMsgOpen(false)} />
      <TeacherMaterialsModal open={teacherMaterialsOpen}     onClose={()=>setTeacherMaterialsOpen(false)} />
    </>
  );
}
