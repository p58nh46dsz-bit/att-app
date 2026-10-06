// АТТ Академия API. Run: npm start (needs DATABASE_URL and JWT_SECRET, see .env.example).
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { createUser, checkLogin, publicUser } = require("./users");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is missing or shorter than 32 characters — set it in server/.env");
  process.exit(1);
}
const TOKEN_DAYS = 30;

const app = express();
app.use(express.json({ limit: "20kb" }));
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
    const { sub } = jwt.verify(m ? m[1] : "", JWT_SECRET);
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [sub]);
    if (!rows[0]) throw new Error("no user");
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

// Self-registration is always a STUDENT: the role is set here, never taken from the request,
// so nobody can register themselves as a teacher. Teachers are created by an administrator (seed/admin).
app.post("/auth/register", async (req, res) => {
  const b = req.body || {};
  const clean = v => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
  const person = { role: "student", lastName: clean(b.lastName), firstName: clean(b.firstName), middleName: clean(b.middleName), group: clean(b.group) };
  if (!person.lastName || !person.firstName || !person.group ||
      [person.lastName, person.firstName, person.middleName, person.group].some(s => s.length > 60)) {
    return res.status(400).json({ error: "lastName, firstName and group are required (max 60 chars each)" });
  }
  const { user, password, duplicatePerson } = await createUser(person);
  // The password is returned exactly once and is not stored anywhere in readable form.
  res.status(201).json({ login: user.login, password, duplicatePerson });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "server error" });
});

const port = Number(process.env.PORT) || 3050;
app.listen(port, () => console.log(`API on http://localhost:${port}`));
