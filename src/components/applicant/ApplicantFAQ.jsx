// FAQScreen — applicant FAQ inner screen.
// Questions/answers taken verbatim from атт.спб.рф/abiturientu/f-a-q (minor
// cleanup only: original site's text is ALL CAPS for questions and repeats
// "Телефон:" per line — normalized casing and merged phone lines here).
function FAQScreen({ open, onClose }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("все");
  const [openQ, setOpenQ] = useState(null);
  const [questionDraft, setQuestionDraft] = useState("");
  const [askOpen, setAskOpen] = useState(false);

  const cats = MOCK_FAQ_CATEGORIES;
  const faqs = MOCK_FAQ_ITEMS;

  const filtered = faqs.filter(f =>
    (cat === "все" || f.cat === cat) &&
    (f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className={`inner-screen${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Экран абитуриента" tag="FAQ" tagClass="applicant" />
      <div className="inner-body">
        <div >
          <input className="faq-search" placeholder="Поиск по вопросам..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="faq-cats" >
          {cats.map(c => (
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={c} className={`faq-cat${cat === c ? " active" : ""}`} onClick={() => setCat(c)}>{c}</div>
          ))}
        </div>
        {filtered.map((f, i) => (
          <div key={i} className={`faq-item${openQ === i ? " open" : ""}`}
            >
            <div role="button" tabIndex={0} onKeyDown={activateOnEnter} className="faq-q" onClick={() => setOpenQ(openQ === i ? null : i)}>
              <span className="faq-q-text">{f.q}</span>
              <span className="faq-chevron">▼</span>
            </div>
            <div className="faq-a">{f.a.split("\n").map((line, j) => <div key={j}>{line}</div>)}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: C.sub, fontSize:"0.8125rem", padding: 24 }}>
            Ничего не найдено. Попробуйте другой запрос.
          </div>
        )}
        <div className="section-card" >
          <div className="section-head"><Icon name="message-circle" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:4}} />НЕ НАШЛИ ОТВЕТ?</div>
          <p style={{ fontSize:"0.8125rem", color: C.sub, marginBottom: 12 }}>Задайте вопрос — он поступит в приёмную комиссию</p>
          <input className="faq-search" placeholder="Введите ваш вопрос..." style={{ marginBottom: 10 }} value={questionDraft} onChange={e => setQuestionDraft(e.target.value)} />
          <button className="btn-blue" style={{ width: "100%", borderRadius: 12, padding: 12 }} onClick={() => setAskOpen(true)}>Отправить вопрос</button>
        </div>
      </div>
      <AskQuestionModal
        open={askOpen}
        onClose={() => setAskOpen(false)}
        initialQuestion={questionDraft}
        onSent={q => setQuestionDraft(q)}
      />
    </div>
  );
}

// ── AskQuestionModal — bottom sheet for "не нашли ответ" question submission ──
function AskQuestionModal({ open, onClose, initialQuestion, onSent }) {
  const [step, setStep] = useState("form"); // "form" | "success"
  const [fio, setFio] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [showErr, setShowErr] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("form");
      setFio(""); setDob(""); setEmail("");
      setQuestion(initialQuestion || "");
      setShowErr(false);
    }
  }, [open, initialQuestion]);

  const canSubmit = fio.trim() && dob && email.trim() && question.trim();
  const handleSubmit = () => {
    if (!canSubmit) { setShowErr(true); return; }
    setShowErr(false);
    onSent("");
    setStep("success");
  };

  return (
    <>
      <div className={`lk-overlay${open ? " open" : ""}`} onClick={onClose} />
      <div className={`lk-sheet${open ? " open" : ""}`}>
        <div className="lk-handle" />
        {step === "form" ? (
          <>
            <div className="lk-header">
              <div className="lk-avatar-big"><Icon name="message-circle" size={22} color="#FFFFFF" /></div>
              <div>
                <div className="lk-name">Вопрос в приёмную комиссию</div>
                <div className="lk-meta">Ответим на указанную почту</div>
              </div>
              <button className="lk-edit-btn" onClick={onClose}>✕ Закрыть</button>
            </div>
            <div className="lk-body" style={{ gap: 14 }}>
              <div>
                <div className="apply-label">ФИО</div>
                <input className="faq-search" placeholder="Иванов Иван Иванович" value={fio} onChange={e => setFio(e.target.value)} />
              </div>
              <div>
                <div className="apply-label">ДАТА РОЖДЕНИЯ</div>
                <input className="faq-search" type="date" value={dob} onChange={e => setDob(e.target.value)} />
              </div>
              <div>
                <div className="apply-label">ПОЧТА</div>
                <input className="faq-search" type="email" placeholder="you@mail.ru" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <div className="apply-label">ВАШ ВОПРОС</div>
                <textarea className="faq-search" style={{ minHeight: 90, resize: "vertical", fontFamily: "inherit" }}
                  placeholder="Введите ваш вопрос..." value={question} onChange={e => setQuestion(e.target.value)} />
              </div>
              {showErr && (
                <div style={{ fontSize:"0.75rem", color: "#E84C4C", display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="alert-triangle" size={13} color="#f5c067" />Заполните все поля, чтобы отправить вопрос
                </div>
              )}
              <button className="btn-blue" style={{ borderRadius: 14, padding: 14, fontSize:"0.875rem" }} onClick={handleSubmit}>Отправить ✓</button>
            </div>
          </>
        ) : (
          <div className="lk-body" style={{ textAlign: "center", padding: "24px 20px 32px", alignItems: "center", gap: 16 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle className="success-check-circle" cx="32" cy="32" r="29" stroke="#4CAF6B" strokeWidth="4" />
              <path className="success-check-mark" d="M18 33 L27 42 L46 21" stroke="#4CAF6B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 style={{ fontSize:"1.25rem" }}>Вопрос отправлен!</h2>
            <p style={{ fontSize:"0.8125rem", color: C.sub, lineHeight: 1.6 }}>Приёмная комиссия ответит вам на указанную почту в ближайшее время.</p>
            <p style={{ fontSize:"0.6875rem", color: C.sub, opacity: .7 }}>Контактный email приёмной комиссии: abiturient@nvsh.gugov.spb.ru</p>
            <button className="btn-blue" style={{ width: "100%", borderRadius: 14, padding: 14 }} onClick={onClose}>Готово</button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Document SVG icons ───────────────────────────────────────────────────────
