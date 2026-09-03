// NotifPanel — shared between student and teacher roles (different datasets per role).
// Icon color follows notification severity (cls), not the per-context color from the
// main icon mapping — that's the more meaningful signal in a notification list.
const NOTIF_CLS_COLOR = { red:"#ff7e7e", amber:"#f5c067", green:"#5ec97a", "":"#4A8FE7" };
const STUDENT_NOTIFS = [
  { cls:"red",   icon:"alert-triangle",  msg:"Дедлайн завтра: Курсовая по физике", time:"Сегодня, 09:00", unread:true },
  { cls:"amber", icon:"calendar",        msg:"Расписание изменено: пара в пятницу перенесена", time:"Вчера, 18:30", unread:true },
  { cls:"green", icon:"check-circle-2",  msg:"Запись на консультацию подтверждена — 22 мая, 11:00", time:"Вчера, 14:15", unread:true },
  { cls:"",      icon:"bar-chart-3",     msg:"Новая оценка: Математика — 5", time:"2 дня назад", unread:false },
  { cls:"",      icon:"megaphone",       msg:"Новость академии: Студенческий форум 22 мая", time:"3 дня назад", unread:false },
  { cls:"amber", icon:"wallet",          msg:"Стипендия зачислена на карту", time:"5 дней назад", unread:false },
];
const TEACHER_NOTIFS = [
  { cls:"red",   icon:"file-edit",       msg:"8 непроверенных работ — Экономика, ДВ-41", time:"Сегодня, 09:00", unread:true },
  { cls:"amber", icon:"calendar",        msg:"Собрание кафедры — завтра, 14:00", time:"Вчера, 18:00", unread:true },
  { cls:"green", icon:"check-circle-2",  msg:"Ведомость ДВ-31 принята деканатом", time:"Вчера, 12:30", unread:false },
  { cls:"",      icon:"message-circle",  msg:"Новый вопрос от студента в чате ДВ-11", time:"2 дня назад", unread:false },
  { cls:"amber", icon:"clipboard-list",  msg:"Напоминание: сдать ведомости до 5 июня", time:"3 дня назад", unread:false },
];
function NotifPanel({ open, onClose, onCountChange, role = "student" }) {
  const [notifs, setNotifs] = useState(role === "teacher" ? TEACHER_NOTIFS : STUDENT_NOTIFS);
  useEffect(() => {
    setNotifs(role === "teacher" ? TEACHER_NOTIFS : STUDENT_NOTIFS);
  }, [role]);
  const markRead = (i) => setNotifs(prev => {
    const next = prev.map((n, idx) => idx === i ? {...n, unread:false} : n);
    if(onCountChange) onCountChange(next.filter(n=>n.unread).length);
    return next;
  });
  const unreadCount = notifs.filter(n=>n.unread).length;
  return (
    <>
      <div className={`panel-overlay${open?" open":""}`} onClick={onClose} />
      <div className={`notif-panel${open?" open":""}`}>
        <div className="notif-header">
          <span className="notif-title">Уведомления {unreadCount > 0 && <span style={{fontSize:12,background:"#E84C4C",borderRadius:10,padding:"2px 7px",marginLeft:6}}>{unreadCount}</span>}</span>
          <button className="notif-close" aria-label="Закрыть" onClick={onClose}>×</button>
        </div>
        <div className="notif-body">
          {notifs.map((n,i)=>(
            <div key={i} className={`notif-item${n.cls?" "+n.cls:""}`}
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

// SEARCH PANEL
