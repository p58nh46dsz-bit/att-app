// All remaining app data: public content, groups/rosters, teacher documents + history,
// notifications, student grades/portfolio/consultations/certificates, teacher materials,
// grade entries and group messages, applicant submissions, schedule.
// Every personal route is bound to the signed-in user (req.user) — a user can never ask
// for somebody else's rows by id. Role checks are done here on the server.
const rateLimit = require("express-rate-limit");
const pool = require("./db");

const only = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: "forbidden" });

const bad = (res, msg = "bad request") => res.status(400).json({ error: msg });
const str = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

// "Сегодня, 09:00" / "Вчера, 18:30" / "2 дня назад" / "12.09.2026" — in Moscow time.
function ruTime(d) {
  const tz = "Europe/Moscow";
  const dayKey = x => new Intl.DateTimeFormat("sv-SE", { timeZone: tz }).format(x);
  const hhmm = new Intl.DateTimeFormat("ru-RU", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d);
  const days = Math.round((new Date(dayKey(new Date())) - new Date(dayKey(d))) / 86400000);
  if (days <= 0) return `Сегодня, ${hhmm}`;
  if (days === 1) return `Вчера, ${hhmm}`;
  if (days < 7) return `${days} ${days < 5 ? "дня" : "дней"} назад`;
  return new Intl.DateTimeFormat("ru-RU", { timeZone: tz }).format(d);
}

const myGroups = u => (u.role === "admin" ? null : (u.profile && u.profile.groups) || []); // null = all

