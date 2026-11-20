// Loads the public reference data into a NEW database. Run once after `npm run migrate`: npm run seed:data
//   * public content shown to everyone (specialties, FAQ, open days, news)
//   * lists the app offers (certificate types, consultation types and slots, portfolio categories)
//   * the document templates (recipients, signatories) used in the teacher's "Документы"
//   * the timetable from schedule.json
// It creates NO people, marks, notifications or documents: those come from the administrator and real users.
// Safe to re-run: these lists are overwritten from the source files.
const fs = require("fs");
const path = require("path");
const pool = require("./db");

const root = path.join(__dirname, "..");
const D = new Function(fs.readFileSync(path.join(root, "src/data/mockData.js"), "utf8") + `\n;return {
  MOCK_PORTFOLIO_CATEGORIES, MOCK_CONSULTATION_TYPES, MOCK_CONSULTATION_SLOTS, MOCK_CERTIFICATES,
  MOCK_SPEC_GROUPS, MOCK_FAQ_CATEGORIES, MOCK_FAQ_ITEMS, MOCK_OPEN_DAY_EVENTS, MOCK_ACADEMY_NEWS };`)();
const docDefaults = JSON.parse(fs.readFileSync(path.join(__dirname, "seed-data/doc_defaults.json"), "utf8"));

(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const content = (key, value) => client.query(
      "INSERT INTO content (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = $2", [key, JSON.stringify(value)]);
    await content("specialties", D.MOCK_SPEC_GROUPS);
    await content("faq", { categories: D.MOCK_FAQ_CATEGORIES, items: D.MOCK_FAQ_ITEMS });
    await content("open_days", D.MOCK_OPEN_DAY_EVENTS);
    await content("news", D.MOCK_ACADEMY_NEWS);
    await content("doc_defaults", docDefaults);

    for (const [i, c] of D.MOCK_CERTIFICATES.entries()) {
      await client.query(
        `INSERT INTO certificate_types (key, position, icon, title, sub) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (key) DO UPDATE SET position=$2, icon=$3, title=$4, sub=$5`, ["c" + (i + 1), i, c.icon, c.title, c.sub || ""]);
    }
    for (const [i, t] of D.MOCK_CONSULTATION_TYPES.entries()) {
      await client.query(
        `INSERT INTO consultation_types (position, icon, title, sub) VALUES ($1,$2,$3,$4)
         ON CONFLICT (title) DO UPDATE SET position=$1, icon=$2, sub=$4`, [i, t.icon, t.title, t.sub || ""]);
    }
    for (const [i, t] of D.MOCK_CONSULTATION_SLOTS.entries()) {
      await client.query("INSERT INTO consultation_slots (slot, position) VALUES ($1,$2) ON CONFLICT (slot) DO UPDATE SET position=$2", [t, i]);
    }
    for (const [i, c] of D.MOCK_PORTFOLIO_CATEGORIES.entries()) {
      await client.query(
        `INSERT INTO portfolio_categories (key, position, icon, color, title, sub) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (key) DO UPDATE SET position=$2, icon=$3, color=$4, title=$5, sub=$6`, [c.key, i, c.icon, c.color, c.title, c.sub || ""]);
    }
    await client.query("COMMIT");
    console.log("reference data loaded");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
