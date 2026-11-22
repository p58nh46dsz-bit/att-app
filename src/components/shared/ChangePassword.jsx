// Changing one's own password: the form (shared by student, teacher and administrator) and the student/teacher screen.
// The rules are the same as on the server (server/passwordPolicy.js), shown live as the person types.
const PW_WEAK = ["12345678","123456789","1234567890","11111111","qwertyui","qwerty123","qwertyuiop","password","password1","password123","adminadmin","admin123","йцукенгш","1q2w3e4r","q1w2e3r4"];
function passwordRules(next, current, login) {
  return [
    { ok: next.length >= 8, text: "8+ символов" },
    { ok: /\p{L}/u.test(next) && /\d/.test(next), text: "Буквы и цифры" },
    { ok: next.length > 0 && next.trim() === next && !(login && next.toLowerCase().includes(String(login).toLowerCase())) && !PW_WEAK.includes(next.toLowerCase()),
      text: "Не простой и без логина" },
    { ok: next.length > 0 && next !== current, text: "Не как текущий" },
  ];
}
const PW_LEVELS = ["", "Слабый", "Слабый", "Средний", "Надёжный"];

function PwField({ icon, value, onChange, placeholder, autoComplete, visible, onToggle, state }) {
  return (
    <div className="pw-row">
      <span className="pw-ico"><Icon name={icon} size={20} /></span>
      <input className="pw-input" type={visible ? "text" : "password"} value={value} onChange={onChange}
        placeholder={placeholder} aria-label={placeholder} autoComplete={autoComplete} maxLength={128}
        autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      {onToggle && (
        <button type="button" className="pw-eye" onClick={onToggle} aria-pressed={visible} aria-label={visible ? "Скрыть пароль" : "Показать пароль"}>
          <Icon name={visible ? "eye_off" : "eye"} size={20} />
        </button>
      )}
      {state && (
        <span className="pw-state" key={state} aria-hidden="true">
          {state === "ok" ? <Icon name="check" size={20} color="var(--ok)" strokeWidth={2.6} /> : <Icon name="x_circle" size={20} color="var(--bad)" />}
        </span>
      )}
    </div>
  );
}

function PasswordForm({ user, onChanged, onDone }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errKey, setErrKey] = useState(0);
  const [done, setDone] = useState(false);
  const rules = passwordRules(next, current, user && user.login);
  const level = next ? rules.filter(r => r.ok).length : 0;
  const matches = next.length > 0 && next === again;
  const mismatch = again.length > 0 && !matches && (again.length >= next.length || !next.startsWith(again));
  const valid = current.length > 0 && rules.every(r => r.ok) && matches;
  const edit = setter => e => { setter(e.target.value); setError(""); };
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
      setError(r.status === 0 ? "Нет связи с сервером" : r.status === 429 ? "Слишком много попыток, подождите" : (r.data && r.data.error) || "Не удалось сменить пароль");
      setErrKey(k => k + 1);
    }
  };
  if (done) return (
    <div className="pw-done">
      <SuccessCheck size={64} />
      <h2 className="pw-title">Пароль изменён</h2>
      <div className="pw-done-sub">На других устройствах войдите заново</div>
      {onDone && <button type="button" className="pw-submit" onClick={onDone}>Готово</button>}
    </div>
  );
  return (
    <form onSubmit={submit} className="pw" noValidate>
      <div className="pw-hero">
        <div className="pw-badge"><Icon name="key_round" size={28} strokeWidth={2.2} /></div>
        <h2 className="pw-title">Новый пароль</h2>
      </div>
      <div className="pw-group">
        <PwField icon="lock" value={current} onChange={edit(setCurrent)} placeholder="Текущий пароль" autoComplete="current-password"
          visible={showCur} onToggle={() => setShowCur(v => !v)} />
      </div>
      <div className="pw-group g2">
        <PwField icon="key_round" value={next} onChange={edit(setNext)} placeholder="Новый пароль" autoComplete="new-password"
          visible={showNew} onToggle={() => setShowNew(v => !v)} />
        <PwField icon="key_round" value={again} onChange={edit(setAgain)} placeholder="Повторите новый" autoComplete="new-password"
          visible={showNew} state={matches ? "ok" : mismatch ? "bad" : null} />
      </div>
      <div className="pw-meter" aria-live="polite">
        <div className="pw-bars" data-level={level}><i /><i /><i /><i /></div>
        <span className="pw-level" data-level={level}>{PW_LEVELS[level] || "Надёжность"}</span>
      </div>
      <div className="pw-chips">
        {rules.map(r => (
          <span key={r.text} className={`pw-chip${r.ok ? " ok" : ""}`}>
            <Icon name="check" size={14} strokeWidth={3} />{r.text}
          </span>
        ))}
      </div>
      {error && <div className="pw-error" role="alert" key={errKey}><Icon name="x_circle" size={16} />{error}</div>}
      <button type="submit" className={`pw-submit${busy ? " busy" : ""}`} disabled={!valid || busy}>
        {busy ? <><span className="pw-spin" aria-hidden="true" />Сохраняем</> : "Сменить пароль"}
      </button>
    </form>
  );
}

// Student / teacher: a screen of the personal account.
function LKPassword({ open, onClose, user }) {
  return (
    <div className={`inner-screen lk-inner${open ? " open" : ""}`}>
      <TopBar plain={!!user && user.role === "teacher"} onBack={onClose} title="Личный кабинет" tag="Смена пароля" />
      <div className="inner-body">
        {open && <PasswordForm user={user} onDone={onClose} />}
      </div>
    </div>
  );
}
