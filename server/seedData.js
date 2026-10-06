// Loads the app's placeholder data into PostgreSQL. Run: npm run seed:data
// Safe to re-run: content blobs, groups and the schedule are overwritten from the source files;
// notifications and per-user demo rows (grades, portfolio, certificates, materials) are only
// created when missing, so nothing a user did is lost.
const fs = require("fs");
const path = require("path");
const pool = require("./db");

const root = path.join(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");

const D = new Function(read("src/data/mockData.js") + `\n;return {
  MOCK_GRADES_SUBJECTS, MOCK_PORTFOLIO_CATEGORIES, MOCK_PORTFOLIO_ITEMS, MOCK_CURRICULUM_YEARS,
  MOCK_CONSULTATION_TYPES, MOCK_CONSULTATION_SLOTS, MOCK_CERTIFICATES, MOCK_MATERIALS_BY_SUBJECT,
  MOCK_STUDENTS_BY_GROUP, MOCK_SPEC_GROUPS, MOCK_FAQ_CATEGORIES, MOCK_FAQ_ITEMS, MOCK_OPEN_DAY_EVENTS,
  MOCK_ACADEMY_NEWS, MOCK_DOC_GROUP, MOCK_DOC_TEACHER, MOCK_DOC_STUDENTS, MOCK_DOC_RECIPIENTS,
  MOCK_DOC_ORDER, MOCK_DOC_DISTRIBUTION };`)();

// STUDENT_NOTIFS / TEACHER_NOTIFS live inside a .jsx file, so pull just those array literals out.
const notifSrc = read("src/components/shared/Notifications.jsx");
const grab = name => new Function(`return ${notifSrc.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\]);`))[1]}`)();
const STUDENT_NOTIFS = grab("STUDENT_NOTIFS");
const TEACHER_NOTIFS = grab("TEACHER_NOTIFS");

// "Сегодня, 09:00" / "Вчера, 18:30" / "3 дня назад" → a timestamp relative to now.
function parseTime(s) {
  const d = new Date();
  let m;
  if ((m = /^(Сегодня|Вчера), (\d\d):(\d\d)$/.exec(s))) {
    if (m[1] === "Вчера") d.setDate(d.getDate() - 1);
    d.setHours(+m[2], +m[3], 0, 0);
  } else if ((m = /^(\d+) /.exec(s))) {
    d.setDate(d.getDate() - +m[1]);
  }
  return d;
}

async function content(client, key, value) {
  await client.query("INSERT INTO content (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = $2", [key, JSON.stringify(value)]);
}

(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── public content ─────────────────────────────────────────────────────
    const certs = D.MOCK_CERTIFICATES.map((c, i) => ({ key: "c" + (i + 1), icon: c.icon, title: c.title, sub: c.sub }));
    await content(client, "specialties", D.MOCK_SPEC_GROUPS);
    await content(client, "faq", { categories: D.MOCK_FAQ_CATEGORIES, items: D.MOCK_FAQ_ITEMS });
    await content(client, "open_days", D.MOCK_OPEN_DAY_EVENTS);
    await content(client, "news", D.MOCK_ACADEMY_NEWS);
    await content(client, "curriculum", D.MOCK_CURRICULUM_YEARS);
    await content(client, "portfolio_categories", D.MOCK_PORTFOLIO_CATEGORIES);
    await content(client, "consultation_types", D.MOCK_CONSULTATION_TYPES);
    await content(client, "consultation_slots", D.MOCK_CONSULTATION_SLOTS);
    await content(client, "certificates", certs);
    await content(client, "teacher_subjects", Object.keys(D.MOCK_MATERIALS_BY_SUBJECT));
    await content(client, "doc_defaults", {
      teacher: D.MOCK_DOC_TEACHER, recipients: D.MOCK_DOC_RECIPIENTS, order: D.MOCK_DOC_ORDER, distribution: D.MOCK_DOC_DISTRIBUTION,
    });

    // ── groups and rosters ─────────────────────────────────────────────────
    const g = D.MOCK_DOC_GROUP;
    await client.query(
      `INSERT INTO groups (code, specialty_code, specialty_name, mdk_code, mdk_name) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (code) DO UPDATE SET specialty_code=$2, specialty_name=$3, mdk_code=$4, mdk_name=$5`,
      [g.code, g.specialtyCode, g.specialtyName, g.mdkCode, g.mdkName]);
    await client.query("DELETE FROM group_roster WHERE group_code = $1", [g.code]);
    for (const [i, s] of D.MOCK_DOC_STUDENTS.entries()) {
      await client.query("INSERT INTO group_roster (group_code, position, student_name, topic) VALUES ($1,$2,$3,$4)", [g.code, i, s.name, s.topic]);
    }
    for (const [code, names] of Object.entries(D.MOCK_STUDENTS_BY_GROUP)) {
      await client.query("INSERT INTO groups (code) VALUES ($1) ON CONFLICT DO NOTHING", [code]);
      await client.query("DELETE FROM group_roster WHERE group_code = $1", [code]);
      for (const [i, n] of names.entries()) {
        await client.query("INSERT INTO group_roster (group_code, position, student_name) VALUES ($1,$2,$3)", [code, i, n]);
      }
    }

    // ── schedule (ДВ-41, scraped) ──────────────────────────────────────────
    const sched = JSON.parse(read("schedule.json"));
    for (const [day, record] of Object.entries(sched.days)) {
      await client.query(
        "INSERT INTO schedule_days (group_code, day, record) VALUES ($1,$2,$3) ON CONFLICT (group_code, day) DO UPDATE SET record = $3",
        [sched.group, day, JSON.stringify(record)]);
    }
    await client.query(
      "INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = $2",
      ["schedule_meta:" + sched.group, JSON.stringify({ generated_at: sched.generated_at })]);

    // ── teacher profiles from people.json (so group lists stay in sync) ─────
    const people = JSON.parse(read("scripts/people.json"));
    for (const p of people.filter(x => x.role === "teacher")) {
      await client.query(
        "UPDATE users SET profile = profile || $1 WHERE role = 'teacher' AND last_name = $2 AND first_name = $3",
        [JSON.stringify({ groups: p.groups, department: p.department, position: p.position, experience: p.experience, email: p.email, phone: p.phone }), p.lastName, p.firstName]);
    }

    // ── notifications: only when the table is empty (never duplicate, never reset reads) ──
    const users = (await client.query("SELECT id, role FROM users")).rows;
    if (!(await client.query("SELECT 1 FROM notifications LIMIT 1")).rowCount) {
      for (const [aud, list] of [["student", STUDENT_NOTIFS], ["teacher", TEACHER_NOTIFS]]) {
        for (const n of list) {
          const { rows } = await client.query(
            "INSERT INTO notifications (audience, cls, icon, msg, created_at) VALUES ($1,$2,$3,$4,$5) RETURNING id",
            [aud, n.cls, n.icon, n.msg, parseTime(n.time)]);
          if (!n.unread) {
            for (const u of users.filter(u => (aud === "teacher" ? u.role !== "student" : u.role === "student"))) {
              await client.query("INSERT INTO notification_reads (user_id, notification_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [u.id, rows[0].id]);
            }
          }
        }
      }
    }

    // ── per-user demo rows, created only when a user has none yet ──────────
    for (const u of users.filter(u => u.role === "student")) {
      if (!(await client.query("SELECT 1 FROM grades WHERE user_id = $1 LIMIT 1", [u.id])).rowCount) {
        for (const [i, s] of D.MOCK_GRADES_SUBJECTS.entries()) {
          await client.query("INSERT INTO grades (user_id, subject, position, items) VALUES ($1,$2,$3,$4)", [u.id, s.name, i, JSON.stringify(s.grades)]);
        }
      }
      if (!(await client.query("SELECT 1 FROM portfolio_items WHERE user_id = $1 LIMIT 1", [u.id])).rowCount) {
        for (const [cat, items] of Object.entries(D.MOCK_PORTFOLIO_ITEMS)) {
          for (const [i, it] of items.entries()) {
            await client.query("INSERT INTO portfolio_items (user_id, category, position, icon, title, meta, tag) VALUES ($1,$2,$3,$4,$5,$6,$7)",
              [u.id, cat, i, it.icon, it.title, it.meta, it.tag]);
          }
        }
      }
      if (!(await client.query("SELECT 1 FROM certificate_requests WHERE user_id = $1 LIMIT 1", [u.id])).rowCount) {
        for (const [i, c] of D.MOCK_CERTIFICATES.entries()) {
          if (c.status) await client.query("INSERT INTO certificate_requests (user_id, cert_key, status) VALUES ($1,$2,$3)", [u.id, "c" + (i + 1), c.status]);
        }
      }
    }
    for (const u of users.filter(u => u.role === "teacher")) {
      if (!(await client.query("SELECT 1 FROM teacher_materials WHERE user_id = $1 LIMIT 1", [u.id])).rowCount) {
        let n = 0;
        for (const [subject, files] of Object.entries(D.MOCK_MATERIALS_BY_SUBJECT)) {
          for (const f of files) {
            await client.query(
              "INSERT INTO teacher_materials (user_id, subject, name, type, size, created_at) VALUES ($1,$2,$3,$4,$5, now() - ($6 || ' days')::interval)",
              [u.id, subject, f.name, f.type, f.size, ++n * 2]);
          }
        }
      }
    }

    await client.query("COMMIT");
    const c = async t => (await pool.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n;
    console.log(`content ${await c("content")}, groups ${await c("groups")}, roster ${await c("group_roster")}, schedule days ${await c("schedule_days")}, notifications ${await c("notifications")}, grades ${await c("grades")}, portfolio ${await c("portfolio_items")}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
})().catch(e => { console.error(e); process.exit(1); });
