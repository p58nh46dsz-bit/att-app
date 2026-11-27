// Fills in today's timetable when the server was down at the time the academy's timetable was published.
// The timetables are read from the academy's site by the GitHub Action (schedule.json and teacher_schedule.json in the
// repository). Production pulls them every hour from cron (deploy/update-schedule.sh); a server that is switched off at
// that moment (for example a laptop) would otherwise miss the day. So at start and every 30 minutes this checks the
// database for today's (Moscow) lessons, and only if they are missing downloads the files and runs the same importers
// the cron script runs. Once the day is in the database, nothing is downloaded.
// Turn it off with SCHEDULE_SYNC=off. The branch is SCHEDULE_BRANCH (default main).
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const pool = require("./db");

const REPO = process.env.ATT_REPO || "p58nh46dsz-bit/att-app";
const BRANCH = process.env.SCHEDULE_BRANCH || "main";
const EVERY_MS = 30 * 60 * 1000;
const RAW = name => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${name}`;

let busy = false;

// Today's date in Moscow, as the schedule tables key it (YYYY-MM-DD).
function moscowToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(new Date());
}

// Downloads a file and checks that it is valid JSON that has a day for today; returns its text or null.
async function fetchFor(name, day) {
  const r = await fetch(RAW(name), { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  const text = await r.text();
  const data = JSON.parse(text);   // refuse anything that is not valid JSON
  return data.days && data.days[day] ? text : null;
}

function runImporter(script, env) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [path.join(__dirname, script)], { cwd: __dirname, env: { ...process.env, ...env }, timeout: 180000 },
      (err, stdout, stderr) => {
        if (stdout) process.stdout.write(stdout);
        if (err) return reject(new Error(`${script}: ${stderr || err.message}`));
        resolve();
      });
  });
}

async function hasDay(table, day) {
  const { rowCount } = await pool.query(`SELECT 1 FROM ${table} WHERE day = $1 LIMIT 1`, [day]);
  return rowCount > 0;
}

// One pass: if a table has no lessons for today, load the freshest file for it.
async function check() {
  if (busy) return;
  busy = true;
  let dir = null;
  try {
    const day = moscowToday();
    const needTeachers = !(await hasDay("teacher_schedule_days", day));
    const needGroups = !(await hasDay("schedule_days", day));
    if (!needTeachers && !needGroups) return;
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "att-sched-"));
    if (needGroups) {
      const text = await fetchFor("schedule.json", day);
      if (text) {
        const file = path.join(dir, "schedule.json");
        fs.writeFileSync(file, text);
        await runImporter("importSchedule.js", { SCHEDULE_FILE: file });
        console.log(`schedule sync: groups for ${day} loaded from ${BRANCH}`);
      }
    }
    if (needTeachers) {
      const text = await fetchFor("teacher_schedule.json", day);
      if (text) {
        const file = path.join(dir, "teacher_schedule.json");
        fs.writeFileSync(file, text);
        await runImporter("importTeacherSchedule.js", { TEACHER_SCHEDULE_FILE: file });
        console.log(`schedule sync: teachers for ${day} loaded from ${BRANCH}`);
      }
    }
  } catch (e) {
    // Offline, or the day is not published yet: the next tick tries again.
    console.warn(`schedule sync skipped: ${e.message}`);
  } finally {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
    busy = false;
  }
}

function start() {
  if (process.env.SCHEDULE_SYNC === "off") return;
  setTimeout(check, 5000).unref();
  setInterval(check, EVERY_MS).unref();
}

module.exports = { start, check, moscowToday };
