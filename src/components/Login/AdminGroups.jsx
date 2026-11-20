// AdminGroups — the list of groups of the college. The administrator adds new ones as the college sends them
// (one or several at once); teachers and accounts then choose from this list.
function AdminGroups({ onBack }) {
  const { data: groups, error, load } = useApi("/admin/groups", true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const add = async event => {
    event.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true); setProblem(""); setMessage("");
    const r = await apiAuthed("/admin/groups", { method: "POST", body: { codes: text } });
    setBusy(false);
    if (r.status === 201) {
      adminAuditChanged();
      const { added, existing } = r.data;
      setMessage([added.length ? `Добавлено: ${added.join(", ")}.` : "", existing.length ? `Уже были: ${existing.join(", ")}.` : ""].filter(Boolean).join(" "));
      setText(""); load();
    } else setProblem((r.data && r.data.error) || "Не удалось добавить. Проверьте подключение к серверу.");
  };
  const remove = async code => {
    setProblem(""); setMessage("");
    let r = await apiAuthed("/admin/groups/" + encodeURIComponent(code), { method: "DELETE" });
    if (r.status === 409 && r.data && r.data.needsConfirm) {
      const d = r.data;
      const lines = [`Группа ${code} не пустая:`, d.students ? `· студентов с аккаунтом: ${d.students} (аккаунты останутся, но без группы)` : "", d.marks ? `· оценок, которые будут удалены: ${d.marks}` : "",
        d.teachers ? `· преподавателей, у которых группа пропадёт вместе с предметами: ${d.teachers}` : "", d.days ? `· дней расписания, которые будут удалены: ${d.days}` : "", "", "Удалить группу? Это нельзя отменить."].filter(l => l !== "" || true);
      if (!window.confirm(lines.join("\n"))) return;
      r = await apiAuthed("/admin/groups/" + encodeURIComponent(code) + "?force=1", { method: "DELETE" });
    } else if (r.status === 200) { /* empty group: deleted without questions */ }
    if (r.status === 200) { adminAuditChanged(); setMessage(`Группа ${code} удалена.`); load(); } else setProblem((r.data && r.data.error) || "Не удалось удалить.");
  };
  // Adding a list of students to one group.
  const [open, setOpen] = useState(null);       // group whose "add students" form is open
  const [list, setList] = useState("");
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState(null);   // { group, created, rejected } of the last batch
  const addStudents = async code => {
    if (adding || !list.trim()) return;
    setAdding(true); setProblem(""); setMessage(""); setResult(null);
    const r = await apiAuthed("/admin/groups/" + encodeURIComponent(code) + "/students", { method: "POST", body: { text: list } });
    setAdding(false);
    if (r.status === 201) { adminAuditChanged(); setResult(r.data); setList(""); setOpen(null); load(); }
    else setProblem((r.data && r.data.error) || "Не удалось добавить студентов. Проверьте подключение к серверу.");
  };
  const copyResult = async () => {
    const text = result.created.map(c => `${c.name}\t${c.login}\t${c.password}`).join("\n");
    try { await navigator.clipboard.writeText(text); setMessage("Список скопирован: ФИО, логин и пароль через табуляцию."); } catch { setProblem("Не удалось скопировать. Выделите список и скопируйте вручную."); }
  };
  return <section className="screen active admin-screen" aria-label="Группы">
    <style>{registerCSS + adminServiceCSS}</style>
    <header className="topbar"><button className="back-btn" onClick={onBack}>← Назад</button><span className="admin-page-title">Группы</span></header>
    <main className="dash admin-body">
      <div className="greeting"><h1>Группы колледжа</h1></div>
      <p className="admin-subtitle">Из этого списка выбирают группу при создании студента, а преподаватели отмечают свои группы.</p>
      <form className="register-card" onSubmit={add}>
        <label className="register-field" htmlFor="admin-groups-input">Новые группы</label>
        <textarea id="admin-groups-input" className="register-input admin-service-textarea" value={text} maxLength={2000}
          onChange={event => { setText(event.target.value); setProblem(""); setMessage(""); }} placeholder={"ДВ-41\nДВ-31, ДГ-31"} />
        <p className="register-hint">Одна или несколько групп: по одной на строку или через запятую.</p>
        {problem && <p className="register-error" role="alert">{problem}</p>}
        {message && <p role="status" className="admin-service-success">{message}</p>}
        <button className="register-submit" type="submit" disabled={busy || !text.trim()}>{busy ? "Добавляем…" : "Добавить в список"}</button>
      </form>
      {result && <section className="register-card" role="status">
        <h2 className="admin-service-title">Группа {result.group}: создано аккаунтов {result.created.length}{result.rejected.length ? `, не создано ${result.rejected.length}` : ""}</h2>
        {result.created.length > 0 && <>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.8125rem"}}>
            <thead><tr><th align="left">ФИО</th><th align="left">Логин</th><th align="left">Пароль</th></tr></thead>
            <tbody>{result.created.map(c => <tr key={c.login} style={{borderTop:"1px solid var(--line)"}}>
              <td style={{padding:"6px 8px 6px 0"}}>{c.name}{c.duplicate ? " ⚠" : ""}</td><td style={{fontFamily:"monospace"}}>{c.login}</td><td style={{fontFamily:"monospace"}}>{c.password}</td></tr>)}</tbody>
          </table></div>
          <button className="admin-service-secondary" onClick={copyResult}>Скопировать список</button>
          <p className="register-hint">Передайте логины и пароли студентам. Позже пароль можно посмотреть в разделе «Пользователи». ⚠ — в группе уже есть студент с таким же ФИО, аккаунт создан с другим логином.</p>
        </>}
        {result.rejected.length > 0 && <div role="alert" className="register-warning"><strong>Не создано:</strong>
          {result.rejected.map((x, i) => <p key={i} style={{margin:"4px 0"}}>«{x.line}» — {x.reason}</p>)}</div>}
      </section>}
      <section className="register-card">
        <h2 className="admin-service-title">В списке{groups ? `: ${groups.length}` : ""}</h2>
        {error && <p className="register-error" role="alert">Не удалось загрузить список. Проверьте подключение к серверу.</p>}
        {groups && groups.length === 0 && <p className="register-hint">Групп пока нет. Добавьте первую выше.</p>}
        {(groups || []).map(g => <article className="admin-college-item" key={g.code} style={{marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1}}><h3 style={{margin:0}}>{g.code}</h3><p className="register-hint" style={{margin:0}}>Студентов с аккаунтом: {g.students} · преподавателей: {g.teachers}</p></div>
            <button className="admin-service-secondary" onClick={() => { setOpen(open === g.code ? null : g.code); setList(""); setProblem(""); }} aria-expanded={open === g.code}>Добавить студентов</button>
            <button className="admin-service-secondary" onClick={() => remove(g.code)} aria-label={`Удалить группу ${g.code}`}>Удалить</button>
          </div>
          {open === g.code && <div style={{marginTop:10}}>
            <label className="register-field" htmlFor={`students-${g.code}`}>Список студентов группы {g.code}</label>
            <textarea id={`students-${g.code}`} className="register-input admin-service-textarea" style={{minHeight:160}} value={list} onChange={event => setList(event.target.value)} disabled={adding}
              placeholder={"Иванов Пётр Петрович\nПетрова Анна Сергеевна\nСидоров Алексей"} />
            <p className="register-hint">По одному студенту на строку: фамилия, имя, отчество (отчество можно не указывать). Можно вставить столбец из Excel. Для каждого создастся аккаунт с логином и паролем.</p>
            <button className="register-submit" disabled={adding || !list.trim()} onClick={() => addStudents(g.code)}>{adding ? "Создаём аккаунты…" : "Создать аккаунты"}</button>
          </div>}
        </article>)}
      </section>
    </main>
  </section>;
}
