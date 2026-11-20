// Notifications are loaded from the API (GET /me/notifications); nothing is bundled with the app.
// NotifPanel — shared between student and teacher roles (different datasets per role).
// Icon color follows notification severity (cls), not the per-context color from the
// main icon mapping — that's the more meaningful signal in a notification list.
const NOTIF_CLS_COLOR = { red:"var(--bad)", amber:"var(--warn)", green:"var(--ok)", "":"var(--link)" };
// Which block of the history a notification belongs to (as in Instagram's activity feed).
function notifBucket(n) {
  if (n.unread) return 0;
  const d = n.at ? new Date(n.at) : null;
  if (!d || isNaN(d)) return 4;
  const start = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 86400000);
  return days <= 0 ? 1 : days === 1 ? 2 : days < 7 ? 3 : 4;
}
const NOTIF_BUCKETS = ["Новые", "Сегодня", "Вчера", "На этой неделе", "Ранее"];
// A full-screen list: new ones first, then the history by day. Shared by student and teacher.
function NotifPanel({ open, onClose, onCountChange, role = "student", notifs, setNotifs }) {
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
    apiAuthed("/me/notifications/read", { method: "POST", body: { all: true } });
    setNotifs(prev => prev.map(n => ({ ...n, unread: false })));
    if (onCountChange) onCountChange(0);
  };
  const unreadCount = notifs.filter(n => n.unread).length;
  const groups = NOTIF_BUCKETS.map((title, k) => ({ title, items: notifs.filter(n => notifBucket(n) === k) })).filter(g => g.items.length);
  const tone = cls => cls === "red" ? "var(--bad)" : cls === "amber" ? "var(--warn)" : cls === "green" ? "var(--ok)" : "var(--link)";
  return (
    <div className={`inner-screen lk-inner tq-screen${open ? " open" : ""}`} style={{zIndex:210}}>
      <TopBar plain onBack={onClose} title="Назад" tag="Уведомления" />
      <div className="inner-body tq-sched-body">
        {notifs.length === 0 ? (
          <TQEmpty kind="calendar" title="Пока тихо" text="Здесь появятся сообщения от колледжа и напоминания." />
        ) : <>
          {unreadCount > 0 && <button className="tq-chip" style={{alignSelf:"flex-end"}} onClick={readAll}>Прочитать все</button>}
          {groups.map(g => (
            <div key={g.title} style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
              <div className="tq-sec" style={{padding:"8px 4px 0"}}>{g.title}</div>
              <div className="tq-card">
                {g.items.map(n => (
                  <button key={n.id} className="tq-item" onClick={() => markRead(n.id)} style={{alignItems:"flex-start",cursor:n.unread ? "pointer" : "default"}}>
                    <div className="tq-ava" style={{width:40,height:40,background:`color-mix(in srgb, ${tone(n.cls)} 14%, var(--card))`,color:tone(n.cls)}}><Icon name={n.icon || "bell"} size={18} /></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"0.875rem",lineHeight:1.4,fontWeight:n.unread ? 600 : 400,color:n.unread ? "var(--text)" : "var(--sub2)"}}>{n.msg}</div>
                      <div className="tq-item-sub">{n.time}</div>
                    </div>
                    {n.unread && <span style={{width:9,height:9,borderRadius:"50%",background:"var(--red)",flexShrink:0,marginTop:6}} />}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {notifs.length >= 300 && <div className="tq-note" style={{paddingTop:6}}>Показаны последние 300 уведомлений</div>}
        </>}
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
