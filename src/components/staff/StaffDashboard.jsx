// StaffDashboard — the screen of the administration's staff (role "staff"). Four functions:
//  * announcements and events (publish, see what is in the feed);
//  * appeals (read, answer, set the status);
//  * an educational event (planned for the students);
//  * the groups' results (average mark, debtors, absences).
const SF_AUDIENCE = [["all", "Всем"], ["student", "Студентам"], ["teacher", "Преподавателям"]];
// Who sees an event: students and teachers get a notification; "staff" stays on the administration's dashboard.
const SF_EVENT_AUDIENCE = [["all", "Студенты и преподаватели"], ["student", "Только студенты"], ["teacher", "Только преподаватели"], ["staff", "Только администрация"]];
const sfEvAud = a => (SF_EVENT_AUDIENCE.find(x => x[0] === a) || [null, a])[1];
const SF_STATUS = [["new", "Новое"], ["working", "В работе"], ["resolved", "Решено"]];
const sfDate = iso => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
const sfWhen = iso => new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const sfAud = a => (SF_AUDIENCE.find(x => x[0] === a) || [null, a])[1];

function StaffDashboard({ active, user, onLogout }) {
  const [open, setOpen] = useState(null);
  const ready = active && !!user;
  const { data: appeals, load: loadAppeals } = useApi("/staff/appeals", ready);
  const { data: anns } = useApi("/staff/announcements", ready);
  const { data: groups } = useApi("/staff/group-stats", ready);
  const { data: dpoIn } = useApi("/staff/dpo-topics", ready);
  const newAppeals = (appeals || []).filter(a => a.status === "new").length;
  const h = new Date().getHours();
  const hello = h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
  const cards = [
    { key: "ann", icon: "megaphone", title: "Объявления и события", sub: "Новости и события для студентов и преподавателей", stat: anns ? `${anns.length} в ленте` : "", tone: "#2A5FD0" },
    { key: "appeals", icon: "message-circle", title: "Обращения", sub: "Ответы студентам и преподавателям", stat: appeals ? (newAppeals ? `${newAppeals} новых` : "Все отвечены") : "", tone: "#C8281C", badge: newAppeals },
    { key: "event", icon: "party_popper", title: "Воспитательное мероприятие", sub: "Запланировать событие для студентов", stat: "", tone: "#D98A0B" },
    { key: "dpo", icon: "file-text", title: "Темы ДПО", sub: "Утверждённые программы, которые прислали преподаватели", stat: dpoIn ? `${dpoIn.length} получено` : "", tone: "#5B6CFF" },
    { key: "groups", icon: "bar-chart-3", title: "Успеваемость групп", sub: "Средний балл, долги и пропуски", stat: groups ? `${groups.length} групп` : "", tone: "#1E9E5B" },
  ];
  return (
    <div className={`screen sf-app${active ? " active" : ""}`}>
      <div className="sf-hero">
        <div className="sf-hero-top">
          <div>
            <div className="sf-date">{new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</div>
            <h1 className="sf-hello">{hello},<br /><span>{user ? [user.firstName, user.middleName].filter(Boolean).join(" ") : ""}</span></h1>
          </div>
          <button className="sf-out" onClick={onLogout}>Выйти</button>
        </div>
        <div className="sf-hero-stats">
          <div><b>{appeals ? newAppeals : "—"}</b><span>новых обращений</span></div>
          <div><b>{anns ? anns.length : "—"}</b><span>в ленте</span></div>
          <div><b>{groups ? groups.length : "—"}</b><span>групп</span></div>
        </div>
      </div>
      <div className="sf-grid">
        {cards.map(c => (
          <button key={c.key} className="sf-card" style={{ "--sf-tone": c.tone }} onClick={() => { tqTap(); setOpen(c.key); }}>
            <span className="sf-ico" style={{ background: `color-mix(in srgb, ${c.tone} 14%, var(--card))`, color: c.tone }}><Icon name={c.icon} size={22} /></span>
            <span className="sf-title">{c.title}</span>
            <span className="sf-sub">{c.sub}</span>
            <span className="sf-foot">
              {c.stat && <span className="sf-stat">{c.stat}</span>}
              {c.badge > 0 && <span className="sf-badge">{c.badge}</span>}
            </span>
          </button>
        ))}
      </div>
      {open === "ann" && <AnnouncementsScreen onClose={() => setOpen(null)} />}
      {open === "appeals" && <AppealsScreen onClose={() => { setOpen(null); loadAppeals(); }} />}
      {open === "event" && <EventSheet onClose={() => setOpen(null)} />}
      {open === "dpo" && <DpoReceivedScreen onClose={() => setOpen(null)} />}
      {open === "groups" && <GroupsScreen groups={groups} onClose={() => setOpen(null)} />}
    </div>
  );
}

// A full screen over the dashboard, with a back arrow.
function SfScreen({ title, onClose, children }) {
  return (
    <div className="inner-screen lk-inner sf-screen open">
      <TopBar plain onBack={onClose} title="Назад" tag={title} />
      <div className="inner-body sf-body">{children}</div>
    </div>
  );
}

// ── Announcements and events ────────────────────────────────────────────────────────────────────────────────
function AnnouncementsScreen({ onClose }) {
  const [tab, setTab] = useState("ann");
  const [adding, setAdding] = useState(null);   // "ann" | "event" | null
  const { data: anns, load: loadAnn } = useApi("/staff/announcements", true);
  const { data: events, load: loadEv } = useApi("/staff/events", true);
  return (
    <SfScreen title="Объявления" onClose={onClose}>
      <div className="tq-seg" role="tablist" aria-label="Раздел">
        {[["ann", "Объявления"], ["events", "События"]].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "active" : ""} onClick={() => { tqTap(); setTab(k); }}>{label}</button>
        ))}
      </div>
      <button className="tq-btn" onClick={() => setAdding(tab === "ann" ? "ann" : "event")}><Icon name="plus" size={18} />{tab === "ann" ? "Новое объявление" : "Новое событие"}</button>
      {tab === "ann" ? (
        !anns ? <TQSkeleton rows={3} avatar={false} /> : anns.length === 0 ? <TQEmpty kind="calendar" title="Объявлений пока нет" text="Первое объявление увидят выбранные вами получатели." /> :
          <div className="sf-list">{anns.map(a => (
            <div key={a.id} className="sf-item">
              <div className="sf-item-top"><b>{a.title}</b>{a.pinned && <span className="sf-tag">Закреплено</span>}</div>
              <div className="sf-item-body">{a.body}</div>
              <div className="sf-meta">{sfAud(a.audience)} · {sfDate(a.created_at)}</div>
            </div>))}</div>
      ) : (
        !events ? <TQSkeleton rows={3} avatar={false} /> : events.length === 0 ? <TQEmpty kind="calendar" title="Событий пока нет" text="Добавьте событие: оно появится в расписании студентов." /> :
          <div className="sf-list">{events.map(e => (
            <div key={e.id} className="sf-item">
              <div className="sf-item-top"><b>{e.title}</b></div>
              <div className="sf-meta">{sfWhen(e.starts_at)}{e.place ? ` · ${e.place}` : ""} · {sfEvAud(e.audience)}</div>
              {e.body && <div className="sf-item-body">{e.body}</div>}
            </div>))}</div>
      )}
      {adding === "ann" && <AnnouncementSheet onClose={() => setAdding(null)} onSaved={() => { setAdding(null); loadAnn(); }} />}
      {adding === "event" && <EventSheet onClose={() => setAdding(null)} onSaved={() => { setAdding(null); loadEv(); }} />}
    </SfScreen>
  );
}

