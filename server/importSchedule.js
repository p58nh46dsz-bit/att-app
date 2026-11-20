// Loads the timetable from schedule.json (kept up to date by the GitHub Action that scrapes att.spb.ru)
// into the database. Safe to run every hour: days are overwritten, nothing else is touched.
//   npm run import:schedule
const fs = require("fs");
const path = require("path");
const pool = require("./db");

(async () => {
  // SCHEDULE_FILE: the production server keeps the freshest copy next to the site (see deploy/update-schedule.sh).
  const sched = JSON.parse(fs.readFileSync(process.env.SCHEDULE_FILE || path.join(__dirname, "../schedule.json"), "utf8"));
  const pad = n => String(n).padStart(2, "0");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO groups (code) VALUES ($1) ON CONFLICT DO NOTHING", [sched.group]);
    for (const [day, r] of Object.entries(sched.days)) {
      await client.query(
        `INSERT INTO schedule_days (group_code, day, corpus, weekday, source_url, generated_at) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (group_code, day) DO UPDATE SET corpus=$3, weekday=$4, source_url=$5, generated_at=$6`,
        [sched.group, day, r.corpus || null, r.weekday || null, r.source_url || null, r.generated_at || sched.generated_at || null]);
      await client.query("DELETE FROM schedule_lessons WHERE group_code = $1 AND day = $2", [sched.group, day]);
      for (const l of r.lessons || []) {
        await client.query(
          "INSERT INTO schedule_lessons (group_code, day, period, start_time, end_time, room, subject, teacher) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
          [sched.group, day, l.period, `${pad(l.start[0])}:${pad(l.start[1])}`, `${pad(l.end[0])}:${pad(l.end[1])}`, l.room || "", l.subj, l.teacher || ""]);
      }
    }
    await client.query("INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = $2",
      ["schedule_meta:" + sched.group, JSON.stringify({ generated_at: sched.generated_at })]);
    await client.query("COMMIT");
    console.log(`schedule ${sched.group}: ${Object.keys(sched.days).length} days`);
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); await pool.end(); }
})().catch(e => { console.error(e.message); process.exit(1); });
