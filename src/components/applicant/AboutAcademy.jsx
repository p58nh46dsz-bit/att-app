// AboutScreen — applicant "about the academy" screen.
function AboutScreen({ open, onClose }) {
  return (
    <div className={`inner-screen${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Экран абитуриента" tag="Об академии" tagClass="applicant" />
      <div className="inner-body">
        <div className="about-stat-grid" >
          {[
            { num: "1945", lbl: "Год основания" },
            { num: "3 000+", lbl: "Студентов сейчас" },
            { num: "85%", lbl: "Трудоустройство" },
            { num: "12", lbl: "Специальностей" },
          ].map(s => (
            <div key={s.lbl} className="about-stat">
              <div className="about-stat-num">{s.num}</div>
              <div className="about-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        <div className="section-card" >
          <div className="section-head">📋 ИНФОРМАЦИЯ</div>
          {[
            { icon: "📜", text: "Лицензия и аккредитация", sub: "Сканы документов" },
            { icon: "📖", text: "История колледжа", sub: "С 1945 года" },
            { icon: "🔬", text: "Материально-техническая база", sub: "Лаборатории, спортзал, библиотека" },
            { icon: "💼", text: "Трудоустройство выпускников", sub: "85% — по специальности" },
          ].map(i => (
            <div key={i.text} className="about-list-item">
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{i.icon}</span>
              <div>
                <div style={{ color: C.text, fontSize: 13 }}>{i.text}</div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{i.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="section-card" >
          <div className="section-head">🖼️ ФОТОГАЛЕРЕЯ</div>
          <div className="gallery-strip">
            {["🏫", "📚", "🔬", "🏃", "🎓", "🛠️"].map((e, i) => (
              <div key={i} className="gallery-thumb"
                style={{ background: `hsl(${220 + i * 20}, 30%, 20%)` }}>{e}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
