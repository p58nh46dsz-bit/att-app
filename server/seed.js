// Loads the demo people from scripts/people.json into the database. Run: npm run seed
// - Someone who already exists (same role + ФИО + group) is skipped, so re-running is safe.
// - For demo accounts whose passwords were already handed out (credentials.local.txt,
//   gitignored), the SAME password is reused, so nobody has to relearn them.
// - Anyone else gets a freshly generated password, printed once here.
const fs = require("fs");
const path = require("path");
const pool = require("./db");
const crypto = require("crypto");
const { verify, hash } = require("@node-rs/argon2");
const { createUser } = require("./users");
const { encryptPassword } = require("./passwordCrypto");

const root = path.join(__dirname, "..");
const people = JSON.parse(fs.readFileSync(path.join(root, "scripts/people.json"), "utf8"));

// "ДВ-41 | Матвеев Иван Алексеевич | matveev.dv41 | Matveev-9043 | …" → { "матвеев иван алексеевич|дв-41": "Matveev-9043" }
const known = {};
const credFile = path.join(root, "credentials.local.txt");
if (fs.existsSync(credFile)) {
  for (const line of fs.readFileSync(credFile, "utf8").split("\n").filter(Boolean)) {
    const [grp, fio, , pass] = line.split("|").map(s => s.trim());
    const key = fio.replace(/\s+/g, " ").toLowerCase() + "|" + (grp === "преп." ? "" : grp.toLowerCase());
    known[key] = pass;
  }
}

(async () => {
  let added = 0;
  for (const p of people) {
    const person = {
      role: p.role, lastName: p.lastName, firstName: p.firstName, middleName: p.middleName || "",
      group: p.role === "student" ? p.group : null,
      profile: p.role === "teacher"
        ? { department: p.department, position: p.position, experience: p.experience, groups: p.groups, email: p.email, phone: p.phone }
        : {},
    };
    const exists = await pool.query(
      "SELECT id, password_hash, password_enc FROM users WHERE role=$1 AND last_name=$2 AND first_name=$3 AND middle_name=$4 AND group_code IS NOT DISTINCT FROM $5",
      [person.role, person.lastName, person.firstName, person.middleName, person.group]);
    const key = [person.lastName, person.firstName, person.middleName].filter(Boolean).join(" ").toLowerCase() + "|" + (person.group || "").toLowerCase();
    if (exists.rowCount) {
      // Accounts made before readable passwords existed: store the known password (only if it really matches the hash).
      const u = exists.rows[0];
      if (!u.password_enc && known[key] && await verify(u.password_hash, known[key])) {
        await pool.query("UPDATE users SET password_enc = $2 WHERE id = $1", [u.id, encryptPassword(known[key])]);
        console.log(`password stored for ${person.lastName} ${person.firstName}`);
      }
      continue;
    }
    const { user, password, duplicatePerson } = await createUser(person, known[key]);
    console.log(`${person.role === "teacher" ? "преп." : person.group} | ${user.last_name} ${user.first_name} | ${user.login} | ${password}${duplicatePerson ? " | ⚠ полный тёзка" : ""}`);
    added++;
  }
  console.log(`${added} added, ${people.length - added} already present`);

  // The administrator account (login "admin"). Its password is generated once and written ONLY to
  // credentials.local.txt (gitignored) — it is not printed and not kept anywhere in the repository.
  if (!(await pool.query("SELECT 1 FROM users WHERE role = 'admin'")).rowCount) {
    const password = crypto.randomBytes(9).toString("base64url");
    await pool.query(
      `INSERT INTO users (login, role, last_name, first_name, middle_name, profile, password_hash, password_enc)
       VALUES ('admin', 'admin', '', 'Администратор', '', '{}', $1, $2)`,
      [await hash(password), encryptPassword(password)]);
    fs.appendFileSync(credFile, `админ | Администратор | admin | ${password}\n`);
    console.log("admin created — login and password are in credentials.local.txt");
  }
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
