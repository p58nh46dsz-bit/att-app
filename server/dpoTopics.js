// DPO course topics. A teacher writes the topic and its programme and sends it to the methodist. The methodist returns it
// for rework (with a remark) or approves it. An approved topic is sent by the teacher to a deputy director (a staff
// account), who sees the topics sent to him on the administration's dashboard.
const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const pool = require("./db");

// Files of a topic's programme: raw bytes on the server's disk (FILES_DIR/dpo-topic/<file id>), opened through a
// two-minute link made for that one file, as the other files of the app are.
const FILES_DIR = process.env.FILES_DIR || path.join(__dirname, "uploads");
const MAX_FILE = 25 * 1024 * 1024;
const fileOf = id => path.join(FILES_DIR, "dpo-topic", String(id));
const rawBody = express.raw({ type: () => true, limit: MAX_FILE });

const TOPIC_KINDS = {
  "ДПО": { min: 16, max: 200 },
  "Профессиональная подготовка": { min: 16, max: 144 },
  "Профессиональная переподготовка": { min: 250, max: null },
};

const bad = (res, msg = "bad request") => res.status(400).json({ error: msg });
const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const isId = v => /^\d{1,15}$/.test(String(v));
const isUuid = v => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const fullName = (last, first, middle) => [last, first, middle].filter(Boolean).join(" ");

// Columns shared by every list: the topic, its teacher and its recipient.
const SELECT_TOPICS = `
  SELECT t.id, t.title, t.category, t.hours, t.programme, t.status, t.remark, t.recipient_id, t.created_at, t.updated_at, t.sent_at,
         t.teacher_id, tu.last_name AS t_last, tu.first_name AS t_first, tu.middle_name AS t_middle,
         ru.last_name AS r_last, ru.first_name AS r_first, ru.middle_name AS r_middle
  FROM dpo_topics t
  JOIN users tu ON tu.id = t.teacher_id
  LEFT JOIN users ru ON ru.id = t.recipient_id`;

const topicOut = r => ({
  id: Number(r.id), title: r.title, category: r.category, hours: r.hours, programme: r.programme, status: r.status, remark: r.remark,
  teacher: fullName(r.t_last, r.t_first, r.t_middle), teacherId: r.teacher_id,
  recipient: r.recipient_id ? fullName(r.r_last, r.r_first, r.r_middle) : "",
  createdAt: r.created_at, updatedAt: r.updated_at, sentAt: r.sent_at,
});

// Adds the files of each topic in the list (one query for the whole list).
async function withFiles(list) {
  if (!list.length) return list;
  const { rows } = await pool.query(
    "SELECT id, topic_id, name, bytes, stored FROM dpo_topic_files WHERE topic_id = ANY($1) AND stored ORDER BY id", [list.map(t => t.id)]);
  for (const t of list) t.files = rows.filter(f => Number(f.topic_id) === t.id).map(f => ({ id: Number(f.id), name: f.name, bytes: f.bytes }));
  return list;
}

