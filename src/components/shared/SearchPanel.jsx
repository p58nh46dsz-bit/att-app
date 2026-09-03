// SearchPanel — app-wide search overlay opened from the student topbar.
const ALL_ITEMS = [
  { icon:"calendar",        title:"Расписание", sub:"Сегодня / завтра / неделя", lk:"schedule" },
  { icon:"bar-chart-3",     title:"Оценки и успеваемость", sub:"Средний балл, долги", lk:"grades" },
  { icon:"clipboard-list",  title:"Учебный план", sub:"Предметы по курсам", lk:"curriculum" },
  { icon:"trophy",          title:"Портфолио", sub:"Проекты, сертификаты", lk:"portfolio" },
  { icon:"message-circle",  title:"Запись на консультацию", sub:"Выбор типа и времени", lk:"consult" },
  { icon:"file-text",       title:"Заказ справок", sub:"Об обучении, военкомат", lk:"spravki" },
  { icon:"graduation-cap",  title:"Факультативы", sub:"ДПО и кружки", lk:"faculty" },
  { icon:"megaphone",       title:"Новости академии", sub:"Актуальные события", lk:null },
  { icon:"bell",            title:"Уведомления", sub:"3 непрочитанных", lk:null },
];
function SearchPanel({ open, onClose, setLkInner }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(id);
    }
  }, [open]);
  const results = q.trim().length > 0
    ? ALL_ITEMS.filter(it =>
        it.title.toLowerCase().includes(q.toLowerCase()) ||
        it.sub.toLowerCase().includes(q.toLowerCase())
      )
    : ALL_ITEMS;

  return (
    <div className={`search-panel${open?" open":""}`}>
      <div className="search-row">
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Поиск по приложению..."
          value={q}
          onChange={e=>setQ(e.target.value)}
          aria-label="Поиск по приложению"
        />
        <button className="search-cancel" onClick={()=>{setQ("");onClose();}}>Отмена</button>
      </div>
      <div className="search-results">
        {results.length === 0 && (
          <div className="search-empty">Ничего не найдено</div>
        )}
        {results.map((it,i)=>(
          <div key={i} className="search-result"
            onClick={()=>{ if(it.lk){setLkInner(it.lk);} setQ(""); onClose(); }}
            >
            <span className="search-result-icon"><Icon name={it.icon} size={17} color="#4A8FE7" /></span>
            <div>
              <div className="search-result-title">{it.title}</div>
              <div className="search-result-sub">{it.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// LK BOTTOM SHEET
