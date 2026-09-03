// STUDENTS roster data + GroupModal — group roster viewer, opened from the teacher dashboard.
const STUDENTS = {
  "ДВ-41": [
    "Алексеев Дмитрий","Баранов Кирилл","Васильева Анна","Герасимов Павел",
    "Громов Илья","Дмитриева Олеся","Егоров Тимур","Жукова Виктория",
    "Захаров Артём","Иванов Никита","Карпов Максим","Козлова Дарья",
    "Лебедев Роман","Морозов Владислав","Никитина Екатерина","Орлов Денис",
    "Петрова Алина","Рябов Сергей","Смирнов Андрей","Фёдоров Евгений",
    "Харитонов Глеб","Шевченко Ирина",
  ],
  "ДВ-31": [
    "Антонов Степан","Белова Марина","Волков Арсений","Гусева Полина",
    "Давыдов Михаил","Ефимова Татьяна","Зайцев Константин","Казакова Надежда",
    "Киселёв Фёдор","Колесников Игорь","Кузнецова Валерия","Макаров Антон",
    "Медведева Ксения","Новиков Владимир","Орехова Светлана","Панов Руслан",
    "Соловьёв Артур","Тихонов Матвей","Филиппова Юлия",
  ],
  "ДВ-11": [
    "Абрамов Леонид","Богданова Алёна","Виноградов Семён","Гончарова Вера",
    "Данилов Олег","Елисеева Кристина","Жданов Роман","Зотова Наталья",
    "Исаев Александр","Кириллова Людмила","Крылов Борис","Лазарева Диана",
    "Логинов Артём","Михайлова Оксана","Назаров Евгений","Осипова Галина",
    "Попов Дмитрий","Романова Анастасия","Сидоров Пётр","Тарасова Инна",
    "Ульянов Максим","Фомина Ирина","Чернов Александр","Шаров Николай",
  ],
};

// ── TEACHER MSG MODAL ────────────────────────────────────────────────────────
function GroupModal({ group, onClose }) {
  const students = STUDENTS[group] || [];
  const [search, setSearch] = useState("");
  const filtered = students.filter(s => s.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open">
        <div className="lk-handle" />
        <div className="lk-header">
          <div className="lk-avatar-big" style={{background:"linear-gradient(135deg,#4CAF6B,#2d8050)",fontSize:16}}>👥</div>
          <div>
            <div className="lk-name">Группа {group}</div>
            <div className="lk-meta">{students.length} студентов</div>
          </div>
          <button className="lk-edit-btn" onClick={onClose}>✕ Закрыть</button>
        </div>
        <div style={{padding:"12px 20px 8px"}}>
          <input
            style={{width:"100%",padding:"10px 14px",background:"#142240",border:"1px solid #1E3560",borderRadius:12,color:"#fff",fontFamily:"inherit",fontSize:14,outline:"none"}}
            placeholder="🔍 Поиск по фамилии..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
        </div>
        <div className="lk-body" style={{paddingTop:8}}>
          {filtered.map((s,i)=>(
            <div key={i} style={{
              display:"flex",alignItems:"center",gap:12,
              padding:"10px 14px",background:"#142240",borderRadius:12,}}>
              <div style={{
                width:34,height:34,borderRadius:"50%",flexShrink:0,
                background:`hsl(${(i*47)%360},40%,35%)`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:13,fontWeight:700,color:"#fff"}}>
                {s.split(" ").map(w=>w[0]).join("").slice(0,2)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500}}>{s}</div>
                <div style={{fontSize:11,color:"#7B9DBF"}}>студент · {group}</div>
              </div>
              <span style={{color:"#7B9DBF",fontSize:14}}>›</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{textAlign:"center",color:"#7B9DBF",fontSize:13,padding:20}}>Не найдено</div>
          )}
        </div>
      </div>
    </>
  );
}


// NEXT CLASS MODAL