module.exports = function registerDpoTopics(app, requireUser) {
  const only = (...roles) => (req, res, next) => (roles.includes(req.user.role) ? next() : res.status(403).json({ error: "forbidden" }));
  const notifyTeacher = (teacherId, msg) => pool.query(
    "INSERT INTO notifications (audience, user_id, cls, icon, msg) VALUES ('teacher', $1, '', 'file-text', $2)", [teacherId, msg.slice(0, 400)]);

  // Parses the editable fields of a topic. Returns { value } or { error }.
  function parseTopic(b) {
    const title = clean(b.title, 200);
    if (!title) return { error: "Укажите название темы." };
    // The kind of programme and the hours it allows: ДПО 12–200, professional training 12–144, retraining from 200.
    const kind = TOPIC_KINDS[clean(b.category, 120)];
    if (!kind) return { error: "Выберите вид программы." };
    const hours = Number(b.hours);
    if (!Number.isInteger(hours) || hours < kind.min || (kind.max !== null && hours > kind.max)) return { error: kind.max ? `Для этого вида от ${kind.min} до ${kind.max} академических часов.` : `Для этого вида от ${kind.min} часов.` };
    return { value: { title, category: clean(b.category, 120), hours, programme: typeof b.programme === "string" ? b.programme.trim().slice(0, 20000) : "" } };
  }

  // ── Teacher ─────────────────────────────────────────────────────────────────────────────────────────────────
  app.get("/me/dpo-topics", requireUser, only("teacher"), async (req, res) => {
    const { rows } = await pool.query(`${SELECT_TOPICS} WHERE t.teacher_id = $1 ORDER BY t.updated_at DESC`, [req.user.id]);
    res.json(await withFiles(rows.map(topicOut)));
  });

  app.post("/me/dpo-topics", requireUser, only("teacher"), async (req, res) => {
    const { value, error } = parseTopic(req.body || {});
    if (error) return bad(res, error);
    const { rows } = await pool.query(
      `INSERT INTO dpo_topics (teacher_id, title, category, hours, programme) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [req.user.id, value.title, value.category, value.hours, value.programme]);
    res.status(201).json({ id: Number(rows[0].id) });
  });

  // Editing is allowed while the topic is a draft or was returned for rework.
  app.put("/me/dpo-topics/:id", requireUser, only("teacher"), async (req, res) => {
    if (!isId(req.params.id)) return bad(res);
    const cur = (await pool.query("SELECT id, status FROM dpo_topics WHERE id = $1 AND teacher_id = $2", [req.params.id, req.user.id])).rows[0];
    if (!cur) return res.status(404).json({ error: "Тема не найдена." });
    if (!["draft", "returned"].includes(cur.status)) return res.status(409).json({ error: "Тему сейчас нельзя изменить: она на проверке или утверждена." });
    const { value, error } = parseTopic(req.body || {});
    if (error) return bad(res, error);
    await pool.query(
      "UPDATE dpo_topics SET title = $2, category = $3, hours = $4, programme = $5, updated_at = now() WHERE id = $1",
      [cur.id, value.title, value.category, value.hours, value.programme]);
    res.json({ ok: true });
  });

  // The programme goes to the methodist. It must have text.
  app.post("/me/dpo-topics/:id/submit", requireUser, only("teacher"), async (req, res) => {
    if (!isId(req.params.id)) return bad(res);
    const cur = (await pool.query("SELECT id, status, programme FROM dpo_topics WHERE id = $1 AND teacher_id = $2", [req.params.id, req.user.id])).rows[0];
    if (!cur) return res.status(404).json({ error: "Тема не найдена." });
    if (!["draft", "returned"].includes(cur.status)) return res.status(409).json({ error: "Тема уже отправлена на проверку." });
    // The programme is the text or an attached file (or both): something must be there.
    const files = (await pool.query("SELECT count(*)::int AS n FROM dpo_topic_files WHERE topic_id = $1 AND stored", [cur.id])).rows[0].n;
    if (!cur.programme.trim() && files === 0) return bad(res, "Добавьте программу: текст или файл.");
    await pool.query("UPDATE dpo_topics SET status = 'review', remark = '', updated_at = now() WHERE id = $1", [cur.id]);
    res.json({ ok: true });
  });

  // Staff accounts the approved topic can be sent to (the deputy director among them).
  app.get("/me/dpo-recipients", requireUser, only("teacher"), async (_req, res) => {
    const { rows } = await pool.query(
      "SELECT id, last_name, first_name, middle_name FROM users WHERE role = 'staff' ORDER BY last_name, first_name");
    res.json(rows.map(r => ({ id: r.id, name: fullName(r.last_name, r.first_name, r.middle_name) })));
  });

  // Sends an approved topic to a deputy director.
  app.post("/me/dpo-topics/:id/send", requireUser, only("teacher"), async (req, res) => {
    if (!isId(req.params.id) || !isUuid(req.body && req.body.recipient_id)) return bad(res);
    const cur = (await pool.query("SELECT id, status FROM dpo_topics WHERE id = $1 AND teacher_id = $2", [req.params.id, req.user.id])).rows[0];
    if (!cur) return res.status(404).json({ error: "Тема не найдена." });
    if (cur.status !== "approved" && cur.status !== "sent") return bad(res, "Отправить можно только утверждённую тему.");
    const rec = (await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'staff'", [req.body.recipient_id])).rows[0];
    if (!rec) return bad(res, "Выберите сотрудника администрации.");
    await pool.query("UPDATE dpo_topics SET status = 'sent', recipient_id = $2, sent_at = now(), updated_at = now() WHERE id = $1", [cur.id, rec.id]);
    res.json({ ok: true });
  });

  // ── Methodist ───────────────────────────────────────────────────────────────────────────────────────────────
  // Topics waiting for review come first, then the rest.
  app.get("/methodist/dpo-topics", requireUser, only("methodist"), async (_req, res) => {
    const { rows } = await pool.query(`${SELECT_TOPICS} ORDER BY (t.status = 'review') DESC, t.updated_at DESC`);
    res.json(await withFiles(rows.map(topicOut)));
  });

  // Returns the topic for rework. The remark is required: the teacher must know what to change.
  app.post("/methodist/dpo-topics/:id/return", requireUser, only("methodist"), async (req, res) => {
    if (!isId(req.params.id)) return bad(res);
    const remark = clean((req.body || {}).remark, 2000);
    if (!remark) return bad(res, "Напишите, что нужно исправить.");
    const cur = (await pool.query("SELECT id, title, teacher_id, status FROM dpo_topics WHERE id = $1", [req.params.id])).rows[0];
    if (!cur) return res.status(404).json({ error: "Тема не найдена." });
    if (cur.status !== "review") return bad(res, "Тема сейчас не на проверке.");
    await pool.query("UPDATE dpo_topics SET status = 'returned', remark = $2, updated_at = now() WHERE id = $1", [cur.id, remark]);
    await notifyTeacher(cur.teacher_id, `Методист вернул тему «${cur.title}» на доработку: ${remark}`);
    res.json({ ok: true });
  });

  app.post("/methodist/dpo-topics/:id/approve", requireUser, only("methodist"), async (req, res) => {
    if (!isId(req.params.id)) return bad(res);
    const cur = (await pool.query("SELECT id, title, teacher_id, status FROM dpo_topics WHERE id = $1", [req.params.id])).rows[0];
    if (!cur) return res.status(404).json({ error: "Тема не найдена." });
    if (cur.status !== "review") return bad(res, "Тема сейчас не на проверке.");
    await pool.query("UPDATE dpo_topics SET status = 'approved', remark = '', updated_at = now() WHERE id = $1", [cur.id]);
    await notifyTeacher(cur.teacher_id, `Методист утвердил тему «${cur.title}». Теперь её можно отправить заместителю директора.`);
    res.json({ ok: true });
  });

  // ── Staff ───────────────────────────────────────────────────────────────────────────────────────────────────
  // ── Files of the programme ──────────────────────────────────────────────────────────────────────────────
  // The teacher adds and removes files while the topic is a draft or was returned for rework.
  app.put("/me/dpo-topics/:id/files", requireUser, only("teacher"), rawBody, async (req, res) => {
    if (!isId(req.params.id)) return bad(res);
    let name = "";
    try { name = decodeURIComponent(String(req.headers["x-file-name"] || "")).trim().slice(0, 200); } catch { /* bad name */ }
    if (!name) return bad(res, "Укажите имя файла.");
    if (!Buffer.isBuffer(req.body) || !req.body.length) return bad(res, "Файл пустой.");
    const t = (await pool.query("SELECT id, status FROM dpo_topics WHERE id = $1 AND teacher_id = $2", [req.params.id, req.user.id])).rows[0];
    if (!t) return res.status(404).json({ error: "Тема не найдена." });
    if (!["draft", "returned"].includes(t.status)) return res.status(409).json({ error: "Файлы можно менять, пока тема не отправлена методисту." });
    const mime = String(req.headers["content-type"] || "application/octet-stream").slice(0, 100);
    const { rows } = await pool.query("INSERT INTO dpo_topic_files (topic_id, name, mime, bytes) VALUES ($1,$2,$3,$4) RETURNING id",
      [t.id, name, mime, req.body.length]);
    await fs.promises.mkdir(path.dirname(fileOf(rows[0].id)), { recursive: true });
    await fs.promises.writeFile(fileOf(rows[0].id), req.body);
    await pool.query("UPDATE dpo_topic_files SET stored = true WHERE id = $1", [rows[0].id]);
    await pool.query("UPDATE dpo_topics SET updated_at = now() WHERE id = $1", [t.id]);
    res.status(201).json({ id: Number(rows[0].id) });
  });

  app.delete("/me/dpo-topic-files/:fid", requireUser, only("teacher"), async (req, res) => {
    if (!isId(req.params.fid)) return bad(res);
    const f = (await pool.query(
      "SELECT f.id, t.status FROM dpo_topic_files f JOIN dpo_topics t ON t.id = f.topic_id WHERE f.id = $1 AND t.teacher_id = $2", [req.params.fid, req.user.id])).rows[0];
    if (!f) return res.status(404).json({ error: "Файл не найден." });
    if (!["draft", "returned"].includes(f.status)) return res.status(409).json({ error: "Файлы можно менять, пока тема не отправлена методисту." });
    await pool.query("DELETE FROM dpo_topic_files WHERE id = $1", [f.id]);
    await fs.promises.rm(fileOf(f.id), { force: true });
    res.status(204).end();
  });

  // Who may open a file: the teacher who wrote the topic, the methodist, the administrator, and the deputy director it was sent to.
  const fileAccess = async (u, fid) => {
    const r = (await pool.query(
      "SELECT f.id, f.name, f.mime, f.stored, t.teacher_id, t.status, t.recipient_id FROM dpo_topic_files f JOIN dpo_topics t ON t.id = f.topic_id WHERE f.id = $1", [fid])).rows[0];
    if (!r || !r.stored) return null;
    const ok = u.role === "admin" || u.role === "methodist" || (u.role === "teacher" && r.teacher_id === u.id)
      || (u.role === "staff" && r.status === "sent" && r.recipient_id === u.id);
    return ok ? r : null;
  };
  app.get("/dpo-topic-files/:fid/link", requireUser, async (req, res) => {
    if (!isId(req.params.fid)) return bad(res);
    if (!(await fileAccess(req.user, req.params.fid))) return res.status(404).json({ error: "not found" });
    const k = jwt.sign({ k: "dpo-topic", f: String(req.params.fid) }, process.env.JWT_SECRET, { expiresIn: "2m" });
    res.json({ url: `/dpo-topic-files/${req.params.fid}/file?k=${encodeURIComponent(k)}` });
  });

  app.get("/dpo-topic-files/:fid/file", async (req, res) => {
    if (!isId(req.params.fid)) return bad(res);
    try {
      const t = jwt.verify(String(req.query.k || ""), process.env.JWT_SECRET);
      if (t.k !== "dpo-topic" || t.f !== String(req.params.fid)) throw new Error("other file");
    } catch { return res.status(404).json({ error: "not found" }); }
    const r = (await pool.query("SELECT name, mime, stored FROM dpo_topic_files WHERE id = $1", [req.params.fid])).rows[0];
    if (!r || !r.stored) return res.status(404).json({ error: "not found" });
    res.setHeader("Content-Type", r.mime || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(r.name)}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    fs.createReadStream(fileOf(req.params.fid)).on("error", () => res.status(404).end()).pipe(res);
  });

  // The topics sent to the signed-in staff member (the administrator sees all of them).
  app.get("/staff/dpo-topics", requireUser, only("staff", "admin"), async (req, res) => {
    const admin = req.user.role === "admin";
    const { rows } = await pool.query(
      `${SELECT_TOPICS} WHERE t.status = 'sent' AND ($1 OR t.recipient_id = $2) ORDER BY t.sent_at DESC`,
      [admin, admin ? null : req.user.id]);
    res.json(await withFiles(rows.map(topicOut)));
  });
};
