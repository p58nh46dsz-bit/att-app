// Login screen (extracted from App's inline JSX) + ForgotModal (password-recovery sheet, launched from here).
function Login({ active, login, setLogin, pass, setPass, showPass, setShowPass, loginError, setLoginError, setScreen, setForgotOpen }) {
  return (
      <div className={`screen${active ? " active" : ""}`}>
        <div className="login-wrap">
          {/* circular logo + glow */}
          <div style={{
            width:140, height:140,
            borderRadius:"50%", overflow:"hidden", flexShrink:0,
            background:"#0e1f3a",
            boxShadow:"inset 0 0 0 3px rgba(14,31,58,0.95), 0 0 0 2px rgba(100,160,255,0.3), 0 0 36px 14px rgba(74,143,231,0.6), 0 0 90px 36px rgba(74,143,231,0.2)",
          }}>
            <AttLogo size={140} circular />
          </div>
          <div style={{ textAlign: "center", marginTop:-4 }}>
            <div style={{ fontSize: 12, letterSpacing: 4, color: "#ffffff", fontWeight: 600 }}>АТТ</div>
          </div>
          <div className="login-heading" >
            ВХОД В ПРИЛОЖЕНИЕ
          </div>
          <div className="field-wrap" >
            <span className="field-icon">✉️</span>
            <input type="text" placeholder="Логин / Почта" value={login} onChange={e => setLogin(e.target.value)} />
          </div>
          <div className="field-wrap" >
            <span className="field-icon">🔒</span>
            <input type={showPass ? "text" : "password"} placeholder="Пароль" value={pass} onChange={e => setPass(e.target.value)} />
            <button className="show-btn" onClick={() => setShowPass(v => !v)}>
              {showPass ? "👁️ скрыть" : "👁️ показать"}
            </button>
          </div>
          <button className="forgot" onClick={()=>setForgotOpen(true)}>
            ВОССТАНОВИТЬ ПАРОЛЬ
          </button>
          <button className="btn-primary"
            onClick={() => {
              if (login === "student@academy.ru" && pass === "/Daniel6752") {
                setLoginError("");
                setScreen("student");
              } else {
                setLoginError("Неверный логин или пароль");
              }
            }}>
            ВОЙТИ
          </button>
          {loginError && (
            <div style={{color:"#E84C4C",fontSize:13,textAlign:"center",background:"#E84C4C11",border:"1px solid #E84C4C33",borderRadius:10,padding:"10px 16px",width:"100%"}}>
              ❌ {loginError}
            </div>
          )}
          <div className="divider" >
            <div className="divider-line" /><span>или</span><div className="divider-line" />
          </div>
          <button className="link-btn" 
            onClick={() => setScreen("applicant")}>
            Я АБИТУРИЕНТ →
          </button>
          <button className="link-btn" style={{ color: "#5ec97a"}}
            onClick={() => setScreen("teacher")}>
            Я ПРЕПОДАВАТЕЛЬ →
          </button>
        </div>
      </div>
  );
}
function ForgotModal({ open, onClose }) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  if (!open) return null;
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open" style={{maxHeight:"65vh"}}>
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#4A8FE7,#2a6fc9)",fontSize:20}}>🔑</div>
          <div>
            <div className="lk-name">Восстановление пароля</div>
            <div className="lk-meta">{step===0?"Введите почту для сброса":"Письмо отправлено"}</div>
          </div>
          <button className="lk-edit-btn" aria-label="Закрыть" onClick={()=>{setStep(0);setEmail("");onClose();}}>✕</button>
        </div>
        <div className="lk-body">
          {step === 0 ? (
            <>
              <div style={{fontSize:13,color:"#7B9DBF",lineHeight:1.6}}>Укажите email, привязанный к аккаунту. Мы отправим ссылку для сброса пароля.</div>
              <div className="field-wrap" style={{width:"100%"}}>
                <span className="field-icon">✉️</span>
                <input type="email" placeholder="Ваш email" value={email} onChange={e=>setEmail(e.target.value)}
                  style={{width:"100%",padding:"14px 14px 14px 40px",background:"#142240",border:"1px solid #1E3560",borderRadius:12,color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",boxSizing:"border-box"}} />
              </div>
              <button className="btn-primary" onClick={()=>{ if(email.includes("@")) setStep(1); }}>Отправить ссылку</button>
            </>
          ) : (
            <div style={{textAlign:"center",padding:"10px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
              <div style={{fontSize:52}}>📧</div>
              <div style={{fontSize:16,fontWeight:700}}>Письмо отправлено!</div>
              <div style={{fontSize:13,color:"#7B9DBF",lineHeight:1.6}}>Проверьте ваш email:<br/><b style={{color:"#fff"}}>{email}</b><br/><span style={{fontSize:11}}>Ссылка действительна 24 часа</span></div>
              <button className="btn-primary" onClick={()=>{setStep(0);setEmail("");onClose();}}>Понятно</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// NOTIFICATIONS PANEL
