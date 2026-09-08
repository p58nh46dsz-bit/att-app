// AdmissionsScreen — applicant admissions-committee contact screen.
function AdmissionsScreen({ open, onClose }) {
  return (
    <div className={`inner-screen${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Экран абитуриента" tag="Приёмная комиссия" tagClass="applicant" />
      <div className="inner-body">
        <div className="person-card" >
          <div className="person-ava"><Icon name="user-round" size={20} color="#FFFFFF" /></div>
          <div>
            <div style={{ fontWeight: 600, fontSize:"0.875rem" }}>Корабельников Сергей Кимович</div>
            <div style={{ fontSize:"0.75rem", color: C.sub }}>Директор АТТ</div>
          </div>
        </div>
        <div className="person-card" >
          <div className="person-ava"><Icon name="user-round" size={20} color="#FFFFFF" /></div>
          <div>
            <div style={{ fontWeight: 600, fontSize:"0.875rem" }}>Приёмная комиссия АТТ</div>
            <div style={{ fontSize:"0.75rem", color: C.sub }}>Секретарь · по телефону или email</div>
          </div>
        </div>

        <div className="contact-card" >
          <div className="section-head"><Icon name="map-pin" size={12} color="#7B9DBF" style={{verticalAlign:-2,marginRight:4}} />АДРЕС И РЕЖИМ РАБОТЫ</div>
          <div className="contact-row">
            <div className="contact-icon"><Icon name="building-2" size={18} color="#FFFFFF" /></div>
            <div className="contact-info">
              <div className="contact-label">Адрес</div>
              <div className="contact-val">ул. Салова, д. 65, Санкт-Петербург, 192102</div>
            </div>
          </div>
          <div className="contact-row">
            <div className="contact-icon"><Icon name="clock" size={18} color="#FFFFFF" /></div>
            <div className="contact-info">
              <div className="contact-label">График работы</div>
              <div className="contact-val">Пн–Пт, 10:00–17:00</div>
            </div>
          </div>
          <div className="contact-row">
            <div className="contact-icon"><Icon name="phone" size={18} color="#FFFFFF" /></div>
            <div className="contact-info">
              <div className="contact-label">Телефон</div>
              <div className="contact-val">+7 (812) 766-32-80</div>
            </div>
            <a className="contact-btn btn-call" href="tel:+78127663280">Позвонить</a>
          </div>
          <div className="contact-row">
            <div className="contact-icon"><Icon name="mail" size={18} color="#FFFFFF" /></div>
            <div className="contact-info">
              <div className="contact-label">Email</div>
              <div className="contact-val">abiturient@nvsh.gugov.spb.ru</div>
            </div>
            <a className="contact-btn btn-mail" href="mailto:abiturient@nvsh.gugov.spb.ru">Написать</a>
          </div>
        </div>

        <a className="map-placeholder" href="https://yandex.ru/maps/?text=Санкт-Петербург, ул. Салова, д. 65" target="_blank" rel="noopener" style={{textDecoration:"none"}}>
          <Icon name="map" size={32} color="#4A8FE7" />
          <span style={{ fontSize:"0.8125rem", color: C.sub }}>Карта проезда</span>
          <span style={{ fontSize:"0.6875rem", color: C.blue }}>Открыть в картах →</span>
        </a>
      </div>
    </div>
  );
}
