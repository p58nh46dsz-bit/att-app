// TeacherGradeModal — "Выставить оценки": a grade sheet for one group, subject, kind of work and day.
// The marks are kept in the database. Opening the same sheet again shows what was saved, and saving it again
// updates those marks (a mark can also be cleared by tapping it once more).
function TeacherGradeModal({ open, onClose, user, onOpenTeaching }) {
  const groups = user && user.groups ? user.groups : [];
  const [pickedGroup, setGroup] = useState(null);
  const group = pickedGroup || groups[0] || "";
  const { data: info } = useApi(group ? "/groups/" + encodeURIComponent(group) : null, open && !!group);
  const roster = info ? info.roster : [];   // [{ id, name, topic }]
  // The subjects are the ones this teacher teaches to the chosen group (set in "Мои группы и предметы").
  const { data: teaching } = useApi("/me/teaching", open);
  const subjects = (teaching && teaching.groups.find(g => g.code === group) || { subjects: [] }).subjects;
  const [pickedSubject, setSubject] = useState(null);
  const subject = subjects.includes(pickedSubject) ? pickedSubject : (subjects[0] || null);
  const [kind, setKind] = useState("Контрольная работа");
  const [customKind, setCustomKind] = useState(false);
  const [tab, setTab] = useState("sheet");   // "sheet" | "summary"
  const sumPath = open && group && subject && tab === "summary" ? `/me/grade-summary?group=${encodeURIComponent(group)}&subject=${encodeURIComponent(subject)}` : null;
  const { data: sum, error: sumError } = useApi(sumPath, !!sumPath);
  const [date, setDate] = useState(() => isoDate(new Date()));
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);   // answer of the last save
  const [marks, setMarks] = useState({});       // place id -> 5 | 4 | 3 | 2 | "н"
  const [loadState, setLoadState] = useState("idle"); // idle | loading | ok | error
  const vals = [5,4,3,2,"н"];
  const colMap = {5:"#4CAF6B",4:"var(--link)",3:"#F5A623",2:"#E84C4C","н":"#E84C4C"};
  const clsMap = {5:"g5",4:"g4",3:"g3",2:"g2","н":"gn"};
  // load what is already saved for this sheet whenever the sheet changes
  useEffect(() => {
    if (!open || !group || !subject || !date) { setMarks({}); setLoadState("idle"); return; }
    let live = true;
    setLoadState("loading"); setSaveError("");
    apiAuthed(`/me/grade-sheet?group=${encodeURIComponent(group)}&subject=${encodeURIComponent(subject)}&kind=${encodeURIComponent(kind.trim())}&date=${date}`).then(r => {
      if (!live) return;
      if (r.status === 200) { setMarks(r.data.marks || {}); setLoadState("ok"); } else { setMarks({}); setLoadState("error"); }
    });
    return () => { live = false; };
  }, [open, group, subject, kind, date]);
  const setG = (id, v) => tqTap() || setMarks(m => { const n = { ...m }; if (n[id] === v) delete n[id]; else n[id] = v; return n; });
  const filled = roster.filter(r => marks[r.id] !== undefined).length;
  const reset = () => { setResult(null); setMarks({}); };
  const save = async () => {
    setSaving(true); setSaveError("");
    const entries = roster.map(r => ({ studentId: r.id, value: marks[r.id] === undefined ? null : marks[r.id] }));
    const r = await apiAuthed("/me/grade-sheet", { method: "PUT", body: { groupCode: group, subject, kind: kind.trim(), date, entries } });
    setSaving(false);
    if (r.status === 200) setResult(r.data);
    else setSaveError(r.status === 0 ? "Нет связи с сервером. Оценки не сохранены." : (r.data && r.data.error) || "Не удалось сохранить оценки. Попробуйте ещё раз.");
  };
  if (!open) return null;
  if (groups.length === 0) return <TeacherNoGroups title="Выставить оценки" onClose={onClose} onOpenTeaching={onOpenTeaching} />;
  const KINDS = ["Контрольная работа", "Самостоятельная работа", "Практическая работа", "Устный ответ", "Зачёт", "Экзамен"];
  const close = () => { reset(); setTab("sheet"); onClose(); };
  const dateLabel = date === isoDate(new Date()) ? "сегодня" : date.split("-").reverse().join(".");
  return (
    <>
      <div className="lk-overlay open" onClick={close} />
      <div className="lk-sheet open tq-sheet">
        <div className="lk-handle" />
        <TQSheetHead title="Оценки" sub={subject ? `${group} · ${subject}` : `${group} · выберите предмет`} onClose={close} />
        {result ? (
          <div className="tq-sh-body">
            <div className="tq-done">
              <SuccessCheck size={56} />
              <div style={{fontSize:"1.25rem",fontWeight:700}}>Оценки сохранены</div>
              <div style={{fontSize:"0.875rem",color:"var(--sub)",lineHeight:1.6}}>
                {group} · {subject} · {kind.trim()} · {dateLabel}<br/>
                Записано: {result.saved}{result.cleared ? ` · снято: ${result.cleared}` : ""}
                {result.accountsCreated ? <><br/>Новых учётных записей студентов: {result.accountsCreated}</> : null}
              </div>
            </div>
            <div className="tq-foot">
              <button className="tq-btn" onClick={close}>Готово</button>
              <button className="tq-btn ghost" onClick={()=>setResult(null)}>Вернуться к ведомости</button>
            </div>
          </div>
        ) : (
          <div className="tq-sh-body">
            <div className="tq-sec">Группа</div>
            <TQChips label="Группа" items={groups} value={group} onPick={g => { setGroup(g); setSubject(null); }} />
            <div className="tq-sec">Предмет</div>
            {subjects.length === 0 ? (
              <div className="tq-card"><div style={{padding:16,fontSize:"0.875rem",lineHeight:1.5}}>
                Для группы {group} не указаны предметы.
                <button className="tq-btn ghost" style={{marginTop:12,minHeight:44}} onClick={onOpenTeaching}>Указать предметы</button>
              </div></div>
            ) : <TQChips label="Предмет" items={subjects} value={subject} onPick={setSubject} />}
            {subject && <div className="tq-seg" role="tablist" aria-label="Раздел" style={{marginTop:6}}>
              {[["sheet","Ведомость"],["summary","Сводка"]].map(([k, label]) => (
                <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "active" : ""} onClick={() => { tqTap(); setTab(k); }}>{label}</button>
              ))}
            </div>}
            {subject && tab === "summary" && <GradeSummary sum={sum} error={sumError} />}
            {tab === "sheet" && <div className="tq-sec">Вид работы</div>}
            {tab === "sheet" && <TQChips label="Вид работы" items={[...KINDS, "Другое"]} value={customKind ? "Другое" : (KINDS.includes(kind) ? kind : "Другое")}
              onPick={k => { if (k === "Другое") { setCustomKind(true); setKind(""); } else { setCustomKind(false); setKind(k); } }} />}
            {tab === "sheet" && (customKind || !KINDS.includes(kind)) && <input aria-label="Вид работы" className="tq-field" maxLength={60} value={kind} onChange={e=>setKind(e.target.value)} placeholder="Например, Контрольная № 2" />}
            {tab === "sheet" && <div className="tq-sec">Дата</div>}
            {tab === "sheet" && <input aria-label="Дата" className="tq-field" type="date" value={date} max={isoDate(new Date())} onChange={e=>{ if (e.target.value) setDate(e.target.value); }} />}
            {subject && tab === "sheet" && <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 4px 2px"}}>
                <span style={{fontSize:"0.8125rem",fontWeight:600,color:"var(--sub)"}}>{loadState === "loading" ? "Загружаем ведомость…" : loadState === "error" ? "Ведомость не загрузилась" : "Студенты"}</span>
                <span style={{fontSize:"0.8125rem",color:"var(--sub)",fontVariantNumeric:"tabular-nums"}}>{filled} из {roster.length}</span>
              </div>
              {!info && <TQSkeleton rows={6} />}
              {roster.length === 0 && info && <TQEmpty kind="people" title="Студентов нет" text="В этой группе пока нет студентов." />}
              {roster.length > 0 && <div className="tq-card">
                {roster.map(r => {
                  const gv = marks[r.id];
                  return (
                    <div key={r.id} className="tq-grade-row">
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                        <div className="tq-ava" style={{width:30,height:30,fontSize:"0.6875rem"}}>{tqInitials(r.fullName || r.name)}</div>
                        <div style={{flex:1,minWidth:0,fontSize:"0.875rem",fontWeight:500}}>{r.fullName || r.name}</div>
                      </div>
                      <div className="tq-grades" role="group" aria-label={r.fullName || r.name}>
                        {vals.map(v => <button key={v} aria-pressed={gv === v} className={`tq-g${gv === v ? " on " + clsMap[v] : ""}`} onClick={()=>setG(r.id, v)}>{v}</button>)}
                      </div>
                    </div>
                  );
                })}
              </div>}
              <div className="tq-foot">
                {saveError && <div role="alert" className="tq-note" style={{color:"var(--bad)"}}>{saveError}</div>}
                <button className="tq-btn" disabled={!roster.length||loadState==="loading"||saving||!kind.trim()} onClick={save}>{saving ? "Сохраняем…" : filled ? `Сохранить · ${filled}` : "Сохранить"}</button>
              </div>
            </>}
            {!subject && <div style={{height:20,flexShrink:0}} />}
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════

// TEACHER GROUP MODAL

// "Сводка": a table of everything saved for the group and subject: a row per student, a column per piece of work.
function GradeSummary({ sum, error }) {
  if (error) return <div className="tq-note" style={{color:"var(--bad)"}}>Не удалось загрузить сводку.</div>;
  if (!sum) return <TQSkeleton rows={4} />;
  if (sum.columns.length === 0) return <TQEmpty kind="calendar" title="Оценок пока нет" text="Выставьте оценки на вкладке «Ведомость», и здесь появится таблица." />;
  const short = n => { const p = String(n).split(" "); return p[0] + (p[1] ? " " + p[1][0] + "." : ""); };
  const fmtDay = d => d.slice(8, 10) + "." + d.slice(5, 7);
  const avgTone = a => a === null ? "var(--sub)" : a >= 4.5 ? "var(--ok)" : a >= 3.5 ? "var(--link)" : a >= 3 ? "var(--warn)" : "var(--bad)";
  const all = sum.students.map(s => s.avg).filter(a => a !== null);
  const groupAvg = all.length ? Math.round(all.reduce((a, b) => a + b, 0) * 10 / all.length) / 10 : null;
  return <>
    <div className="tq-card tq-stats">
      <div><b>{sum.columns.length}</b><span>работ</span></div>
      <div><b style={{color:avgTone(groupAvg)}}>{groupAvg ?? "—"}</b><span>средний балл</span></div>
      <div><b style={{color:"var(--bad)"}}>{sum.students.filter(s => Object.values(s.marks).some(v => v === 2)).length}</b><span>с двойками</span></div>
    </div>
    <div className="tq-card tq-table-wrap">
      <table className="tq-table">
        <thead><tr>
          <th className="tq-sticky">Студент</th>
          {sum.columns.map(c => <th key={c.key}><div>{fmtDay(c.date)}</div><small>{c.kind || "Оценка"}</small></th>)}
          <th>Ср.</th>
        </tr></thead>
        <tbody>
          {sum.students.map(s => (
            <tr key={s.id}>
              <td className="tq-sticky">{short(s.name)}{s.absent > 0 && <small className="tq-miss">н × {s.absent}</small>}</td>
              {sum.columns.map(c => { const v = s.marks[c.key]; return <td key={c.key}>{v === undefined ? <span className="tq-nomark">·</span> : <span className={`tq-mark m${v}`}>{v}</span>}</td>; })}
              <td><b style={{color:avgTone(s.avg)}}>{s.avg ?? "—"}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={{height:20,flexShrink:0}} />
  </>;
}
