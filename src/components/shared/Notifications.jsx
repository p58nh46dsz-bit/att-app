// Notifications are loaded from the API (GET /me/notifications); nothing is bundled with the app.
// NotifPanel — shared between student and teacher roles (different datasets per role).
// Icon color follows notification severity (cls), not the per-context color from the
// main icon mapping — that's the more meaningful signal in a notification list.
const NOTIF_CLS_COLOR = { red:"var(--bad)", amber:"var(--warn)", green:"var(--ok)", "":"var(--link)" };
// The history is grouped by day, as in the activity feeds of large apps; unread ones are marked in place.
const dayStart = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
const daysAgo = d => Math.round((dayStart(new Date()) - dayStart(d)) / 86400000);
function notifBucket(n) {
  const d = n.at ? new Date(n.at) : null;
  if (!d || isNaN(d)) return 3;
  const days = daysAgo(d);
  return days <= 0 ? 0 : days === 1 ? 1 : days < 7 ? 2 : 3;
}
const NOTIF_BUCKETS = ["Сегодня", "Вчера", "На этой неделе", "Ранее"];
// The time on the device's clock: "10:32" today, "вчера", a weekday this week, otherwise a date.
function notifTime(n) {
  const d = n.at ? new Date(n.at) : null;
  if (!d || isNaN(d)) return n.time || "";
  const days = daysAgo(d);
  if (days <= 0) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (days === 1) return "вчера";
  if (days < 7) return d.toLocaleDateString("ru-RU", { weekday: "short" });
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "");
}
// A short title for the kind of notification (the database keeps only an icon and the text).
function notifTitle(n) {
  const m = n.msg || "";
  if (n.icon === "check") return "Оценка";
  if (n.icon === "bell") return /^Пропуск/.test(m) ? "Пропуск" : "Напоминание";
  if (n.icon === "file-text" || n.icon === "file_text") return "Справка";
  if (n.icon === "user") return "Профиль";
  if (n.icon === "megaphone") return /, группа [^:]+:/.test(m) ? "Сообщение группе" : "Объявление";
  return "АТТ";
}
const NOTIF_TONE = { red: "var(--bad)", amber: "var(--warn)", green: "var(--ok)", "": "var(--link)" };
// A full-screen inbox shared by student and teacher: All / Unread, the history by day, tap to read and expand.
function NotifPanel({ open, onClose, onCountChange, role = "student", notifs, setNotifs }) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  useEffect(() => { if (!open) { setExpanded(null); setFilter("all"); } }, [open]);
  const markRead = (id) => {
    const target = notifs.find(n => n.id === id);
    if (!target || !target.unread) return;
    apiAuthed("/me/notifications/read", { method: "POST", body: { id } });
    setNotifs(prev => {
      const next = prev.map(n => n.id === id ? { ...n, unread: false } : n);
      if (onCountChange) onCountChange(next.filter(n => n.unread).length);
      return next;
    });
  };
  const readAll = () => {
    tqTap();
    apiAuthed("/me/notifications/read", { method: "POST", body: { all: true } });
    setNotifs(prev => prev.map(n => ({ ...n, unread: false })));
    if (onCountChange) onCountChange(0);
  };
  const tap = n => { setExpanded(e => e === n.id ? null : n.id); markRead(n.id); };
  const unreadCount = notifs.filter(n => n.unread).length;
  const shown = filter === "unread" ? notifs.filter(n => n.unread) : notifs;
  const groups = NOTIF_BUCKETS.map((title, k) => ({ title, items: shown.filter(n => notifBucket(n) === k) })).filter(g => g.items.length);
  return (
    <div className={`inner-screen lk-inner tq-screen nf-screen${open ? " open" : ""}`} style={{zIndex:210}}>
      <TopBar plain onBack={onClose} title="Назад" tag="Уведомления" />
      <div className="inner-body nf-body">
        {notifs.length > 0 && (
          <div className="nf-bar">
            <div className="nf-seg" role="tablist" aria-label="Какие уведомления показать">
              {[["all", "Все"], ["unread", "Непрочитанные"]].map(([k, label]) => (
                <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => { tqTap(); setFilter(k); }}>
                  {label}{k === "unread" && unreadCount > 0 && <span className="nf-seg-n">{unreadCount}</span>}
                </button>
              ))}
            </div>
            {unreadCount > 0 && <button className="nf-readall" onClick={readAll}>Прочитать все</button>}
          </div>
        )}
        {shown.length === 0 ? (
          <div className="nf-empty">
            <div className="nf-empty-ico"><Icon name={filter === "unread" ? "check" : "bell"} size={30} strokeWidth={1.8} /></div>
            <div className="nf-empty-title">{filter === "unread" ? "Всё прочитано" : "Пока тихо"}</div>
            <div className="nf-empty-text">{filter === "unread" ? "Новых уведомлений нет" : "Здесь появятся сообщения колледжа и напоминания"}</div>
          </div>
        ) : groups.map(g => (
          <section key={g.title} className="nf-group">
            <h3 className="nf-day">{g.title}</h3>
            <div className="nf-list">
              {g.items.map(n => {
                const tone = NOTIF_TONE[n.cls] || NOTIF_TONE[""];
                return (
                  <button key={n.id} className={`nf-row${n.unread ? " unread" : ""}${expanded === n.id ? " open" : ""}`} onClick={() => tap(n)} aria-expanded={expanded === n.id}>
                    <span className="nf-ico" style={{ color: tone, background: `color-mix(in srgb, ${tone} 13%, var(--card))` }}><Icon name={n.icon || "bell"} size={19} /></span>
                    <span className="nf-main">
                      <span className="nf-top"><b>{notifTitle(n)}</b><time>{notifTime(n)}</time></span>
                      <span className="nf-msg">{n.msg}</span>
                    </span>
                    <i className="nf-dot" aria-label={n.unread ? "Не прочитано" : undefined} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        {notifs.length >= 300 && <div className="tq-note" style={{paddingTop:6}}>Показаны последние 300 уведомлений</div>}
      </div>
    </div>
  );
}

// LKNotifications — full-page "Уведомления" screen reached from the profile menu
// (as opposed to NotifPanel above, the quick side-drawer opened from the bell icon).
function LKNotifications({ open, onClose, onCountChange, notifs, setNotifs }) {
  const markRead = (i) => {
    const target = notifs[i];
    if (!target || !target.unread) return;
    apiAuthed("/me/notifications/read", { method: "POST", body: { id: target.id } }); // remembered per user in the database
    setNotifs(prev => {
      const next = prev.map((n, idx) => idx === i ? {...n, unread:false} : n);
      if (onCountChange) onCountChange(next.filter(n=>n.unread).length);
      return next;
    });
  };
  const unreadCount = notifs.filter(n=>n.unread).length;
  return (
    <div className={`inner-screen lk-inner${open ? " open" : ""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag={`Уведомления${unreadCount>0 ? ` · ${unreadCount}` : ""}`} />
      <div className="inner-body">
        {notifs.length === 0 && <div style={{textAlign:"center",color:"var(--sub)",fontSize:"0.8125rem",padding:"32px 12px"}}>Уведомлений пока нет</div>}
        {notifs.map((n,i)=>(
          <div role="button" tabIndex={0} onKeyDown={activateOnEnter} key={i} className={`notif-item${n.cls?" "+n.cls:""}`}
            style={{animationDelay:`${i*0.05}s`, cursor:"pointer", opacity: n.unread ? 1 : 0.6, transition:"opacity .2s"}}
            onClick={()=>markRead(i)}>
            <span className="notif-icon"><Icon name={n.icon} size={18} color={NOTIF_CLS_COLOR[n.cls]} /></span>
            <div className="notif-text">
              <div className="notif-msg" style={{fontWeight: n.unread ? 600 : 400}}>{n.msg}</div>
              <div className="notif-time">{n.time}</div>
            </div>
            {n.unread && <div className="notif-unread-dot" style={{transition:"opacity .2s"}}/>}
          </div>
        ))}
      </div>
    </div>
  );
}

// SEARCH PANEL
