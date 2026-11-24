// What a teacher manages besides the timetable and the journal:
//  * coursework: topics given to a group, the works the students hand in (files), a mark or "back for revision";
//  * ДПО: the programmes a teacher leads: who signed up, the materials (files) and the tests with their results.
// Files are kept on the server's disk (FILES_DIR/coursework/<work id>, FILES_DIR/dpo/<material id>) and opened
// through a two-minute link made for that one file, because the phone's viewer cannot send the sign-in token.
const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const pool = require("./db");

const only = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: "forbidden" });
const bad = (res, msg = "bad request") => res.status(400).json({ error: msg });
const str = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const ID_RE = /^\d{1,18}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const FILES_DIR = process.env.FILES_DIR || path.join(__dirname, "uploads");
const MAX_FILE = 25 * 1024 * 1024;
const fileOf = (kind, id) => path.join(FILES_DIR, kind, String(id));
const person = r => [r.last_name, r.first_name, r.middle_name].filter(Boolean).join(" ");

module.exports = function registerManage(app, requireUser) {
  const notify = (audience, userId, cls, icon, msg) => pool.query(
    "INSERT INTO notifications (audience, user_id, cls, icon, msg) VALUES ($1,$2,$3,$4,$5)", [audience, userId, cls, icon, msg.slice(0, 400)]);

  function sendFile(res, kind, row) {
    res.setHeader("Content-Type", row.mime || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(row.name)}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    fs.createReadStream(fileOf(kind, row.id)).on("error", () => res.status(404).end()).pipe(res);
  }
  // One pair of routes per kind of file: /<base>/:id/link (signed in) gives a link, /<base>/:id/file?k= serves it.
  function fileRoutes(base, kind, load, mayOpen) {
    app.get(`${base}/:id/link`, requireUser, async (req, res) => {
      if (!ID_RE.test(req.params.id)) return bad(res);
      const row = await load(req.params.id);
      if (!row || !row.stored || !(await mayOpen(req.user, row))) return res.status(404).json({ error: "not found" });
      const k = jwt.sign({ k: kind, f: req.params.id }, process.env.JWT_SECRET, { expiresIn: "2m" });
      res.json({ url: `${base}/${req.params.id}/file?k=${encodeURIComponent(k)}` });
    });
    app.get(`${base}/:id/file`, async (req, res) => {
      if (!ID_RE.test(req.params.id)) return bad(res);
      try {
        const t = jwt.verify(String(req.query.k || ""), process.env.JWT_SECRET);
        if (t.k !== kind || t.f !== req.params.id) throw new Error("other file");
      } catch { return res.status(404).json({ error: "not found" }); }
      const row = await load(req.params.id);
      if (!row || !row.stored) return res.status(404).json({ error: "not found" });
      sendFile(res, kind, row);
    });
  }
  async function saveFile(req, kind, id) {
    const body = req.body;
    if (!Buffer.isBuffer(body) || !body.length) return null;
    await fs.promises.mkdir(path.dirname(fileOf(kind, id)), { recursive: true });
    await fs.promises.writeFile(fileOf(kind, id), body);
    return { mime: String(req.headers["content-type"] || "application/octet-stream").slice(0, 100), bytes: body.length };
  }
  const rawBody = express.raw({ type: () => true, limit: MAX_FILE });

  // ── Coursework: the teacher's side ────────────────────────────────────────────────────────────────────
  const ownTopic = async (u, id) => (await pool.query("SELECT * FROM coursework_topics WHERE id = $1 AND teacher_id = $2", [id, u.id])).rows[0];

  app.get("/me/coursework", requireUser, only("teacher"), async (req, res) => {
    const { rows } = await pool.query(
      `SELECT t.id, t.group_name, s.name AS subject, t.title, t.descr, to_char(t.due, 'YYYY-MM-DD') AS due,
              (SELECT count(*) FROM group_students g WHERE g.group_code = t.group_name)::int AS total,
              count(w.id) FILTER (WHERE w.status = 'submitted')::int AS waiting,
              count(w.id) FILTER (WHERE w.status = 'revision')::int AS revision,
              count(w.id) FILTER (WHERE w.status = 'accepted')::int AS accepted
       FROM coursework_topics t LEFT JOIN subjects s ON s.id = t.subject_id LEFT JOIN coursework_works w ON w.topic_id = t.id
       WHERE t.teacher_id = $1 GROUP BY t.id, s.name ORDER BY t.created_at DESC`, [req.user.id]);
    res.json(rows.map(r => ({ id: Number(r.id), group: r.group_name, subject: r.subject, title: r.title, descr: r.descr, due: r.due,
      total: r.total, waiting: r.waiting, revision: r.revision, accepted: r.accepted })));
  });

  app.post("/me/coursework", requireUser, only("teacher"), async (req, res) => {
    const { group, subject, title, descr, due } = req.body || {};
    if (!str(group, 40) || !str(title, 200) || (descr !== undefined && (typeof descr !== "string" || descr.length > 2000))
      || (due !== undefined && due !== null && due !== "" && !DAY_RE.test(String(due)))) return bad(res);
    if (!(await pool.query("SELECT 1 FROM teacher_groups WHERE teacher_id = $1 AND group_code = $2", [req.user.id, group.trim()])).rowCount)
      return res.status(403).json({ error: "Это не ваша группа. Добавьте её в «Группы и предметы»." });
    let subjectId = null;
    if (subject) {
      const s = (await pool.query("SELECT id FROM subjects WHERE lower(name) = lower($1)", [String(subject).trim()])).rows[0];
      if (!s) return bad(res, "unknown subject");
      subjectId = s.id;
    }
    const choices = Array.isArray(req.body.choices) ? req.body.choices.map(c => (typeof c === "string" ? c.trim() : "")).filter(Boolean) : [];
    if (choices.length > 60 || choices.some(c => c.length > 300)) return bad(res, "too many tasks or too long");
    const client = await pool.connect();
    let topicId;
    try {
      await client.query("BEGIN");
      topicId = (await client.query(
        "INSERT INTO coursework_topics (teacher_id, group_name, subject_id, title, descr, due) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
        [req.user.id, group.trim(), subjectId, title.trim(), (descr || "").trim(), due || null])).rows[0].id;
      for (let i = 0; i < choices.length; i++) await client.query("INSERT INTO coursework_choices (topic_id, position, title) VALUES ($1,$2,$3)", [topicId, i, choices[i]]);
      await client.query("COMMIT");
    } catch (err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
    const rows = [{ id: topicId }];
    const students = await pool.query("SELECT user_id FROM group_students WHERE group_code = $1 AND user_id IS NOT NULL", [group.trim()]);
    for (const s of students.rows) await notify("student", s.user_id, "", "file-text", `Курсовая: «${title.trim()}»${due ? `, срок до ${String(due).split("-").reverse().join(".")}` : ""}`);
    res.status(201).json({ id: Number(rows[0].id) });
  });

  app.delete("/me/coursework/:id", requireUser, only("teacher"), async (req, res) => {
    if (!ID_RE.test(req.params.id)) return bad(res);
    const works = await pool.query("SELECT w.id FROM coursework_works w JOIN coursework_topics t ON t.id = w.topic_id WHERE t.id = $1 AND t.teacher_id = $2", [req.params.id, req.user.id]);
    const r = await pool.query("DELETE FROM coursework_topics WHERE id = $1 AND teacher_id = $2", [req.params.id, req.user.id]);
    for (const w of works.rows) await fs.promises.rm(fileOf("coursework", w.id), { force: true });
    res.status(r.rowCount ? 204 : 404).end();
  });

  // A topic with every student of the group and their work (or none yet).
  app.get("/me/coursework/:id", requireUser, only("teacher"), async (req, res) => {
    if (!ID_RE.test(req.params.id)) return bad(res);
    const t = await ownTopic(req.user, req.params.id);
    if (!t) return res.status(404).json({ error: "not found" });
    const { rows } = await pool.query(
      `SELECT g.display_name, u.last_name, u.first_name, u.middle_name, g.user_id, w.id AS work_id, w.name AS file, w.status, w.grade, w.comment, w.stored, w.bytes, w.submitted_at
       FROM group_students g LEFT JOIN users u ON u.id = g.user_id
       LEFT JOIN coursework_works w ON w.student_id = g.user_id AND w.topic_id = $1
       WHERE g.group_code = $2 ORDER BY g.position, u.last_name, g.display_name`, [t.id, t.group_name]);
    const chRows = (await pool.query(
      `SELECT c.id, c.title, u.last_name, u.first_name, u.middle_name FROM coursework_choices c
       LEFT JOIN coursework_works w ON w.choice_id = c.id LEFT JOIN users u ON u.id = w.student_id
       WHERE c.topic_id = $1 ORDER BY c.position`, [t.id])).rows;
    res.json({
      id: Number(t.id), group: t.group_name, title: t.title, descr: t.descr,
      due: t.due ? new Date(t.due.getTime() - t.due.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : null,
      choices: chRows.map(c => ({ id: Number(c.id), title: c.title, taken: c.last_name ? person(c) : null })),
      students: rows.map(r => ({ name: r.last_name ? person(r) : (r.display_name || "Без имени"), hasAccount: !!r.user_id,
        work: r.work_id ? { id: Number(r.work_id), file: r.file, status: r.status, grade: r.grade, comment: r.comment, stored: r.stored, bytes: r.bytes, at: r.submitted_at } : null })),
    });
  });

  // The teacher's decision on a work: accepted with a mark (2–5), or back for revision with a comment.
  app.put("/me/coursework/works/:id", requireUser, only("teacher"), async (req, res) => {
    if (!ID_RE.test(req.params.id)) return bad(res);
    const { status, grade, comment } = req.body || {};
    if (!["accepted", "revision"].includes(status) || (comment !== undefined && (typeof comment !== "string" || comment.length > 1000))) return bad(res);
    if (status === "accepted" && !(Number.isInteger(grade) && grade >= 2 && grade <= 5)) return bad(res, "grade 2–5 required");
    const w = (await pool.query(
      `SELECT w.id, w.student_id, w.status, t.title, t.subject_id, t.group_name FROM coursework_works w JOIN coursework_topics t ON t.id = w.topic_id
       WHERE w.id = $1 AND t.teacher_id = $2`, [req.params.id, req.user.id])).rows[0];
    if (!w) return res.status(404).json({ error: "not found" });
    if (w.status === "booked") return res.status(409).json({ error: "Работа ещё не сдана" });
    await pool.query("UPDATE coursework_works SET status = $2, grade = $3, comment = $4, updated_at = now() WHERE id = $1",
      [w.id, status, status === "accepted" ? grade : null, (comment || "").trim()]);
    await pool.query("DELETE FROM grade_records WHERE coursework_work_id = $1", [w.id]);
    if (status === "accepted" && w.subject_id) {
      const place = (await pool.query("SELECT id FROM group_students WHERE user_id = $1 AND group_code = $2", [w.student_id, w.group_name])).rows[0];
      if (place) await pool.query(
        `INSERT INTO grade_records (student_id, subject_id, teacher_id, kind, value, work_date, coursework_work_id)
         VALUES ($1,$2,$3,'Курсовая',$4,current_date,$5) ON CONFLICT DO NOTHING`, [place.id, w.subject_id, req.user.id, grade, w.id]);
    }
    await notify("student", w.student_id, status === "accepted" ? (grade >= 4 ? "green" : grade === 3 ? "amber" : "red") : "amber", "check",
      status === "accepted" ? `Курсовая «${w.title}» принята, оценка ${grade}${comment ? `. ${comment.trim()}` : ""}` : `Курсовая «${w.title}» возвращена на доработку${comment ? `: ${comment.trim()}` : ""}`);
    res.json({ ok: true });
  });

  // ── Coursework: the student's side ────────────────────────────────────────────────────────────────────
  app.get("/me/coursework-student", requireUser, only("student"), async (req, res) => {
    const { rows } = await pool.query(
      `SELECT t.id, s.name AS subject, t.title, t.descr, to_char(t.due, 'YYYY-MM-DD') AS due,
              u.last_name, u.first_name, u.middle_name,
              w.id AS work_id, w.name AS file, w.status, w.grade, w.comment, w.stored
       FROM coursework_topics t JOIN users u ON u.id = t.teacher_id LEFT JOIN subjects s ON s.id = t.subject_id
       LEFT JOIN coursework_works w ON w.topic_id = t.id AND w.student_id = $1
       WHERE t.group_name = $2 ORDER BY t.created_at DESC`, [req.user.id, req.user.group_code || ""]);
    const ch = (await pool.query(
      `SELECT c.id, c.topic_id, c.title, w.student_id FROM coursework_choices c JOIN coursework_topics t ON t.id = c.topic_id
       LEFT JOIN coursework_works w ON w.choice_id = c.id WHERE t.group_name = $1 ORDER BY c.position`, [req.user.group_code || ""])).rows;
    const byTopic = new Map();
    for (const c of ch) {
      const k = String(c.topic_id);
      (byTopic.get(k) || byTopic.set(k, []).get(k)).push({ id: Number(c.id), title: c.title, taken: c.student_id != null, mine: c.student_id === req.user.id });
    }
    res.json(rows.map(r => ({ id: Number(r.id), subject: r.subject, title: r.title, descr: r.descr, due: r.due, teacher: person(r), choices: byTopic.get(String(r.id)) || [],
      work: r.work_id ? { id: Number(r.work_id), file: r.file, status: r.status, grade: r.grade, comment: r.comment, stored: r.stored } : null })));
  });

  // The student takes a free task of the topic (choice: its id) or gives his task up (choice: null).
  app.put("/me/coursework/:topicId/choice", requireUser, only("student"), async (req, res) => {
    if (!ID_RE.test(req.params.topicId)) return bad(res);
    const cid = req.body ? req.body.choice : undefined;
    if (cid !== null && !(Number.isInteger(cid) && cid > 0)) return bad(res);
    const t = (await pool.query("SELECT id, group_name FROM coursework_topics WHERE id = $1", [req.params.topicId])).rows[0];
    if (!t || t.group_name !== req.user.group_code) return res.status(404).json({ error: "not found" });
    if (cid !== null && !(await pool.query("SELECT 1 FROM coursework_choices WHERE id = $1 AND topic_id = $2", [cid, t.id])).rowCount)
      return bad(res, "unknown task");
    const cur = (await pool.query("SELECT id, status FROM coursework_works WHERE topic_id = $1 AND student_id = $2", [t.id, req.user.id])).rows[0];
    if (cur && cur.status !== "booked") return res.status(409).json({ error: "Работа уже сдана по этой теме, сменить тему нельзя" });
    try {
      if (cid === null) {
        if (cur) await pool.query("DELETE FROM coursework_works WHERE id = $1", [cur.id]);
      } else if (cur) {
        await pool.query("UPDATE coursework_works SET choice_id = $2, updated_at = now() WHERE id = $1", [cur.id, cid]);
      } else {
        await pool.query("INSERT INTO coursework_works (topic_id, student_id, name, status, choice_id) VALUES ($1,$2,'','booked',$3)", [t.id, req.user.id, cid]);
      }
    } catch (err) {
      if (err.code === "23505") return res.status(409).json({ error: "Эта тема уже занята" });
      throw err;
    }
    res.json({ ok: true, choice: cid });
  });

  // The student hands in (or replaces) the file: raw bytes, the name in x-file-name (URI-encoded).
  app.put("/me/coursework/:topicId/work", requireUser, only("student"), rawBody, async (req, res) => {
    if (!ID_RE.test(req.params.topicId)) return bad(res);
    let name = "";
    try { name = decodeURIComponent(String(req.headers["x-file-name"] || "")).trim().slice(0, 200); } catch { /* bad name */ }
    if (!name) return bad(res, "file name required");
    if (!Buffer.isBuffer(req.body) || !req.body.length) return bad(res, "empty file");
    const t = (await pool.query("SELECT id, teacher_id, title, group_name FROM coursework_topics WHERE id = $1", [req.params.topicId])).rows[0];
    if (!t || t.group_name !== req.user.group_code) return res.status(404).json({ error: "not found" });
    const old = (await pool.query("SELECT id, status, choice_id FROM coursework_works WHERE topic_id = $1 AND student_id = $2", [t.id, req.user.id])).rows[0];
    const hasTasks = (await pool.query("SELECT 1 FROM coursework_choices WHERE topic_id = $1 LIMIT 1", [t.id])).rowCount > 0;
    if (hasTasks && !(old && old.choice_id)) return bad(res, "Сначала выберите тему");
    if (old && old.status === "accepted") return res.status(409).json({ error: "Работа уже принята, оценка выставлена" });
    const { rows } = await pool.query(
      `INSERT INTO coursework_works (topic_id, student_id, name) VALUES ($1,$2,$3)
       ON CONFLICT (topic_id, student_id) DO UPDATE SET name = EXCLUDED.name, status = 'submitted', grade = NULL, comment = '', stored = false, submitted_at = now(), updated_at = now()
       RETURNING id`, [t.id, req.user.id, name]);
    const saved = await saveFile(req, "coursework", rows[0].id);
    await pool.query("UPDATE coursework_works SET mime = $2, bytes = $3, stored = true WHERE id = $1", [rows[0].id, saved.mime, saved.bytes]);
    await notify("teacher", t.teacher_id, "", "file-text", `${person(req.user)} (${t.group_name}) сдал(а) курсовую «${t.title}»`);
    res.json({ id: Number(rows[0].id) });
  });

  fileRoutes("/coursework/works", "coursework",
    async id => (await pool.query(
      `SELECT w.id, w.name, w.mime, w.stored, w.student_id, t.teacher_id FROM coursework_works w JOIN coursework_topics t ON t.id = w.topic_id WHERE w.id = $1`, [id])).rows[0],
    async (u, w) => u.role === "admin" || w.student_id === u.id || w.teacher_id === u.id);

  // ── ДПО: the teacher's programmes ─────────────────────────────────────────────────────────────────────
  const leads = async (u, id) => (await pool.query("SELECT 1 FROM dpo_program_teachers WHERE program_id = $1 AND teacher_id = $2", [id, u.id])).rowCount > 0;

  app.get("/me/dpo", requireUser, only("teacher"), async (req, res) => {
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.category,
              EXISTS (SELECT 1 FROM dpo_program_teachers t WHERE t.program_id = p.id AND t.teacher_id = $1) AS led,
              (SELECT count(*) FROM dpo_registrations r WHERE r.program_id = p.id)::int AS signed,
              (SELECT count(*) FROM dpo_materials m WHERE m.program_id = p.id)::int AS materials,
              (SELECT count(*) FROM dpo_tests t WHERE t.program_id = p.id)::int AS tests
       FROM dpo_programs p ORDER BY p.position`, [req.user.id]);
    res.json(rows);
  });

  app.put("/me/dpo/:id/lead", requireUser, only("teacher"), async (req, res) => {
    const on = req.body && req.body.on;
    if (typeof on !== "boolean" || !str(req.params.id, 80)) return bad(res);
    if (!(await pool.query("SELECT 1 FROM dpo_programs WHERE id = $1", [req.params.id])).rowCount) return res.status(404).json({ error: "not found" });
    if (on) await pool.query("INSERT INTO dpo_program_teachers (program_id, teacher_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [req.params.id, req.user.id]);
    else await pool.query("DELETE FROM dpo_program_teachers WHERE program_id = $1 AND teacher_id = $2", [req.params.id, req.user.id]);
    res.json({ ok: true, led: on });
  });

  app.get("/me/dpo/:id", requireUser, only("teacher"), async (req, res) => {
    if (!(await leads(req.user, req.params.id))) return res.status(403).json({ error: "Вы не ведёте эту программу" });
    const id = req.params.id;
    const [prog, regs, mats, tests, questions, options, results] = await Promise.all([
      pool.query("SELECT id, title, category, descr, hours_count FROM dpo_programs WHERE id = $1", [id]),
      pool.query(`SELECT u.last_name, u.first_name, u.middle_name, u.group_code, r.created_at FROM dpo_registrations r JOIN users_v u ON u.id = r.user_id
                  WHERE r.program_id = $1 ORDER BY r.created_at`, [id]),
      pool.query("SELECT id, name, type, size, date_label, stored FROM dpo_materials WHERE program_id = $1 ORDER BY position, id", [id]),
      pool.query("SELECT id, title FROM dpo_tests WHERE program_id = $1 ORDER BY position, id", [id]),
      pool.query("SELECT q.id, q.test_id, q.text, q.correct_idx FROM dpo_questions q JOIN dpo_tests t ON t.id = q.test_id WHERE t.program_id = $1 ORDER BY q.position, q.id", [id]),
      pool.query("SELECT o.question_id, o.text FROM dpo_options o JOIN dpo_questions q ON q.id = o.question_id JOIN dpo_tests t ON t.id = q.test_id WHERE t.program_id = $1 ORDER BY o.position", [id]),
      pool.query(`SELECT r.test_id, r.score, r.taken_at, u.last_name, u.first_name, u.group_code FROM test_results r JOIN users_v u ON u.id = r.user_id
                  JOIN dpo_tests t ON t.id = r.test_id WHERE t.program_id = $1 ORDER BY r.taken_at DESC`, [id]),
    ]);
    if (!prog.rows[0]) return res.status(404).json({ error: "not found" });
    const opts = new Map();
    for (const o of options.rows) (opts.get(o.question_id) || opts.set(o.question_id, []).get(o.question_id)).push(o.text);
    res.json({
      ...prog.rows[0],
      registrations: regs.rows.map(r => ({ name: person(r), group: r.group_code, at: r.created_at })),
      materials: mats.rows.map(m => ({ id: Number(m.id), name: m.name, type: m.type, size: m.size, date: m.date_label, stored: m.stored })),
      tests: tests.rows.map(t => ({
        id: Number(t.id), title: t.title,
        questions: questions.rows.filter(q => q.test_id === t.id).map(q => ({ q: q.text, options: opts.get(q.id) || [], correct: q.correct_idx })),
        results: results.rows.filter(r => r.test_id === t.id).map(r => ({ name: `${r.last_name} ${r.first_name}`, group: r.group_code, score: r.score, at: r.taken_at })),
      })),
    });
  });

  // Materials: first the record, then the file (raw bytes, up to 25 MB).
  app.post("/me/dpo/:id/materials", requireUser, only("teacher"), async (req, res) => {
    const { name, type, size } = req.body || {};
    if (!str(name, 200) || (type !== undefined && !str(type, 20)) || (size !== undefined && !str(size, 20))) return bad(res);
    if (!(await leads(req.user, req.params.id))) return res.status(403).json({ error: "Вы не ведёте эту программу" });
    const { rows } = await pool.query(
      `INSERT INTO dpo_materials (program_id, position, name, type, size, date_label)
       VALUES ($1, COALESCE((SELECT max(position) + 1 FROM dpo_materials WHERE program_id = $1), 0), $2, $3, $4, to_char(now() AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY')) RETURNING id`,
      [req.params.id, name.trim(), type || "other", size || ""]);
    res.status(201).json({ id: Number(rows[0].id) });
  });
  const ownMaterial = async (u, id) => (await pool.query(
    `SELECT m.id, m.name, m.mime, m.stored, m.program_id FROM dpo_materials m JOIN dpo_program_teachers t ON t.program_id = m.program_id
     WHERE m.id = $1 AND t.teacher_id = $2`, [id, u.id])).rows[0];
  app.put("/me/dpo/materials/:mid/file", requireUser, only("teacher"), rawBody, async (req, res) => {
    if (!ID_RE.test(req.params.mid)) return bad(res);
    const m = await ownMaterial(req.user, req.params.mid);
    if (!m) return res.status(404).json({ error: "not found" });
    const saved = await saveFile(req, "dpo", m.id);
    if (!saved) return bad(res, "empty file");
    await pool.query("UPDATE dpo_materials SET mime = $2, stored = true WHERE id = $1", [m.id, saved.mime]);
    res.json({ ok: true });
  });
  app.delete("/me/dpo/materials/:mid", requireUser, only("teacher"), async (req, res) => {
    if (!ID_RE.test(req.params.mid)) return bad(res);
    const m = await ownMaterial(req.user, req.params.mid);
    if (!m) return res.status(404).json({ error: "not found" });
    await pool.query("DELETE FROM dpo_materials WHERE id = $1", [m.id]);
    await fs.promises.rm(fileOf("dpo", m.id), { force: true });
    res.status(204).end();
  });
  fileRoutes("/dpo-materials", "dpo",
    async id => (await pool.query("SELECT id, name, mime, stored, program_id FROM dpo_materials WHERE id = $1", [id])).rows[0],
    async (u, m) => u.role === "admin" || (u.role === "teacher" && await leads(u, m.program_id))
      || (u.role === "student" && (await pool.query("SELECT 1 FROM dpo_registrations WHERE user_id = $1 AND program_id = $2", [u.id, m.program_id])).rowCount > 0));

  // Tests: a title and questions with 2–6 options and the number of the right one.
  app.post("/me/dpo/:id/tests", requireUser, only("teacher"), async (req, res) => {
    const { title, questions } = req.body || {};
    if (!str(title, 200) || !Array.isArray(questions) || questions.length < 1 || questions.length > 50) return bad(res);
    for (const q of questions) {
      if (!q || !str(q.q, 500) || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6
        || !q.options.every(o => str(o, 300)) || !Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) return bad(res, "bad question");
    }
    if (!(await leads(req.user, req.params.id))) return res.status(403).json({ error: "Вы не ведёте эту программу" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const t = (await client.query(
        "INSERT INTO dpo_tests (program_id, position, title, status) VALUES ($1, COALESCE((SELECT max(position) + 1 FROM dpo_tests WHERE program_id = $1), 0), $2, 'available') RETURNING id",
        [req.params.id, title.trim()])).rows[0];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qid = (await client.query("INSERT INTO dpo_questions (test_id, position, text, correct_idx) VALUES ($1,$2,$3,$4) RETURNING id", [t.id, i, q.q.trim(), q.correct])).rows[0].id;
        for (let k = 0; k < q.options.length; k++) await client.query("INSERT INTO dpo_options (question_id, position, text) VALUES ($1,$2,$3)", [qid, k, q.options[k].trim()]);
      }
      await client.query("COMMIT");
      res.status(201).json({ id: Number(t.id) });
    } catch (err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
  });
  app.delete("/me/dpo/tests/:tid", requireUser, only("teacher"), async (req, res) => {
    if (!ID_RE.test(req.params.tid)) return bad(res);
    const t = (await pool.query(
      `SELECT t.id FROM dpo_tests t JOIN dpo_program_teachers l ON l.program_id = t.program_id WHERE t.id = $1 AND l.teacher_id = $2`, [req.params.tid, req.user.id])).rows[0];
    if (!t) return res.status(404).json({ error: "not found" });
    await pool.query("DELETE FROM dpo_tests WHERE id = $1", [t.id]);
    res.status(204).end();
  });
};
