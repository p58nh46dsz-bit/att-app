// All remaining app data: public content, groups/rosters, teacher documents + history,
// notifications, student grades/portfolio/consultations/certificates, teacher materials,
// grade entries and group messages, applicant submissions, schedule.
// Every personal route is bound to the signed-in user (req.user) — a user can never ask
// for somebody else's rows by id. Role checks are done here on the server.
const rateLimit = require("express-rate-limit");
const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const pool = require("./db");
const { createUser } = require("./users");

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

// "Фамилия И.О." for an account, or the name as imported from the roster.
const shortName = r => r.display_name || `${r.last_name} ${r.first_name.charAt(0)}.${r.middle_name ? r.middle_name.charAt(0) + "." : ""}`;
const hm = t => t.split(":").slice(0, 2).map(Number); // "10:40:00" → [10, 40]

const myGroups = u => (u.role === "admin" ? null : (u.profile && u.profile.groups) || []); // null = all

module.exports = function registerData(app, requireUser) {
  // ── Public content blobs ───────────────────────────────────────────────────
  app.get("/content", async (_req, res) => {
    const [blobs, certs, ctypes, slots, cats, subjects] = await Promise.all([
      pool.query("SELECT key, value FROM content"),
      pool.query("SELECT key, icon, title, sub FROM certificate_types ORDER BY position"),
      pool.query("SELECT icon, title, sub FROM consultation_types ORDER BY position"),
      pool.query("SELECT slot FROM consultation_slots ORDER BY position"),
      pool.query("SELECT key, sub, icon, color, title FROM portfolio_categories ORDER BY position"),
      pool.query("SELECT name, for_materials, gradable FROM subjects ORDER BY for_materials DESC, id"),
    ]);
    res.json({
      ...Object.fromEntries(blobs.rows.map(r => [r.key, r.value])),
      certificates: certs.rows, consultation_types: ctypes.rows, consultation_slots: slots.rows.map(r => r.slot),
      portfolio_categories: cats.rows, teacher_subjects: subjects.rows.filter(r => r.for_materials).map(r => r.name),
      grade_subjects: subjects.rows.filter(r => r.gradable).map(r => r.name),
    });
  });

  // ── Schedule: the same shape as schedule.json ────────────────────────────────────────────────────────
  // * a teacher gets their own pairs, found in the academy's teachers' timetable by surname + initials;
  // * a student gets their group's timetable: the scraped one (schedule_days, richer) when there is one, otherwise the
  //   pairs the teachers' timetable lists for the group (the 3rd building's sheet has no subject names there);
  // * the administrator, who belongs to no group, sees ДВ-41.
  const pairTimes = r => (r.start_time ? { start: hm(r.start_time), end: hm(r.end_time) } : null);
  const teachersDays = async () => (await pool.query("SELECT to_char(day, 'YYYY-MM-DD') AS day, weekday, generated_at FROM teacher_schedule_days ORDER BY day")).rows;

  async function teacherSchedule(u) {
    const initials = [(u.first_name || "").charAt(0), (u.middle_name || "").charAt(0)].join("").toUpperCase();
    const [days, lessons] = await Promise.all([
      teachersDays(),
      pool.query(
        `SELECT to_char(day, 'YYYY-MM-DD') AS day, corpus, period, teacher, group_name, subject, room, start_time::text AS start_time, end_time::text AS end_time
         FROM teacher_lessons
         WHERE replace(lower(split_part(teacher, ' ', 1)), 'ё', 'е') = replace(lower($1), 'ё', 'е')
           AND upper(replace(replace(split_part(teacher, ' ', 2), '.', ''), 'Ё', 'Е')) LIKE replace(upper($2), 'Ё', 'Е') || '%'
         ORDER BY day, period`, [u.last_name || "", initials]),
    ]);
    return {
      group: null, teacher: true, generated_at: days.length ? days[days.length - 1].generated_at : null,
      days: Object.fromEntries(days.map(d => [d.day, {
        date: d.day, weekday: d.weekday,
        lessons: lessons.rows.filter(l => l.day === d.day && l.start_time).map(l => ({
          period: l.period, ...pairTimes(l), room: l.room, corpus: l.corpus, group: l.group_name, subject: l.subject, teacher: l.teacher,
          subj: [l.group_name, l.subject].filter(Boolean).join(" · ") || "Пара",
        })),
      }])),
    };
  }

  async function groupFromTeachers(group) {
    const [days, lessons] = await Promise.all([
      teachersDays(),
      pool.query(
        `SELECT to_char(day, 'YYYY-MM-DD') AS day, corpus, period, teacher, subject, room, start_time::text AS start_time, end_time::text AS end_time
         FROM teacher_lessons WHERE group_name = $1 AND start_time IS NOT NULL ORDER BY day, period, teacher`, [group]),
    ]);
    return {
      group, generated_at: days.length ? days[days.length - 1].generated_at : null,
      days: Object.fromEntries(days.map(d => [d.day, {
        date: d.day, weekday: d.weekday,
        lessons: lessons.rows.filter(l => l.day === d.day).map(l => ({
          period: l.period, ...pairTimes(l), room: l.room, corpus: l.corpus, teacher: l.teacher, subj: l.subject || `Пара · ${l.teacher}`,
        })),
      }])),
    };
  }

  app.get("/schedule", requireUser, async (req, res) => {
    if (req.user.role === "teacher") return res.json(await teacherSchedule(req.user));
    const group = req.user.group_code || null;   // the administrator belongs to no group and has no timetable
    if (!group) return res.json({ group: null, generated_at: null, days: {} });
    const [days, lessons] = await Promise.all([
      pool.query("SELECT to_char(day, 'YYYY-MM-DD') AS day, corpus, weekday, source_url, generated_at FROM schedule_days WHERE group_code = $1 ORDER BY day", [group]),
      pool.query("SELECT to_char(day, 'YYYY-MM-DD') AS day, period, start_time::text AS st, end_time::text AS et, room, subject, teacher FROM schedule_lessons WHERE group_code = $1 ORDER BY day, period", [group]),
    ]);
    // days from the teachers' timetable first, then the scraped group timetable over them where it has the same day
    const derived = await groupFromTeachers(group);
    if (!days.rows.length) return res.json(derived);
    const meta = (await pool.query("SELECT value FROM settings WHERE key = $1", ["schedule_meta:" + group])).rows[0];
    res.json({
      group, generated_at: meta ? meta.value.generated_at : null,
      days: { ...derived.days, ...Object.fromEntries(days.rows.map(d => [d.day, {
        date: d.day, corpus: d.corpus, weekday: d.weekday, source_url: d.source_url, generated_at: d.generated_at && d.generated_at.toISOString(),
        lessons: lessons.rows.filter(l => l.day === d.day).map(l => ({ period: l.period, start: hm(l.st), end: hm(l.et), room: l.room, subj: l.subject, teacher: l.teacher })),
      }])) },
    });
  });

  // ── Groups and rosters (teachers see only their own groups) ────────────────
  app.get("/groups", requireUser, only("teacher", "admin"), async (req, res) => {
    const mine = myGroups(req.user);
    const { rows } = await pool.query(
      `SELECT g.code, g.specialty_code, sp.name AS specialty_name, m.code AS mdk_code, m.name AS mdk_name,
              (SELECT count(*) FROM group_students r WHERE r.group_code = g.code)::int AS count
       FROM groups g LEFT JOIN specialties sp ON sp.code = g.specialty_code LEFT JOIN subjects m ON m.id = g.mdk_subject_id
       WHERE $1::text[] IS NULL OR g.code = ANY($1) ORDER BY g.code`, [mine]);
    res.json(rows.map(r => ({ code: r.code, count: r.count, specialtyCode: r.specialty_code, specialtyName: r.specialty_name, mdkCode: r.mdk_code, mdkName: r.mdk_name })));
  });

  app.get("/groups/:code", requireUser, only("teacher", "admin"), async (req, res) => {
    const mine = myGroups(req.user);
    if (mine && !mine.includes(req.params.code)) return res.status(403).json({ error: "forbidden" });
    const g = (await pool.query(
      `SELECT g.code, g.specialty_code, sp.name AS specialty_name, m.code AS mdk_code, m.name AS mdk_name
       FROM groups g LEFT JOIN specialties sp ON sp.code = g.specialty_code LEFT JOIN subjects m ON m.id = g.mdk_subject_id WHERE g.code = $1`, [req.params.code])).rows[0];
    if (!g) return res.status(404).json({ error: "not found" });
    const roster = (await pool.query(
      `SELECT gs.id, gs.display_name, gs.topic, u.last_name, u.first_name, u.middle_name
       FROM group_students gs LEFT JOIN users u ON u.id = gs.user_id WHERE gs.group_code = $1 ORDER BY gs.position, gs.id`, [g.code])).rows;
    res.json({
      code: g.code, specialtyCode: g.specialty_code, specialtyName: g.specialty_name, mdkCode: g.mdk_code, mdkName: g.mdk_name,
      roster: roster.map(r => ({
        id: Number(r.id), name: shortName(r), topic: r.topic,
        // the whole name for lists where there is room: surname, first name, patronymic (as typed for an account)
        fullName: r.last_name ? [r.last_name, r.first_name, r.middle_name].filter(Boolean).join(" ") : (r.display_name || shortName(r)),
      })),
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
      `SELECT n.id, n.cls, n.icon, n.msg, n.created_at, (r.user_id IS NULL) AS unread ${visibleNotifs} ORDER BY n.created_at DESC LIMIT 300`,
      [req.user.id, audience(req.user)]);
    res.json(rows.map(r => ({ id: Number(r.id), cls: r.cls, icon: r.icon, msg: r.msg, time: ruTime(r.created_at), at: r.created_at, unread: r.unread })));
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


  // ── Profile picture (any role): a small JPEG data URL made in the browser ────────────────────────────
  app.get("/me/avatar", requireUser, async (req, res) => {
    const { rows } = await pool.query("SELECT image FROM user_avatars WHERE user_id = $1", [req.user.id]);
    res.json({ image: rows[0] ? rows[0].image : null });
  });
  app.put("/me/avatar", requireUser, async (req, res) => {
    const image = req.body && req.body.image;
    if (typeof image !== "string" || !/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(image) || image.length > 120000) return bad(res, "Нужна фотография JPEG до 90 КБ.");
    await pool.query(
      `INSERT INTO user_avatars (user_id, image) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET image = EXCLUDED.image, updated_at = now()`, [req.user.id, image]);
    res.json({ ok: true });
  });
  app.delete("/me/avatar", requireUser, async (req, res) => {
    await pool.query("DELETE FROM user_avatars WHERE user_id = $1", [req.user.id]);
    res.json({ ok: true });
  });

  // ── A teacher fills in "О вас" themselves: the administrators see it in the accounts list and are told ──
  app.put("/me/profile", requireUser, only("teacher"), async (req, res) => {
    const b = req.body || {};
    const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
    const department = clean(b.department, 160), experience = clean(b.experience, 60);
    const email = clean(b.email, 160), phone = clean(b.phone, 40);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(res, "Проверьте email: так он не похож на адрес почты.");
    if (phone && !/^[+()\d\s-]{5,40}$/.test(phone)) return bad(res, "Телефон: только цифры, пробелы, скобки, + и дефис.");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const before = (await client.query(
        `SELECT u.email, u.phone, tp.department, tp.experience FROM users u LEFT JOIN teacher_profiles tp ON tp.user_id = u.id WHERE u.id = $1`, [req.user.id])).rows[0] || {};
      await client.query("UPDATE users SET email = $2, phone = $3 WHERE id = $1", [req.user.id, email || null, phone || null]);
      await client.query(
        `INSERT INTO teacher_profiles (user_id, department, experience) VALUES ($1,$2,$3)
         ON CONFLICT (user_id) DO UPDATE SET department = $2, experience = $3`, [req.user.id, department, experience]);
      const changed = (before.email || "") !== email || (before.phone || "") !== phone || (before.department || "") !== department || (before.experience || "") !== experience;
      if (changed) {
        const who = `${req.user.last_name} ${(req.user.first_name || " ").charAt(0)}.${req.user.middle_name ? req.user.middle_name.charAt(0) + "." : ""}`;
        await client.query(
          `INSERT INTO notifications (audience, user_id, cls, icon, msg)
           SELECT 'teacher', id, '', 'user', $1 FROM users WHERE role = 'admin'`, [`${who} обновил(а) данные о себе в профиле`]);
      }
      await client.query("COMMIT");
    } catch (err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
    res.json({ ok: true, department, experience, email, phone });
  });

  // ── Student: grades, portfolio ─────────────────────────────────────────────
  app.get("/me/grades", requireUser, async (req, res) => {
    const { rows: marks } = await pool.query(
      `SELECT s.name AS subject, gr.kind, gr.value, gr.id, to_char(gr.work_date, 'YYYY-MM-DD') AS day
       FROM grade_records gr JOIN group_students gs ON gs.id = gr.student_id JOIN subjects s ON s.id = gr.subject_id
       WHERE gs.user_id = $1 ORDER BY gr.work_date, gr.id`, [req.user.id]);
    const bySubject = new Map(); // subjects keep the order in which their first mark was given
    for (const m of marks) {
      if (!bySubject.has(m.subject)) bySubject.set(m.subject, []);
      bySubject.get(m.subject).push({ type: m.kind, val: m.value, date: m.day });
    }
    res.json([...bySubject].map(([subject, items]) => ({ subject, items })).map(r => {
      const nums = r.items.map(g => g.val).filter(Number.isFinite);
      const avg = nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 10) / 10 : null;
      return { name: r.subject, avg, cls: avg === null ? "ok" : avg >= 4.5 ? "good" : avg >= 3 ? "ok" : "bad", grades: r.items };
    }));
  });

  // Missed lessons ("н" in the grade sheet). Only absences are recorded, so this is a count, not a percentage.
  app.get("/me/attendance", requireUser, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT COALESCE(s.name, 'Без предмета') AS name, count(*)::int AS missed
       FROM attendance_records a JOIN group_students gs ON gs.id = a.student_id LEFT JOIN subjects s ON s.id = a.subject_id
       WHERE gs.user_id = $1 AND a.status = 'absent' GROUP BY s.name ORDER BY s.name`, [req.user.id]);
    res.json({ missed: rows.reduce((n, r) => n + r.missed, 0), bySubject: rows });
  });

  app.get("/me/portfolio", requireUser, async (req, res) => {
    const { rows } = await pool.query(
      "SELECT category, icon, title, meta, tag FROM portfolio_items WHERE user_id = $1 ORDER BY category, position", [req.user.id]);
    const out = {};
    for (const r of rows) (out[r.category] = out[r.category] || []).push({ icon: r.icon, title: r.title, meta: r.meta, tag: r.tag });
    res.json(out);
  });

  // ── Student: consultations (a slot can be booked by one person) ────────────
  app.get("/consultations/taken", requireUser, async (req, res) => {
    const day = String(req.query.day || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return bad(res);
    const { rows } = await pool.query("SELECT slot FROM consultations WHERE day = $1", [day]);
    res.json(rows.map(r => r.slot));
  });

  app.get("/me/consultations", requireUser, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT c.id, t.title AS type_title, to_char(c.day, 'YYYY-MM-DD') AS day, c.slot
       FROM consultations c JOIN consultation_types t ON t.id = c.type_id WHERE c.user_id = $1 AND c.day >= current_date ORDER BY c.day, c.slot`, [req.user.id]);
    res.json(rows.map(r => ({ id: Number(r.id), type: r.type_title, day: r.day, slot: r.slot })));
  });

  app.post("/me/consultations", requireUser, only("student"), async (req, res) => {
    const { type, day, slot } = req.body || {};
    const typeRow = (await pool.query("SELECT id FROM consultation_types WHERE title = $1", [String(type)])).rows[0];
    const slotOk = (await pool.query("SELECT 1 FROM consultation_slots WHERE slot = $1", [String(slot)])).rowCount > 0;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day)) || !typeRow || !slotOk) return bad(res);
    try {
      await pool.query("INSERT INTO consultations (user_id, type_id, day, slot) VALUES ($1,$2,$3,$4)", [req.user.id, typeRow.id, day, slot]);
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
    const known = typeof key === "string" && (await pool.query("SELECT 1 FROM certificate_types WHERE key = $1", [key])).rowCount > 0;
    if (!known || (purpose !== undefined && (typeof purpose !== "string" || purpose.length > 200))) return bad(res);
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
      `SELECT s.name AS subject, m.name, m.type, m.size, m.created_at
       FROM teacher_materials m JOIN subjects s ON s.id = m.subject_id WHERE m.user_id = $1 ORDER BY m.created_at DESC`, [req.user.id]);
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
    const subj = (await pool.query("SELECT id FROM subjects WHERE lower(name) = lower($1)", [subject.trim()])).rows[0];
    if (!subj) return bad(res, "unknown subject");
    if (req.user.role === "teacher" && !(await pool.query("SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND subject_id = $2 LIMIT 1", [req.user.id, subj.id])).rowCount) {
      return res.status(403).json({ error: "Вы не ведёте этот предмет. Добавьте его в «Мои группы и предметы»." });
    }
    await pool.query("INSERT INTO teacher_materials (user_id, subject_id, name, type, size) VALUES ($1,$2,$3,$4,$5)",
      [req.user.id, subj.id, name.trim(), type || "other", size || ""]);
    res.status(201).json({ ok: true });
  });

  // Is this pair the teacher's own in the academy's timetable (matched by surname + initials, as in /schedule)?
  async function ownsPair(u, day, group, period, corpus) {
    const initials = [(u.first_name || "").charAt(0), (u.middle_name || "").charAt(0)].join("").toUpperCase();
    const own = await pool.query(
      `SELECT 1 FROM teacher_lessons
       WHERE day = $1 AND group_name = $2 AND period = $3 AND ($6::text IS NULL OR corpus = $6)
         AND replace(lower(split_part(teacher, ' ', 1)), 'ё', 'е') = replace(lower($4), 'ё', 'е')
         AND upper(replace(replace(split_part(teacher, ' ', 2), '.', ''), 'Ё', 'Е')) LIKE replace(upper($5), 'Ё', 'Е') || '%' LIMIT 1`,
      [day, group, period, u.last_name || "", initials, corpus || null]);
    return own.rowCount > 0;
  }

  // ── Lunch of the 1st–2nd buildings: the teacher of a group's 2nd pair decides, the group's students follow ──
  // A teacher gets { group: "split" | "after" } for the day; a student gets the choice for their group (or null).
  async function lunchFor(u, day) {
    if (u.role === "teacher") {
      const { rows } = await pool.query("SELECT group_name, split FROM lunch_breaks WHERE day = $1 AND teacher_id = $2", [day, u.id]);
      return Object.fromEntries(rows.map(r => [r.group_name, r.split ? "split" : "after"]));
    }
    if (!u.group_code) return null;
    const { rows } = await pool.query("SELECT split FROM lunch_breaks WHERE day = $1 AND group_name = $2", [day, u.group_code]);
    return rows[0] ? (rows[0].split ? "split" : "after") : null;
  }
  app.get("/lunch", requireUser, async (req, res) => {
    const day = String(req.query.day || "");
    if (!DAY_RE.test(day)) return bad(res);
    res.json({ day, lunch: await lunchFor(req.user, day) });
  });
  app.put("/me/lunch", requireUser, only("teacher"), async (req, res) => {
    const { day, group, choice } = req.body || {};
    if (!DAY_RE.test(String(day || "")) || !str(group, 40) || !["split", "after"].includes(choice)) return bad(res);
    if (!(await ownsPair(req.user, day, group.trim(), 2, "1-2"))) return res.status(403).json({ error: "У вас нет 2-й пары у этой группы в 1–2 корпусе" });
    await pool.query(
      `INSERT INTO lunch_breaks (day, group_name, split, teacher_id) VALUES ($1, $2, $3, $4)
       ON CONFLICT (day, group_name) DO UPDATE SET split = EXCLUDED.split, teacher_id = EXCLUDED.teacher_id, updated_at = now()`,
      [day, group.trim(), choice === "split", req.user.id]);
    res.json({ day, group: group.trim(), choice });
  });

  // Materials attached to one pair (day + group + pair number), from the pair's sheet on the teacher's dashboard.
  // (DAY_RE is declared with the grade sheet below; the handlers only run after it is set.)
  // A teacher gets the materials they attached that day; a student gets the ones attached to their group's pairs
  // (only those whose file has arrived).
  app.get("/me/lesson-materials", requireUser, only("teacher", "student"), async (req, res) => {
    const day = String(req.query.day || "");
    if (!DAY_RE.test(day)) return bad(res);
    const { rows } = req.user.role === "teacher"
      ? await pool.query(
        `SELECT id, group_name, period, name, type, size, mime, bytes, stored FROM lesson_materials
         WHERE user_id = $1 AND day = $2 ORDER BY created_at`, [req.user.id, day])
      : await pool.query(
        `SELECT id, group_name, period, name, type, size, mime, bytes, stored FROM lesson_materials
         WHERE group_name = $1 AND day = $2 AND stored ORDER BY created_at`, [req.user.group_code || "", day]);
    res.json(rows.map(r => ({ id: Number(r.id), group: r.group_name, period: r.period, name: r.name, type: r.type, size: r.size,
      mime: r.mime, bytes: r.bytes, stored: r.stored })));
  });

  // The file itself: raw bytes in the body (up to 25 MB), written to FILES_DIR/lesson/<id>.
  const FILES_DIR = process.env.FILES_DIR || path.join(__dirname, "uploads");
  const lessonFile = id => path.join(FILES_DIR, "lesson", String(id));
  const MAX_FILE = 25 * 1024 * 1024;
  app.put("/me/lesson-materials/:id/file", requireUser, only("teacher"),
    express.raw({ type: () => true, limit: MAX_FILE }), async (req, res) => {
      if (!/^\d{1,18}$/.test(req.params.id)) return bad(res);
      const row = (await pool.query("SELECT id FROM lesson_materials WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id])).rows[0];
      if (!row) return res.status(404).json({ error: "not found" });
      const body = req.body;
      if (!Buffer.isBuffer(body) || !body.length) return bad(res, "empty file");
      const mime = String(req.headers["content-type"] || "application/octet-stream").slice(0, 100);
      await fs.promises.mkdir(path.dirname(lessonFile(row.id)), { recursive: true });
      await fs.promises.writeFile(lessonFile(row.id), body);
      await pool.query("UPDATE lesson_materials SET mime = $2, bytes = $3, stored = true WHERE id = $1", [row.id, mime, body.length]);
      res.json({ ok: true, bytes: body.length });
    });

  // Opening a file: the teacher who attached it, a student of that group, or an administrator. The phone opens files
  // in the browser's own viewer, which cannot send the sign-in token, so the app first asks for a link that carries
  // a key for this one file, valid for two minutes.
  const fileRow = async id => (await pool.query("SELECT id, user_id, group_name, name, mime, stored FROM lesson_materials WHERE id = $1", [id])).rows[0];
  const mayOpen = (u, m) => m && m.stored && (u.role === "admin" || m.user_id === u.id || (u.role === "student" && u.group_code === m.group_name));
  app.get("/lesson-materials/:id/link", requireUser, async (req, res) => {
    if (!/^\d{1,18}$/.test(req.params.id)) return bad(res);
    if (!mayOpen(req.user, await fileRow(req.params.id))) return res.status(404).json({ error: "not found" });
    const k = jwt.sign({ f: req.params.id }, process.env.JWT_SECRET, { expiresIn: "2m" });
    res.json({ url: `/lesson-materials/${req.params.id}/file?k=${encodeURIComponent(k)}` });
  });
  app.get("/lesson-materials/:id/file", async (req, res, next) => {
    if (!req.query.k) return next();                      // no key: the usual sign-in check below
    if (!/^\d{1,18}$/.test(req.params.id)) return bad(res);
    try {
      const { f, k } = jwt.verify(String(req.query.k), process.env.JWT_SECRET);
      if (k || f !== req.params.id) throw new Error("other file");   // keys of other kinds of file (coursework, ДПО) carry k
    } catch { return res.status(404).json({ error: "not found" }); }
    const m = await fileRow(req.params.id);
    if (!m || !m.stored) return res.status(404).json({ error: "not found" });
    sendLessonFile(res, m);
  }, requireUser, async (req, res) => {
    if (!/^\d{1,18}$/.test(req.params.id)) return bad(res);
    const m = await fileRow(req.params.id);
    if (!mayOpen(req.user, m)) return res.status(404).json({ error: "not found" });
    sendLessonFile(res, m);
  });
  function sendLessonFile(res, m) {
    res.setHeader("Content-Type", m.mime || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(m.name)}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    fs.createReadStream(lessonFile(m.id)).on("error", () => res.status(404).end()).pipe(res);
  }

  app.post("/me/lesson-materials", requireUser, only("teacher"), async (req, res) => {
    const { day, group, period, name, type, size } = req.body || {};
    if (!DAY_RE.test(String(day || "")) || !str(group, 40) || !Number.isInteger(period) || period < 0 || period > 8 || !str(name, 200)
      || (type !== undefined && !str(type, 20)) || (size !== undefined && !str(size, 20))) return bad(res);
    if (!(await ownsPair(req.user, day, group.trim(), period))) return res.status(403).json({ error: "Это не ваша пара" });
    const { rows } = await pool.query(
      "INSERT INTO lesson_materials (user_id, day, group_name, period, name, type, size) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [req.user.id, day, group.trim(), period, name.trim(), type || "other", size || ""]);
    res.status(201).json({ id: Number(rows[0].id) });
  });

  app.delete("/me/lesson-materials/:id", requireUser, only("teacher"), async (req, res) => {
    if (!/^\d{1,18}$/.test(req.params.id)) return bad(res);
    const r = await pool.query("DELETE FROM lesson_materials WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
    if (r.rowCount) await fs.promises.rm(lessonFile(req.params.id), { force: true });
    res.status(r.rowCount ? 204 : 404).end();
  });

  const ownGroup = (u, code) => { const g = myGroups(u); return g === null || g.includes(code); };

  // "Аветисян С.К." / "Дмитриева Олеся" / "Иванов Пётр Сергеевич" → a person for createUser().
  const INITIALS = /^([А-ЯЁA-Z])\.([А-ЯЁA-Z])?\.?$/;
  function personFromRoster(name, group, placeId) {
    const [last, second = "", third = ""] = name.trim().split(/\s+/);
    const m = INITIALS.exec(second);
    return m
      ? { role: "student", lastName: last, firstName: m[1] + ".", middleName: m[2] ? m[2] + "." : "", group, placeId, nameIncomplete: true }
      : { role: "student", lastName: last, firstName: second || "-", middleName: third, group, placeId, nameIncomplete: !second || INITIALS.test(third) };
  }

  // ── The grade sheet: marks of one group for one subject, kind of work and day ─────────────────────────
  // A teacher may only work with the subjects they teach to the group (teacher_assignments). The sheet is
  // loaded back when it is opened again, and saving it again updates the marks instead of adding new ones.
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
  const validDay = d => {
    if (!DAY_RE.test(String(d))) return false;
    const t = new Date(d + "T12:00:00Z").getTime();
    const now = Date.now();
    return Number.isFinite(t) && t < now + 2 * 86400000 && t > now - 400 * 86400000;
  };
  // Looks the sheet's subject up and checks the teacher's right to it. Returns { subj } or sends the error.
  async function sheetSubject(req, res, groupCode, subject) {
    if (!str(groupCode, 40) || !ownGroup(req.user, groupCode) || !str(subject, 120)) { bad(res); return null; }
    const subj = (await pool.query("SELECT id FROM subjects WHERE lower(name) = lower($1) AND gradable", [subject.trim()])).rows[0];
    if (!subj) { bad(res, "unknown subject"); return null; }
    if (req.user.role === "teacher" && !(await pool.query(
      "SELECT 1 FROM teacher_assignments WHERE teacher_id = $1 AND group_code = $2 AND subject_id = $3", [req.user.id, groupCode, subj.id])).rowCount) {
      res.status(403).json({ error: "Вы не ведёте этот предмет у этой группы. Добавьте его в «Мои группы и предметы»." }); return null;
    }
    return { subj };
  }

  // One personal notification for a student (inside the caller's transaction).
  const notifyStudent = (client, userId, cls, icon, msg) =>
    client.query("INSERT INTO notifications (audience, user_id, cls, icon, msg) VALUES ('student', $1, $2, $3, $4)", [userId, cls, icon, msg.slice(0, 400)]);

  // What is already saved for this sheet: { "<place id>": 5 | "н" }.
  app.get("/me/grade-sheet", requireUser, only("teacher", "admin"), async (req, res) => {
    const { group, subject, kind = "", date } = req.query;
    if (!validDay(date) || String(kind).length > 60) return bad(res);
    const ok = await sheetSubject(req, res, String(group || ""), String(subject || ""));
    if (!ok) return;
    const [marks, absent] = await Promise.all([
      pool.query(`SELECT g.student_id, g.value FROM grade_records g JOIN group_students s ON s.id = g.student_id
                  WHERE s.group_code = $1 AND g.subject_id = $2 AND g.kind = $3 AND g.work_date = $4`, [group, ok.subj.id, String(kind).trim(), date]),
      pool.query(`SELECT a.student_id FROM attendance_records a JOIN group_students s ON s.id = a.student_id
                  WHERE s.group_code = $1 AND a.subject_id = $2 AND a.day = $3 AND a.status = 'absent'`, [group, ok.subj.id, date]),
    ]);
    const out = {};
    for (const r of marks.rows) out[Number(r.student_id)] = r.value;
    for (const r of absent.rows) out[Number(r.student_id)] = "н";
    res.json({ marks: out });
  });

  // Saves the whole sheet. entries: [{ studentId, value }], value 5|4|3|2, "н" (absent) or null (clear the mark).
  app.put("/me/grade-sheet", requireUser, only("teacher", "admin"), async (req, res) => {
    const { groupCode, subject, kind, date, entries } = req.body || {};
    if (!validDay(date) || (kind !== undefined && typeof kind !== "string") || String(kind || "").length > 60 ||
        !Array.isArray(entries) || entries.length === 0 || entries.length > 300 ||
        !entries.every(e => e && Number.isInteger(e.studentId) && (e.value === null || ["5", "4", "3", "2", "н"].includes(String(e.value))))) return bad(res);
    const ok = await sheetSubject(req, res, groupCode, subject);
    if (!ok) return;
    const roster = (await pool.query(
      `SELECT gs.id, gs.user_id, gs.display_name FROM group_students gs WHERE gs.group_code = $1`, [groupCode])).rows;
    const byId = new Map(roster.map(r => [Number(r.id), r]));
    if (entries.some(e => !byId.has(e.studentId))) return bad(res, "student is not in this group");
    const work = String(kind || "").trim();

    // A student who has no account yet gets one now (the administrator sees it marked "Уточнить ФИО").
    let accountsCreated = 0;
    for (const e of entries) {
      const place = byId.get(e.studentId);
      if (e.value === null || place.user_id || !place.display_name) continue;
      const { user } = await createUser(personFromRoster(place.display_name, groupCode, Number(place.id)));
      place.user_id = user.id; accountsCreated++;
      await pool.query("INSERT INTO admin_audit (admin_id, admin_login, kind, action, target) VALUES ($1,$2,'account',$3,$4)",
        [req.user.id, req.user.login, "Учётная запись создана автоматически при выставлении оценки", user.login]);
    }

    const client = await pool.connect();
    let saved = 0, cleared = 0;
    try {
      await client.query("BEGIN");
      for (const e of entries) {
        const id = e.studentId, v = e.value === null ? null : String(e.value);
        // what was there before: a student is told only about a change, not about every re-save of the same sheet
        const prevGrade = (await client.query("SELECT value FROM grade_records WHERE student_id = $1 AND subject_id = $2 AND kind = $3 AND work_date = $4", [id, ok.subj.id, work, date])).rows[0];
        const prevAbsent = (await client.query("SELECT 1 FROM attendance_records WHERE student_id = $1 AND subject_id = $2 AND day = $3 AND status = 'absent'", [id, ok.subj.id, date])).rowCount > 0;
        // start from a clean slate for this student and sheet, then write what is chosen
        const d1 = await client.query("DELETE FROM grade_records WHERE student_id = $1 AND subject_id = $2 AND kind = $3 AND work_date = $4", [id, ok.subj.id, work, date]);
        // "н" in the grade sheet is an absence; clearing it removes only an absence (a "present"/"late" from the journal stays)
        const d2 = await client.query("DELETE FROM attendance_records WHERE student_id = $1 AND subject_id = $2 AND day = $3" + (v === "н" ? "" : " AND status = 'absent'"), [id, ok.subj.id, date]);
        if (v === null) { if (d1.rowCount || d2.rowCount) cleared++; continue; }
        if (v === "н") {
          await client.query("INSERT INTO attendance_records (student_id, subject_id, teacher_id, day, status) VALUES ($1,$2,$3,$4,'absent')", [id, ok.subj.id, req.user.id, date]);
        } else {
          await client.query("INSERT INTO grade_records (student_id, subject_id, teacher_id, kind, value, work_date) VALUES ($1,$2,$3,$4,$5,$6)",
            [id, ok.subj.id, req.user.id, work, Number(v), date]);
        }
        saved++;
        const uid = byId.get(id).user_id, when = date.split("-").reverse().slice(0, 2).join(".");
        if (uid && v === "н" && !prevAbsent)
          await notifyStudent(client, uid, "red", "bell", `Пропуск: ${subject.trim()}, ${when}. Вас отметили отсутствующим.`);
        else if (uid && v !== "н" && (!prevGrade || Number(prevGrade.value) !== Number(v)))
          await notifyStudent(client, uid, Number(v) >= 4 ? "green" : Number(v) === 3 ? "amber" : "red", "check",
            `Оценка ${v}: ${subject.trim()}${work ? ", " + work : ""}, ${when}`);
      }
      await client.query("COMMIT");
    } catch (err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
    res.json({ saved, cleared, accountsCreated });
  });

  // ── The journal: who was at the lesson (present / absent / late) for a group, subject and day ─────────
  // Stored in attendance_records, one row per student, subject and day. A student can be marked even before they
  // have an account (the row belongs to the place in the group). Same rights as the grade sheet.
  const STATUSES = ["present", "absent", "late"];
  app.get("/me/journal", requireUser, only("teacher", "admin"), async (req, res) => {
    const { group, subject, date } = req.query;
    if (!validDay(date)) return bad(res);
    const ok = await sheetSubject(req, res, String(group || ""), String(subject || ""));
    if (!ok) return;
    const { rows } = await pool.query(
      `SELECT a.student_id, a.status FROM attendance_records a JOIN group_students s ON s.id = a.student_id
       WHERE s.group_code = $1 AND a.subject_id = $2 AND a.day = $3`, [group, ok.subj.id, date]);
    res.json({ marks: Object.fromEntries(rows.map(r => [Number(r.student_id), r.status])) });
  });

  // entries: [{ studentId, status }], status present | absent | late, or null to clear the mark.
  app.put("/me/journal", requireUser, only("teacher", "admin"), async (req, res) => {
    const { groupCode, subject, date, entries } = req.body || {};
    if (!validDay(date) || !Array.isArray(entries) || entries.length === 0 || entries.length > 300 ||
        !entries.every(e => e && Number.isInteger(e.studentId) && (e.status === null || STATUSES.includes(e.status)))) return bad(res);
    const ok = await sheetSubject(req, res, groupCode, subject);
    if (!ok) return;
    const places = new Map((await pool.query("SELECT id, user_id FROM group_students WHERE group_code = $1", [groupCode])).rows.map(r => [Number(r.id), r.user_id]));
    const ids = new Set(places.keys());
    if (entries.some(e => !ids.has(e.studentId))) return bad(res, "student is not in this group");
    const client = await pool.connect();
    const counts = { present: 0, absent: 0, late: 0, cleared: 0 };
    try {
      await client.query("BEGIN");
      for (const e of entries) {
        const was = (await client.query("SELECT status FROM attendance_records WHERE student_id = $1 AND subject_id = $2 AND day = $3", [e.studentId, ok.subj.id, date])).rows[0];
        await client.query("DELETE FROM attendance_records WHERE student_id = $1 AND subject_id = $2 AND day = $3", [e.studentId, ok.subj.id, date]);
        if (e.status === null) { counts.cleared++; continue; }
        await client.query("INSERT INTO attendance_records (student_id, subject_id, teacher_id, day, status) VALUES ($1,$2,$3,$4,$5)", [e.studentId, ok.subj.id, req.user.id, date, e.status]);
        counts[e.status]++;
        if (e.status === "absent" && !(was && was.status === "absent") && places.get(e.studentId))
          await notifyStudent(client, places.get(e.studentId), "red", "bell", `Пропуск: ${subject.trim()}, ${date.split("-").reverse().slice(0, 2).join(".")}. Вас отметили отсутствующим.`);
      }
      await client.query("COMMIT");
    } catch (err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
    res.json(counts);
  });


  // ── Teacher's overview: attendance by day and by student, and the grade table ───────────────────────────
  app.get("/me/journal/history", requireUser, only("teacher", "admin"), async (req, res) => {
    const { group, subject } = req.query;
    const ok = await sheetSubject(req, res, String(group || ""), String(subject || ""));
    if (!ok) return;
    const [places, recs] = await Promise.all([
      pool.query(`SELECT gs.id, COALESCE(NULLIF(trim(concat_ws(' ', u.last_name, u.first_name, u.middle_name)), ''), gs.display_name) AS display_name
                  FROM group_students gs LEFT JOIN users u ON u.id = gs.user_id WHERE gs.group_code = $1 ORDER BY gs.position, gs.id`, [group]),
      pool.query(`SELECT a.student_id, a.day::text AS day, a.status FROM attendance_records a JOIN group_students s ON s.id = a.student_id
                  WHERE s.group_code = $1 AND a.subject_id = $2 AND a.day > current_date - 200 ORDER BY a.day DESC`, [group, ok.subj.id])]);
    const days = new Map(), per = new Map(places.rows.map(p => [Number(p.id), { present: 0, absent: 0 }]));
    for (const r of recs.rows) {
      const d = days.get(r.day) || { date: r.day, present: 0, absent: 0 };
      const absent = r.status === "absent";
      d[absent ? "absent" : "present"]++; days.set(r.day, d);
      const p = per.get(Number(r.student_id)); if (p) p[absent ? "absent" : "present"]++;
    }
    res.json({
      total: places.rowCount,
      days: [...days.values()],
      students: places.rows.map(p => { const c = per.get(Number(p.id)), n = c.present + c.absent;
        return { id: Number(p.id), name: p.display_name, present: c.present, absent: c.absent, pct: n ? Math.round(c.present * 100 / n) : null }; }),
    });
  });

  app.get("/me/grade-summary", requireUser, only("teacher", "admin"), async (req, res) => {
    const { group, subject } = req.query;
    const ok = await sheetSubject(req, res, String(group || ""), String(subject || ""));
    if (!ok) return;
    const [places, recs, abs] = await Promise.all([
      pool.query(`SELECT gs.id, COALESCE(NULLIF(trim(concat_ws(' ', u.last_name, u.first_name, u.middle_name)), ''), gs.display_name) AS display_name
                  FROM group_students gs LEFT JOIN users u ON u.id = gs.user_id WHERE gs.group_code = $1 ORDER BY gs.position, gs.id`, [group]),
      pool.query(`SELECT g.student_id, g.value, g.kind, g.work_date::text AS day FROM grade_records g JOIN group_students s ON s.id = g.student_id
                  WHERE s.group_code = $1 AND g.subject_id = $2 AND g.work_date > current_date - 200 ORDER BY g.work_date, g.kind`, [group, ok.subj.id]),
      pool.query(`SELECT a.student_id, count(*)::int AS n FROM attendance_records a JOIN group_students s ON s.id = a.student_id
                  WHERE s.group_code = $1 AND a.subject_id = $2 AND a.status = 'absent' GROUP BY a.student_id`, [group, ok.subj.id])]);
    const cols = [], seen = new Set(), by = new Map(places.rows.map(p => [Number(p.id), {}]));
    for (const r of recs.rows) {
      const key = r.day + "|" + r.kind;
      if (!seen.has(key)) { seen.add(key); cols.push({ key, date: r.day, kind: r.kind }); }
      if (by.has(Number(r.student_id))) by.get(Number(r.student_id))[key] = r.value;
    }
    const missed = new Map(abs.rows.map(r => [Number(r.student_id), r.n]));
    res.json({
      columns: cols,
      students: places.rows.map(p => { const m = by.get(Number(p.id)), v = Object.values(m);
        return { id: Number(p.id), name: p.display_name, marks: m, absent: missed.get(Number(p.id)) || 0,
          avg: v.length ? Math.round(v.reduce((a, b) => a + b, 0) * 10 / v.length) / 10 : null }; }),
    });
  });

  app.post("/me/group-messages", requireUser, only("teacher", "admin"), async (req, res) => {
    const { groupCode, body } = req.body || {};
    if (!str(groupCode, 40) || !ownGroup(req.user, groupCode) || !str(body, 1000)) return bad(res);
    // The message is kept, and every student of the group who has an account gets it as a personal notification.
    const client = await pool.connect();
    let delivered = 0;
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO group_messages (teacher_id, group_code, body) VALUES ($1,$2,$3)", [req.user.id, groupCode, body.trim()]);
      const who = `${req.user.last_name} ${(req.user.first_name || " ").charAt(0)}.${req.user.middle_name ? req.user.middle_name.charAt(0) + "." : ""}`;
      const msg = `${who}, группа ${groupCode}: ${body.trim()}`.slice(0, 400);
      const r = await client.query(
        `INSERT INTO notifications (audience, user_id, cls, icon, msg)
         SELECT 'student', user_id, '', 'megaphone', $2 FROM group_students WHERE group_code = $1 AND user_id IS NOT NULL`, [groupCode, msg]);
      delivered = r.rowCount;
      await client.query("COMMIT");
    } catch (err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
    res.status(201).json({ ok: true, delivered });
  });

  // ── Applicants: public form, strictly rate-limited and size-capped ─────────
  const applyLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
  app.post("/applications", applyLimiter, async (req, res) => {
    const d = req.body;
    const ok = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max;
    if (!d || typeof d !== "object" || !ok(d.edu, 100) || !ok(d.spec, 200) || !ok(d.method, 50) || d.consent !== true ||
        !Array.isArray(d.docs) || d.docs.length > 20 || !d.docs.every(x => ok(x, 60))) return bad(res);
    const client = await pool.connect();
    let rows;
    try {
      await client.query("BEGIN");
      rows = (await client.query("INSERT INTO applications (edu, specialty, method, consent) VALUES ($1,$2,$3,true) RETURNING id", [d.edu, d.spec, d.method])).rows;
      for (const doc of new Set(d.docs)) await client.query("INSERT INTO application_documents (application_id, doc_key) VALUES ($1,$2)", [rows[0].id, doc]);
      await client.query("COMMIT");
    } catch (err) { await client.query("ROLLBACK"); throw err; } finally { client.release(); }
    res.status(201).json({ id: Number(rows[0].id) });
  });
};
