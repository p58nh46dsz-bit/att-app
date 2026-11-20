// Electives (ДПО + кружки) API: catalogue, interest survey, registrations, test results.
// Quiz answers are graded HERE: the catalogue sent to the app has no `correct` field, and
// the correct options are returned only after a student submits their answers.
const pool = require("./db");

// "7 800 руб.", "18 часов", "4 недели": numbers are stored as numbers, the app gets the same words as before.
const plural = (n, one, few, many) => { const m = n % 100, d = n % 10; return m > 10 && m < 20 ? many : d === 1 ? one : d >= 2 && d <= 4 ? few : many; };
const money = n => (n == null ? "" : `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} руб.`);
const hoursText = n => `${n} ${plural(n, "час", "часа", "часов")}`;
const termText = (n, unit) => `${n} ${unit === "weeks" ? plural(n, "неделя", "недели", "недель") : plural(n, "день", "дня", "дней")}`;

// Tests of one or more programmes, assembled from dpo_tests / dpo_questions / dpo_options.
// withAnswers=false drops `correct`, so the app never sees the right answers before submitting.
async function loadTests(programIds, withAnswers) {
  const [tests, questions, options] = await Promise.all([
    pool.query("SELECT id, program_id, title, status, score FROM dpo_tests WHERE program_id = ANY($1) ORDER BY program_id, position", [programIds]),
    pool.query(`SELECT q.id, q.test_id, q.text, q.correct_idx FROM dpo_questions q JOIN dpo_tests t ON t.id = q.test_id WHERE t.program_id = ANY($1) ORDER BY q.test_id, q.position`, [programIds]),
    pool.query(`SELECT o.question_id, o.text FROM dpo_options o JOIN dpo_questions q ON q.id = o.question_id JOIN dpo_tests t ON t.id = q.test_id WHERE t.program_id = ANY($1) ORDER BY o.question_id, o.position`, [programIds]),
  ]);
  const opts = new Map();
  for (const o of options.rows) (opts.get(o.question_id) || opts.set(o.question_id, []).get(o.question_id)).push(o.text);
  const qs = new Map();
  for (const q of questions.rows) {
    (qs.get(q.test_id) || qs.set(q.test_id, []).get(q.test_id)).push(
      { q: q.text, ...(withAnswers ? { correct: q.correct_idx } : {}), options: opts.get(q.id) || [] });
  }
  const byProgram = new Map();
  for (const t of tests.rows) {
    const out = { title: t.title, status: t.status, ...(t.score ? { score: t.score } : {}), ...(qs.has(t.id) ? { questions: qs.get(t.id) } : {}) };
    (byProgram.get(t.program_id) || byProgram.set(t.program_id, []).get(t.program_id)).push(out);
  }
  return byProgram;
}

