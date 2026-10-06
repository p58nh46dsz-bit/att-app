// Electives (ДПО + кружки) API: catalogue, interest survey, registrations, test results.
// Quiz answers are graded HERE: the catalogue sent to the app has no `correct` field, and
// the correct options are returned only after a student submits their answers.
const pool = require("./db");

const publicTests = tests => tests.map(t => ({
  ...t,
  questions: t.questions ? t.questions.map(({ q, options }) => ({ q, options })) : undefined,
}));

module.exports = function registerElectives(app, requireUser) {
  // Catalogue — the same information the academy publishes on its website, so it is public.
  app.get("/electives", async (_req, res) => {
    const [dpo, circles, interests, contact] = await Promise.all([
      pool.query("SELECT * FROM dpo_programs ORDER BY position"),
      pool.query("SELECT * FROM circles ORDER BY position"),
      pool.query("SELECT id, label FROM interest_options ORDER BY position"),
      pool.query("SELECT value FROM settings WHERE key = 'dpo_contact'"),
    ]);
    res.json({
      dpo: dpo.rows.map(p => ({
        id: p.id, title: p.title, category: p.category, price: p.price, hours: p.hours, term: p.term,
        doc: p.doc, paid: p.paid, tags: p.tags, desc: p.descr, materials: p.materials, tests: publicTests(p.tests),
      })),
      circles: circles.rows.map(c => ({
        id: c.id, title: c.title, category: c.category, leader: c.leader, ageRange: c.age_range,
        hours: c.hours, schedule: c.schedule, tags: c.tags, paid: c.paid,
      })),
      interests: interests.rows,
      contact: contact.rows[0] ? contact.rows[0].value : null,
    });
  });

  // Everything this user did in Факультативы.
  app.get("/me/electives", requireUser, async (req, res) => {
    const id = req.user.id;
    const [survey, regs, tests] = await Promise.all([
      pool.query("SELECT tags FROM interest_surveys WHERE user_id = $1", [id]),
      pool.query("SELECT kind, item_id FROM registrations WHERE user_id = $1 ORDER BY created_at", [id]),
      pool.query("SELECT program_id, test_idx, score FROM test_results WHERE user_id = $1", [id]),
    ]);
    res.json({
      survey: survey.rows[0] ? survey.rows[0].tags : null,
      dpo: regs.rows.filter(r => r.kind === "dpo").map(r => r.item_id),
      circles: regs.rows.filter(r => r.kind === "circle").map(r => r.item_id),
      tests: Object.fromEntries(tests.rows.map(r => [`${r.program_id}:${r.test_idx}`, r.score])),
    });
  });

  app.put("/me/survey", requireUser, async (req, res) => {
    const tags = (req.body || {}).tags;
    if (!Array.isArray(tags) || tags.length === 0 || tags.some(t => typeof t !== "string")) {
      return res.status(400).json({ error: "tags must be a non-empty array" });
    }
    const known = new Set((await pool.query("SELECT id FROM interest_options")).rows.map(r => r.id));
    if (!tags.every(t => known.has(t))) return res.status(400).json({ error: "unknown interest" });
    await pool.query(
      `INSERT INTO interest_surveys (user_id, tags) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET tags = $2, updated_at = now()`,
      [req.user.id, [...new Set(tags)]]);
    res.json({ ok: true });
  });

  app.post("/me/registrations", requireUser, async (req, res) => {
    const { kind, itemId } = req.body || {};
    const table = kind === "dpo" ? "dpo_programs" : kind === "circle" ? "circles" : null;
    if (!table || typeof itemId !== "string") return res.status(400).json({ error: "bad request" });
    if (!(await pool.query(`SELECT 1 FROM ${table} WHERE id = $1`, [itemId])).rowCount) {
      return res.status(404).json({ error: "not found" });
    }
    await pool.query(
      "INSERT INTO registrations (user_id, kind, item_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
      [req.user.id, kind, itemId]);
    res.status(201).json({ ok: true });
  });

  // Submit answers for a final test; only students registered for the programme can.
  app.post("/me/tests", requireUser, async (req, res) => {
    const { programId, idx, answers } = req.body || {};
    if (typeof programId !== "string" || !Number.isInteger(idx) || !Array.isArray(answers)) {
      return res.status(400).json({ error: "bad request" });
    }
    const reg = await pool.query(
      "SELECT 1 FROM registrations WHERE user_id=$1 AND kind='dpo' AND item_id=$2", [req.user.id, programId]);
    if (!reg.rowCount) return res.status(403).json({ error: "not registered" });
    const prog = (await pool.query("SELECT tests FROM dpo_programs WHERE id = $1", [programId])).rows[0];
    const test = prog && prog.tests[idx];
    if (!test || !test.questions || test.status === "locked") return res.status(404).json({ error: "no such test" });
    if (answers.length !== test.questions.length || !answers.every(a => Number.isInteger(a))) {
      return res.status(400).json({ error: "answer every question" });
    }
    const correct = test.questions.map(q => q.correct);
    const right = answers.filter((a, i) => a === correct[i]).length;
    const score = `${right}/${correct.length}`;
    await pool.query(
      `INSERT INTO test_results (user_id, program_id, test_idx, score) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, program_id, test_idx) DO UPDATE SET score = $4, taken_at = now()`,
      [req.user.id, programId, idx, score]);
    res.json({ score, correct });
  });
};