module.exports = function registerData(app, requireUser) {
  // ── Public content blobs ───────────────────────────────────────────────────
  app.get("/content", async (_req, res) => {
    const { rows } = await pool.query("SELECT key, value FROM content");
    res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
  });

  // ── Schedule: same shape as schedule.json. Only ДВ-41 is scraped so far, so every
  // student gets it; once other groups are imported their own rows are served instead.
  app.get("/schedule", requireUser, async (req, res) => {
    const wanted = req.user.group_code || "ДВ-41";
    let group = wanted;
    let rows = (await pool.query("SELECT day, record FROM schedule_days WHERE group_code = $1 ORDER BY day", [group])).rows;
    if (!rows.length) {
      group = "ДВ-41";
      rows = (await pool.query("SELECT day, record FROM schedule_days WHERE group_code = $1 ORDER BY day", [group])).rows;
    }
    const meta = (await pool.query("SELECT value FROM settings WHERE key = $1", ["schedule_meta:" + group])).rows[0];
    res.json({
      group, generated_at: meta ? meta.value.generated_at : null,
      days: Object.fromEntries(rows.map(r => [new Intl.DateTimeFormat("sv-SE").format(r.day), r.record])),
    });
  });

  // ── Groups and rosters (teachers see only their own groups) ────────────────
  app.get("/groups", requireUser, only("teacher", "admin"), async (req, res) => {
    const mine = myGroups(req.user);
    const { rows } = await pool.query(
      `SELECT g.code, g.specialty_code, g.specialty_name, g.mdk_code, g.mdk_name,
              (SELECT count(*) FROM group_roster r WHERE r.group_code = g.code)::int AS count
       FROM groups g WHERE $1::text[] IS NULL OR g.code = ANY($1) ORDER BY g.code`, [mine]);
    res.json(rows.map(r => ({ code: r.code, count: r.count, specialtyCode: r.specialty_code, specialtyName: r.specialty_name, mdkCode: r.mdk_code, mdkName: r.mdk_name })));
  });

  app.get("/groups/:code", requireUser, only("teacher", "admin"), async (req, res) => {
    const mine = myGroups(req.user);
    if (mine && !mine.includes(req.params.code)) return res.status(403).json({ error: "forbidden" });
    const g = (await pool.query("SELECT * FROM groups WHERE code = $1", [req.params.code])).rows[0];
    if (!g) return res.status(404).json({ error: "not found" });
    const roster = (await pool.query("SELECT student_name, topic FROM group_roster WHERE group_code = $1 ORDER BY position", [g.code])).rows;
    res.json({
      code: g.code, specialtyCode: g.specialty_code, specialtyName: g.specialty_name, mdkCode: g.mdk_code, mdkName: g.mdk_name,
      roster: roster.map(r => ({ name: r.student_name, topic: r.topic })),
    });
  });

  // ── Teacher documents: history ─────────────────────────────────────────────
  app.get("/me/documents", requireUser, only("teacher", "admin"), async (req, res) => {
    const { rows } = await pool.query(
      "SELECT id, type, title, meta, payload, created_at FROM document_history WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
    res.json(rows.map(r => ({
      id: Number(r.id), type: r.type, title: r.title, meta: r.meta, payload: r.payload,
      savedAt: new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(r.created_at),
    })));
  });

  app.post("/me/documents", requireUser, only("teacher", "admin"), async (req, res) => {
    const { type, title, meta, payload } = req.body || {};
    if (!["memo", "order"].includes(type) || !str(title, 200) || (meta !== undefined && !str(meta, 1000))) return bad(res);
    if (payload !== undefined && (typeof payload !== "object" || payload === null || JSON.stringify(payload).length > 150000)) return bad(res, "payload too large");
    const { rows } = await pool.query(
      "INSERT INTO document_history (user_id, type, title, meta, payload) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [req.user.id, type, title.trim(), meta || "", payload || {}]);
    res.status(201).json({ id: Number(rows[0].id) });
  });

  // ── Notifications ──────────────────────────────────────────────────────────
  const visibleNotifs = `FROM notifications n
    LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.user_id = $1
    WHERE n.audience = $2 AND (n.user_id IS NULL OR n.user_id = $1)`;
  const audience = u => (u.role === "teacher" || u.role === "admin" ? "teacher" : "student");

  app.get("/me/notifications", requireUser, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT n.id, n.cls, n.icon, n.msg, n.created_at, (r.user_id IS NULL) AS unread ${visibleNotifs} ORDER BY n.created_at DESC`,
      [req.user.id, audience(req.user)]);
    res.json(rows.map(r => ({ id: Number(r.id), cls: r.cls, icon: r.icon, msg: r.msg, time: ruTime(r.created_at), unread: r.unread })));
  });

  app.post("/me/notifications/read", requireUser, async (req, res) => {
    const { id, all } = req.body || {};
    if (!all && !Number.isInteger(id)) return bad(res);
    await pool.query(
      `INSERT INTO notification_reads (user_id, notification_id)
       SELECT $1, n.id ${visibleNotifs} AND r.user_id IS NULL AND ($3::boolean OR n.id = $4)
       ON CONFLICT DO NOTHING`,
      [req.user.id, audience(req.user), !!all, all ? 0 : id]);
    res.json({ ok: true });
  });

  // ── Student: grades, portfolio ─────────────────────────────────────────────
  app.get("/me/grades", requireUser, async (req, res) => {
    const { rows } = await pool.query("SELECT subject, items FROM grades WHERE user_id = $1 ORDER BY position", [req.user.id]);
    res.json(rows.map(r => {
      const nums = r.items.map(g => g.val).filter(Number.isFinite);
      const avg = nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 10) / 10 : null;
      return { name: r.subject, avg, cls: avg === null ? "ok" : avg >= 4.5 ? "good" : avg >= 3 ? "ok" : "bad", grades: r.items };
    }));
  });

  app.get("/me/portfolio", requireUser, async (req, res) => {
    const { rows } = await pool.query(
      "SELECT category, icon, title, meta, tag FROM portfolio_items WHERE user_id = $1 ORDER BY category, position", [req.user.id]);
    const out = {};
    for (const r of rows) (out[r.category] = out[r.category] || []).push({ icon: r.icon, title: r.title, meta: r.meta, tag: r.tag });
    res.json(out);
  });

  // ── Student: consultations (a slot can be booked by one person) ────────────
  const contentValue = async key => ((await pool.query("SELECT value FROM content WHERE key = $1", [key])).rows[0] || {}).value;

  app.get("/consultations/taken", requireUser, async (req, res) => {
    const day = String(req.query.day || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return bad(res);
    const { rows } = await pool.query("SELECT slot FROM consultations WHERE day = $1", [day]);
    res.json(rows.map(r => r.slot));
  });

  app.get("/me/consultations", requireUser, async (req, res) => {
    const { rows } = await pool.query(
      "SELECT id, type_title, to_char(day, 'YYYY-MM-DD') AS day, slot FROM consultations WHERE user_id = $1 AND day >= current_date ORDER BY day, slot", [req.user.id]);
    res.json(rows.map(r => ({ id: Number(r.id), type: r.type_title, day: r.day, slot: r.slot })));
  });

  app.post("/me/consultations", requireUser, only("student"), async (req, res) => {
    const { type, day, slot } = req.body || {};
    const types = (await contentValue("consultation_types")) || [];
    const slots = (await contentValue("consultation_slots")) || [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day)) || !types.some(t => t.title === type) || !slots.includes(slot)) return bad(res);
    try {
      await pool.query("INSERT INTO consultations (user_id, type_title, day, slot) VALUES ($1,$2,$3,$4)", [req.user.id, type, day, slot]);
    } catch (e) {
      if (e.code === "23505") return res.status(409).json({ error: "slot taken" });
      throw e;
    }
    res.status(201).json({ ok: true });
  });

  // ── Student: certificates (справки) ────────────────────────────────────────
  // The student app knows two states: "process" (admin statuses new / processing) and "ready".
  // `_notes` carries the administrator's comment per certificate, when there is one.
  app.get("/me/certificates", requireUser, async (req, res) => {
    const { rows } = await pool.query("SELECT cert_key, status, note FROM certificate_requests WHERE user_id = $1", [req.user.id]);
    const out = Object.fromEntries(rows.map(r => [r.cert_key, r.status === "ready" ? "ready" : "process"]));
    out._notes = Object.fromEntries(rows.filter(r => r.note).map(r => [r.cert_key, r.note]));
    res.json(out);
  });

  app.post("/me/certificates", requireUser, only("student"), async (req, res) => {
    const { key, purpose } = req.body || {};
    const catalog = (await contentValue("certificates")) || [];
    if (!catalog.some(c => c.key === key) || (purpose !== undefined && (typeof purpose !== "string" || purpose.length > 200))) return bad(res);
    await pool.query("INSERT INTO certificate_requests (user_id, cert_key, purpose) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [req.user.id, key, (purpose || "").trim()]);
    res.status(201).json({ ok: true });
  });

  // ── Appeals (обращения): a student or teacher writes to the administration, sees the reply ──
  app.get("/me/appeals", requireUser, only("student", "teacher"), async (req, res) => {
    const { rows } = await pool.query("SELECT id, subject, message, status, reply, created_at FROM appeals WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
    res.json(rows.map(r => ({ id: Number(r.id), subject: r.subject, message: r.message, status: r.status, reply: r.reply, time: ruTime(r.created_at) })));
  });

  app.post("/me/appeals", requireUser, only("student", "teacher"), async (req, res) => {
    const { subject, message } = req.body || {};
    if (!str(subject, 120) || !str(message, 2000)) return bad(res);
    const { rows } = await pool.query("INSERT INTO appeals (user_id, subject, message) VALUES ($1,$2,$3) RETURNING id", [req.user.id, subject.trim(), message.trim()]);
    res.status(201).json({ id: Number(rows[0].id) });
  });

  // ── Teacher: materials, grade entries, group messages ──────────────────────
  app.get("/me/materials", requireUser, only("teacher", "admin"), async (req, res) => {
    const { rows } = await pool.query(
      "SELECT subject, name, type, size, created_at FROM teacher_materials WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
    const out = {};
    for (const r of rows) (out[r.subject] = out[r.subject] || []).push({
      name: r.name, type: r.type, size: r.size,
      date: new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "long" }).format(r.created_at),
    });
    res.json(out);
  });

  app.post("/me/materials", requireUser, only("teacher", "admin"), async (req, res) => {
    const { subject, name, type, size } = req.body || {};
    if (!str(subject, 80) || !str(name, 200) || (type !== undefined && !str(type, 20)) || (size !== undefined && !str(size, 20))) return bad(res);
    await pool.query("INSERT INTO teacher_materials (user_id, subject, name, type, size) VALUES ($1,$2,$3,$4,$5)",
      [req.user.id, subject.trim(), name.trim(), type || "other", size || ""]);
    res.status(201).json({ ok: true });
  });

  const ownGroup = (u, code) => { const g = myGroups(u); return g === null || g.includes(code); };

  app.post("/me/grade-entries", requireUser, only("teacher", "admin"), async (req, res) => {
    const { groupCode, entries } = req.body || {};
    if (!str(groupCode, 40) || !ownGroup(req.user, groupCode) || !Array.isArray(entries) || entries.length === 0 || entries.length > 100 ||
        !entries.every(e => e && str(e.student, 120) && ["5", "4", "3", "2", "н"].includes(String(e.value)))) return bad(res);
    for (const e of entries) {
      await pool.query("INSERT INTO grade_entries (teacher_id, group_code, student_name, value) VALUES ($1,$2,$3,$4)",
        [req.user.id, groupCode, e.student, String(e.value)]);
    }
    res.status(201).json({ saved: entries.length });
  });

  app.post("/me/group-messages", requireUser, only("teacher", "admin"), async (req, res) => {
    const { groupCode, body } = req.body || {};
    if (!str(groupCode, 40) || !ownGroup(req.user, groupCode) || !str(body, 1000)) return bad(res);
    await pool.query("INSERT INTO group_messages (teacher_id, group_code, body) VALUES ($1,$2,$3)", [req.user.id, groupCode, body.trim()]);
    res.status(201).json({ ok: true });
  });

  // ── Applicants: public form, strictly rate-limited and size-capped ─────────
  const applyLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
  app.post("/applications", applyLimiter, async (req, res) => {
    const data = req.body;
    if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0 || JSON.stringify(data).length > 20000) return bad(res);
    const { rows } = await pool.query("INSERT INTO applications (data) VALUES ($1) RETURNING id", [data]);
    res.status(201).json({ id: Number(rows[0].id) });
  });
};
