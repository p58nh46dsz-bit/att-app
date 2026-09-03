// LKPortfolio — "Портфолио" screen in the student personal account.
function LKPortfolio({ open, onClose }) {
  const [cat, setCat] = useState(null);
  const cats = [
    { key:"study",   icon:"📚", color:"#4A8FE7", title:"Учебная деятельность",      sub:"Проекты, курсовые, навыки" },
    { key:"project", icon:"🛠️", color:"#1F5CB8", title:"Проектная деятельность",    sub:"Технические и учебные проекты" },
    { key:"social",  icon:"🤝", color:"#4CAF6B", title:"Общественная деятельность", sub:"Волонтёрство, актив, самоуправление" },
    { key:"culture", icon:"🎭", color:"#9B6BE0", title:"Культурно-творческая",      sub:"Конкурсы, творчество, мероприятия" },
    { key:"sport",   icon:"🏆", color:"#F5A623", title:"Спортивная",               sub:"Соревнования, секции, нормативы" },
    { key:"academic",icon:"📊", color:"#3FA7D6", title:"Успеваемость",             sub:"Средний балл, статистика" },
    { key:"penalty", icon:"⚠️", color:"#E05252", title:"Дисциплинарные взыскания", sub:"Замечания, выговоры" },
  ];
  const data = {
    study: [
      { icon:"📐", title:"Диагностика двигателя ВАЗ", meta:"Курсовой проект · 2024", tag:"Отлично" },
      { icon:"🔧", title:"Техническое обслуживание",  meta:"Продвинутый уровень",    tag:"Практика" },
      { icon:"🏅", title:"1С: Предприятие (базовый)", meta:"Сертификат · март 2024", tag:"Сертификат" },
    ],
    project: [
      { icon:"💻", title:"Мобильное приложение расписания", meta:"Учебный проект · 2024", tag:"В процессе" },
      { icon:"🚗", title:"Стенд диагностики авто",          meta:"Командный проект · 2023", tag:"Завершён" },
    ],
    social: [
      { icon:"🤝", title:"Волонтёр Дня открытых дверей", meta:"Приёмная комиссия · 2024", tag:"Актив" },
      { icon:"🧹", title:"Экологический субботник",       meta:"ул. Салова · 2023",        tag:"Участник" },
    ],
    culture: [
      { icon:"🎤", title:'Фестиваль "Студенческая весна"', meta:"Вокал · 2024", tag:"Лауреат" },
      { icon:"🎨", title:"Конкурс стенгазет",              meta:"Группа ДВ-41 · 2023", tag:"1 место" },
    ],
    sport: [
      { icon:"⚽", title:"Первенство по мини-футболу", meta:"Сборная академии · 2024", tag:"2 место" },
      { icon:"🏃", title:"Сдача норм ГТО",             meta:"2023", tag:"Серебро" },
    ],
    academic: [
      { icon:"📈", title:"Средний балл: 4.6",       meta:"По итогам 7 семестра", tag:"Хорошо" },
      { icon:"✅", title:"Посещаемость: 87%",       meta:"Текущий семестр",       tag:"Норма" },
      { icon:"📚", title:"Закрыто сессий: 7 из 7", meta:"Без задолженностей",     tag:"Отлично" },
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
                <span style={{fontSize:22,flexShrink:0,width:42,height:42,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:12,background:c.color+"22",border:`1px solid ${c.color}44`}}>{c.icon}</span>
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
                <div style={{fontSize:32,marginBottom:8}}>{cat==="penalty"?"✅":"📭"}</div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>{cat==="penalty"?"Взысканий нет":"Пока пусто"}</div>
                <div style={{fontSize:12,color:"#7B9DBF"}}>{cat==="penalty"?"Дисциплинарных взысканий не зафиксировано":"Здесь появятся ваши достижения"}</div>
              </div>
            ) : (data[cat]||[]).map((it,i)=>(
              <div key={i} className="portfolio-item">
                <span style={{fontSize:24,flexShrink:0}}>{it.icon}</span>
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
          <button className="btn-sec" style={{borderRadius:14,padding:12,fontSize:13}}>📄 Экспорт в PDF</button>
        )}
      </div>
    </div>
  );
}

// LK CURRICULUM
