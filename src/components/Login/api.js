// Client for the АТТ API (server/). Used by the login screen and by session restore.
// The token lives in localStorage ("att_token"); the password is only ever sent to the API
// once, on sign-in, and never stored on the device.

// Local development talks to the API on this machine. Set the production URL here once the
// API is hosted (Russia — see docs), e.g. "https://api.example.ru".
const API_BASE = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://localhost:3050"
  : "";

async function apiCall(path, { method = "GET", body, token } = {}) {
  if (!API_BASE) return { status: 0, data: { error: "no-api" } };
  try {
    const r = await fetch(API_BASE + path, {
      method,
      headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, data: await r.json().catch(() => ({})) };
  } catch {
    return { status: 0, data: { error: "network" } }; // server unreachable / offline
  }
}

const apiLogin = (login, password) => apiCall("/auth/login", { method: "POST", body: { login, password } });
const apiDemo  = who => apiCall("/auth/demo", { method: "POST", body: { who } });
const apiMe    = token => apiCall("/auth/me", { token });

// Authenticated call: attaches the stored token. Resolves like apiCall ({status, data}).
const apiAuthed = (path, opts = {}) => apiCall(path, { ...opts, token: loadJSON("att_token", null) });

// Public catalogue content (specialties, FAQ, open days, news, curriculum, …). The values below
// are the built-in fallback copy, used until / unless GET /content answers (offline, API down);
// loadContent() overwrites them with the database's version.
const CONTENT = {
  specialties: MOCK_SPEC_GROUPS,
  faq: { categories: MOCK_FAQ_CATEGORIES, items: MOCK_FAQ_ITEMS },
  open_days: MOCK_OPEN_DAY_EVENTS,
  news: MOCK_ACADEMY_NEWS,
  curriculum: MOCK_CURRICULUM_YEARS,
  portfolio_categories: MOCK_PORTFOLIO_CATEGORIES,
  consultation_types: MOCK_CONSULTATION_TYPES,
  consultation_slots: MOCK_CONSULTATION_SLOTS,
  certificates: MOCK_CERTIFICATES.map((c, i) => ({ key: "c" + (i + 1), icon: c.icon, title: c.title, sub: c.sub })),
  teacher_subjects: Object.keys(MOCK_MATERIALS_BY_SUBJECT),
  doc_defaults: { teacher: MOCK_DOC_TEACHER, recipients: MOCK_DOC_RECIPIENTS, order: MOCK_DOC_ORDER, distribution: MOCK_DOC_DISTRIBUTION },
};
async function loadContent() {
  const r = await apiCall("/content");
  if (r.status === 200) { Object.assign(CONTENT, r.data); return true; }
  return false;
}

// Loads authenticated data for a screen. `active` = the screen is open (loads on open and on path change).
function useApi(path, active = true) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const load = async () => {
    setError(false);
    const r = await apiAuthed(path);
    if (r.status === 200) setData(r.data); else setError(true);
  };
  useEffect(() => { if (active) load(); }, [active, path]);
  return { data, error, load, setData };
}

// Placeholder screen shown while data loads or when the server can't be reached.
function ApiShell({ open, onClose, tag, error, onRetry }) {
  return (
    <div className={`inner-screen lk-inner${open?" open":""}`}>
      <TopBar onBack={onClose} title="Личный кабинет" tag={tag} />
      <div className="inner-body">
        <div style={{textAlign:"center",padding:"40px 12px",color:"#7B9DBF",fontSize:"0.8125rem",lineHeight:1.6}}>
          {error
            ? <>Не удалось загрузить данные.<br/>Проверьте подключение к серверу.<br/><button className="btn-blue" style={{marginTop:14,borderRadius:50,padding:"10px 28px"}} onClick={onRetry}>Повторить</button></>
            : "Загрузка…"}
        </div>
      </div>
    </div>
  );
}
