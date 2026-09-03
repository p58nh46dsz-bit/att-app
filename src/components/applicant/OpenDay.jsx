// OpenDaysScreen — applicant open-day events screen.
function OpenDaysScreen({ open, onClose }) {
  const events = [
    { icon: "graduation-cap", title: "День открытых дверей — Основной", date: "8 июня 2026", time: "12:00", format: "офлайн", color: "#0f2040" },
    { icon: "laptop",         title: "Онлайн-встреча с куратором", date: "15 июня 2026", time: "16:00", format: "онлайн", color: "#0f1c38" },
    { icon: "microscope",     title: "Экскурсия по лабораториям", date: "22 июня 2026", time: "11:00", format: "офлайн", color: "#0f2040" },
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
              <Icon name={e.icon} size={30} color="#FFFFFF" />
            </div>
            <div className="event-body">
              <div className="event-title">{e.title}</div>
              <div className="event-meta">
                <span className="event-tag"><Icon name="calendar" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{e.date}</span>
                <span className="event-tag"><Icon name="clock" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:3}} />{e.time}</span>
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
          <div className="section-head"><Icon name="camera" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:4}} />АРХИВ ПРОШЛЫХ МЕРОПРИЯТИЙ</div>
          <div className="gallery-strip">
            {["mic", "graduation-cap", "handshake", "trophy", "camera", "party-popper"].map((icon, i) => (
              <div key={i} className="gallery-thumb"
                style={{ background: `hsl(${260 + i * 15}, 25%, 22%)` }}><Icon name={icon} size={22} color="#FFFFFF" /></div>
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
