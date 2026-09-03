// LKPortfolio — "Портфолио" screen in the student personal account.
function LKPortfolio({ open, onClose }) {
  const [cat, setCat] = useState(null);
  const cats = [
    { key:"study",   icon:"book-open",     color:"#4A8FE7", title:"Учебная деятельность",      sub:"Проекты, курсовые, навыки" },
    { key:"project", icon:"wrench",        color:"#1F5CB8", title:"Проектная деятельность",    sub:"Технические и учебные проекты" },
    { key:"social",  icon:"handshake",     color:"#4CAF6B", title:"Общественная деятельность", sub:"Волонтёрство, актив, самоуправление" },
    { key:"culture", icon:"drama",         color:"#9B6BE0", title:"Культурно-творческая",      sub:"Конкурсы, творчество, мероприятия" },
    { key:"sport",   icon:"trophy",        color:"#F5A623", title:"Спортивная",               sub:"Соревнования, секции, нормативы" },
    { key:"academic",icon:"bar-chart-3",   color:"#3FA7D6", title:"Успеваемость",             sub:"Средний балл, статистика" },
    { key:"penalty", icon:"alert-triangle",color:"#E05252", title:"Дисциплинарные взыскания", sub:"Замечания, выговоры" },
  ];
  const data = {
    study: [
      { icon:"ruler",  title:"Диагностика двигателя ВАЗ", meta:"Курсовой проект · 2024", tag:"Отлично" },
      { icon:"wrench", title:"Техническое обслуживание",  meta:"Продвинутый уровень",    tag:"Практика" },
      { icon:"medal",  title:"1С: Предприятие (базовый)", meta:"Сертификат · март 2024", tag:"Сертификат" },
    ],
    project: [
      { icon:"laptop", title:"Мобильное приложение расписания", meta:"Учебный проект · 2024", tag:"В процессе" },
      { icon:"car",    title:"Стенд диагностики авто",          meta:"Командный проект · 2023", tag:"Завершён" },
    ],
    social: [
      { icon:"handshake", title:"Волонтёр Дня открытых дверей", meta:"Приёмная комиссия · 2024", tag:"Актив" },
      { icon:"leaf",       title:"Экологический субботник",       meta:"ул. Салова · 2023",        tag:"Участник" },
    ],
    culture: [
      { icon:"mic",     title:'Фестиваль "Студенческая весна"', meta:"Вокал · 2024", tag:"Лауреат" },
      { icon:"palette", title:"Конкурс стенгазет",              meta:"Группа ДВ-41 · 2023", tag:"1 место" },
    ],
    sport: [
      { icon:"goal",     title:"Первенство по мини-футболу", meta:"Сборная академии · 2024", tag:"2 место" },
      { icon:"activity", title:"Сдача норм ГТО",             meta:"2023", tag:"Серебро" },
    ],
    academic: [
      { icon:"trending-up",   title:"Средний балл: 4.6",       meta:"По итогам 7 семестра", tag:"Хорошо" },
      { icon:"check-circle-2",title:"Посещаемость: 87%",       meta:"Текущий семестр",       tag:"Норма" },
      { icon:"book-open",     title:"Закрыто сессий: 7 из 7", meta:"Без задолженностей",     tag:"Отлично" },
    ],
    penalty: [],
  };
  const cur = cats.find(c=>c.key===cat);
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={cat?()=>setCat(null):onClose} title="Личный кабинет" tag={cur?cur.title:"Портфолио"} />
      <div className="inner-body">
        {!cat && (
          <>
            {cats.map(c=>(
              <div key={c.key} className="portfolio-item" style={{cursor:"pointer",alignItems:"center"}} onClick={()=>setCat(c.key)}>
                <span style={{flexShrink:0,width:42,height:42,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:12,background:c.color+"22",border:`1px solid ${c.color}44`}}><Icon name={c.icon} size={20} color={c.color} /></span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,marginBottom:3}}>{c.title}</div>
                  <div style={{fontSize:12,color:"#7B9DBF"}}>{c.sub}</div>
                </div>
                <span style={{color:"#7B9DBF",fontSize:18,flexShrink:0}}>›</span>
              </div>
            ))}
          </>
        )}
        {cat && (
          <>
            {(data[cat]||[]).length===0 ? (
              <div className="section-card" style={{textAlign:"center",padding:"28px 16px"}}>
                <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><Icon name={cat==="penalty"?"check-circle-2":"inbox"} size={32} color={cat==="penalty"?"#5ec97a":"#4A8FE7"} /></div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>{cat==="penalty"?"Взысканий нет":"Пока пусто"}</div>
                <div style={{fontSize:12,color:"#7B9DBF"}}>{cat==="penalty"?"Дисциплинарных взысканий не зафиксировано":"Здесь появятся ваши достижения"}</div>
              </div>
            ) : (data[cat]||[]).map((it,i)=>(
              <div key={i} className="portfolio-item">
                <Icon name={it.icon} size={22} color="#4A8FE7" style={{flexShrink:0}} />
                <div>
                  <div style={{fontSize:14,fontWeight:600,marginBottom:3}}>{it.title}</div>
                  <div style={{fontSize:12,color:"#7B9DBF"}}>{it.meta}</div>
                  <span className="portfolio-tag">{it.tag}</span>
                </div>
              </div>
            ))}
            {cat!=="penalty" && cat!=="academic" && (
              <button className="btn-blue" style={{borderRadius:14,padding:14,marginTop:4}}>+ Добавить достижение</button>
            )}
          </>
        )}
        {!cat && (
          <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Icon name="file-text" size={14} color="#7B9DBF" />Экспорт в PDF</button>
        )}
      </div>
    </div>
  );
}

// LK CURRICULUM
