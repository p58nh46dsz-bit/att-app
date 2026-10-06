// Auth logic (pure functions, no UI) — shared by the login screen, by registration
// (authCreateAccount) and by scripts/gen-accounts.js, which loads this exact file.
//
// Account: { login, role:"student"|"teacher", salt, hash, lastName, firstName,
//   middleName, group?, ...teacher info }. Only a salted SHA-256 hash is stored,
// never the password. NOTE: this is a static site with no server yet, so the hash
// is visible to anyone who reads the page — real protection comes with the database.

const AUTH_TRANSLIT = {
  а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",
  н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",
  ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
};

function authTranslit(s) {
  return String(s).toLowerCase().split("").map(ch => AUTH_TRANSLIT[ch] !== undefined ? AUTH_TRANSLIT[ch] : (/[a-z0-9]/.test(ch) ? ch : "")).join("");
}

// Same surname inside one group (or same initials for teachers) → the next spelling
// that still reads naturally to a Russian speaker: v→w, doubled v, i→y, k→c, doubled
// last letter. Last resort is a numeric suffix, so a free candidate always exists.
function authSpellings(surname) {
  const s = authTranslit(surname);
  const rules = [
    x => x,
    x => x.replace("v", "w"),
    x => x.replace("v", "vv"),
    x => x.replace("i", "y"),
    x => x.replace("k", "c"),
    x => x + x.slice(-1),
    x => x.replace("v", "w").replace("i", "y"),
    x => x.replace("v", "w").replace("k", "c"),
  ];
  const out = [];
  rules.forEach(r => { const v = r(s); if (!out.includes(v)) out.push(v); });
  for (let n = 2; n < 100; n++) out.push(s + n);
  return out;
}

function authNormalizeLogin(login) { return String(login || "").trim().toLowerCase(); }

function authLoginSuffix(person) {
  if (person.role === "teacher") {
    return [person.firstName, person.middleName].filter(Boolean).map(n => authTranslit(n)[0]).join("");
  }
  return authTranslit(person.group);
}

function authRandomDigits(n) {
  const a = new Uint32Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, v => v % 10).join("");
}

function authRandomHex(bytes) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
}

async function authHash(salt, password) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + password));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
}

// A password counts as taken if it matches any existing account (each account is
// hashed with its own salt, so the only way to compare is to re-hash per account).
async function authPasswordTaken(existing, password) {
  for (const a of existing) if (await authHash(a.salt, password) === a.hash) return true;
  return false;
}

// Builds an account with a login and a password that are both unique among
// `existing` accounts. Returns { account, password, duplicatePerson } — show/print
// `password` once, it is not stored. duplicatePerson=true means a full namesake
// already exists (same ФИО and group): still created with different credentials,
// but worth a human look.
async function authCreateAccount(person, existing) {
  const taken = new Set(existing.map(a => authNormalizeLogin(a.login)));
  const suffix = authLoginSuffix(person);
  const spelling = authSpellings(person.lastName).find(sp => !taken.has(sp + "." + suffix));
  const login = spelling + "." + suffix;

  const cap = spelling.charAt(0).toUpperCase() + spelling.slice(1);
  let password;
  do { password = cap + "-" + authRandomDigits(4); } while (await authPasswordTaken(existing, password));

  const salt = authRandomHex(8);
  const duplicatePerson = existing.some(a => a.role === person.role && a.lastName === person.lastName &&
    a.firstName === person.firstName && a.middleName === person.middleName && a.group === person.group);
  const account = { ...person, login, salt, hash: await authHash(salt, password) };
  return { account, password, duplicatePerson };
}

// Login check with a lockout: 5 wrong attempts in a row → locked for 5 minutes.
// The counter lives in localStorage, so it is a speed bump, not real security.
const AUTH_MAX_FAILS = 5;
const AUTH_LOCK_MS = 5 * 60 * 1000;

function authLockLeftMs(login) {
  const st = loadJSON("att_login_fails", {})[authNormalizeLogin(login)];
  return st && st.until && st.until > Date.now() ? st.until - Date.now() : 0;
}

async function authVerify(accounts, login, password) {
  const key = authNormalizeLogin(login);
  if (!key || !password) return { ok: false, reason: "empty" };
  const left = authLockLeftMs(key);
  if (left > 0) return { ok: false, reason: "locked", minutes: Math.ceil(left / 60000) };

  const acc = accounts.find(a => authNormalizeLogin(a.login) === key);
  // hash even when the login is unknown, so response time doesn't reveal which logins exist
  const hash = await authHash(acc ? acc.salt : "x", password);
  if (acc && hash === acc.hash) {
    const fails = loadJSON("att_login_fails", {}); delete fails[key]; saveJSON("att_login_fails", fails);
    return { ok: true, account: acc };
  }
  const fails = loadJSON("att_login_fails", {});
  const count = ((fails[key] && fails[key].count) || 0) + 1;
  fails[key] = count >= AUTH_MAX_FAILS ? { count: 0, until: Date.now() + AUTH_LOCK_MS } : { count };
  saveJSON("att_login_fails", fails);
  return count >= AUTH_MAX_FAILS
    ? { ok: false, reason: "locked", minutes: 5 }
    : { ok: false, reason: "wrong", triesLeft: AUTH_MAX_FAILS - count };
}

// Display helpers: "Иван М." for the top bar, "ИМ" for avatars, "Иван Алексеевич" for greetings.
function authShortName(a) { return a ? `${a.firstName} ${a.lastName.charAt(0)}.` : ""; }
function authInitials(a) { return a ? a.firstName.charAt(0) + a.lastName.charAt(0) : ""; }
function authFullName(a) { return a ? [a.lastName, a.firstName, a.middleName].filter(Boolean).join(" ") : ""; }

function authFindAccount(accounts, login) {
  const key = authNormalizeLogin(login);
  return accounts.find(a => authNormalizeLogin(a.login) === key) || null;
}
