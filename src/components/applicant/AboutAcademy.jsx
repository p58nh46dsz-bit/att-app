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
          <div className="section-head"><Icon name="clipboard-list" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:4}} />ИНФОРМАЦИЯ</div>
          {[
            { icon: "scroll-text", text: "Лицензия и аккредитация", sub: "Сканы документов" },
            { icon: "book-open",   text: "История колледжа", sub: "С 1945 года" },
            { icon: "microscope",  text: "Материально-техническая база", sub: "Лаборатории, спортзал, библиотека" },
            { icon: "briefcase",   text: "Трудоустройство выпускников", sub: "85% — по специальности" },
          ].map(i => (
            <div key={i.text} className="about-list-item">
              <span style={{ flexShrink: 0, marginTop: 1, display:"flex" }}><Icon name={i.icon} size={17} color="#4A8FE7" /></span>
              <div>
                <div style={{ color: C.text, fontSize: 13 }}>{i.text}</div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{i.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="section-card" >
          <div className="section-head"><Icon name="image" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:4}} />ФОТОГАЛЕРЕЯ</div>
          <div className="gallery-strip">
            {["school", "book-open", "microscope", "activity", "graduation-cap", "wrench"].map((icon, i) => (
              <div key={i} className="gallery-thumb"
                style={{ background: `hsl(${220 + i * 20}, 30%, 20%)` }}><Icon name={icon} size={22} color="#FFFFFF" /></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
