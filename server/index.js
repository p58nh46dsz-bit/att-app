// АТТ Академия API. Run: npm start (needs DATABASE_URL and JWT_SECRET, see .env.example).
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { checkLogin, publicUser, setPassword } = require("./users");
const { verify } = require("@node-rs/argon2");
const { passwordProblem } = require("./passwordPolicy");

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
// Behind nginx the real client address is in X-Forwarded-For; the rate limits need it (set TRUST_PROXY=1 on the server).
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
app.disable("x-powered-by");
// Personal data must never be cached by a browser or a proxy, and the API is never meant to be framed or sniffed.
app.use((_req, res, next) => {
  res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer" });
  next();
});
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
    const { rows } = await pool.query("SELECT * FROM users_v WHERE id = $1", [sub]);
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

app.get("/auth/me", requireUser, (req, res) => res.json({ user: publicUser(req.user) }));

// Changing one's own password (student, teacher, administrator). The current password is asked again, so a
// stolen open session can't take the account over. The old sessions end, the answer carries a fresh token for
// this one. A password a person chose is NOT kept in the readable (encrypted) copy: the administrator can reset
// it but can no longer look it up.
const pwLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
app.post("/me/password", pwLimiter, requireUser, async (req, res) => {
  const { current, next } = req.body || {};
  if (typeof current !== "string" || typeof next !== "string") return res.status(400).json({ error: "Введите текущий и новый пароль." });
  if (!(await verify(req.user.password_hash, current))) return res.status(403).json({ error: "Текущий пароль указан неверно." });
  const problem = passwordProblem(next, req.user.login);
  if (problem) return res.status(400).json({ error: problem });
  if (next === current) return res.status(400).json({ error: "Новый пароль должен отличаться от текущего." });
  await setPassword(req.user.id, next, { keepReadable: false });
  res.json({ ok: true, token: sign(req.user) });
});

// There is no self-registration: accounts are created by an administrator (see admin.js).

require("./electives")(app, requireUser);
require("./data")(app, requireUser);
require("./teaching")(app, requireUser);
require("./manage")(app, requireUser);
require("./dpoTopics")(app, requireUser);
require("./admin")(app, requireUser);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "server error" });
});

const port = Number(process.env.PORT) || 3050;
// Listen on the loopback address only when told to (production: nginx is the only thing that talks to Node).
const host = process.env.HOST || undefined;
const server = app.listen(port, host, () => console.log(`API on http://${host || "localhost"}:${port}`));
// systemd stops the service with SIGTERM: finish the requests in flight, close the database connections, exit.
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => server.close(() => pool.end().finally(() => process.exit(0))));
