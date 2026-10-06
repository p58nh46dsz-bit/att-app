// АТТ Академия API. Run: npm start (needs DATABASE_URL and JWT_SECRET, see .env.example).
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { checkLogin, publicUser } = require("./users");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is missing or shorter than 32 characters — set it in server/.env");
  process.exit(1);
}
if (!/^[0-9a-f]{64}$/i.test(process.env.PASSWORD_KEY || "")) {
  console.error("PASSWORD_KEY is missing or not 64 hex characters — set it in server/.env");
  process.exit(1);
}
const TOKEN_DAYS = 30;

const app = express();
app.use(express.json({ limit: "200kb" })); // formed documents (24 topics) are ~10–20 kB; routes cap their own payloads
// Browsers may only call this API from the listed origins (the site + local dev).
const origins = (process.env.CORS_ORIGINS || "http://localhost:3040").split(",").map(s => s.trim());
app.use(cors({ origin: origins }));

// Per-IP brake on top of the per-account lockout, so one machine can't hammer many logins.
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
app.use("/auth", limiter);

const sign = u => jwt.sign({ sub: u.id, role: u.role }, JWT_SECRET, { expiresIn: `${TOKEN_DAYS}d` });

async function requireUser(req, res, next) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  try {
    const { sub, iat } = jwt.verify(m ? m[1] : "", JWT_SECRET);
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [sub]);
    if (!rows[0]) throw new Error("no user");
    // A password reset signs out every session issued before it.
    if (Math.floor(rows[0].password_changed_at.getTime() / 1000) > iat) throw new Error("password changed");
    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

app.get("/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
});

app.post("/auth/login", async (req, res) => {
  const { login, password } = req.body || {};
  if (typeof login !== "string" || typeof password !== "string" || !login.trim() || !password) {
    return res.status(400).json({ ok: false, reason: "empty" });
  }
  const r = await checkLogin(login, password);
  if (!r.ok) return res.status(r.reason === "locked" ? 429 : 401).json(r);
  res.json({ ok: true, token: sign(r.user), user: publicUser(r.user) });
});

// TEMPORARY demo shortcut (empty form → Матвеев Даниил, "a"/"a" → Белкова). Disabled unless
// ALLOW_DEMO=1, so it must be off in production. The demo passwords never reach the site's code.
const DEMO_LOGINS = { student: "matvveev.dv41", teacher: "belkova.ns" };
app.post("/auth/demo", async (req, res) => {
  const login = process.env.ALLOW_DEMO === "1" && DEMO_LOGINS[(req.body || {}).who];
  if (!login) return res.status(404).json({ error: "not found" });
  const { rows } = await pool.query("SELECT * FROM users WHERE lower(login) = $1", [login]);
  if (!rows[0]) return res.status(404).json({ error: "demo account missing" });
  res.json({ ok: true, token: sign(rows[0]), user: publicUser(rows[0]) });
});

app.get("/auth/me", requireUser, (req, res) => res.json({ user: publicUser(req.user) }));

// There is no self-registration: accounts are created by an administrator (see admin.js).

require("./electives")(app, requireUser);
require("./data")(app, requireUser);
require("./admin")(app, requireUser);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "server error" });
});

const port = Number(process.env.PORT) || 3050;
app.listen(port, () => console.log(`API on http://localhost:${port}`));
