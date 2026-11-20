// Creates the administrator account, or sets a new password for an existing one.
// Run on the server:  npm run create-admin
// The password is typed at a hidden prompt (or taken from ADMIN_PASSWORD for scripted installs); it is never
// printed or written to a file. Rules: at least 12 characters, with letters and digits.
const readline = require("readline");
const { hash } = require("@node-rs/argon2");
const pool = require("./db");
const { encryptPassword } = require("./passwordCrypto");

function askHidden(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.includes(question)) rl.output.write(s); }; // echo the question, not the typing
    rl.question(question, answer => { rl.close(); process.stdout.write("\n"); resolve(answer); });
  });
}

const crypto = require("crypto");
const { pickLogin } = require("./accountLogic");

// A strong random password: 20 characters from letters (no look-alikes), digits and a few symbols.
function generatePassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "-_.!#"];
  const all = sets.join("");
  const pick = set => set[crypto.randomInt(set.length)];
  const chars = [...sets.map(pick), ...Array.from({ length: 16 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join("");
}

(async () => {
  // ADMIN_NAME="Фамилия Имя Отчество" sets the person; the login is then built by the same rule as for teachers
  // (surname in Latin + initials, e.g. ivanov.ip) unless ADMIN_LOGIN is given.
  // ADMIN_GENERATE=1 makes a random password and prints it ONCE (it is not saved anywhere else).
  const [lastName = "", firstName = "Администратор", middleName = ""] = (process.env.ADMIN_NAME || "").trim().split(/\s+/).filter(Boolean);
  const named = !!process.env.ADMIN_NAME;
  let login = (process.env.ADMIN_LOGIN || "").trim().toLowerCase();
  if (!login && named) {
    const taken = new Set((await pool.query("SELECT lower(login) AS l FROM users")).rows.map(r => r.l));
    login = pickLogin({ role: "teacher", lastName, firstName, middleName }, taken).login;
  }
  login = login || "admin";
  if (!/^[a-z0-9._-]{3,40}$/.test(login)) throw new Error("login: 3–40 characters a-z 0-9 . _ -");
  let password = process.env.ADMIN_PASSWORD, generated = false;
  if (!password && process.env.ADMIN_GENERATE === "1") { password = generatePassword(); generated = true; }
  if (!password) {
    password = await askHidden(`Password for "${login}": `);
    if (password !== await askHidden("Repeat the password: ")) throw new Error("passwords do not match");
  }
  if (password.length < 12 || !/[A-Za-zА-Яа-я]/.test(password) || !/\d/.test(password)) {
    throw new Error("password too weak: at least 12 characters, letters and digits");
  }
  const h = await hash(password), enc = encryptPassword(password);
  const existing = (await pool.query("SELECT id FROM users WHERE lower(login) = $1 AND role = 'admin'", [login])).rows[0];
  if (existing) {
    await pool.query(
      `UPDATE users SET password_hash=$2, password_enc=$3, password_changed_at=now(), failed_attempts=0, locked_until=NULL,
         last_name = CASE WHEN $4 THEN $5 ELSE last_name END, first_name = CASE WHEN $4 THEN $6 ELSE first_name END,
         middle_name = CASE WHEN $4 THEN $7 ELSE middle_name END WHERE id=$1`,
      [existing.id, h, enc, named, lastName, firstName, middleName]);
    console.log(`administrator "${login}" updated`);
  } else {
    if ((await pool.query("SELECT 1 FROM users WHERE lower(login) = $1", [login])).rowCount) throw new Error(`login "${login}" is taken by a non-admin account`);
    await pool.query(
      `INSERT INTO users (login, role, last_name, first_name, middle_name, password_hash, password_enc)
       VALUES ($1, 'admin', $2, $3, $4, $5, $6)`, [login, lastName, firstName, middleName, h, enc]);
    console.log(`administrator "${login}" created`);
  }
  if (generated) console.log(`login: ${login}\npassword: ${password}`);
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
