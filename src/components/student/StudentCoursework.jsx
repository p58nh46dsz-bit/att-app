// LKCoursework — "Курсовая" in the student's personal account. A topic may offer tasks to choose from: the student
// takes a free one (the others see it as taken), hands in the file, and sees the teacher's decision.
function LKCoursework({ open, onClose }) {
  const { data: topics, error, load } = useApi("/me/coursework-student", open);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState({});
  const pick = useRef(null);
  const target = useRef(null);
  const setE = (id, msg) => setErr(e => ({ ...e, [id]: msg }));
  const choose = t => { target.current = t; if (pick.current) pick.current.click(); };
  const send = async ev => {
    const f = ev.target.files && ev.target.files[0];
    const t = target.current;
    ev.target.value = "";
    if (!f || !t) return;
    if (f.size > 25 * 1024 * 1024) { setE(t.id, "Файл больше 25 МБ"); return; }
    setBusy(t.id); setE(t.id, "");
    const r = await apiUploadFile(`/me/coursework/${t.id}/work`, f, { "x-file-name": encodeURIComponent(f.name) });
    setBusy(null);
    if (r.status === 200) { tqTap(); load(); }
    else setE(t.id, r.status === 0 ? "Нет связи с сервером" : (r.data && r.data.error) || "Не удалось отправить файл");
  };
  const book = async (t, cid) => {
    setBusy(t.id); setE(t.id, "");
    const r = await apiAuthed(`/me/coursework/${t.id}/choice`, { method: "PUT", body: { choice: cid } });
    setBusy(null);
    if (r.status === 200) { tqTap(); load(); }
    else setE(t.id, r.status === 0 ? "Нет связи с сервером" : (r.data && r.data.error) || "Не удалось выбрать тему");
  };
  const status = w => {
    if (!w) return ["Не сдано", ""];
    if (w.status === "accepted") return [`Принято · ${w.grade}`, "ok"];
    if (w.status === "revision") return ["На доработке", "warn"];
    if (w.status === "submitted") return ["На проверке", "now"];
    return ["Тема выбрана", ""];   // booked, nothing handed in yet
  };
  return (
    <div className={`inner-screen lk-inner${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag="Курсовая" />
      <div className="inner-body mg-body">
        <input ref={pick} type="file" style={{ display: "none" }} onChange={send} />
        {topics === null && !error ? <TQSkeleton rows={3} avatar={false} /> :
          error ? <TQEmpty kind="calendar" title="Не удалось загрузить" text="Проверьте связь и попробуйте ещё раз."><button className="tq-btn" onClick={load}>Повторить</button></TQEmpty> :
          topics.length === 0 ? <TQEmpty kind="calendar" title="Тем пока нет" text="Когда преподаватель назначит курсовую вашей группе, она появится здесь." /> :
          topics.map(t => {
            const [label, tone] = status(t.work);
            const locked = !!t.work && t.work.status === "accepted";
            const hasFile = !!t.work && !!t.work.stored;
            const hasTasks = t.choices.length > 0;
            const booked = !!t.work && t.work.status === "booked" || (!!t.work && !!t.work.choice);
            const frozen = locked || hasFile;   // a task cannot be changed once the file is in
            return (
              <div key={t.id} className="tq-card mg-stud">
                <div className="mg-stud-top">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mg-head-title">{t.title}</div>
                    <div className="tq-item-sub">{t.teacher}{t.subject ? ` · ${t.subject}` : ""}{t.due ? ` · до ${t.due.split("-").reverse().slice(0, 2).join(".")}` : ""}</div>
                  </div>
                  <span className={`tq-pill ${tone}`}>{label}</span>
                </div>
                {t.descr && <div className="mg-descr">{t.descr}</div>}
                {hasTasks && <>
                  <div className="tq-sec" style={{ padding: "4px 0 0" }}>Выберите тему</div>
                  <div className="mg-choices">
                    {t.choices.map(c => (
                      <button key={c.id} className={`mg-choice${c.mine ? " mine" : ""}`}
                        disabled={busy === t.id || frozen || (c.taken && !c.mine)}
                        onClick={() => book(t, c.mine ? null : c.id)}>
                        <span className="mg-choice-title">{c.title}</span>
                        <span className={`tq-pill ${c.mine ? "ok" : c.taken ? "" : "now"}`}>{c.mine ? "Ваша" : c.taken ? "Занята" : "Свободна"}</span>
                      </button>
                    ))}
                  </div>
                  {booked && !frozen && <div className="tq-note" style={{ textAlign: "left" }}>Нажмите на свою тему, чтобы отказаться от неё.</div>}
                </>}
                {hasFile && <div className="mg-file"><Icon name="file-text" size={16} />{t.work.file}</div>}
                {t.work && t.work.comment && <div className={`mg-comment${t.work.status === "revision" ? " warn" : ""}`}>{t.work.comment}</div>}
                {err[t.id] && <div role="alert" className="tq-note" style={{ color: "var(--bad)", textAlign: "left" }}>{err[t.id]}</div>}
                {!locked && <button className="tq-btn mg-send" disabled={busy === t.id || (hasTasks && !booked)} onClick={() => choose(t)}>
                  <Icon name="paperclip" size={18} />{busy === t.id ? "Отправляем…" : hasTasks && !booked ? "Сначала выберите тему" : hasFile ? "Заменить файл" : "Сдать работу"}
                </button>}
              </div>
            );
          })}
      </div>
    </div>
  );
}
