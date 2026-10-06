// Administrator panel API. Every route requires a signed-in user whose role is "admin"
// (checked here on the server — the app hiding a screen is not a protection).
// Everything an admin does is written to admin_audit; passwords are never written there.
const pool = require("./db");
const { createUser, passwordTaken, setPassword } = require("./users");
const { decryptPassword } = require("./passwordCrypto");
const { translit } = require("./accountLogic");

const bad = (res, msg = "bad request") => res.status(400).json({ error: msg });
const clean = v => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");
const isUuid = v => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const isId = v => /^\d{1,15}$/.test(String(v));
const fullName = r => [r.last_name, r.first_name, r.middle_name].filter(Boolean).join(" ");

const NAME_RE = /^[А-Яа-яЁёA-Za-z\s-]+$/;
const GROUP_RE = /^[А-Яа-яЁёA-Za-z0-9\s-]+$/;

// Validates the "new account" form → a person for createUser(), or an error message.
function parsePerson(b) {
  if (!["student", "teacher"].includes(b.role)) return { error: "Выберите роль пользователя." };
  const person = { role: b.role, lastName: clean(b.lastName), firstName: clean(b.firstName), middleName: clean(b.middleName) };
  for (const [field, label] of [["lastName", "Фамилия"], ["firstName", "Имя"], ["middleName", "Отчество"]]) {
    const v = person[field];
    if ((field !== "middleName" && !v) || (v && (!NAME_RE.test(v) || !translit(v) || v.length > 60))) {
      return { error: `${label}: укажите имя буквами, до 60 символов.` };
    }
  }
  if (b.role === "student") {
    person.group = clean(b.group).toUpperCase();
    if (!person.group || person.group.length > 40 || !GROUP_RE.test(person.group) || !translit(person.group)) {
      return { error: "Укажите группу студента, например ДВ-41." };
    }
    person.profile = {};
  } else {
    const groups = Array.isArray(b.groups) ? b.groups : String(b.groups || "").split(",");
    const profile = {
      department: clean(b.department).slice(0, 160), position: clean(b.position).slice(0, 120) || "Преподаватель",
      experience: clean(b.experience).slice(0, 60),
      groups: Array.from(new Set(groups.map(g => clean(g).toUpperCase()).filter(Boolean))).slice(0, 30),
      email: clean(b.email).slice(0, 160), phone: clean(b.phone).slice(0, 40),
    };
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return { error: "Проверьте email преподавателя." };
    if (profile.groups.some(g => g.length > 40 || !GROUP_RE.test(g))) return { error: "Проверьте список групп." };
    person.group = null;
    person.profile = profile;
  }
  return { person };
}

