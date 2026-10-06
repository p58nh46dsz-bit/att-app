// Auth logic (pure functions, no UI) — shared by the login screen, by registration
// (authCreateAccount) and by scripts/gen-accounts.js, which loads this exact file.
//
// Account: { login, role:"student"|"teacher", salt, hash, lastName, firstName,
//   middleName, group?, ...teacher info }. Only a salted SHA-256 hash is stored,
// generated accounts never contain the password. The explicitly enabled local
// admin prototype stores viewable passwords separately in AUTH_ADMIN_KEY.
// NOTE: this is a static site with no server yet, so the hash
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
  if (acc && hash === acc.hash && authManagedAccountCurrent(acc)) {
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

// All accounts that can sign in: the generated ones (ACCOUNTS) plus the ones created
// through registration in this browser (localStorage "att_accounts_extra", same shape).
// Until there is a database, registration appends to that key via authAddAccount.
const AUTH_ADMIN_KEY = "att_account_admin_v1";

function authReadAdminState() {
  try {
    const raw = window.localStorage.getItem(AUTH_ADMIN_KEY);
    const state = raw === null ? {accounts:{}} : JSON.parse(raw);
    if (!state || !state.accounts || Array.isArray(state.accounts) || typeof state.accounts !== "object" ||
        Object.entries(state.accounts).some(([key,entry]) => !entry || typeof entry.deleted !== "boolean" ||
          !entry.account || authNormalizeLogin(entry.account.login) !== key ||
          typeof entry.account.salt !== "string" || typeof entry.account.hash !== "string" ||
          (entry.password !== undefined && typeof entry.password !== "string"))) throw new Error("Invalid accounts");
    return state;
  } catch (error) { throw new Error("Не удалось прочитать данные управления аккаунтами. Сохранённые записи не изменены."); }
}
function authWriteAdminState(state) {
  try { window.localStorage.setItem(AUTH_ADMIN_KEY,JSON.stringify(state)); }
  catch (error) { throw new Error("Изменения не сохранены. Проверьте доступность хранилища браузера и свободное место."); }
}
function authAccountPool(includeDeleted = false) {
  const state = authReadAdminState();
  const extra = loadJSON("att_accounts_extra",[]);
  if (!Array.isArray(extra)) throw new Error("Некорректные данные аккаунтов.");
  const accounts = new Map(ACCOUNTS.concat(extra).map(account => [authNormalizeLogin(account.login),account]));
  Object.entries(state.accounts).forEach(([key,entry]) => {
    if (entry.deleted && !includeDeleted) accounts.delete(key);
    else accounts.set(key,entry.account);
  });
  return Array.from(accounts.values());
}
function authAllAccounts() {
  // Fail closed rather than restoring deleted accounts if admin storage is broken.
  try { return authAccountPool(); } catch (error) { return []; }
}
function authAddAccount(account,password) {
  const key = authNormalizeLogin(account.login);
  if (key === "admin" || authAccountPool(true).some(existing => authNormalizeLogin(existing.login) === key)) throw new Error("Этот логин уже занят.");
  const state = authReadAdminState();
  state.accounts[key] = {account,deleted:false,...(typeof password === "string" ? {password} : {})};
  authWriteAdminState(state);
}
function authSavedPassword(login) {
  const entry = authReadAdminState().accounts[authNormalizeLogin(login)];
  return entry && !entry.deleted && typeof entry.password === "string" ? entry.password : null;
}
function authManagedAccountCurrent(account) {
  if (account.role === "admin" && authNormalizeLogin(account.login) === "admin") return true;
  try {
    const entry = authReadAdminState().accounts[authNormalizeLogin(account.login)];
    return !entry || (!entry.deleted && entry.account.hash === account.hash && entry.account.salt === account.salt);
  } catch (error) { return false; }
}
function authIsAccountCurrent(account) {
  const current = authFindAccount(authAllAccounts(),account.login);
  return !!current && current.hash === account.hash && current.salt === account.salt;
}
function authRevokeLocalSession(login) {
  if (authNormalizeLogin(loadJSON("att_user",null)) !== authNormalizeLogin(login)) return;
  saveJSON("att_user",null); saveJSON("att_user_hash",null); saveJSON("att_session",null);
}
async function authChangePassword(login,password) {
  if (typeof password !== "string" || !password.trim() || password.length > 128) throw new Error("Укажите новый пароль — до 128 символов.");
  const key = authNormalizeLogin(login);
  if (key === "admin") throw new Error("Служебный аккаунт администратора здесь изменить нельзя.");
  const change = async () => {
    const accounts = authAllAccounts();
    const account = authFindAccount(accounts,key);
    if (!account) throw new Error("Аккаунт уже удалён или недоступен.");
    if (await authPasswordTaken(authAccountPool(true).filter(item => authNormalizeLogin(item.login) !== key),password)) throw new Error("Этот пароль уже используется. Выберите другой.");
    const salt = authRandomHex(8);
    const updated = {...account,salt,hash:await authHash(salt,password)};
    if (!authIsAccountCurrent(account)) throw new Error("Аккаунт был изменён. Обновите список и повторите действие.");
    const state = authReadAdminState();
    state.accounts[key] = {account:updated,password,deleted:false};
    authWriteAdminState(state);
    authRevokeLocalSession(key);
    const fails = loadJSON("att_login_fails",{}); delete fails[key]; saveJSON("att_login_fails",fails);
    return updated;
  };
  return typeof navigator !== "undefined" && navigator.locks ? navigator.locks.request("att-account-registration",change) : change();
}
function authDeleteAccount(login) {
  const key = authNormalizeLogin(login);
  if (key === "admin") throw new Error("Служебный аккаунт администратора удалить нельзя.");
  const account = authFindAccount(authAllAccounts(),key);
  if (!account) throw new Error("Аккаунт уже удалён или недоступен.");
  const state = authReadAdminState();
  // Keep only the salted account to reserve its login; discard the viewable password.
  state.accounts[key] = {account,deleted:true};
  authWriteAdminState(state);
  authRevokeLocalSession(key);
}

// Display helpers: "Иван М." for the top bar, "ИМ" for avatars, "Иван Алексеевич" for greetings.
function authShortName(a) { return a ? `${a.firstName} ${a.lastName.charAt(0)}.` : ""; }
function authInitials(a) { return a ? a.firstName.charAt(0) + a.lastName.charAt(0) : ""; }
function authFullName(a) { return a ? [a.lastName, a.firstName, a.middleName].filter(Boolean).join(" ") : ""; }

function authFindAccount(accounts, login) {
  const key = authNormalizeLogin(login);
  return accounts.find(a => authNormalizeLogin(a.login) === key) || null;
}
