// TeacherManage — two screens of the teacher's personal account:
//  * TeacherCoursework: topics given to a group, the works the students hand in, a mark or "back for revision";
//  * TeacherDpo: the ДПО programmes the teacher leads: who signed up, materials (files), tests and their results.
// Both are full screens (like the timetable) with sheets for forms.

const MG_STATUS = w => !w ? ["Не сдано", ""] : w.status === "booked" ? ["Тема выбрана", ""] : w.status === "accepted" ? [`Принято · ${w.grade}`, "ok"] : w.status === "revision" ? ["На доработке", "warn"] : ["На проверке", "now"];
const mgDate = iso => iso ? iso.split("-").reverse().slice(0, 2).join(".") : "";
const mgSheet = (title, sub, onClose, body) => (
  <>
    <div className="lk-overlay open" onClick={onClose} />
    <div className="lk-sheet open tq-sheet" style={{ zIndex: 260 }}>
      <div className="lk-handle" />
      <TQSheetHead title={title} sub={sub} onClose={onClose} />
      <div className="tq-sh-body">{body}</div>
    </div>
  </>
);

// ── Coursework ───────────────────────────────────────────────────────────────────────────────────────────
function TeacherCoursework({ open, onClose }) {
  const { data: topics, error, load } = useApi("/me/coursework", open);
  const [topicId, setTopicId] = useState(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => { if (!open) { setTopicId(null); setCreating(false); } }, [open]);
  const topic = topics && topics.find(t => t.id === topicId);
  return (
    <div className={`inner-screen lk-inner tq-screen${open ? " open" : ""}`}>
      <TopBar plain onBack={topic ? () => { setTopicId(null); load(); } : onClose} title="Назад" tag={topic ? "Курсовая" : "Курсовые"} />
      <div className="inner-body mg-body">
        {topic ? <CourseworkTopic key={topic.id} topic={topic} onDeleted={() => { setTopicId(null); load(); }} /> : (
          topics === null && !error ? <TQSkeleton rows={3} avatar={false} /> :
          error ? <TQEmpty kind="calendar" title="Не удалось загрузить" text="Проверьте связь и попробуйте ещё раз."><button className="tq-btn" onClick={load}>Повторить</button></TQEmpty> : <>
            <button className="tq-btn mg-new" onClick={() => setCreating(true)}><Icon name="plus" size={18} />Новая тема</button>
            {topics.length === 0 ? <TQEmpty kind="calendar" title="Тем пока нет" text="Создайте тему курсовой и назначьте её группе: студенты увидят её и смогут сдать работу." /> : (
              <div className="tq-card">
                {topics.map(t => (
                  <button key={t.id} className="tq-item mg-topic" onClick={() => setTopicId(t.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="tq-item-title mg-title">{t.title}</div>
                      <div className="tq-item-sub">{t.group}{t.subject ? ` · ${t.subject}` : ""}{t.due ? ` · до ${mgDate(t.due)}` : ""}</div>
                      <div className="mg-chips">
                        {t.waiting > 0 && <span className="tq-pill now">На проверке {t.waiting}</span>}
                        {t.revision > 0 && <span className="tq-pill warn">На доработке {t.revision}</span>}
                        <span className="tq-pill ok">Принято {t.accepted} из {t.total}</span>
                      </div>
                    </div>
                    <Icon name="chevron-right" size={18} style={{ color: "var(--sub)", opacity: .6, flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {creating && <NewCourseworkSheet onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function NewCourseworkSheet({ onClose, onCreated }) {
  const { data: teaching } = useApi("/me/teaching", true);
  const groups = teaching ? teaching.groups : [];
  const [group, setGroup] = useState(null);
  const [subject, setSubject] = useState(null);
  const [title, setTitle] = useState("");
  const [descr, setDescr] = useState("");
  const [choices, setChoices] = useState(() => Array(28).fill(""));   // 28 empty lines to start with, more by "+"
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const g = group || (groups[0] && groups[0].code);
  const subjects = (groups.find(x => x.code === g) || { subjects: [] }).subjects;
  const save = async () => {
    setBusy(true); setErr("");
    const r = await apiAuthed("/me/coursework", { method: "POST", body: { group: g, subject: subject && subjects.includes(subject) ? subject : undefined, title, descr, due: due || undefined, choices: choices.map(c => c.trim()).filter(Boolean) } });
    setBusy(false);
    if (r.status === 201) { tqTap(); onCreated(); } else setErr((r.data && r.data.error) || "Не удалось создать тему");
  };
  return mgSheet("Новая тема", "Курсовая для группы", onClose, !teaching ? <TQSkeleton rows={3} avatar={false} /> : groups.length === 0 ? (
    <TQEmpty kind="calendar" title="Нет групп" text="Сначала укажите свои группы и предметы."><button className="tq-btn" onClick={onClose}>Понятно</button></TQEmpty>
  ) : <>
    <div className="tq-sec">Группа</div>
    <TQChips label="Группа" items={groups.map(x => x.code)} value={g} onPick={c => { setGroup(c); setSubject(null); }} />
    {subjects.length > 0 && <><div className="tq-sec">Предмет, оценка попадёт в журнал</div>
      <TQChips label="Предмет" items={subjects} value={subject} onPick={s => setSubject(subject === s ? null : s)} /></>}
    <div className="tq-sec">Тема</div>
    <input className="tq-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Название темы" maxLength={200} />
    <textarea className="tq-field mg-area" value={descr} onChange={e => setDescr(e.target.value)} placeholder="Описание и требования (необязательно)" rows={3} maxLength={2000} />
    <div className="tq-sec">Темы для выбора (необязательно)</div>
    <div className="mg-choices">
      {choices.map((c, i) => (
        <div key={i} className="mg-opt">
          <input className="tq-field" value={c} onChange={e => setChoices(a => a.map((x, k) => k === i ? e.target.value : x))} placeholder={`Тема ${i + 1}`} maxLength={300} />
          <button className="tp-remove" aria-label="Убрать тему" onClick={() => setChoices(a => a.filter((_, k) => k !== i))}><Icon name="x" size={16} /></button>
        </div>
      ))}
      <button className="mg-link" disabled={choices.length >= 60} onClick={() => setChoices(a => [...a, ""])}>+ Добавить тему</button>
      {choices.some(c => c.trim()) && <div className="tq-note" style={{ textAlign: "left" }}>Студенты группы сами выберут одну из свободных тем. Каждая тема достаётся одному студенту.</div>}
    </div>
    <div className="tq-sec">Срок сдачи</div>
    <input className="tq-field" type="date" value={due} onChange={e => setDue(e.target.value)} />
    <div className="tq-foot">
      {err && <div role="alert" className="tq-note" style={{ color: "var(--bad)" }}>{err}</div>}
      <button className="tq-btn" disabled={busy || !title.trim()} onClick={save}>{busy ? "Создаём…" : "Создать и отправить группе"}</button>
    </div>
  </>);
}

// The topic's tasks as a drop-down: each shows whether it is free or whose it is; the holder's work opens from here.
function TopicChoices({ data, onOpenWork }) {
  const [sel, setSel] = useState(data.choices[0].id);
  const c = data.choices.find(x => x.id === sel) || data.choices[0];
  const holder = c.taken ? data.students.find(s => s.name === c.taken && s.work && s.work.status !== "booked") : null;
  const [label, tone] = MG_STATUS(holder && holder.work);
  const taken = data.choices.filter(x => x.taken).length;
  return <>
    <div className="tq-sec">Темы для выбора · заняты {taken} из {data.choices.length}</div>
    <div className="tq-card mg-pick">
      <select className="tq-field mg-select" value={c.id} onChange={e => setSel(Number(e.target.value))} aria-label="Тема">
        {data.choices.map(x => <option key={x.id} value={x.id}>{x.title}{x.taken ? ` — ${x.taken}` : " — свободна"}</option>)}
      </select>
      <div className="mg-pick-info">
        <div className="tq-item-sub">{c.taken ? "Занята" : "Свободна"}</div>
        <div className="mg-title">{c.taken || "Никем не выбрана"}</div>
        {holder && <div className="mg-chips"><span className={`tq-pill ${tone}`}>{label}</span></div>}
      </div>
      {holder && <button className="tq-btn mg-secondary" onClick={() => onOpenWork(holder)}>Открыть работу</button>}
    </div>
  </>;
}

function CourseworkTopic({ topic, onDeleted }) {
  const { data, error, load } = useApi(`/me/coursework/${topic.id}`, true);
  const [work, setWork] = useState(null);   // the student whose work is open in the sheet
  const remove = async () => {
    if (!window.confirm("Удалить тему вместе со всеми сданными работами? Это нельзя отменить.")) return;
    const r = await apiAuthed(`/me/coursework/${topic.id}`, { method: "DELETE" });
    if (r.status === 204) onDeleted();
  };
  if (error) return <TQEmpty kind="calendar" title="Не удалось загрузить" text="Попробуйте ещё раз."><button className="tq-btn" onClick={load}>Повторить</button></TQEmpty>;
  if (!data) return <TQSkeleton rows={4} avatar={false} />;
  return <>
    <div className="tq-card mg-head">
      <div className="mg-head-title">{data.title}</div>
      <div className="tq-item-sub">{data.group}{data.due ? ` · срок ${mgDate(data.due)}` : ""}</div>
      {data.descr && <div className="mg-descr">{data.descr}</div>}
    </div>
    {data.choices && data.choices.length > 0 && <TopicChoices data={data} onOpenWork={s => setWork(s)} />}
    <div className="tq-sec">Студенты</div>
    <div className="tq-card">
      {data.students.map((s, i) => {
        const [label, tone] = MG_STATUS(s.work);
        return (
          <button key={i} className="tq-item" disabled={!s.work} style={{ cursor: s.work ? "pointer" : "default" }} onClick={() => s.work && setWork(s)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="tq-item-title mg-title">{s.name}</div>
              {s.work && <div className="tq-item-sub">{s.work.file}</div>}
              {!s.hasAccount && <div className="tq-item-sub">нет аккаунта в приложении</div>}
            </div>
            <span className={`tq-pill ${tone}`}>{label}</span>
          </button>
        );
      })}
    </div>
    <button className="mg-danger" onClick={remove}>Удалить тему</button>
    {work && <WorkSheet student={work} onClose={() => setWork(null)} onSaved={() => { setWork(null); load(); }} />}
  </>;
}

function WorkSheet({ student, onClose, onSaved }) {
  const w = student.work;
  const [comment, setComment] = useState(w.comment || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const decide = async (status, grade) => {
    setBusy(true); setErr("");
    const r = await apiAuthed(`/me/coursework/works/${w.id}`, { method: "PUT", body: { status, grade, comment } });
    setBusy(false);
    if (r.status === 200) { tqTap(); onSaved(); } else setErr((r.data && r.data.error) || "Не удалось сохранить");
  };
  const [label, tone] = MG_STATUS(w);
  return mgSheet(student.name, `Сдано ${new Date(w.at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`, onClose, <>
    <div className="tq-card"><button className="tq-item" disabled={!w.stored} onClick={async () => { if (!(await openFileLink(`/coursework/works/${w.id}/link`))) setErr("Не удалось открыть файл"); }}>
      <div className="tp-file-ico" style={{ color: "var(--link)" }}><Icon name="file-text" size={19} /></div>
      <div style={{ flex: 1, minWidth: 0 }}><div className="tq-item-title mg-title">{w.file}</div><div className="tq-item-sub">{w.bytes ? fileSize(w.bytes) : "Открыть файл"}</div></div>
      <span className={`tq-pill ${tone}`}>{label}</span>
    </button></div>
    <div className="tq-sec">Комментарий студенту</div>
    <textarea className="tq-field mg-area" value={comment} onChange={e => setComment(e.target.value)} placeholder="Необязательно" rows={3} maxLength={1000} />
    <div className="tq-sec">Оценка</div>
    <div className="mg-grades">
      {[5, 4, 3, 2].map(g => <button key={g} className={`mg-grade g${g}`} disabled={busy} onClick={() => decide("accepted", g)}>{g}</button>)}
    </div>
    <div className="tq-foot">
      {err && <div role="alert" className="tq-note" style={{ color: "var(--bad)" }}>{err}</div>}
      <button className="tq-btn mg-secondary" disabled={busy} onClick={() => decide("revision")}>Вернуть на доработку</button>
    </div>
  </>);
}

// ── ДПО ──────────────────────────────────────────────────────────────────────────────────────────────────
function TeacherDpo({ open, onClose }) {
  const { data: programs, error, load } = useApi("/me/dpo", open);
  const [progId, setProgId] = useState(null);
  useEffect(() => { if (!open) setProgId(null); }, [open]);
  const prog = programs && programs.find(p => p.id === progId);
  const lead = async (p, on) => { tqTap(); const r = await apiAuthed(`/me/dpo/${p.id}/lead`, { method: "PUT", body: { on } }); if (r.status === 200) load(); };
  return (
    <div className={`inner-screen lk-inner tq-screen${open ? " open" : ""}`}>
      <TopBar plain onBack={prog ? () => { setProgId(null); load(); } : onClose} title="Назад" tag={prog ? "Программа ДПО" : "ДПО"} />
      <div className="inner-body mg-body">
        {prog ? <DpoProgram key={prog.id} prog={prog} /> : (
          programs === null && !error ? <TQSkeleton rows={4} avatar={false} /> :
          error ? <TQEmpty kind="calendar" title="Не удалось загрузить" text="Проверьте связь и попробуйте ещё раз."><button className="tq-btn" onClick={load}>Повторить</button></TQEmpty> : <>
            <div className="tq-note" style={{ textAlign: "left", padding: "0 4px" }}>Отметьте программы, которые вы ведёте: для них откроются записавшиеся, материалы и тесты.</div>
            <div className="tq-card">
              {programs.map(p => (
                <div key={p.id} className="tq-item mg-prog">
                  <button className="mg-prog-main" disabled={!p.led} onClick={() => setProgId(p.id)}>
                    <div className="tq-item-title mg-title">{p.title}</div>
                    <div className="tq-item-sub">{p.led ? `Записались ${p.signed} · материалы ${p.materials} · тесты ${p.tests}` : p.category}</div>
                  </button>
                  <button className={`mg-lead${p.led ? " on" : ""}`} onClick={() => lead(p, !p.led)} aria-pressed={p.led}>{p.led ? "Веду" : "Вести"}</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DpoProgram({ prog }) {
  const { data, error, load } = useApi(`/me/dpo/${prog.id}`, true);
  const [tab, setTab] = useState("reg");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [openTest, setOpenTest] = useState(null);
  const fileInput = useRef(null);
  const attach = async ev => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { setErr("Файл больше 25 МБ"); return; }
    setBusy(true); setErr("");
    const r = await apiAuthed(`/me/dpo/${prog.id}/materials`, { method: "POST", body: { name: f.name, type: fileKind(f.name), size: fileSize(f.size) } });
    if (r.status !== 201) { setBusy(false); setErr((r.data && r.data.error) || "Не удалось добавить файл"); return; }
    const up = await apiUploadFile(`/me/dpo/materials/${r.data.id}/file`, f);
    if (up.status !== 200) { await apiAuthed(`/me/dpo/materials/${r.data.id}`, { method: "DELETE" }); setBusy(false); setErr(up.status === 0 ? "Нет связи с сервером" : "Не удалось загрузить файл"); return; }
    setBusy(false); tqTap(); load();
  };
  const delMaterial = async m => { if (window.confirm(`Удалить «${m.name}»?`)) { const r = await apiAuthed(`/me/dpo/materials/${m.id}`, { method: "DELETE" }); if (r.status === 204) load(); } };
  const delTest = async t => { if (window.confirm(`Удалить тест «${t.title}» вместе с результатами?`)) { const r = await apiAuthed(`/me/dpo/tests/${t.id}`, { method: "DELETE" }); if (r.status === 204) load(); } };
  if (error) return <TQEmpty kind="calendar" title="Не удалось загрузить" text="Попробуйте ещё раз."><button className="tq-btn" onClick={load}>Повторить</button></TQEmpty>;
  if (!data) return <TQSkeleton rows={4} avatar={false} />;
  return <>
    <div className="tq-card mg-head"><div className="mg-head-title">{data.title}</div><div className="tq-item-sub">{data.category} · {data.hours_count} ч</div></div>
    <div className="tq-seg" role="tablist" aria-label="Раздел программы">
      {[["reg", `Записались ${data.registrations.length}`], ["mat", `Материалы ${data.materials.length}`], ["test", `Тесты ${data.tests.length}`]].map(([k, label]) => (
        <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "active" : ""} onClick={() => { tqTap(); setTab(k); }}>{label}</button>
      ))}
    </div>
    {tab === "reg" && (data.registrations.length === 0
      ? <TQEmpty kind="calendar" title="Пока никто не записался" text="Студенты записываются на программу в разделе «Факультативы»." />
      : <div className="tq-card">{data.registrations.map((r, i) => (
        <div key={i} className="tq-item" style={{ cursor: "default" }}><div style={{ flex: 1, minWidth: 0 }}><div className="tq-item-title mg-title">{r.name}</div><div className="tq-item-sub">{r.group || "без группы"} · {new Date(r.at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</div></div></div>))}</div>)}
    {tab === "mat" && <>
      {data.materials.length === 0 ? <div className="tq-card"><div className="tq-item tp-empty"><Icon name="paperclip" size={18} />Материалов пока нет</div></div> : (
        <div className="tq-card">{data.materials.map(m => (
          <div key={m.id} className="tq-item tp-file">
            <button className="tp-file-open" disabled={!m.stored} onClick={async () => { if (!(await openFileLink(`/dpo-materials/${m.id}/link`))) setErr("Не удалось открыть файл"); }}>
              <div className="tp-file-ico" style={{ color: MOCK_MATERIAL_COLOR[m.type] || MOCK_MATERIAL_COLOR.other }}><Icon name={MOCK_MATERIAL_ICON[m.type] || "file"} size={19} /></div>
              <div style={{ flex: 1, minWidth: 0 }}><div className="tq-item-title tp-file-name">{m.name}</div><div className="tq-item-sub">{m.date} · {m.size}{m.stored ? "" : " · файл не загружен"}</div></div>
            </button>
            <button className="tp-remove" aria-label={`Удалить ${m.name}`} onClick={() => delMaterial(m)}><Icon name="x" size={16} /></button>
          </div>))}</div>)}
      <input ref={fileInput} type="file" style={{ display: "none" }} onChange={attach} />
      {err && <div role="alert" className="tq-note" style={{ color: "var(--bad)" }}>{err}</div>}
      <button className="tq-btn" disabled={busy} onClick={() => fileInput.current && fileInput.current.click()}><Icon name="paperclip" size={18} />{busy ? "Добавляем…" : "Добавить файл"}</button>
    </>}
    {tab === "test" && <>
      {data.tests.length === 0 ? <div className="tq-card"><div className="tq-item tp-empty"><Icon name="clipboard-list" size={18} />Тестов пока нет</div></div> : (
        <div className="tq-card">{data.tests.map(t => (
          <div key={t.id}>
            <div className="tq-item">
              <button className="tp-file-open" onClick={() => setOpenTest(openTest === t.id ? null : t.id)}>
                <div className="tp-file-ico" style={{ color: "var(--link)" }}><Icon name="clipboard-list" size={19} /></div>
                <div style={{ flex: 1, minWidth: 0 }}><div className="tq-item-title mg-title">{t.title}</div><div className="tq-item-sub">{t.questions.length} вопр. · прошли {t.results.length}</div></div>
              </button>
              <button className="tp-remove" aria-label={`Удалить ${t.title}`} onClick={() => delTest(t)}><Icon name="x" size={16} /></button>
            </div>
            {openTest === t.id && <div className="mg-results">{t.results.length === 0 ? <div className="tq-item-sub">Пока никто не прошёл</div> : t.results.map((r, i) => (
              <div key={i} className="mg-result"><span>{r.name}{r.group ? `, ${r.group}` : ""}</span><b>{r.score}</b></div>))}</div>}
          </div>))}</div>)}
      <button className="tq-btn" onClick={() => setCreating(true)}><Icon name="plus" size={18} />Новый тест</button>
    </>}
    {creating && <NewTestSheet progId={prog.id} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
  </>;
}

function NewTestSheet({ progId, onClose, onCreated }) {
  const blank = () => ({ q: "", options: ["", ""], correct: 0 });
  const [title, setTitle] = useState("");
  const [qs, setQs] = useState([blank()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (i, patch) => setQs(a => a.map((q, k) => k === i ? { ...q, ...patch } : q));
  const setOpt = (i, j, v) => set(i, { options: qs[i].options.map((o, k) => k === j ? v : o) });
  const valid = title.trim() && qs.every(q => q.q.trim() && q.options.length >= 2 && q.options.every(o => o.trim()));
  const save = async () => {
    setBusy(true); setErr("");
    const r = await apiAuthed(`/me/dpo/${progId}/tests`, { method: "POST", body: { title, questions: qs } });
    setBusy(false);
    if (r.status === 201) { tqTap(); onCreated(); } else setErr((r.data && r.data.error) || "Не удалось создать тест");
  };
  return mgSheet("Новый тест", "Отметьте правильный ответ", onClose, <>
    <input className="tq-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Название теста" maxLength={200} />
    {qs.map((q, i) => (
      <div key={i} className="mg-q">
        <div className="mg-q-head"><b>Вопрос {i + 1}</b>{qs.length > 1 && <button className="tp-remove" aria-label="Убрать вопрос" onClick={() => setQs(a => a.filter((_, k) => k !== i))}><Icon name="x" size={16} /></button>}</div>
        <input className="tq-field" value={q.q} onChange={e => set(i, { q: e.target.value })} placeholder="Текст вопроса" maxLength={500} />
        {q.options.map((o, j) => (
          <div key={j} className="mg-opt">
            <button className={`mg-radio${q.correct === j ? " on" : ""}`} role="radio" aria-checked={q.correct === j} aria-label="Правильный ответ" onClick={() => set(i, { correct: j })}>{q.correct === j && <Icon name="check" size={14} strokeWidth={3} />}</button>
            <input className="tq-field" value={o} onChange={e => setOpt(i, j, e.target.value)} placeholder={`Вариант ${j + 1}`} maxLength={300} />
            {q.options.length > 2 && <button className="tp-remove" aria-label="Убрать вариант" onClick={() => set(i, { options: q.options.filter((_, k) => k !== j), correct: q.correct === j ? 0 : q.correct > j ? q.correct - 1 : q.correct })}><Icon name="x" size={16} /></button>}
          </div>
        ))}
        {q.options.length < 6 && <button className="mg-link" onClick={() => set(i, { options: [...q.options, ""] })}>+ Вариант</button>}
      </div>
    ))}
    <button className="mg-link" onClick={() => setQs(a => [...a, blank()])}>+ Ещё вопрос</button>
    <div className="tq-foot">
      {err && <div role="alert" className="tq-note" style={{ color: "var(--bad)" }}>{err}</div>}
      <button className="tq-btn" disabled={busy || !valid} onClick={save}>{busy ? "Сохраняем…" : "Создать тест"}</button>
    </div>
  </>);
}
