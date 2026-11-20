// Loads the electives catalogue (ДПО, кружки, interest options, contacts) from the app's
// mock data into PostgreSQL. Run: npm run seed:catalog
// Re-running UPDATES existing rows from mockData.js, so while that file is the source of
// truth edits belong there; once an admin UI edits the catalogue in the database, stop running this.
const fs = require("fs");
const path = require("path");
const pool = require("./db");

const src = fs.readFileSync(path.join(__dirname, "../src/data/mockData.js"), "utf8");
const D = new Function(src + `\n;return { MOCK_ELECTIVES_DPO, MOCK_ELECTIVES_CIRCLES, MOCK_INTEREST_OPTIONS,
  MOCK_DPO_CONTACT };`)();

(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [i, o] of D.MOCK_INTEREST_OPTIONS.entries()) {
      await client.query(
        "INSERT INTO interest_options (id, position, label) VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET position=$2, label=$3",
        [o.id, i, o.label]);
    }
    const num = t => parseInt(String(t).replace(/\D/g, ""), 10);
    const setTags = async (table, col, id, tags) => {
      await client.query(`DELETE FROM ${table} WHERE ${col} = $1`, [id]);
      for (const t of new Set(tags || [])) await client.query(`INSERT INTO ${table} (${col}, interest_id) VALUES ($1,$2)`, [id, t]);
    };
    for (const [i, p] of D.MOCK_ELECTIVES_DPO.entries()) {
      await client.query(
        `INSERT INTO dpo_programs (id, position, title, category, price_rub, hours_count, term_amount, term_unit, doc, paid, descr)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE SET position=$2, title=$3, category=$4, price_rub=$5, hours_count=$6, term_amount=$7, term_unit=$8,
           doc=$9, paid=$10, descr=$11`,
        [p.id, i, p.title, p.category, num(p.price), num(p.hours), num(p.term), /дн/.test(p.term) ? "days" : "weeks", p.doc, p.paid, p.desc]);
      await setTags("program_interests", "program_id", p.id, p.tags);
    }
    for (const [i, c] of D.MOCK_ELECTIVES_CIRCLES.entries()) {
      await client.query(
        `INSERT INTO circles (id, position, title, category, leader, age_range, hours, schedule, paid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET position=$2, title=$3, category=$4, leader=$5, age_range=$6, hours=$7, schedule=$8, paid=$9`,
        [c.id, i, c.title, c.category, c.leader || "", c.ageRange || null, c.hours || null, c.schedule || "", !!c.paid]);
      await setTags("circle_interests", "circle_id", c.id, c.tags);
    }
    await client.query(
      "INSERT INTO settings (key, value) VALUES ('dpo_contact', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
      [JSON.stringify(D.MOCK_DPO_CONTACT)]);
    await client.query("COMMIT");
    console.log(`catalogue loaded: ${D.MOCK_ELECTIVES_DPO.length} ДПО, ${D.MOCK_ELECTIVES_CIRCLES.length} кружков, ${D.MOCK_INTEREST_OPTIONS.length} интересов`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
