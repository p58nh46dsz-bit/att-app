// Manage the list of subjects (until the admin screen for it exists).
//   npm run subjects                         – list
//   npm run subjects -- add "Математика"     – add a subject teachers can put marks in
//   npm run subjects -- remove "Математика"  – remove (refused if marks or files already use it)
const pool = require("./db");
(async () => {
  const [cmd, ...rest] = process.argv.slice(2);
  const name = rest.join(" ").trim();
  if (!cmd) {
    for (const r of (await pool.query("SELECT name, for_materials, gradable FROM subjects ORDER BY id")).rows) console.log(`${r.name}${r.gradable ? "" : "  (без оценок)"}`);
  } else if (cmd === "add" && name) {
    await pool.query("INSERT INTO subjects (name, for_materials, gradable) VALUES ($1, true, true) ON CONFLICT (name) DO NOTHING", [name]);
    console.log(`added: ${name}`);
  } else if (cmd === "remove" && name) {
    const r = await pool.query("DELETE FROM subjects WHERE name = $1", [name]);
    console.log(r.rowCount ? `removed: ${name}` : "no such subject");
  } else {
    console.log('usage: npm run subjects -- add|remove "Название"');
  }
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
