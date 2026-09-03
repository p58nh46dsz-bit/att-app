// OpenDaysScreen — applicant open-day events screen.
function OpenDaysScreen({ open, onClose }) {
  const events = [
    { emoji: "🎓", title: "День открытых дверей — Основной", date: "8 июня 2026", time: "12:00", format: "офлайн", color: "#0f2040" },
    { emoji: "💻", title: "Онлайн-встреча с куратором", date: "15 июня 2026", time: "16:00", format: "онлайн", color: "#0f1c38" },
    { emoji: "🔬", title: "Экскурсия по лабораториям", date: "22 июня 2026", time: "11:00", format: "офлайн", color: "#0f2040" },
  ];
  return (
    <div className={`inner-screen${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Экран абитуриента" tag="День открытых дверей" tagClass="applicant" />
      <div className="inner-body">
        <div style={{ fontSize: 13, color: C.sub}}>
          Ближайшие мероприятия для поступающих
        </div>
        {events.map((e, i) => (
          <div key={i} className="event-card"
            >
            <div className="event-banner" style={{ background: e.color }}>
              <span>{e.emoji}</span>
            </div>
            <div className="event-body">
              <div className="event-title">{e.title}</div>
              <div className="event-meta">
                <span className="event-tag">📅 {e.date}</span>
                <span className="event-tag">🕐 {e.time}</span>
                <span className={`event-format ${e.format === "онлайн" ? "online" : "offline"}`}>
                  {e.format}
                </span>
              </div>
              <button className="btn-blue" style={{ width: "100%", borderRadius: 10, padding: "10px 0", marginTop: 12, fontSize: 13 }}>
                Записаться →
              </button>
            </div>
          </div>
        ))}

        <div className="section-card" >
          <div className="section-head">📸 АРХИВ ПРОШЛЫХ МЕРОПРИЯТИЙ</div>
          <div className="gallery-strip">
            {["🎤", "👨‍🎓", "🤝", "🏆", "📷", "🎉"].map((e, i) => (
              <div key={i} className="gallery-thumb"
                style={{ background: `hsl(${260 + i * 15}, 25%, 22%)` }}>{e}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP

// LK SCHEDULE