function SfSheet({ title, sub, onClose, children }) {
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open tq-sheet" style={{ zIndex: 260 }}>
        <div className="lk-handle" />
        <TQSheetHead title={title} sub={sub} onClose={onClose} />
        <div className="tq-sh-body">{children}</div>
      </div>
    </>
  );
}

function AnnouncementSheet({ onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    setBusy(true); setErr("");
    const r = await apiAuthed("/admin/announcements", { method: "POST", body: { title, body, audience, pinned } });
    setBusy(false);
    if (r.status === 200 || r.status === 201) { tqTap(); onSaved(); } else setErr((r.data && r.data.error) || "Не удалось опубликовать");
  };
  return (
    <SfSheet title="Новое объявление" sub="Опубликуется сразу" onClose={onClose}>
      <div className="tq-sec">Кому</div>
      <TQChips label="Аудитория" items={SF_AUDIENCE.map(([k, l]) => ({ key: k, label: l }))} value={audience} onPick={setAudience} />
      <div className="tq-sec">Заголовок</div>
      <input className="tq-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Коротко о главном" maxLength={120} />
      <div className="tq-sec">Текст</div>
      <textarea className="tq-field sf-area" value={body} onChange={e => setBody(e.target.value)} placeholder="Подробности" rows={5} maxLength={4000} />
      <label className="sf-switch"><input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} /><span>Закрепить сверху</span></label>
      <div className="tq-foot">
        {err && <div role="alert" className="tq-note" style={{ color: "var(--bad)" }}>{err}</div>}
        <button className="tq-btn" disabled={busy || !title.trim() || !body.trim()} onClick={save}>{busy ? "Публикуем…" : "Опубликовать"}</button>
      </div>
    </SfSheet>
  );
}

