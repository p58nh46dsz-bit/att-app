// User creation and sign-in against PostgreSQL. Passwords are only ever stored as argon2id.
const { hash, verify } = require("@node-rs/argon2");
const pool = require("./db");
const { pickLogin, makePassword, normalizeLogin } = require("./accountLogic");

const MAX_FAILS = 5;
const LOCK_MINUTES = 5;

// A public view of a user: never includes the hash or lockout counters.
function publicUser(u) {
  return {
    id: u.id, login: u.login, role: u.role,
    lastName: u.last_name, firstName: u.first_name, middleName: u.middle_name,
    group: u.group_code, ...u.profile,
  };
}

// Creates a user with a login and password that are unique in the database.
// `person`: { role, lastName, firstName, middleName, group?, profile? }.
// `fixedPassword` is for seeding demo accounts that must keep a known password.
// Returns { user, password, duplicatePerson } — show `password` once, it is not stored.
async function createUser(person, fixedPassword) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE"); // two registrations can't pick the same login
    const taken = new Set((await client.query("SELECT lower(login) AS l FROM users")).rows.map(r => r.l));
    const { login, spelling } = pickLogin(person, taken);

    let password = fixedPassword;
    if (!password) {
      // Passwords differ between people too: compare only with accounts sharing this surname spelling.
      const same = (await client.query("SELECT password_hash FROM users WHERE lower(login) LIKE $1", [spelling + ".%"])).rows;
      for (;;) {
        password = makePassword(spelling);
        let clash = false;
        for (const r of same) if (await verify(r.password_hash, password)) { clash = true; break; }
        if (!clash) break;
      }
    }

    const dup = (await client.query(
      "SELECT 1 FROM users WHERE role=$1 AND last_name=$2 AND first_name=$3 AND middle_name=$4 AND group_code IS NOT DISTINCT FROM $5 LIMIT 1",
      [person.role, person.lastName, person.firstName, person.middleName || "", person.group || null])).rowCount > 0;

    const ins = await client.query(
      `INSERT INTO users (login, role, last_name, first_name, middle_name, group_code, profile, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [login, person.role, person.lastName, person.firstName, person.middleName || "", person.group || null,
       person.profile || {}, await hash(password)]);
    await client.query("COMMIT");
    return { user: ins.rows[0], password, duplicatePerson: dup };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Returns { ok:true, user } or { ok:false, reason:"wrong"|"locked", triesLeft?, minutes? }.
async function checkLogin(rawLogin, password) {
  const login = normalizeLogin(rawLogin);
  const { rows } = await pool.query("SELECT * FROM users WHERE lower(login) = $1", [login]);
  const u = rows[0];

  if (u && u.locked_until && u.locked_until > new Date()) {
    return { ok: false, reason: "locked", minutes: Math.ceil((u.locked_until - new Date()) / 60000) };
  }
  // Verify against a dummy hash for unknown logins so response time doesn't reveal which exist.
  const good = u ? await verify(u.password_hash, password) : (await verify(DUMMY_HASH, password), false);
  if (u && good) {
    await pool.query("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1", [u.id]);
    return { ok: true, user: u };
  }
  if (!u) return { ok: false, reason: "wrong", triesLeft: MAX_FAILS - 1 };

  const fails = u.failed_attempts + 1;
  if (fails >= MAX_FAILS) {
    await pool.query("UPDATE users SET failed_attempts = 0, locked_until = now() + ($2 || ' minutes')::interval WHERE id = $1", [u.id, LOCK_MINUTES]);
    return { ok: false, reason: "locked", minutes: LOCK_MINUTES };
  }
  await pool.query("UPDATE users SET failed_attempts = $2 WHERE id = $1", [u.id, fails]);
  return { ok: false, reason: "wrong", triesLeft: MAX_FAILS - fails };
}

let DUMMY_HASH = "";
hash("dummy-password").then(h => { DUMMY_HASH = h; });

module.exports = { createUser, checkLogin, publicUser };
