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
