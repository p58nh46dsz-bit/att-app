// Groups and teaching: the list of groups (kept by the administrator), and each teacher's own choice of
// groups and of the subjects they teach to them.
const pool = require("./db");

const only = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: "forbidden" });
const bad = (res, msg = "bad request") => res.status(400).json({ error: msg });
const SUBJECT_MAX = 120;
const cleanName = v => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");

module.exports = function registerTeaching(app, requireUser) {
  // Every group in the college, for the pickers (account form, teacher's choice).
  app.get("/group-list", requireUser, async (_req, res) => {
    const { rows } = await pool.query("SELECT code FROM groups ORDER BY code");
    res.json(rows.map(r => r.code));
  });

  // A teacher's groups with the subjects taught to each, the groups still free to choose, and subject suggestions.
  async function teachingOf(teacherId) {
    const [mine, assigned, all, known] = await Promise.all([
      pool.query("SELECT group_code FROM teacher_groups WHERE teacher_id = $1 ORDER BY position, group_code", [teacherId]),
      pool.query(`SELECT a.group_code, s.name FROM teacher_assignments a JOIN subjects s ON s.id = a.subject_id
                  WHERE a.teacher_id = $1 ORDER BY s.name`, [teacherId]),
      pool.query("SELECT code FROM groups ORDER BY code"),
      pool.query("SELECT name FROM subjects WHERE gradable ORDER BY name"),
    ]);
    const bySubjects = new Map();
    for (const r of assigned.rows) (bySubjects.get(r.group_code) || bySubjects.set(r.group_code, []).get(r.group_code)).push(r.name);
    const mineCodes = mine.rows.map(r => r.group_code);
    const taught = [...new Set(assigned.rows.map(r => r.name))];
    return {
      groups: mineCodes.map(code => ({ code, subjects: bySubjects.get(code) || [] })),
      availableGroups: all.rows.map(r => r.code).filter(c => !mineCodes.includes(c)),
      // first the subjects this teacher already teaches somewhere, then everything else known
      suggestions: [...taught, ...known.rows.map(r => r.name).filter(n => !taught.includes(n))],
    };
  }
  app.get("/me/teaching", requireUser, only("teacher"), async (req, res) => res.json(await teachingOf(req.user.id)));

  app.post("/me/teaching/groups", requireUser, only("teacher"), async (req, res) => {
    const code = cleanName((req.body || {}).code);
    if (!code || !(await pool.query("SELECT 1 FROM groups WHERE code = $1", [code])).rowCount) return bad(res, "Такой группы нет в списке.");
    await pool.query(
      `INSERT INTO teacher_groups (teacher_id, group_code, position)
       VALUES ($1, $2, COALESCE((SELECT max(position) + 1 FROM teacher_groups WHERE teacher_id = $1), 0)) ON CONFLICT DO NOTHING`, [req.user.id, code]);
    res.status(201).json(await teachingOf(req.user.id));
  });

  app.delete("/me/teaching/groups/:code", requireUser, only("teacher"), async (req, res) => {
    await pool.query("DELETE FROM teacher_groups WHERE teacher_id = $1 AND group_code = $2", [req.user.id, req.params.code]); // takes its subjects with it
    res.json(await teachingOf(req.user.id));
  });

  // The teacher types the subject's name, or picks a suggested one; a name that isn't known yet is added to the list.
  app.post("/me/teaching/subjects", requireUser, only("teacher"), async (req, res) => {
    const group = cleanName((req.body || {}).group), name = cleanName((req.body || {}).subject);
    if (!name || name.length > SUBJECT_MAX) return bad(res, "Введите название предмета (до 120 символов).");
    if (!(await pool.query("SELECT 1 FROM teacher_groups WHERE teacher_id = $1 AND group_code = $2", [req.user.id, group])).rowCount) {
      return bad(res, "Сначала выберите эту группу как свою.");
    }
    let subj = (await pool.query("SELECT id FROM subjects WHERE lower(name) = lower($1)", [name])).rows[0];
    if (!subj) subj = (await pool.query("INSERT INTO subjects (name, for_materials, gradable) VALUES ($1, true, true) RETURNING id", [name])).rows[0];
    await pool.query("INSERT INTO teacher_assignments (teacher_id, group_code, subject_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [req.user.id, group, subj.id]);
    res.status(201).json(await teachingOf(req.user.id));
  });

  app.delete("/me/teaching/subjects", requireUser, only("teacher"), async (req, res) => {
    const group = cleanName(req.query.group), name = cleanName(req.query.subject);
    await pool.query(
      `DELETE FROM teacher_assignments a USING subjects s
       WHERE s.id = a.subject_id AND a.teacher_id = $1 AND a.group_code = $2 AND lower(s.name) = lower($3)`, [req.user.id, group, name]);
    res.json(await teachingOf(req.user.id));
  });
};
