// Loads the teachers' timetable from teacher_schedule.json (written by scripts/scrape_teachers.py) into the database.
// Safe to run every hour: a day that is in the file is replaced as a whole, other days are not touched.
//   npm run import:teachers
const fs = require("fs");
const path = require("path");
const pool = require("./db");

(async () => {
  // TEACHER_SCHEDULE_FILE: the production server keeps the freshest copy next to the site (deploy/update-schedule.sh).
  const file = process.env.TEACHER_SCHEDULE_FILE || path.join(__dirname, "../teacher_schedule.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const pad = n => String(n).padStart(2, "0");
  const time = t => (Array.isArray(t) ? `${pad(t[0])}:${pad(t[1])}` : null);
  const client = await pool.connect();
  let lessons = 0;
  try {
    await client.query("BEGIN");
    for (const [day, rec] of Object.entries(data.days || {})) {
      await client.query("DELETE FROM teacher_schedule_days WHERE day = $1", [day]);   // its lessons go with it
      await client.query("INSERT INTO teacher_schedule_days (day, weekday, generated_at) VALUES ($1,$2,$3)", [day, rec.weekday || null, rec.generated_at || null]);
      for (const l of rec.lessons || []) {
        await client.query(
          `INSERT INTO teacher_lessons (day, corpus, period, teacher, group_name, subject, room, note, start_time, end_time)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [day, l.corpus, l.period, l.teacher, l.group || "", l.subj || "", l.room || "", l.note || "", time(l.start), time(l.end)]);
        lessons++;
      }
    }
    await client.query("COMMIT");
    console.log(`teachers' timetable: ${Object.keys(data.days || {}).length} days, ${lessons} lessons`);
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); await pool.end(); }
})().catch(e => { console.error(e.message); process.exit(1); });
