// Changing one's own password: the form (shared by student, teacher and administrator) and the student/teacher screen.
// The rules are the same as on the server (server/passwordPolicy.js), shown live as the person types.
const PW_WEAK = ["12345678","123456789","1234567890","11111111","qwertyui","qwerty123","qwertyuiop","password","password1","password123","adminadmin","admin123","йцукенгш","1q2w3e4r","q1w2e3r4"];
function passwordRules(next, current, login) {
  return [
    { ok: next.length >= 8, text: "Не меньше 8 символов" },
    { ok: /\p{L}/u.test(next) && /\d/.test(next), text: "Есть и буквы, и цифры" },
    { ok: next.length > 0 && next.trim() === next && !(login && next.toLowerCase().includes(String(login).toLowerCase())) && !PW_WEAK.includes(next.toLowerCase()),
      text: "Не простой, без пробелов по краям, без логина" },
    { ok: next.length > 0 && next !== current, text: "Отличается от текущего" },
  ];
}
const pwInputStyle = {
  width:"100%", boxSizing:"border-box", background:"#0d1830", border:"1px solid #1E3560", borderRadius:10,
  color:"#fff", fontFamily:"inherit", fontSize:"0.9375rem", padding:"12px 14px", marginTop:6,
};

function PasswordForm({ user, onChanged }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const rules = passwordRules(next, current, user && user.login);
  const valid = current.length > 0 && rules.every(r => r.ok) && next === again;
  const submit = async e => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true); setError("");
    const r = await apiAuthed("/me/password", { method: "POST", body: { current, next } });
    setBusy(false);
    if (r.status === 200 && r.data.token) {
      saveJSON("att_token", r.data.token); // the other sessions are closed; this one continues with a new key
      setCurrent(""); setNext(""); setAgain(""); setDone(true);
      if (onChanged) onChanged();
    } else {
      setError(r.status === 0 ? "Нет связи с сервером. Попробуйте позже." : r.status === 429 ? "Слишком много попыток. Подождите немного." : (r.data && r.data.error) || "Не удалось сменить пароль.");
    }
  };
  if (done) return (
    <div style={{textAlign:"center",padding:"24px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      <SuccessCheck size={48} />
      <div style={{fontSize:"1.0625rem",fontWeight:700}}>Пароль изменён</div>
      <div style={{fontSize:"0.8125rem",color:"#7B9DBF",lineHeight:1.6}}>На других устройствах нужно будет войти заново, уже с новым паролем.</div>
    </div>
  );
  return (
    <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:12}} noValidate>
      <label style={{fontSize:"0.75rem",color:"#7B9DBF"}}>Текущий пароль
        <input style={pwInputStyle} type={show ? "text" : "password"} value={current} onChange={e=>{setCurrent(e.target.value);setError("");}} autoComplete="current-password" maxLength={128} />
      </label>
      <label style={{fontSize:"0.75rem",color:"#7B9DBF"}}>Новый пароль
        <input style={pwInputStyle} type={show ? "text" : "password"} value={next} onChange={e=>{setNext(e.target.value);setError("");}} autoComplete="new-password" maxLength={128} />
      </label>
      <label style={{fontSize:"0.75rem",color:"#7B9DBF"}}>Повторите новый пароль
        <input style={pwInputStyle} type={show ? "text" : "password"} value={again} onChange={e=>{setAgain(e.target.value);setError("");}} autoComplete="new-password" maxLength={128} />
      </label>
      <label style={{display:"flex",alignItems:"center",gap:8,fontSize:"0.8125rem",color:"#7B9DBF"}}>
        <input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)} /> Показать пароли
      </label>
      <div style={{background:"#101C33",border:"1px solid #1E3560",borderRadius:12,padding:"10px 14px",display:"flex",flexDirection:"column",gap:6}} aria-live="polite">
        {rules.map(r => (
          <div key={r.text} style={{fontSize:"0.8125rem",color:r.ok?"#5ec97a":"#7B9DBF",display:"flex",gap:8}}>
            <span aria-hidden="true">{r.ok ? "✓" : "○"}</span>{r.text}
          </div>
        ))}
        <div style={{fontSize:"0.8125rem",color:next && next === again ? "#5ec97a" : "#7B9DBF",display:"flex",gap:8}}>
          <span aria-hidden="true">{next && next === again ? "✓" : "○"}</span>Повтор совпадает
        </div>
      </div>
      {error && <div role="alert" style={{color:"#ff7e7e",fontSize:"0.8125rem",textAlign:"center"}}>{error}</div>}
      <button type="submit" className="btn-blue" style={{borderRadius:14,padding:14,opacity:valid&&!busy?1:0.5}} disabled={!valid||busy}>{busy ? "Сохраняем…" : "Сменить пароль"}</button>
    </form>
  );
}

// Student / teacher: a screen of the personal account.
function LKPassword({ open, onClose, user }) {
  return (
    <div className={`inner-screen lk-inner${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Смена пароля" />
      <div className="inner-body">
        {open && <PasswordForm user={user} />}
        <div style={{fontSize:"0.75rem",color:"#7B9DBF",lineHeight:1.6}}>Новый пароль знаете только вы: администратор сможет его сбросить, но не сможет посмотреть.</div>
      </div>
    </div>
  );
}