module.exports = function registerAdmin(app, requireUser) {
  const adminOnly = (req, res, next) => (req.user.role === "admin" ? next() : res.status(403).json({ error: "forbidden" }));
  const guard = [requireUser, adminOnly];

  const audit = (req, kind, action, target) => pool.query(
    "INSERT INTO admin_audit (admin_id, admin_login, kind, action, target) VALUES ($1,$2,$3,$4,$5)",
    [req.user.id, req.user.login, kind, action.slice(0, 120), String(target).slice(0, 200)]);

  const notify = (audience, userId, cls, icon, msg) => pool.query(
    "INSERT INTO notifications (audience, user_id, cls, icon, msg) VALUES ($1,$2,$3,$4,$5)",
    [audience, userId, cls, icon, msg.slice(0, 400)]);

  // ── Users ──────────────────────────────────────────────────────────────────
  app.get("/admin/users", ...guard, async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT id, login, role, last_name, first_name, middle_name, group_code, profile, (password_enc IS NOT NULL) AS has_password
       FROM users WHERE role <> 'admin' ORDER BY role DESC, last_name, first_name, login`);
    res.json(rows.map(r => ({
      id: r.id, login: r.login, role: r.role, lastName: r.last_name, firstName: r.first_name, middleName: r.middle_name,
      group: r.group_code, department: r.profile.department, position: r.profile.position, hasPassword: r.has_password,
    })));
  });

  app.post("/admin/users", ...guard, async (req, res) => {
    const { person, error } = parsePerson(req.body || {});
    if (error) return bad(res, error);
    const { user, password, duplicatePerson } = await createUser(person);
    await audit(req, "account", "Учётная запись создана", user.login);
    res.status(201).json({ login: user.login, password, duplicatePerson, name: fullName(user) });
  });

  // Reading a password is itself an audited action.
  app.get("/admin/users/:id/password", ...guard, async (req, res) => {
    if (!isUuid(req.params.id)) return bad(res);
    const u = (await pool.query("SELECT login, password_enc FROM users WHERE id = $1 AND role <> 'admin'", [req.params.id])).rows[0];
    if (!u) return res.status(404).json({ error: "not found" });
    const password = decryptPassword(u.password_enc);
    if (password !== null) await audit(req, "account", "Пароль просмотрен", u.login);
    res.set("Cache-Control", "no-store").json({ password });
  });

  app.post("/admin/users/:id/password", ...guard, async (req, res) => {
    const password = (req.body || {}).password;
    if (!isUuid(req.params.id)) return bad(res);
    if (typeof password !== "string" || password.trim() !== password || password.length < 6 || password.length > 128) {
      return bad(res, "Новый пароль: от 6 до 128 символов, без пробелов по краям.");
    }
    const u = (await pool.query("SELECT id, login FROM users WHERE id = $1 AND role <> 'admin'", [req.params.id])).rows[0];
    if (!u) return res.status(404).json({ error: "Аккаунт уже удалён или недоступен." });
    if (await passwordTaken(password, u.id)) return res.status(409).json({ error: "Этот пароль уже используется. Выберите другой." });
    await setPassword(u.id, password);
    await audit(req, "account", "Пароль изменён", u.login);
    res.json({ ok: true });
  });

  app.delete("/admin/users/:id", ...guard, async (req, res) => {
    if (!isUuid(req.params.id)) return bad(res);
    const { rows } = await pool.query("DELETE FROM users WHERE id = $1 AND role <> 'admin' RETURNING login", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Аккаунт уже удалён или недоступен." });
    await audit(req, "account", "Учётная запись удалена", rows[0].login);
    res.json({ ok: true });
  });

  // ── Announcements → delivered as notifications ─────────────────────────────
  const annOut = r => ({
    id: r.id, title: r.title, body: r.body, audience: r.audience, group: r.group_code, pinned: r.pinned,
    status: r.status, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString(),
  });

  // Rebuilds the notification rows of one announcement (none when it is archived).
  async function deliver(client, a) {
    await client.query("DELETE FROM notifications WHERE announcement_id = $1", [a.id]);
    if (a.status !== "published") return;
    const msg = `${a.title}: ${a.body}`.slice(0, 400);
    const add = (audience, userId) => client.query(
      "INSERT INTO notifications (audience, user_id, cls, icon, msg, announcement_id) VALUES ($1,$2,'','megaphone',$3,$4)", [audience, userId, msg, a.id]);
    if (a.audience === "all" || a.audience === "student") await add("student", null);
    if (a.audience === "all" || a.audience === "teacher") await add("teacher", null);
    if (a.audience === "group") {
      const students = (await client.query("SELECT id FROM users WHERE role = 'student' AND group_code = $1", [a.group_code])).rows;
      for (const s of students) await add("student", s.id);
      const teachers = (await client.query("SELECT id FROM users WHERE role = 'teacher' AND profile->'groups' ? $1", [a.group_code])).rows;
      for (const t of teachers) await add("teacher", t.id);
    }
  }

  function parseAnnouncement(b, partial) {
    const out = {};
    if (!partial || b.title !== undefined) { out.title = clean(b.title); if (!out.title || out.title.length > 120) return { error: "Заголовок: до 120 символов." }; }
    if (!partial || b.body !== undefined) { out.body = typeof b.body === "string" ? b.body.trim() : ""; if (!out.body || out.body.length > 4000) return { error: "Текст: до 4000 символов." }; }
    if (!partial || b.audience !== undefined) { if (!["all", "student", "teacher", "group"].includes(b.audience)) return { error: "Выберите аудиторию." }; out.audience = b.audience; }
    if (!partial || b.group !== undefined) { out.group = clean(b.group).toUpperCase().slice(0, 40); }
    if (!partial || b.pinned !== undefined) { out.pinned = b.pinned === true; }
    if (b.status !== undefined) { if (!["published", "archived"].includes(b.status)) return { error: "Неверный статус." }; out.status = b.status; }
    return { value: out };
  }

  async function saveAnnouncement(req, res, id) {
    const { value, error } = parseAnnouncement(req.body || {}, !!id);
    if (error) return bad(res, error);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let row, action;
      if (!id) {
        if (value.audience === "group" && !value.group) { await client.query("ROLLBACK"); return bad(res, "Укажите группу."); }
        row = (await client.query(
          "INSERT INTO announcements (title, body, audience, group_code, pinned) VALUES ($1,$2,$3,$4,$5) RETURNING *",
          [value.title, value.body, value.audience, value.audience === "group" ? value.group : "", value.pinned])).rows[0];
        action = "Объявление опубликовано";
      } else {
        const before = (await client.query("SELECT * FROM announcements WHERE id = $1 FOR UPDATE", [id])).rows[0];
        if (!before) { await client.query("ROLLBACK"); return res.status(404).json({ error: "not found" }); }
        const next = {
          title: value.title ?? before.title, body: value.body ?? before.body, audience: value.audience ?? before.audience,
          group: value.group ?? before.group_code, pinned: value.pinned ?? before.pinned, status: value.status ?? before.status,
        };
        if (next.audience === "group" && !next.group) { await client.query("ROLLBACK"); return bad(res, "Укажите группу."); }
        row = (await client.query(
          `UPDATE announcements SET title=$2, body=$3, audience=$4, group_code=$5, pinned=$6, status=$7, updated_at=now()
           WHERE id=$1 RETURNING *`,
          [id, next.title, next.body, next.audience, next.audience === "group" ? next.group : "", next.pinned, next.status])).rows[0];
        action = before.status !== row.status
          ? (row.status === "archived" ? "Объявление снято с публикации" : "Объявление опубликовано снова") : "Объявление изменено";
      }
      await deliver(client, row);
      await client.query("COMMIT");
      await audit(req, "news", action, row.title);
      res.status(id ? 200 : 201).json(annOut(row));
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  app.post("/admin/announcements", ...guard, (req, res) => saveAnnouncement(req, res, null));
  app.patch("/admin/announcements/:id", ...guard, (req, res) => (isUuid(req.params.id) ? saveAnnouncement(req, res, req.params.id) : bad(res)));

  // ── Certificate requests ───────────────────────────────────────────────────
  const certTitles = async () => {
    const v = ((await pool.query("SELECT value FROM content WHERE key = 'certificates'")).rows[0] || {}).value || [];
    return Object.fromEntries(v.map(c => [c.key, c.title]));
  };

  app.patch("/admin/certificates/:id", ...guard, async (req, res) => {
    const { status, note } = req.body || {};
    if (!isId(req.params.id) || (status !== undefined && !["new", "processing", "ready"].includes(status)) ||
        (note !== undefined && (typeof note !== "string" || note.length > 1000))) return bad(res);
    const before = (await pool.query("SELECT user_id, cert_key, status FROM certificate_requests WHERE id = $1", [req.params.id])).rows[0];
    if (!before) return res.status(404).json({ error: "not found" });
    await pool.query("UPDATE certificate_requests SET status = COALESCE($2, status), note = COALESCE($3, note) WHERE id = $1",
      [req.params.id, status ?? null, note === undefined ? null : note.trim()]);
    const title = (await certTitles())[before.cert_key] || before.cert_key;
    if (status === "ready" && before.status !== "ready") await notify("student", before.user_id, "green", "file-text", `Справка готова: ${title}`);
    await audit(req, "certificate", "Заявка на справку обновлена", title);
    res.json({ ok: true });
  });

  // ── Appeals ────────────────────────────────────────────────────────────────
  app.patch("/admin/appeals/:id", ...guard, async (req, res) => {
    const { status, reply } = req.body || {};
    if (!isId(req.params.id) || (status !== undefined && !["new", "working", "resolved"].includes(status)) ||
        (reply !== undefined && (typeof reply !== "string" || reply.length > 2000))) return bad(res);
    const before = (await pool.query(
      "SELECT a.user_id, a.subject, a.status, a.reply, u.role FROM appeals a JOIN users u ON u.id = a.user_id WHERE a.id = $1", [req.params.id])).rows[0];
    if (!before) return res.status(404).json({ error: "not found" });
    const nextReply = reply === undefined ? before.reply : reply.trim();
    const nextStatus = status ?? before.status;
    if (nextStatus === "resolved" && !nextReply) return bad(res, "Напишите ответ перед закрытием обращения.");
    await pool.query("UPDATE appeals SET status = $2, reply = $3, updated_at = now() WHERE id = $1", [req.params.id, nextStatus, nextReply]);
    if (nextReply && nextReply !== before.reply) {
      await notify(before.role === "teacher" ? "teacher" : "student", before.user_id, "", "message-circle", `Ответ на обращение «${before.subject}»: ${nextReply}`);
    }
    await audit(req, "appeal", "Обращение обновлено", before.subject);
    res.json({ ok: true });
  });

  // ── Events ─────────────────────────────────────────────────────────────────
  app.post("/admin/events", ...guard, async (req, res) => {
    const b = req.body || {};
    const title = clean(b.title), place = clean(b.place), body = typeof b.body === "string" ? b.body.trim() : "";
    const when = new Date(b.date);
    if (!title || title.length > 120 || place.length > 120 || body.length > 2000 || Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      return bad(res, "Укажите название и будущую дату события.");
    }
    await pool.query("INSERT INTO admin_events (title, starts_at, place, body) VALUES ($1,$2,$3,$4)", [title, when, place, body]);
    await audit(req, "event", "Событие добавлено", title);
    res.status(201).json({ ok: true });
  });

  // ── Everything the overview/service screens show, in one request ───────────
  app.get("/admin/services", ...guard, async (_req, res) => {
    const titles = await certTitles();
    const [ann, certs, appeals, events] = await Promise.all([
      pool.query("SELECT * FROM announcements ORDER BY created_at DESC"),
      pool.query(`SELECT c.id, c.cert_key, c.purpose, c.status, c.note, c.created_at, u.last_name, u.first_name, u.middle_name, u.group_code
                  FROM certificate_requests c JOIN users u ON u.id = c.user_id ORDER BY c.created_at DESC`),
      pool.query(`SELECT a.id, a.subject, a.message, a.status, a.reply, a.created_at, u.last_name, u.first_name, u.middle_name, u.group_code
                  FROM appeals a JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC`),
      pool.query("SELECT id, title, starts_at, place, body FROM admin_events ORDER BY starts_at"),
    ]);
    res.json({
      announcements: ann.rows.map(annOut),
      certificates: certs.rows.map(r => ({
        id: String(r.id), name: fullName(r), group: r.group_code || "", type: titles[r.cert_key] || r.cert_key,
        purpose: r.purpose, status: r.status, note: r.note, createdAt: r.created_at.toISOString(),
      })),
      appeals: appeals.rows.map(r => ({
        id: String(r.id), name: fullName(r), group: r.group_code || "", subject: r.subject, message: r.message,
        status: r.status, reply: r.reply, createdAt: r.created_at.toISOString(),
      })),
      events: events.rows.map(r => ({ id: r.id, title: r.title, date: r.starts_at.toISOString(), place: r.place, body: r.body })),
    });
  });

  app.get("/admin/audit", ...guard, async (_req, res) => {
    const { rows } = await pool.query("SELECT id, admin_login, kind, action, target, created_at FROM admin_audit ORDER BY created_at DESC, id DESC LIMIT 200");
    res.json(rows.map(r => ({ id: String(r.id), at: r.created_at.toISOString(), actor: r.admin_login, type: r.kind, action: r.action, target: r.target })));
  });
};
