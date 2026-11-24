// TeacherPairSheet — opens from the "next pair" widget on the teacher's dashboard: a live countdown for the pair,
// today's lunch choice (1st–2nd buildings), and the materials attached to this very pair.
const fileKind = name => {
  const ext = (name.split(".").pop() || "").toLowerCase();
  return ext === "pdf" ? "pdf" : ["doc", "docx"].includes(ext) ? "doc" : ["xls", "xlsx", "csv"].includes(ext) ? "xls" : "other";
};
const fileSize = n => n >= 1048576 ? (n / 1048576).toFixed(1) + " МБ" : Math.max(1, Math.round(n / 1024)) + " КБ";
const clock = sec => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60, p = n => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
};

function TeacherPairSheet({ lessons, split, choice, hint, onLunch, materials, reloadMaterials, onJournal, onClose }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileInput = useRef(null);

  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const nowMin = Math.floor(nowSec / 60);
  const segs = lunchSegments(lessons, split);
  const lesson = getNextLesson(segs, true);
  const has = Array.isArray(lesson.start) && Array.isArray(lesson.end);
  const prog = has ? pairProgress(lesson, segs, nowSec) : null;
  const state = prog ? prog.state : "wait";
  // Before the pair, lunch of the building may be running (12:20–13:25 before the 3rd pair, say).
  const [bls, ble] = has ? lunchWindow(lesson.corpus, split) : [0, 0];
  const lunchBefore = state === "wait" && nowMin >= bls && nowMin < ble && prog.start / 60 >= ble;
  // Lunch running before the next pair: the timer runs to the real end of lunch; after it, to the pair itself.
  const left = lunchBefore ? Math.max(0, ble * 60 - nowSec) : prog ? Math.max(0, prog.left) : 0;
  const caption = state === "live" ? (lesson.part === 1 ? "До обеда" : "До конца пары")
    : state === "lunch" ? "Обед · до продолжения пары" : lunchBefore ? "Обед · до конца обеда" : "До начала пары";
  const pct = prog ? Math.round(prog.frac * 100) : 0;
  // A plain progress bar over the whole pair: each teaching part fills in turn; a lunch break between parts is a thin
  // amber line that fills while lunch runs.
  const span = prog ? prog.end - prog.start : 1;
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const track = prog ? prog.parts.flatMap((p, i) => {
    const seg = { kind: "part", grow: p.e - p.s, fill: clamp01((nowSec - p.s) / (p.e - p.s)) };
    const nx = prog.parts[i + 1];
    return nx ? [seg, { kind: "gap", grow: nx.s - p.e, fill: clamp01((nowSec - p.e) / (nx.s - p.e)) }] : [seg];
  }) : [];
  const at = t => `${((t - prog.start) / span) * 100}%`;
  const hhmm = t => `${Math.floor(t / 3600)}:${String(Math.floor(t / 60) % 60).padStart(2, "0")}`;
  const gap = prog && prog.parts.length > 1 ? { s: prog.parts[0].e, e: prog.parts[1].s } : null;
  const p2 = lunchPair(lessons);
  // Shown until lunch is over, and always once a choice is made, so it can be switched back.
  const showLunch = !!p2 && (!!choice || nowMin < 13 * 60 + 25);
  const day = isoDate(now);
  const mine = has ? (materials || []).filter(m => m.group === lesson.group && m.period === lesson.period) : [];

  const attach = async ev => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!f || !has) return;
    if (f.size > 25 * 1024 * 1024) { setErr("Файл больше 25 МБ"); return; }
    setBusy(true); setErr("");
    // First the record, then the file itself; if the file does not arrive, the record is removed again.
    const r = await apiAuthed("/me/lesson-materials", { method: "POST", body: { day, group: lesson.group, period: lesson.period, name: f.name, type: fileKind(f.name), size: fileSize(f.size) } });
    if (r.status !== 201) { setBusy(false); setErr((r.data && r.data.error) || "Не удалось прикрепить файл"); return; }
    const up = await apiUploadFile(`/me/lesson-materials/${r.data.id}/file`, f);
    if (up.status !== 200) {
      await apiAuthed(`/me/lesson-materials/${r.data.id}`, { method: "DELETE" });
      setBusy(false); setErr(up.status === 413 ? "Файл больше 25 МБ" : up.status === 0 ? "Нет связи с сервером" : "Не удалось загрузить файл");
      return;
    }
    setBusy(false); tqTap(); reloadMaterials();
  };
  const open = async m => { if (!(await openLessonFile(m.id))) setErr("Не удалось открыть файл"); };
  const remove = async m => {
    const r = await apiAuthed(`/me/lesson-materials/${m.id}`, { method: "DELETE" });
    if (r.status === 204) reloadMaterials(); else setErr("Не удалось удалить файл");
  };

  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open tq-sheet tp-sheet">
        <div className="lk-handle" />
        <TQSheetHead title={has ? `${lesson.period} пара` : lesson.subj} sub={has ? [lesson.subject, lesson.room && `ауд. ${lesson.room}`].filter(Boolean).join(" · ") : ""} onClose={onClose} />
        <div className="tq-sh-body">
          {has && (
            <div className={`tq-card tp-timer ${state}${lunchBefore ? " lunch" : ""}`} role="timer" aria-label={`${caption}: ${clock(left)}`}>
              <div className="tp-t-cap">
                <span>{caption}</span>
                <span className="tp-t-side">{lunchBefore ? `в ${hhmm(ble * 60)}` : state === "wait" ? `в ${hhmm(prog.start)}` : `${pct}%`}</span>
              </div>
              <div className="tp-t-clock">{clock(left)}</div>
              <div className="tp-track" aria-hidden="true">
                {track.map((s, i) => (
                  <div key={i} className={s.kind === "part" ? "tp-part" : "tp-gap"} style={{ flexGrow: s.grow }}><b style={{ transform: `scaleX(${s.fill})` }} /></div>
                ))}
              </div>
              <div className="tp-scale" aria-hidden="true">
                <span style={{ left: 0 }}>{hhmm(prog.start)}</span>
                {gap && <span className="gap" style={{ left: at((gap.s + gap.e) / 2) }}>обед</span>}
                <span style={{ right: 0 }}>{hhmm(prog.end)}</span>
              </div>
            </div>
          )}

          {showLunch && (<>
            <div className="tq-sec">Обед сегодня</div>
            <div className="tp-lunch" role="radiogroup" aria-label="Обед сегодня">
              {[["split", "С разрывом", "11:30 – 12:20"], ["after", "После пары", "12:20 – 13:25"]].map(([v, t, time]) => (
                <button key={v} type="button" role="radio" aria-checked={choice === v}
                  className={`tp-lunch-opt${choice === v ? " on" : ""}${!choice && hint === v ? " hint" : ""}`} onClick={() => onLunch(v)}>
                  <b>{t}</b><span>{time}</span>
                </button>
              ))}
            </div>
          </>)}

          {has && lesson.group && (<>
            <div className="tq-sec">Материалы к паре{mine.length > 0 && <span className="tp-count">{mine.length}</span>}</div>
            <div className="tq-card">
              {mine.length === 0 ? (
                <div className="tq-item tp-empty"><Icon name="paperclip" size={18} />Ничего не прикреплено</div>
              ) : mine.map(m => (
                <div key={m.id} className="tq-item tp-file">
                  <button type="button" className="tp-file-open" onClick={() => open(m)} disabled={!m.stored} aria-label={`Открыть ${m.name}`}>
                    <div className="tp-file-ico" style={{ color: MOCK_MATERIAL_COLOR[m.type] || MOCK_MATERIAL_COLOR.other }}>
                      <Icon name={MOCK_MATERIAL_ICON[m.type] || "file"} size={19} />
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="tq-item-title tp-file-name">{m.name}</div>
                      <div className="tq-item-sub">{m.stored ? (m.bytes ? fileSize(m.bytes) : m.size) : "Файл не загружен"}</div>
                    </div>
                  </button>
                  <button type="button" className="tp-remove" aria-label={`Убрать ${m.name}`} onClick={() => remove(m)}><Icon name="x" size={16} /></button>
                </div>
              ))}
            </div>
            {err && <div role="alert" className="tq-note" style={{color:"var(--bad)"}}>{err}</div>}
            <input ref={fileInput} type="file" style={{display:"none"}} onChange={attach} />
            <div className="tp-actions">
              <button type="button" className="tq-btn tp-attach" disabled={busy} onClick={() => fileInput.current && fileInput.current.click()}>
                <Icon name="paperclip" size={18} />{busy ? "Прикрепляем…" : "Прикрепить файл"}
              </button>
              <button type="button" className="tq-btn" onClick={() => onJournal(lesson)}><Icon name="clipboard-list" size={18} />Журнал пары</button>
            </div>
          </>)}
        </div>
      </div>
    </>
  );
}
