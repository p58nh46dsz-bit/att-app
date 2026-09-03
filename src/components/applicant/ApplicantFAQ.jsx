// FAQScreen — applicant FAQ inner screen.
function FAQScreen({ open, onClose }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("все");
  const [openQ, setOpenQ] = useState(null);

  const cats = ["все", "документы", "испытания", "стипендии", "общежитие"];
  const faqs = [
    { cat: "документы", q: "Какие документы нужны для поступления?", a: "Аттестат / диплом, фото 3×4 (3 шт.), паспорт (скан), СНИЛС, льготные документы (при наличии)." },
    { cat: "документы", q: "Как подать документы онлайн?", a: "Зарегистрируйтесь в разделе «Подать заявление», загрузите сканы и выберите способ подачи — онлайн или лично." },
    { cat: "испытания", q: "Какие вступительные испытания нужно сдать?", a: "Зависит от специальности. Подробные даты и минимальные баллы указаны в разделе «Специальности»." },
    { cat: "испытания", q: "Можно ли пересдать вступительное испытание?", a: "Пересдача не предусмотрена, но вы можете подать заявление на несколько специальностей." },
    { cat: "стипендии", q: "Кто получает стипендию?", a: "Студенты бюджетной формы обучения, сдавшие сессию без троек. Размер — от 1800 до 4800 руб./мес." },
    { cat: "стипендии", q: "Есть ли повышенная стипендия?", a: "Да, за отличную учёбу и активную общественную деятельность назначается повышенная стипендия." },
    { cat: "общежитие", q: "Предоставляется ли общежитие?", a: "Да, иногородним студентам предоставляется общежитие при наличии мест. Заявка подаётся при поступлении." },
  ];

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
            <div key={c} className={`faq-cat${cat === c ? " active" : ""}`} onClick={() => setCat(c)}>{c}</div>
          ))}
        </div>
        {filtered.map((f, i) => (
          <div key={i} className={`faq-item${openQ === i ? " open" : ""}`}
            >
            <div className="faq-q" onClick={() => setOpenQ(openQ === i ? null : i)}>
              <span>{f.q}</span>
              <span className="faq-chevron">▼</span>
            </div>
            <div className="faq-a">{f.a}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: 24 }}>
            Ничего не найдено. Попробуйте другой запрос.
          </div>
        )}
        <div className="section-card" >
          <div className="section-head"><Icon name="message-circle" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:4}} />НЕ НАШЛИ ОТВЕТ?</div>
          <p style={{ fontSize: 13, color: C.sub, marginBottom: 12 }}>Задайте вопрос — он поступит в приёмную комиссию</p>
          <input className="faq-search" placeholder="Введите ваш вопрос..." style={{ marginBottom: 10 }} />
          <button className="btn-blue" style={{ width: "100%", borderRadius: 12, padding: 12 }}>Отправить вопрос</button>
        </div>
      </div>
    </div>
  );
}

// ── Document SVG icons ───────────────────────────────────────────────────────
