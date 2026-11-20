// TeacherMaterialsModal — "Материалы к паре" modal. Subjects are the ones the teacher teaches (GET /me/teaching), files from GET /me/materials.
function TeacherMaterialsModal({ open, onClose, onOpenTeaching }) {
  const { data: teaching } = useApi("/me/teaching", open);
  const subjects = teaching ? [...new Set(teaching.groups.flatMap(g => g.subjects))].sort((a, b) => a.localeCompare(b, "ru")) : [];
  const [chosenSubject, setSubject] = useState(null);
  const subject = chosenSubject || subjects[0];
  const [uploading, setUploading] = useState(false);
  const [uploaded,  setUploaded]  = useState(false);
  const [uploadError, setUploadError] = useState("");
  const { data: byApi, error, load } = useApi("/me/materials", open);
  const fileInput = useRef(null);
  const files = (byApi && byApi[subject]) || [];
  // The file's name and size are recorded in the database; storing the file itself
  // (object storage hosted in Russia) is a later step.
  const addFile = async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f || !subject) return;
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    const type = ext === "pdf" ? "pdf" : ["doc", "docx"].includes(ext) ? "doc" : ["xls", "xlsx", "csv"].includes(ext) ? "xls" : "other";
    const size = f.size >= 1048576 ? (f.size / 1048576).toFixed(1) + " МБ" : Math.max(1, Math.round(f.size / 1024)) + " КБ";
    setUploading(true); setUploadError("");
    const r = await apiAuthed("/me/materials", { method: "POST", body: { subject, name: f.name, type, size } });
    setUploading(false);
    if (r.status === 201) { setUploaded(true); load(); setTimeout(() => setUploaded(false), 2500); }
    else setUploadError("Не удалось добавить файл. Попробуйте ещё раз.");
  };
  if (!open) return null;
  return (
    <>
      <div className="lk-overlay open" onClick={onClose} />
      <div className="lk-sheet open tq-sheet">
        <div className="lk-handle" />
        <TQSheetHead title="Материалы" sub="Файлы и задания к парам" onClose={onClose} />
        <div className="tq-sh-body">
          {subjects.length === 0 ? (
            <TQEmpty kind="calendar" title="Предметы не указаны" text="Укажите, какие предметы ведёте, чтобы прикреплять к ним материалы.">
              <button className="tq-btn" style={{marginTop:6}} onClick={onOpenTeaching}>Указать предметы</button>
            </TQEmpty>
          ) : <>
            <div className="tq-sec">Предмет</div>
            <TQChips label="Предмет" items={subjects} value={subject} onPick={s => { setSubject(s); setUploaded(false); }} />
            <div className="tq-sec">Файлы</div>
            {error && <div className="tq-note" style={{color:"var(--bad)"}}>Не удалось загрузить список</div>}
            {files.length === 0 ? (
              <div className="tq-card"><div className="tq-item" style={{cursor:"default",justifyContent:"center",color:"var(--sub)",fontSize:"0.875rem"}}>Пока нет файлов</div></div>
            ) : (
              <div className="tq-card">
                {files.map((f, i) => (
                  <div key={i} className="tq-item" style={{cursor:"default"}}>
                    <div style={{width:40,height:40,borderRadius:12,background:`color-mix(in srgb, ${MOCK_MATERIAL_COLOR[f.type]||MOCK_MATERIAL_COLOR.other} 14%, var(--card))`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Icon name={MOCK_MATERIAL_ICON[f.type]||"file"} size={19} color={MOCK_MATERIAL_COLOR[f.type]||MOCK_MATERIAL_COLOR.other} />
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="tq-item-title" style={{fontSize:"0.875rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                      <div className="tq-item-sub">{f.date} · {f.size}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="tq-note" style={{marginTop:4}}>Пока сохраняются только название и размер файла. Скачивание для студентов появится вместе с хранилищем.</div>
            <input ref={fileInput} type="file" style={{display:"none"}} onChange={addFile} />
            <div className="tq-foot">
              {uploadError && <div role="alert" className="tq-note" style={{color:"var(--bad)"}}>{uploadError}</div>}
              {uploaded && <div role="status" className="tq-note" style={{color:"var(--ok)"}}>Файл добавлен</div>}
              <button className="tq-btn" disabled={uploading} onClick={()=>fileInput.current && fileInput.current.click()}><Icon name="plus" size={18} />{uploading ? "Добавляем…" : "Добавить файл"}</button>
            </div>
          </>}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
