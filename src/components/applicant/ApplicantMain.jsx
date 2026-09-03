// Applicant landing screen (extracted from App's inline JSX) — hero + tile grid to the inner applicant screens.
function ApplicantMain({ active, setScreen, setInner }) {
  const tiles = [
    { key: "faq",        cls: "faq",   icon: "❓", title: "FAQ",               sub: "Часто задаваемые вопросы поступающих" },
    { key: "apply",      cls: "apply", icon: "📝", title: "Подать заявление",   sub: "Онлайн-форма, документы, способ подачи" },
    { key: "specs",      cls: "specs", icon: "🎓", title: "Специальности",      sub: "Коды, проходные баллы, план приёма" },
    { key: "admissions", cls: "comm",  icon: "🏢", title: "Приёмная комиссия",  sub: "Контакты, режим работы, карта" },
    { key: "about",      cls: "about", icon: "🏫", title: "Об академии",        sub: "История, лицензия, галерея" },
    { key: "opendays",   cls: "open",  icon: "🗓️", title: "День открытых дверей", sub: "Ближайшие мероприятия и архив" },
  ];
  return (
      <div className={`screen${active ? " active" : ""}`}>
        <div className="topbar">
          <div className="topbar-left">
            <button className="back-btn" onClick={() => setScreen("login")}>← Назад</button>
          </div>
          <span className="tag-role applicant">абитуриент</span>
        </div>
        <div className="dash">
          {/* Hero */}
          <div className="app-hero" >
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <AttLogo size={52} circular />
              <div>
                <div className="app-hero-title">Поступай в АТТ!</div>
                <div className="app-hero-sub">Академия транспортных технологий с 1945 года</div>
              </div>
            </div>
          </div>

          {/* Tiles */}
          <div className="app-tiles">
            {tiles.map((t, i) => (
              <div key={t.key} className={`app-tile ${t.cls}`}
                
                onClick={() => setInner(t.key)}>
                <span className="app-tile-icon">{t.icon}</span>
                <div className="app-tile-title">{t.title}</div>
                <div className="app-tile-sub">{t.sub}</div>
              </div>
            ))}
          </div>
        </div></div>
  );
}
