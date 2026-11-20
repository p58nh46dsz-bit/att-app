// TeacherMsgModal — "Сообщение группе" modal.
function TeacherMsgModal({ open, onClose, user, onOpenTeaching }) {
  const groups = user && user.groups ? user.groups : [];
  const [pickedGroup, setGroup] = useState(null);
  const group = pickedGroup || groups[0] || "";
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg]   = useState("");
  const [sent, setSent] = useState(false);
  const [delivered, setDelivered] = useState(0);   // how many students got it
  const quickMsgs = [
    "Пара переносится в ауд. 210",
    "Занятие сегодня отменяется",
    "Сдать работы до конца недели",
    "Напоминаю о домашнем задании",
  ];
  if (!open) return null;
  if (groups.length === 0) return <TeacherNoGroups title="Сообщение группе" onClose={onClose} onOpenTeaching={onOpenTeaching} />;
  const close = () => { setSent(false); setMsg(""); onClose(); };
  const send = async () => {
    setSending(true); setSendError("");
    const r = await apiAuthed("/me/group-messages", { method: "POST", body: { groupCode: group, body: msg } });
    setSending(false);
    if (r.status === 201) { setDelivered(r.data.delivered || 0); setSent(true); } else setSendError("Не удалось отправить. Попробуйте ещё раз.");
  };
  return (
    <>
      <div className="lk-overlay open" onClick={close} />
      <div className="lk-sheet open tq-sheet">
        <div className="lk-handle" />
        <TQSheetHead title="Сообщение" sub="Придёт студентам уведомлением" onClose={close} />
        {sent ? (
          <div className="tq-sh-body">
            <div className="tq-done">
              <SuccessCheck size={56} />
              <div style={{fontSize:"1.25rem",fontWeight:700}}>Отправлено</div>
              <div style={{fontSize:"0.875rem",color:"var(--sub)",lineHeight:1.6}}>{delivered > 0 ? `Группа ${group}: получили ${delivered} ${rusPlural(delivered, "студент", "студента", "студентов")}` : `В группе ${group} пока нет студентов с аккаунтом. Сообщение сохранено.`}</div>
            </div>
            <div className="tq-foot"><button className="tq-btn" onClick={close}>Готово</button></div>
          </div>
        ) : (
          <div className="tq-sh-body">
            <div className="tq-sec">Кому</div>
            <TQChips label="Группа" items={groups} value={group} onPick={setGroup} />
            <div className="tq-sec">Текст</div>
            <div className="tq-card" style={{padding:"4px 4px 10px"}}>
              <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Напишите сообщение группе" rows={4} maxLength={1000}
                style={{width:"100%",boxSizing:"border-box",background:"transparent",border:"none",color:"var(--text)",fontFamily:"inherit",fontSize:"0.9375rem",lineHeight:1.5,padding:"12px",resize:"none",outline:"none"}} />
              <div style={{textAlign:"right",fontSize:"0.6875rem",color:"var(--sub)",padding:"0 12px",fontVariantNumeric:"tabular-nums"}}>{msg.length}/1000</div>
            </div>
            <div className="tq-sec">Шаблоны</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {quickMsgs.map(qm => <button key={qm} className={`tq-chip${msg === qm ? " on" : ""}`} onClick={()=>{ tqTap(); setMsg(qm); }}>{qm}</button>)}
            </div>
            <div className="tq-foot">
              {sendError && <div role="alert" className="tq-note" style={{color:"var(--bad)"}}>{sendError}</div>}
              <button className="tq-btn" disabled={!msg.trim()||sending} onClick={send}><Icon name="send" size={18} />{sending ? "Отправляем…" : `Отправить в ${group}`}</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── TEACHER MATERIALS MODAL ───────────────────────────────────────────────────
