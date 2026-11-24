// MethodistDashboard — the screen of the methodist (role "methodist"). DPO topics sent by teachers come here: a topic on
// review is either returned for rework with a remark, or approved. An approved topic goes to the teacher, who sends it on.
// Imported by App.jsx (screen "methodist"); reads /methodist/dpo-topics and posts the return/approve actions.
const MD_FILTERS = [["review", "На проверке"], ["returned", "На доработке"], ["approved", "Утверждены"], ["sent", "Отправлены"]];

function MethodistDashboard({ active, user, onLogout }) {
  const ready = active && !!user;
  const { data: topics, error, load } = useApi("/methodist/dpo-topics", ready);
  const [filter, setFilter] = useState("review");
  const [cur, setCur] = useState(null);
  const count = s => (topics ? topics.filter(t => t.status === s).length : 0);
  const shown = topics ? topics.filter(t => t.status === filter) : [];
  const topic = cur && topics ? topics.find(t => t.id === cur) : null;
  return (
    <div className={`screen sf-app${active ? " active" : ""}`}>
      <div className="sf-hero">
        <div className="sf-hero-top">
          <div>
            <div className="sf-date">{new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</div>
            <h1 className="sf-hello">Методист<br /><span>{user ? [user.firstName, user.middleName].filter(Boolean).join(" ") : ""}</span></h1>
          </div>
          <button className="sf-out" onClick={onLogout}>Выйти</button>
        </div>
        <div className="sf-hero-stats">
          <div><b>{topics ? count("review") : "—"}</b><span>на проверке</span></div>
          <div><b>{topics ? count("returned") : "—"}</b><span>на доработке</span></div>
          <div><b>{topics ? count("approved") + count("sent") : "—"}</b><span>утверждено</span></div>
        </div>
      </div>
      <div className="tq-seg" role="tablist" aria-label="Статус">
        {MD_FILTERS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? "active" : ""} onClick={() => { tqTap(); setFilter(k); }}>{label}</button>
        ))}
      </div>
      {topics === null && !error ? <TQSkeleton rows={3} avatar={false} /> :
        error ? <TQEmpty kind="calendar" title="Не удалось загрузить" text="Проверьте связь и попробуйте ещё раз."><button className="tq-btn" onClick={load}>Повторить</button></TQEmpty> :
        shown.length === 0 ? <TQEmpty kind="calendar" title="Пусто" text="В этом разделе пока нет тем." /> :
        <div className="sf-list">{shown.map(t => (
          <button key={t.id} className="sf-item sf-tap" onClick={() => { tqTap(); setCur(t.id); }}>
            <div className="sf-item-top"><b>{t.title}</b><span className="sf-tag">{t.hours ? `${t.hours} ч` : "без часов"}</span></div>
            <div className="sf-meta">{t.teacher}{t.category ? ` · ${t.category}` : ""}</div>
          </button>
        ))}</div>}
      {topic && <MdTopicSheet key={topic.id} topic={topic} onClose={() => setCur(null)} onChanged={() => { setCur(null); load(); }} />}
    </div>
  );
}

function MdTopicSheet({ topic, onClose, onChanged }) {
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const act = async (path, body) => {
    setBusy(true); setErr("");
    const r = await apiAuthed(`/methodist/dpo-topics/${topic.id}/${path}`, { method: "POST", body });
    setBusy(false);
    if (r.status === 200) { tqTap(); onChanged(); } else setErr((r.data && r.data.error) || "Не удалось выполнить действие.");
  };
  const review = topic.status === "review";
  return (
    <SfSheet title={topic.title} sub={[topic.teacher, topic.hours ? `${topic.hours} ч` : "", topic.category].filter(Boolean).join(" · ")} onClose={onClose}>
      {topic.remark && topic.status === "returned" && <div className="sf-quote">Замечание: {topic.remark}</div>}
      <div className="tq-sec">Программа курса</div>
      <div className="sf-quote">{topic.programme.trim() || "Программа не заполнена."}</div>
      <DpoTopicFiles files={topic.files} topicId={topic.id} editable={false} onChanged={() => {}} />
      {review && <>
        <div className="tq-sec">Замечания, если нужна доработка</div>
        <textarea className="tq-field sf-area" value={remark} onChange={e => setRemark(e.target.value)} rows={3} maxLength={2000} placeholder="Что нужно исправить" disabled={busy} />
        <div className="tq-foot">
          {err && <div role="alert" className="tq-note" style={{ color: "var(--bad)" }}>{err}</div>}
          <button className="tq-btn ghost" disabled={busy || !remark.trim()} onClick={() => act("return", { remark })}>Вернуть на доработку</button>
          <button className="tq-btn" disabled={busy} onClick={() => act("approve", {})}>Утвердить</button>
        </div>
      </>}
      {!review && err && <div role="alert" className="tq-note" style={{ color: "var(--bad)" }}>{err}</div>}
    </SfSheet>
  );
}