// Used both for "event" (the feed) and for the educational event (the same record).
function EventSheet({ onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [place, setPlace] = useState("");
  const [audience, setAudience] = useState("all");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    setBusy(true); setErr("");
    const r = await apiAuthed("/admin/events", { method: "POST", body: { title, date: new Date(when).toISOString(), place, body, audience } });
    setBusy(false);
    if (r.status === 200 || r.status === 201) { tqTap(); if (onSaved) onSaved(); else onClose(); } else setErr((r.data && r.data.error) || "Не удалось сохранить");
  };
  return (
    <SfSheet title="Воспитательное мероприятие" sub={`Увидят: ${sfEvAud(audience).toLowerCase()}`} onClose={onClose}>
      <div className="tq-sec">Кто увидит</div>
      <TQChips label="Аудитория" items={SF_EVENT_AUDIENCE.map(([k, l]) => ({ key: k, label: l }))} value={audience} onPick={setAudience} />
      <div className="tq-sec">Название</div>
      <input className="tq-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Например, «День открытых дверей»" maxLength={120} />
      <div className="tq-sec">Когда</div>
      <input className="tq-field" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
      <div className="tq-sec">Где</div>
      <input className="tq-field" value={place} onChange={e => setPlace(e.target.value)} placeholder="Актовый зал, корпус 1" maxLength={120} />
      <div className="tq-sec">Описание</div>
      <textarea className="tq-field sf-area" value={body} onChange={e => setBody(e.target.value)} placeholder="Необязательно" rows={4} maxLength={2000} />
      <div className="tq-foot">
        {err && <div role="alert" className="tq-note" style={{ color: "var(--bad)" }}>{err}</div>}
        <button className="tq-btn" disabled={busy || !title.trim() || !when} onClick={save}>{busy ? "Сохраняем…" : "Запланировать"}</button>
      </div>
    </SfSheet>
  );
}

// ── Appeals ───────────────────────────────────────────────────────────────────────────────────────────────────
// The topics the teachers sent to this staff member after the methodist's approval (read only).
function DpoReceivedScreen({ onClose }) {
  const { data, error, load } = useApi("/staff/dpo-topics", true);
  const [cur, setCur] = useState(null);
  const item = cur && data ? data.find(t => t.id === cur) : null;
  return (
    <SfScreen title="Темы ДПО" onClose={onClose}>
      {data === null && !error ? <TQSkeleton rows={3} avatar={false} /> :
        error ? <TQEmpty kind="calendar" title="Не удалось загрузить" text="Проверьте связь и попробуйте ещё раз."><button className="tq-btn" onClick={load}>Повторить</button></TQEmpty> :
        data.length === 0 ? <TQEmpty kind="calendar" title="Пока нет тем" text="Утверждённые темы ДПО, которые отправят преподаватели, появятся здесь." /> :
        <div className="sf-list">{data.map(t => (
          <button key={t.id} className="sf-item sf-tap" onClick={() => { tqTap(); setCur(t.id); }}>
            <div className="sf-item-top"><b>{t.title}</b>{t.hours ? <span className="sf-tag">{t.hours} ч</span> : null}</div>
            <div className="sf-meta">{t.teacher}{t.category ? ` · ${t.category}` : ""}</div>
          </button>
        ))}</div>}
      {item && <SfSheet title={item.title} sub={`От: ${item.teacher}`} onClose={() => setCur(null)}>
        <div className="sf-quote">{item.programme.trim() || "Программа не заполнена."}</div>
        <DpoTopicFiles files={item.files} topicId={item.id} editable={false} onChanged={() => {}} />
      </SfSheet>}
    </SfScreen>
  );
}

