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


  // Single source of truth for read/unread state, shared between the bell-icon
  // drawer (NotifPanel) and the full "Уведомления" page (LKNotifications) —
  // both used to keep independent local copies, so marking something read in
  // one place didn't stick when you opened the other. Persisted to
  // localStorage so it also survives the app being backgrounded and killed
  // by the OS (React state alone doesn't survive that on a phone).
  const [studentNotifs, setStudentNotifs] = useState(() => loadJSON("att_student_notifs", STUDENT_NOTIFS));
  const [teacherNotifs, setTeacherNotifs] = useState(() => loadJSON("att_teacher_notifs", TEACHER_NOTIFS));
  useEffect(() => { saveJSON("att_student_notifs", studentNotifs); }, [studentNotifs]);
  useEffect(() => { saveJSON("att_teacher_notifs", teacherNotifs); }, [teacherNotifs]);
  const [unreadCount, setUnreadCount] = useState(() => studentNotifs.filter(n => n.unread).length);
  const [teacherUnreadCount, setTeacherUnreadCount] = useState(() => teacherNotifs.filter(n => n.unread).length);
  const [groupModal, setGroupModal] = useState(null);
  const [nextClassOpen, setNextClassOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [teacherLkOpen, setTeacherLkOpen] = useState(false);
  const [teacherGradeOpen, setTeacherGradeOpen] = useState(false);
  const [teacherMsgOpen, setTeacherMsgOpen]           = useState(false);
  const [teacherMaterialsOpen, setTeacherMaterialsOpen] = useState(false);
  // Real schedule for ДВ-41, scraped from att.spb.ru — see schedule.json / .github/workflows/update-schedule.yml
  // schedule.json is a rolling per-date cache ({ days: { "2026-09-05": {...} } }),
  // not a single day, so the site's occasional Sat/Sun makeup classes and
  // several days' worth of real data can coexist instead of one overwriting another.
  const [schedule, setSchedule] = useState(null);
  const [scheduleStatus, setScheduleStatus] = useState("loading"); // "loading" | "ok" | "error"
  useEffect(() => {
    fetch("./schedule.json", { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(data => { setSchedule(data); setScheduleStatus("ok"); })
      .catch(() => setScheduleStatus("error"));
  }, []);
  const todayRecord = schedule && schedule.days ? schedule.days[isoDate(new Date())] : null;
  const hasTodayRecord = !!todayRecord;
  const realLessons = (todayRecord && todayRecord.lessons ? todayRecord.lessons : []).map(l => ({
    start: l.start, end: l.end, subj: l.subj, room: l.room, teacher: l.teacher, online: false,
  }));

  const [nextLesson, setNextLesson] = useState(() => getNextLesson(STUDENT_LESSONS_FALLBACK));
  const [teacherLesson, setTeacherLesson] = useState(() => getNextLesson(TEACHER_LESSONS));
  useEffect(() => {
    const calc = () => {
      const lessons = hasTodayRecord ? realLessons : STUDENT_LESSONS_FALLBACK;
      setNextLesson(getNextLesson(lessons, hasTodayRecord));
      setTeacherLesson(getNextLesson(TEACHER_LESSONS));
    };
    calc();
    const id = setInterval(calc, 30000);
    return () => clearInterval(id);
  }, [scheduleStatus, schedule]);

  useEffect(() => {
    const t1 = setTimeout(() => setSplashHiding(true), 2800);
    const t2 = setTimeout(() => {
      // Resume a previous student/teacher session across app restarts —
      // without this, every relaunch (common on mobile: the OS frequently
      // kills backgrounded apps) bounces the user back to the login screen.
      // "applicant" is intentionally not resumed: it's an unauthenticated
      // sub-section, not a session.
      const saved = loadJSON("att_session", null);
      setScreen(saved === "student" || saved === "teacher" ? saved : "login");
    }, 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  useEffect(() => {
    if (screen === "student" || screen === "teacher") saveJSON("att_session", screen);
    else if (screen === "login") saveJSON("att_session", null);
  }, [screen]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Back-button / browser-history support ──────────────────────────────
  // Capacitor's Android back button, when the app doesn't handle it itself,
  // calls history.back() if the WebView has history and otherwise minimizes
  // the app. There's no routing here (every screen is just local state), so
  // without this, back either does nothing or exits the app from any screen.
  // Fix: keep a synthetic history entry per open layer, ordered innermost
  // (modals) to outermost (the applicant sub-app). Popping one closes
  // whatever is currently on top — no per-screen wiring needed, since this
  // only reads state that already exists.
  const openLayers = [
    forgotOpen            && (() => setForgotOpen(false)),
    teacherMaterialsOpen  && (() => setTeacherMaterialsOpen(false)),
    teacherMsgOpen        && (() => setTeacherMsgOpen(false)),
    teacherGradeOpen      && (() => setTeacherGradeOpen(false)),
    nextClassOpen         && (() => setNextClassOpen(false)),
    groupModal            && (() => setGroupModal(null)),
    searchOpen            && (() => setSearchOpen(false)),
    notifOpen             && (() => setNotifOpen(false)),
    lkInner                && (() => setLkInner(null)),
    teacherLkOpen          && (() => setTeacherLkOpen(false)),
    lkOpen                 && (() => setLkOpen(false)),
    inner                  && (() => setInner(null)),
    screen === "applicant"  && (() => setScreen("login")),
  ].filter(Boolean);

  const navDepthRef = useRef(0);
  const closeTopRef = useRef(null);
  const ignorePopRef = useRef(false);
  closeTopRef.current = openLayers[openLayers.length - 1] || null;

  useEffect(() => {
    const depth = openLayers.length;
    const diff = depth - navDepthRef.current;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) window.history.pushState({ appNav: true }, "");
    } else if (diff < 0) {
      ignorePopRef.current = true;
      window.history.go(diff);
    }
    navDepthRef.current = depth;
  });

  useEffect(() => {
    const onPopState = () => {
      if (ignorePopRef.current) { ignorePopRef.current = false; return; }
      if (closeTopRef.current) closeTopRef.current();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
      <LazyMount open={inner === "faq"}><FAQScreen open={inner === "faq"} onClose={() => setInner(null)} /></LazyMount>
      <LazyMount open={inner === "apply"}><ApplyScreen open={inner === "apply"} onClose={() => setInner(null)} preSpec={applyPreSpec} /></LazyMount>
      <LazyMount open={inner === "specs"}>
        <SpecsScreen open={inner === "specs"} onClose={() => setInner(null)}
          onApply={spec => { setApplyPreSpec(spec); setInner("apply"); }} />
      </LazyMount>
      <LazyMount open={inner === "admissions"}><AdmissionsScreen open={inner === "admissions"} onClose={() => setInner(null)} /></LazyMount>
      <LazyMount open={inner === "about"}><AboutScreen open={inner === "about"} onClose={() => setInner(null)} /></LazyMount>
      <LazyMount open={inner === "opendays"}><OpenDaysScreen open={inner === "opendays"} onClose={() => setInner(null)} /></LazyMount>

      {/* ═══ LK SHEET + INNER SCREENS ═══ */}
      {groupModal && <GroupModal group={groupModal} onClose={()=>setGroupModal(null)} />}
      {nextClassOpen && <NextClassModal lesson={nextLesson} onClose={()=>setNextClassOpen(false)} />}
      <NotifPanel open={notifOpen} role={notifRole} onClose={()=>setNotifOpen(false)}
        notifs={notifRole==="teacher" ? teacherNotifs : studentNotifs}
        setNotifs={notifRole==="teacher" ? setTeacherNotifs : setStudentNotifs}
        onCountChange={notifRole==="teacher" ? setTeacherUnreadCount : setUnreadCount} />
      <SearchPanel open={searchOpen} onClose={()=>setSearchOpen(false)} setLkInner={setLkInner} />
      <LKSheet open={lkOpen} onClose={()=>setLkOpen(false)} onLogout={()=>{setLkOpen(false);setScreen("login");}} setLkInner={setLkInner}
        unreadCount={unreadCount} realLessons={scheduleStatus==="ok" ? realLessons : STUDENT_LESSONS_FALLBACK} />
      <LazyMount open={lkInner==="schedule"}><LKSchedule open={lkInner==="schedule"} onClose={()=>setLkInner(null)} schedule={schedule} scheduleStatus={scheduleStatus} /></LazyMount>
      <LazyMount open={lkInner==="grades"}><LKGrades open={lkInner==="grades"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="portfolio"}><LKPortfolio open={lkInner==="portfolio"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="curriculum"}><LKCurriculum open={lkInner==="curriculum"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="consult"}><LKConsultations open={lkInner==="consult"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="spravki"}><LKSpravki open={lkInner==="spravki"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="faculty"}><LKFaculty open={lkInner==="faculty"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="about-app"}><LKAboutApp open={lkInner==="about-app"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="notifications"}>
        <LKNotifications open={lkInner==="notifications"} onClose={()=>setLkInner(null)}
          notifs={studentNotifs} setNotifs={setStudentNotifs} onCountChange={setUnreadCount} />
      </LazyMount>
      <LazyMount open={lkInner==="teachers"}><LKTeachers open={lkInner==="teachers"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="settings"}><LKSettings open={lkInner==="settings"} onClose={()=>setLkInner(null)} /></LazyMount>
      <ForgotModal    open={forgotOpen}              onClose={()=>setForgotOpen(false)} />
      <TeacherLKSheet open={teacherLkOpen}           onClose={()=>setTeacherLkOpen(false)} onLogout={()=>{setTeacherLkOpen(false);setScreen("login");}} setLkInner={setLkInner} />
      <TeacherGradeModal     open={teacherGradeOpen}         onClose={()=>setTeacherGradeOpen(false)} />
      <TeacherMsgModal       open={teacherMsgOpen}           onClose={()=>setTeacherMsgOpen(false)} />
      <TeacherMaterialsModal open={teacherMaterialsOpen}     onClose={()=>setTeacherMaterialsOpen(false)} />
    </>
  );
}
