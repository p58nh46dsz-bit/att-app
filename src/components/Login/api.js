// Client for the АТТ API (server/). Used by the login screen and by session restore.
// The token lives in localStorage ("att_token"); the password is only ever sent to the API
// once, on sign-in, and never stored on the device.

// Where the API lives:
//  - on localhost or a home-network address (a phone opening http://192.168.x.x:3040): the same machine, port 3050;
//  - on GitHub Pages (the public preview, no server behind it): nowhere, the app shows only public content;
//  - on any other host (the production domain): the same domain, under /api — nginx forwards it to the Node
//    server (see docs/DEPLOY.md), so no CORS and no address to configure.
const API_BASE = /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(location.hostname)
  ? `http://${location.hostname}:3050`
  : /\.github\.io$/.test(location.hostname) ? "" : "/api";

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
const apiMe    = token => apiCall("/auth/me", { token });

// Authenticated call: attaches the stored token. Resolves like apiCall ({status, data}).
const apiAuthed = (path, opts = {}) => apiCall(path, { ...opts, token: loadJSON("att_token", null) });

// Sends a file as it is (raw bytes) with the stored token. Resolves like apiCall.
async function apiUploadFile(path, file) {
  if (!API_BASE) return { status: 0, data: { error: "no-api" } };
  try {
    const r = await fetch(API_BASE + path, {
      method: "PUT", body: file,
      headers: { "content-type": file.type || "application/octet-stream", authorization: "Bearer " + loadJSON("att_token", null) },
    });
    return { status: r.status, data: await r.json().catch(() => ({})) };
  } catch {
    return { status: 0, data: { error: "network" } };
  }
}
// Opens a material attached to a pair in the phone's own viewer (PDF, photos, documents, with Share / Save to Files).
// The tab is opened at once, inside the tap (Safari blocks tabs opened later); then the server gives a link with a
// key for this file, valid for two minutes, and the tab goes there.
async function openLessonFile(id) {
  const tab = window.open("", "_blank");
  const r = await apiAuthed(`/lesson-materials/${id}/link`);
  if (r.status === 200 && r.data.url) {
    const url = API_BASE + r.data.url;
    if (tab) tab.location.href = url; else window.location.href = url;
    return true;
  }
  if (tab) tab.close();
  return false;
}

// Public catalogue content (specialties, FAQ, open days, news, curriculum, …). The values below
// are the built-in fallback copy, used until / unless GET /content answers (offline, API down);
// loadContent() overwrites them with the database's version.
const CONTENT = {
  specialties: MOCK_SPEC_GROUPS,
  faq: { categories: MOCK_FAQ_CATEGORIES, items: MOCK_FAQ_ITEMS },
  open_days: MOCK_OPEN_DAY_EVENTS,
  news: MOCK_ACADEMY_NEWS,
  curriculum: [],
  portfolio_categories: MOCK_PORTFOLIO_CATEGORIES,
  consultation_types: MOCK_CONSULTATION_TYPES,
  consultation_slots: MOCK_CONSULTATION_SLOTS,
  certificates: MOCK_CERTIFICATES.map((c, i) => ({ key: "c" + (i + 1), icon: c.icon, title: c.title, sub: c.sub })),
  teacher_subjects: [],
  grade_subjects: [],
  doc_defaults: { recipients: [], order: { number: "", date: "", basis: "", signer: "", executorRole: "", executorName: "", clerkName: "" }, distribution: [] },
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
        <div style={{textAlign:"center",padding:"40px 12px",color:"var(--sub)",fontSize:"0.8125rem",lineHeight:1.6}}>
          {error
            ? <>Не удалось загрузить данные.<br/>Проверьте подключение к серверу.<br/><button className="btn-blue" style={{marginTop:14,borderRadius:50,padding:"10px 28px"}} onClick={onRetry}>Повторить</button></>
            : "Загрузка…"}
        </div>
      </div>
    </div>
  );
}