function AppealsScreen({ onClose }) {
  const { data, error, load } = useApi("/staff/appeals", true);
  const [filter, setFilter] = useState("all");
  const [cur, setCur] = useState(null);
  const shown = data ? (filter === "new" ? data.filter(a => a.status === "new") : data) : [];
  return (
    <SfScreen title="Обращения" onClose={onClose}>
      <div className="tq-seg" role="tablist" aria-label="Фильтр">
        {[["all", "Все"], ["new", "Новые"]].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? "active" : ""} onClick={() => { tqTap(); setFilter(k); }}>{label}</button>
        ))}
      </div>
      {!data && !error ? <TQSkeleton rows={4} avatar={false} /> :
        error ? <TQEmpty kind="calendar" title="Не удалось загрузить" text="Проверьте связь и попробуйте ещё раз."><button className="tq-btn" onClick={load}>Повторить</button></TQEmpty> :
        shown.length === 0 ? <TQEmpty kind="calendar" title="Обращений нет" text="Здесь появятся обращения студентов и преподавателей." /> :
        <div className="sf-list">{shown.map(a => (
          <button key={a.id} className="sf-item sf-tap" onClick={() => { tqTap(); setCur(a); }}>
            <div className="sf-item-top"><b>{a.subject}</b><span className={`sf-tag ${a.status}`}>{(SF_STATUS.find(x => x[0] === a.status) || [0, ""])[1]}</span></div>
            <div className="sf-meta">{a.from} · {a.fromRole === "teacher" ? "преподаватель" : "студент"} · {sfWhen(a.at)}</div>
          </button>))}</div>}
      {cur && <AppealSheet appeal={cur} onClose={() => setCur(null)} onSaved={() => { setCur(null); load(); }} />}
    </SfScreen>
  );
}

function AppealSheet({ appeal, onClose, onSaved }) {
  const [status, setStatus] = useState(appeal.status);
  const [reply, setReply] = useState(appeal.reply || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    setBusy(true); setErr("");
    const r = await apiAuthed(`/admin/appeals/${appeal.id}`, { method: "PATCH", body: { status, reply } });
    setBusy(false);
    if (r.status === 200) { tqTap(); onSaved(); } else setErr((r.data && r.data.error) || "Не удалось сохранить");
  };
  return (
    <SfSheet title={appeal.subject} sub={`${appeal.from} · ${sfWhen(appeal.at)}`} onClose={onClose}>
      <div className="sf-quote">{appeal.message}</div>
      <div className="tq-sec">Статус</div>
      <TQChips label="Статус" items={SF_STATUS.map(([k, l]) => ({ key: k, label: l }))} value={status} onPick={setStatus} />
      <div className="tq-sec">Ответ</div>
      <textarea className="tq-field sf-area" value={reply} onChange={e => setReply(e.target.value)} placeholder="Ответ автору обращения" rows={4} maxLength={2000} />
      <div className="tq-foot">
        {err && <div role="alert" className="tq-note" style={{ color: "var(--bad)" }}>{err}</div>}
        <button className="tq-btn" disabled={busy || (status === "resolved" && !reply.trim())} onClick={save}>{busy ? "Сохраняем…" : "Сохранить"}</button>
      </div>
    </SfSheet>
  );
}

// ── Groups ─────────────────────────────────────────────────────────────────────────────────────────────────────
function GroupsScreen({ groups, onClose }) {
  const list = groups ? [...groups].sort((a, b) => (a.avg === null) - (b.avg === null) || (a.avg ?? 0) - (b.avg ?? 0)) : null;
  const debtors = list ? list.reduce((n, g) => n + g.debtors, 0) : 0;
  const absences = list ? list.reduce((n, g) => n + g.absences, 0) : 0;
  return (
    <SfScreen title="Успеваемость групп" onClose={onClose}>
      {!list ? <TQSkeleton rows={4} avatar={false} /> : <>
        <div className="sf-stats">
          <div><span>Групп</span><b>{list.length}</b></div>
          <div><span>Должников</span><b>{debtors}</b></div>
          <div><span>Пропусков</span><b>{absences}</b></div>
        </div>
        <div className="sf-list">{list.map(g => (
          <div key={g.code} className="sf-item sf-group">
            <div className="sf-group-code">{g.code}</div>
            <div className="sf-group-avg" data-tone={g.avg === null ? "" : g.avg >= 4 ? "good" : g.avg >= 3 ? "mid" : "bad"}>{g.avg === null ? "—" : g.avg.toFixed(2)}</div>
            <div className="sf-group-meta">{g.students} студ. · долги {g.debtors} · пропуски {g.absences}</div>
          </div>))}</div>
      </>}
    </SfScreen>
  );
}
