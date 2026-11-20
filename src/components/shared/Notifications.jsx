// Notifications are loaded from the API (GET /me/notifications); nothing is bundled with the app.
// NotifPanel — shared between student and teacher roles (different datasets per role).
// Icon color follows notification severity (cls), not the per-context color from the
// main icon mapping — that's the more meaningful signal in a notification list.
const NOTIF_CLS_COLOR = { red:"#ff7e7e", amber:"#f5c067", green:"#5ec97a", "":"#4A8FE7" };
function NotifPanel({ open, onClose, onCountChange, role = "student", notifs, setNotifs }) {
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
    <>
      <div className={`panel-overlay${open?" open":""}`} onClick={onClose} />
      <div className={`notif-panel${open?" open":""}`}>
        <div className="notif-header">
          <span className="notif-title">Уведомления {unreadCount > 0 && <span style={{fontSize:"0.75rem",background:"#E84C4C",borderRadius:10,padding:"2px 7px",marginLeft:6}}>{unreadCount}</span>}</span>
          <button className="notif-close" aria-label="Закрыть" onClick={onClose}>×</button>
        </div>
        <div className="notif-body">
          {notifs.length === 0 && <div style={{textAlign:"center",color:"#7B9DBF",fontSize:"0.8125rem",padding:"32px 12px"}}>Уведомлений пока нет</div>}
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
    </>
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
        {notifs.length === 0 && <div style={{textAlign:"center",color:"#7B9DBF",fontSize:"0.8125rem",padding:"32px 12px"}}>Уведомлений пока нет</div>}
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
