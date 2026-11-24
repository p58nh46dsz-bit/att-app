// DPO course topics, teacher side. The teacher writes a topic and its programme, sends it to the methodist, and after
// approval sends it to a deputy director. The methodist's remark (when the topic is returned) is shown on the topic.
const DPO_STATUS = {
  draft: ["Черновик", ""],
  review: ["На проверке у методиста", "now"],
  returned: ["Нужна доработка", "warn"],
  approved: ["Утверждена", "ok"],
  sent: ["Отправлена", "ok"],
};

function DpoTopicsScreen({ open, onClose }) {
  const { data: topics, error, load } = useApi("/me/dpo-topics", open);
  const [cur, setCur] = useState(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => { if (!open) { setCur(null); setCreating(false); } }, [open]);
  const topic = topics && cur && topics.find(t => t.id === cur);
  return (
    <div className={`inner-screen lk-inner tq-screen${open ? " open" : ""}`}>
      <TopBar plain onBack={topic ? () => { setCur(null); load(); } : onClose} title="Назад" tag={topic ? "Тема ДПО" : "Темы ДПО"} />
      <div className="inner-body mg-body">
        {topic ? <DpoTopicCard key={topic.id} topic={topic} onChanged={load} /> : (
          topics === null && !error ? <TQSkeleton rows={3} avatar={false} /> :
          error ? <TQEmpty kind="calendar" title="Не удалось загрузить" text="Проверьте связь и попробуйте ещё раз."><button className="tq-btn" onClick={load}>Повторить</button></TQEmpty> : (
            <>
              <button className="tq-btn mg-new" onClick={() => setCreating(true)}><Icon name="plus" size={18} />Новая тема</button>
              {topics.length === 0 ? <TQEmpty kind="calendar" title="Тем пока нет" text="Напишите тему курса ДПО и её программу, затем отправьте методисту." /> : (
                <div className="tq-card">
                  {topics.map(t => (
                    <button key={t.id} className="tq-item mg-topic" onClick={() => setCur(t.id)}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="tq-item-title mg-title">{t.title}</div>
                        <div className="tq-item-sub">{t.category || "Без категории"}{t.hours ? ` · ${t.hours} ч` : ""}</div>
                      </div>
                      <span className={`tq-pill ${DPO_STATUS[t.status][1]}`}>{DPO_STATUS[t.status][0]}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>
      {creating && <DpoTopicSheet onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
}

// The three kinds of programme and the range of hours each allows (the same limits are checked on the server).
const DPO_KINDS = [
  { key: "ДПО", min: 16, max: 200 },
  { key: "Профессиональная подготовка", min: 16, max: 144 },
  { key: "Профессиональная переподготовка", min: 250, max: null },
];
const dpoKind = key => DPO_KINDS.find(k => k.key === key);
const dpoHoursOk = form => {
  const k = dpoKind(form.category);
  const h = Number(form.hours);
  return !!k && form.hours !== "" && Number.isInteger(h) && h >= k.min && (k.max === null || h <= k.max);
};

// Title, kind, hours and programme: the same fields for a new topic and for editing one.
function DpoTopicFields({ value, onChange, disabled }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const kind = dpoKind(value.category);
  return (
    <>
      <div className="tq-sec">Название темы</div>
      <input className="tq-field" value={value.title} onChange={e => set("title", e.target.value)} maxLength={200} placeholder="Например, «Охрана труда на автотранспорте»" disabled={disabled} />
      <div className="tq-sec">Вид программы</div>
      <TQChips label="Вид программы" items={DPO_KINDS.map(k => ({ key: k.key, label: k.key }))} value={value.category} onPick={v => set("category", v)} />
      <div className="tq-sec">Количество часов</div>
      <input className="tq-field" inputMode="numeric" value={value.hours} onChange={e => set("hours", e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder={kind ? (kind.max ? `от ${kind.min} до ${kind.max}` : `от ${kind.min}`) + " ак. ч." : "Сначала выберите вид"} disabled={disabled || !kind} />
      {kind && value.hours !== "" && !dpoHoursOk({ category: value.category, hours: value.hours }) && (
        <div className="tq-note" style={{ textAlign: "left", color: "var(--bad)" }}>Для этого вида {kind.max ? `от ${kind.min} до ${kind.max}` : `от ${kind.min}`} академических часов.</div>
      )}
      <div className="tq-sec">Программа курса</div>
      <textarea className="tq-field mg-area" value={value.programme} onChange={e => set("programme", e.target.value)} maxLength={20000} rows={10} placeholder="Разделы, темы занятий, формы контроля" disabled={disabled} />
    </>
  );
}

function DpoTopicSheet({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: "", category: "", hours: "", programme: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    setBusy(true); setErr("");
    const r = await apiAuthed("/me/dpo-topics", { method: "POST", body: { ...form, hours: form.hours === "" ? null : Number(form.hours) } });
    setBusy(false);
    if (r.status === 201) { tqTap(); onSaved(); } else setErr((r.data && r.data.error) || "Не удалось сохранить тему.");
  };
  return (
    <SfSheet title="Новая тема ДПО" sub="Программу можно дописать позже, до отправки методисту" onClose={onClose}>
      <DpoTopicFields value={form} onChange={setForm} disabled={busy} />
      <div className="tq-foot">
        {err && <div role="alert" className="tq-note" style={{ color: "var(--bad)" }}>{err}</div>}
        <button className="tq-btn" disabled={busy || !form.title.trim() || !dpoHoursOk(form)} onClick={save}>{busy ? "Сохраняем…" : "Сохранить черновик"}</button>
      </div>
    </SfSheet>
  );
}

// Files of a topic's programme. A file opens through its own two-minute link. Adding and removing is for the teacher,
// while the topic is a draft or was returned; the methodist and the deputy director only open them.
function DpoTopicFiles({ files, topicId, editable, onChanged }) {
  const pick = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const add = async ev => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { setErr("Файл больше 25 МБ"); return; }
    setBusy(true); setErr("");
    const r = await apiUploadFile(`/me/dpo-topics/${topicId}/files`, f, { "x-file-name": encodeURIComponent(f.name) });
    setBusy(false);
    if (r.status === 201) { tqTap(); onChanged(); } else setErr((r.data && r.data.error) || (r.status === 0 ? "Нет связи с сервером" : "Не удалось загрузить файл"));
  };
  const remove = async id => {
    setBusy(true); setErr("");
    const r = await apiAuthed(`/me/dpo-topic-files/${id}`, { method: "DELETE" });
    setBusy(false);
    if (r.status === 204) { tqTap(); onChanged(); } else setErr((r.data && r.data.error) || "Не удалось удалить файл");
  };
  return (
    <div>
      <div className="tq-sec">Файлы программы</div>
      {(files || []).length === 0 && <div className="tq-note" style={{ textAlign: "left" }}>Файлов пока нет.</div>}
      {(files || []).map(f => (
        <div key={f.id} className="tq-item tp-file">
          <button type="button" className="tp-file-open" onClick={() => openFileLink(`/dpo-topic-files/${f.id}/link`)} aria-label={`Открыть ${f.name}`}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="tq-item-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
              <div className="tq-item-sub">{fileSize(f.bytes)}</div>
            </div>
          </button>
          {editable && <button type="button" className="tq-round" aria-label={`Удалить ${f.name}`} disabled={busy} onClick={() => remove(f.id)}><Icon name="x" size={16} /></button>}
        </div>
      ))}
      {editable && <>
        <input ref={pick} type="file" style={{ display: "none" }} onChange={add} />
        <button type="button" className="tq-btn ghost" disabled={busy} onClick={() => pick.current && pick.current.click()}>
          <Icon name="paperclip" size={18} />{busy ? "Загружаем…" : "Прикрепить файл"}
        </button>
      </>}
      {err && <div role="alert" className="tq-note" style={{ color: "var(--bad)", textAlign: "left" }}>{err}</div>}
    </div>
  );
}

function DpoTopicCard({ topic, onChanged }) {
  const editable = topic.status === "draft" || topic.status === "returned";
  const [form, setForm] = useState({ title: topic.title, category: topic.category, hours: topic.hours ? String(topic.hours) : "", programme: topic.programme });
  const [recipients, setRecipients] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (topic.status !== "approved" && topic.status !== "sent") return;
    apiAuthed("/me/dpo-recipients").then(r => {
      if (r.status === 200) { setRecipients(r.data); if (r.data.length === 1) setRecipient(r.data[0].id); }
    });
  }, [topic.status]);
  // Saves the fields first (while the topic is editable), then runs the action. A failed step stops the chain.
  const run = async action => {
    setBusy(true); setErr("");
    const body = { ...form, hours: form.hours === "" ? null : Number(form.hours) };
    if (editable) {
      const s = await apiAuthed(`/me/dpo-topics/${topic.id}`, { method: "PUT", body });
      if (s.status !== 200) { setBusy(false); setErr((s.data && s.data.error) || "Не удалось сохранить."); return; }
    }
    const r = action ? await action() : { status: 200 };
    setBusy(false);
    if (r.status === 200) { tqTap(); onChanged(); } else setErr((r.data && r.data.error) || "Не удалось выполнить действие.");
  };
  const hasProgramme = form.programme.trim() !== "" || (topic.files || []).length > 0;
  const submit = () => run(() => apiAuthed(`/me/dpo-topics/${topic.id}/submit`, { method: "POST" }));
  const save = () => run(null);
  const send = () => run(() => apiAuthed(`/me/dpo-topics/${topic.id}/send`, { method: "POST", body: { recipient_id: recipient } }));
  const [label, tone] = DPO_STATUS[topic.status];
  return (
    <div className="mg-stud">
      <div className="mg-stud-top">
        <div style={{ flex: 1, minWidth: 0 }}><div className="mg-head-title">{topic.title}</div></div>
        <span className={`tq-pill ${tone}`}>{label}</span>
      </div>
      {topic.status === "returned" && topic.remark && <div className="mg-comment warn">{topic.remark}</div>}
      {topic.status === "sent" && topic.recipient && <div className="tq-note" style={{ textAlign: "left" }}>Отправлено: {topic.recipient}</div>}
      <DpoTopicFields value={form} onChange={setForm} disabled={!editable || busy} />
      <DpoTopicFiles files={topic.files} topicId={topic.id} editable={editable && !busy} onChanged={onChanged} />
      {topic.status === "review" && <div className="tq-note" style={{ textAlign: "left" }}>Тема у методиста. Ответ придёт в уведомлениях.</div>}
      {err && <div role="alert" className="tq-note" style={{ color: "var(--bad)", textAlign: "left" }}>{err}</div>}
      {editable && <>
        <button className="tq-btn ghost" disabled={busy} onClick={save}>Сохранить</button>
        <button className="tq-btn" disabled={busy || !hasProgramme} onClick={submit}>{busy ? "Отправляем…" : "Отправить методисту"}</button>
        {!hasProgramme && <div className="tq-note">Чтобы отправить методисту, добавьте программу: текст или файл.</div>}
      </>}
      {(topic.status === "approved" || topic.status === "sent") && <>
        <div className="tq-sec">Заместителю директора</div>
        {recipients === null ? <TQSkeleton rows={1} avatar={false} /> : recipients.length === 0 ? <div className="tq-note">В администрации пока нет сотрудников для отправки.</div> : <>
          <select className="tq-field" value={recipient} onChange={e => setRecipient(e.target.value)} disabled={busy}>
            <option value="">Выберите сотрудника</option>
            {recipients.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button className="tq-btn" disabled={busy || !recipient} onClick={send}>{topic.status === "sent" ? "Отправить ещё раз" : "Отправить с программой"}</button>
        </>}
      </>}
    </div>
  );
}
