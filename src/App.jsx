// Top-level state, routing between screens/roles, and all modal/panel wiring.
function App() {
  const [screen, setScreen] = useState("splash");
  const [splashHiding, setSplashHiding] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState("");
  // The last login typed on this device is remembered (login only — a password is never stored)
  // so it is prefilled on the next visit, also after "Выйти".
  const [login, setLogin] = useState(() => loadJSON("att_last_login", ""));
  const [pass, setPass] = useState("");
  const [, setContentVersion] = useState(0); // bumped when GET /content replaces the built-in copy
  useEffect(() => { loadContent().then(ok => { if (ok) setContentVersion(v => v + 1); }); }, []);
  const [user, setUser] = useState(null); // the signed-in user as returned by the API (never a password or hash)
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
  // Notifications and their read state live in the database (per user); loaded after sign-in below.
  const [studentNotifs, setStudentNotifs] = useState([]);
  const [teacherNotifs, setTeacherNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [teacherUnreadCount, setTeacherUnreadCount] = useState(0);
  const [groupModal, setGroupModal] = useState(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalPair, setJournalPair] = useState(null);   // a pair of the timetable the journal should open on   // "Журнал группы" (attendance marks)
  const [rosterModal, setRosterModal] = useState(null);   // null | "groups" | "students" (cards on the teacher's main screen)
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
  // The schedule comes from the database for the signed-in user; if the API can't be reached
  // (offline, not deployed yet) the bundled schedule.json is used instead.
  useEffect(() => {
    const fromFile = () => fetch("./schedule.json", { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(data => { setSchedule(data); setScheduleStatus("ok"); })
      .catch(() => setScheduleStatus("error"));
    if (!user) { fromFile(); return; }
    apiAuthed("/schedule").then(r => {
      if (r.status === 200 && r.data.days) { setSchedule(r.data); setScheduleStatus("ok"); }
      else if (user.role === "teacher") setScheduleStatus("error");   // the bundled file is a student group's timetable, not theirs
      else fromFile();
    });
  }, [user && user.id]);
  const todayRecord = schedule && schedule.days ? schedule.days[isoDate(new Date())] : null;
  const hasTodayRecord = !!todayRecord;
  const realLessons = (todayRecord && todayRecord.lessons ? todayRecord.lessons : []).map(l => ({
    start: l.start, end: l.end, subj: l.subj, room: l.room, teacher: l.teacher, online: false,
    period: l.period, group: l.group, subject: l.subject,   // used by the teacher's journal to open "this pair"
  }));

  // A teacher's pairs come from the academy's teachers' timetable (see server/data.js, /schedule).
  const teacherLessons = user && user.role === "teacher" ? realLessons : [];   // /schedule already returns this teacher's own pairs
  const [nextLesson, setNextLesson] = useState(() => getNextLesson(STUDENT_LESSONS_FALLBACK));
  const [teacherLesson, setTeacherLesson] = useState(() => getNextLesson([]));
  // Средний балл и долги of the signed-in student, from the real marks (долг = предмет со средним ниже 3).
  const [gradeStats, setGradeStats] = useState({ avg: null, debts: 0, subjects: 0 });
  useEffect(() => {
    if (!user || user.role !== "student" || lkInner === "grades") return;
    apiAuthed("/me/grades").then(r => {
      if (r.status !== 200) return;
      const all = r.data.flatMap(s => s.grades.map(g => g.val));
      setGradeStats({
        avg: all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length * 10) / 10 : null,
        debts: r.data.filter(s => s.avg !== null && s.avg < 3).length, subjects: r.data.length,
      });
    });
  }, [user && user.id, lkInner]);
  useEffect(() => {
    const calc = () => {
      const lessons = hasTodayRecord ? realLessons : STUDENT_LESSONS_FALLBACK;
      setNextLesson(getNextLesson(lessons, hasTodayRecord));
      setTeacherLesson(getNextLesson(teacherLessons, hasTodayRecord));
    };
    calc();
    const id = setInterval(calc, 30000);
    return () => clearInterval(id);
  }, [scheduleStatus, schedule, user && user.id]);

  useEffect(() => {
    const t1 = setTimeout(() => setSplashHiding(true), 2800);
    const t2 = setTimeout(() => {
      // Resume a previous student/teacher session across app restarts —
      // without this, every relaunch (common on mobile: the OS frequently
      // kills backgrounded apps) bounces the user back to the login screen.
      // "applicant" is intentionally not resumed: it's an unauthenticated
      // sub-section, not a session.
      const saved = loadJSON("att_session", null);
      const cached = loadJSON("att_user", null); // user from the last sign-in, so the app also starts offline
      const token = loadJSON("att_token", null);
      if (cached && cached.role === saved && token) {
        setUser(cached); setScreen(saved);
        // Refresh from the server: an expired/invalid token (401) signs out, a network error keeps the cached user.
        apiMe(token).then(r => {
          if (r.status === 200) { setUser(r.data.user); saveJSON("att_user", r.data.user); }
          else if (r.status === 401) setScreen("login");
        });
      } else setScreen("login");
    }, 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  useEffect(() => {
    if (screen === "student" || screen === "teacher" || screen === "admin") saveJSON("att_session", screen);
    else if (screen === "login") {
      saveJSON("att_session", null); saveJSON("att_user", null); saveJSON("att_token", null);
      setUser(null); setLogin(loadJSON("att_last_login", "")); setPass(""); setShowPass(false);
    }
  }, [screen]);
  // After the teacher changes groups/subjects the profile (user.groups) is read again from the server.
  const refreshUser = () => {
    const token = loadJSON("att_token", null);
    if (token) apiMe(token).then(r => { if (r.status === 200) { setUser(r.data.user); saveJSON("att_user", r.data.user); } });
  };
  const onLogin = (acc, token, remember = true) => {
    saveJSON("att_user", acc); saveJSON("att_token", token);
    if (remember) saveJSON("att_last_login", acc.login); 
    setUser(acc); setPass(""); setScreen(acc.role);
  };
  useEffect(() => {
    if (!user) { setStudentNotifs([]); setTeacherNotifs([]); setUnreadCount(0); setTeacherUnreadCount(0); return; }
    apiAuthed("/me/notifications").then(r => {
      if (r.status !== 200) return;
      const unread = r.data.filter(n => n.unread).length;
      if (user.role === "teacher") { setTeacherNotifs(r.data); setTeacherUnreadCount(unread); }
      else { setStudentNotifs(r.data); setUnreadCount(unread); }
    });
  }, [user && user.id]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // End the session when the server no longer accepts the token (account deleted, password changed
  // by the administrator): checked whenever the app regains focus.
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const r = await apiMe(loadJSON("att_token", null));
      if (r.status !== 401) return;
      setLkOpen(false); setLkInner(null); setNotifOpen(false); setSearchOpen(false);
      setTeacherLkOpen(false); setTeacherGradeOpen(false); setTeacherMsgOpen(false);
      setTeacherMaterialsOpen(false); setGroupModal(null); setRosterModal(null); setJournalOpen(false); setNextClassOpen(false);
      setUser(null); setScreen("login");
      setLoginError("Учётная запись удалена или пароль изменён. Войдите снова.");
    };
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [user && user.id]);

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
    journalOpen           && (() => setJournalOpen(false)),
    groupModal            && (() => setGroupModal(null)),
    rosterModal           && (() => setRosterModal(null)),
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
        onLogin={onLogin}
        setScreen={setScreen}
        setForgotOpen={setForgotOpen}
      />

      {screen === "admin" && <AdminDashboard user={user} schedule={schedule} scheduleStatus={scheduleStatus} onLogout={() => {
        setLogin(""); setPass(""); setLoginError(""); setShowPass(false); setScreen("login");
      }} />}

      <StudentDashboard
        active={screen === "student"}
        user={user}
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
        gradeStats={gradeStats}
      />

      <TeacherProfile
        active={screen === "teacher"}
        user={user}
        teacherUnreadCount={teacherUnreadCount}
        setNotifRole={setNotifRole}
        setNotifOpen={setNotifOpen}
        setScreen={setScreen}
        setTeacherLkOpen={setTeacherLkOpen}
        teacherLesson={teacherLesson}
        teacherLessons={teacherLessons}
        scheduleStatus={scheduleStatus}
        setGroupModal={setGroupModal}
        setRosterModal={setRosterModal}
        setJournalOpen={setJournalOpen}
        setNextClassOpen={setNextClassOpen}
        setTeacherGradeOpen={setTeacherGradeOpen}
        setTeacherMsgOpen={setTeacherMsgOpen}
        setTeacherMaterialsOpen={setTeacherMaterialsOpen}
        setLkInner={setLkInner}
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
      {journalOpen && <TeacherJournal user={user} initialPair={journalPair} lessons={teacherLessons} scheduleStatus={scheduleStatus} onGroupsChanged={refreshUser} onClose={()=>{setJournalOpen(false);setJournalPair(null);}} onOpenTeaching={()=>{setJournalOpen(false);setJournalPair(null);setLkInner("teaching");}} />}
      {rosterModal && <TeacherRosterModal mode={rosterModal} groups={(user && user.groups) || []} onClose={()=>setRosterModal(null)}
        onPickGroup={code=>{setRosterModal(null);setGroupModal(code);}} onOpenTeaching={()=>{setRosterModal(null);setLkInner("teaching");}} />}
      {groupModal && <GroupModal group={groupModal} onClose={()=>setGroupModal(null)} />}
      {nextClassOpen && <NextClassModal lesson={user && user.role === "teacher" ? teacherLesson : nextLesson} group={user && user.group} isTeacher={!!user && user.role === "teacher"}
        onJournal={l=>{setNextClassOpen(false);setJournalPair(l);setJournalOpen(true);}} onClose={()=>setNextClassOpen(false)} />}
      <NotifPanel open={notifOpen} role={notifRole} onClose={()=>setNotifOpen(false)}
        notifs={notifRole==="teacher" ? teacherNotifs : studentNotifs}
        setNotifs={notifRole==="teacher" ? setTeacherNotifs : setStudentNotifs}
        onCountChange={notifRole==="teacher" ? setTeacherUnreadCount : setUnreadCount} />
      <SearchPanel open={searchOpen} onClose={()=>setSearchOpen(false)} setLkInner={setLkInner} />
      <LKSheet user={user} open={lkOpen} onClose={()=>setLkOpen(false)} onLogout={()=>{setLkOpen(false);setScreen("login");}} setLkInner={setLkInner}
        unreadCount={unreadCount} realLessons={scheduleStatus==="ok" ? realLessons : STUDENT_LESSONS_FALLBACK} gradeStats={gradeStats} />
      <LazyMount open={lkInner==="schedule"}><LKSchedule open={lkInner==="schedule"} onClose={()=>setLkInner(null)} schedule={schedule} scheduleStatus={scheduleStatus} /></LazyMount>
      <LazyMount open={lkInner==="grades"}><LKGrades open={lkInner==="grades"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="portfolio"}><LKPortfolio open={lkInner==="portfolio"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="curriculum"}><LKCurriculum user={user} open={lkInner==="curriculum"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="consult"}><LKConsultations open={lkInner==="consult"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="spravki"}><LKSpravki open={lkInner==="spravki"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="faculty"}><LKFaculty open={lkInner==="faculty"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="about-app"}><LKAboutApp open={lkInner==="about-app"} onClose={()=>setLkInner(null)} /></LazyMount>
      <LazyMount open={lkInner==="notifications"}>
        <LKNotifications open={lkInner==="notifications"} onClose={()=>setLkInner(null)}
          notifs={studentNotifs} setNotifs={setStudentNotifs} onCountChange={setUnreadCount} />
      </LazyMount>
      <LazyMount open={lkInner==="teachers"}><LKTeachers open={lkInner==="teachers"} onClose={()=>setLkInner(null)} schedule={schedule} /></LazyMount>
      <LazyMount open={lkInner==="tschedule"}><TeacherSchedule open={lkInner==="tschedule"} onClose={()=>setLkInner(null)} schedule={schedule} scheduleStatus={scheduleStatus}
        onOpenPair={l=>{setLkInner(null);setJournalPair(l);setJournalOpen(true);}} /></LazyMount>
      <LazyMount open={lkInner==="password"}><LKPassword open={lkInner==="password"} onClose={()=>setLkInner(null)} user={user} /></LazyMount>
      <LazyMount open={lkInner==="teaching"}><TeachingScreen open={lkInner==="teaching"} onClose={()=>setLkInner(null)} onChanged={refreshUser} /></LazyMount>
      <LazyMount open={lkInner==="documents"}><TeacherDocuments open={lkInner==="documents"} onClose={()=>setLkInner(null)} user={user} /></LazyMount>
            <ForgotModal    open={forgotOpen}              onClose={()=>setForgotOpen(false)} />
      <TeacherLKSheet user={user} open={teacherLkOpen}           onClose={()=>setTeacherLkOpen(false)} onLogout={()=>{setTeacherLkOpen(false);setScreen("login");}} setLkInner={setLkInner} />
      <TeacherGradeModal     user={user} open={teacherGradeOpen}         onClose={()=>setTeacherGradeOpen(false)} onOpenTeaching={()=>{setTeacherGradeOpen(false);setLkInner("teaching");}} />
      <TeacherMsgModal       user={user} open={teacherMsgOpen}           onClose={()=>setTeacherMsgOpen(false)} />
      <TeacherMaterialsModal open={teacherMaterialsOpen}     onClose={()=>setTeacherMaterialsOpen(false)} onOpenTeaching={()=>{setTeacherMaterialsOpen(false);setLkInner("teaching");}} />
    </>
  );
}