module.exports = function registerElectives(app, requireUser) {
  // Catalogue — the same information the academy publishes on its website, so it is public.
  app.get("/electives", async (_req, res) => {
    const [dpo, circles, interests, contact, mats, pInt, cInt] = await Promise.all([
      pool.query("SELECT * FROM dpo_programs ORDER BY position"),
      pool.query("SELECT * FROM circles ORDER BY position"),
      pool.query("SELECT id, label FROM interest_options ORDER BY position"),
      pool.query("SELECT value FROM settings WHERE key = 'dpo_contact'"),
      pool.query("SELECT program_id, name, type, size, date_label FROM dpo_materials ORDER BY program_id, position"),
      pool.query("SELECT program_id, interest_id FROM program_interests ORDER BY interest_id"),
      pool.query("SELECT circle_id, interest_id FROM circle_interests ORDER BY interest_id"),
    ]);
    const tests = await loadTests(dpo.rows.map(p => p.id), false);
    const group = (rows, key, val) => { const m = new Map(); for (const r of rows) (m.get(r[key]) || m.set(r[key], []).get(r[key])).push(val(r)); return m; };
    const matsBy = group(mats.rows, "program_id", r => ({ date: r.date_label, name: r.name, size: r.size, type: r.type }));
    const pTags = group(pInt.rows, "program_id", r => r.interest_id);
    const cTags = group(cInt.rows, "circle_id", r => r.interest_id);
    res.json({
      dpo: dpo.rows.map(p => ({
        id: p.id, title: p.title, category: p.category, price: money(p.price_rub), hours: hoursText(p.hours_count), term: termText(p.term_amount, p.term_unit),
        doc: p.doc, paid: p.paid, tags: pTags.get(p.id) || [], desc: p.descr, materials: matsBy.get(p.id) || [], tests: tests.get(p.id) || [],
      })),
      circles: circles.rows.map(c => ({
        id: c.id, title: c.title, category: c.category, leader: c.leader, ageRange: c.age_range,
        hours: c.hours, schedule: c.schedule, tags: cTags.get(c.id) || [], paid: c.paid,
      })),
      interests: interests.rows,
      contact: contact.rows[0] ? contact.rows[0].value : null,
    });
  });

  // Everything this user did in Факультативы.
  app.get("/me/electives", requireUser, async (req, res) => {
    const id = req.user.id;
    const [survey, dpo, circles, tests] = await Promise.all([
      pool.query("SELECT interest_id FROM user_interests WHERE user_id = $1 ORDER BY interest_id", [id]),
      pool.query("SELECT program_id FROM dpo_registrations WHERE user_id = $1 ORDER BY created_at", [id]),
      pool.query("SELECT circle_id FROM circle_registrations WHERE user_id = $1 ORDER BY created_at", [id]),
      pool.query("SELECT t.program_id, t.position, r.score FROM test_results r JOIN dpo_tests t ON t.id = r.test_id WHERE r.user_id = $1", [id]),
    ]);
    const done = (await pool.query("SELECT 1 FROM interest_surveys WHERE user_id = $1", [id])).rowCount > 0;
    res.json({
      survey: done ? survey.rows.map(r => r.interest_id) : null,
      dpo: dpo.rows.map(r => r.program_id),
      circles: circles.rows.map(r => r.circle_id),
      tests: Object.fromEntries(tests.rows.map(r => [`${r.program_id}:${r.position}`, r.score])),
    });
  });

  app.put("/me/survey", requireUser, async (req, res) => {
    const tags = (req.body || {}).tags;
    if (!Array.isArray(tags) || tags.length === 0 || tags.some(t => typeof t !== "string")) {
      return res.status(400).json({ error: "tags must be a non-empty array" });
    }
    const known = new Set((await pool.query("SELECT id FROM interest_options")).rows.map(r => r.id));
    if (!tags.every(t => known.has(t))) return res.status(400).json({ error: "unknown interest" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO interest_surveys (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = now()", [req.user.id]);
      await client.query("DELETE FROM user_interests WHERE user_id = $1", [req.user.id]);
      for (const t of new Set(tags)) await client.query("INSERT INTO user_interests (user_id, interest_id) VALUES ($1,$2)", [req.user.id, t]);
      await client.query("COMMIT");
    } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
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
      kind === "dpo"
        ? "INSERT INTO dpo_registrations (user_id, program_id) VALUES ($1,$2) ON CONFLICT DO NOTHING"
        : "INSERT INTO circle_registrations (user_id, circle_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [req.user.id, itemId]);
    res.status(201).json({ ok: true });
  });

  // Submit answers for a final test; only students registered for the programme can.
  app.post("/me/tests", requireUser, async (req, res) => {
    const { programId, idx, answers } = req.body || {};
    if (typeof programId !== "string" || !Number.isInteger(idx) || !Array.isArray(answers)) {
      return res.status(400).json({ error: "bad request" });
    }
    const reg = await pool.query("SELECT 1 FROM dpo_registrations WHERE user_id=$1 AND program_id=$2", [req.user.id, programId]);
    if (!reg.rowCount) return res.status(403).json({ error: "not registered" });
    const test = ((await loadTests([programId], true)).get(programId) || [])[idx];
    if (!test || !test.questions || test.status === "locked") return res.status(404).json({ error: "no such test" });
    if (answers.length !== test.questions.length || !answers.every(a => Number.isInteger(a))) {
      return res.status(400).json({ error: "answer every question" });
    }
    const correct = test.questions.map(q => q.correct);
    const right = answers.filter((a, i) => a === correct[i]).length;
    const score = `${right}/${correct.length}`;
    await pool.query(
      `INSERT INTO test_results (user_id, test_id, score)
       SELECT $1, t.id, $4 FROM dpo_tests t WHERE t.program_id = $2 AND t.position = $3
       ON CONFLICT (user_id, test_id) DO UPDATE SET score = $4, taken_at = now()`,
      [req.user.id, programId, idx, score]);
    res.json({ score, correct });
  });
};
