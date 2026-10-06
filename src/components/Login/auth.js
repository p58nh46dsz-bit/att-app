// Auth rules (pure functions, no UI). The login/password RULES live here once: the server loads this exact
// file in Node (server/accountLogic.js) to generate logins and passwords, and the app uses the display
// helpers below. Signing in, passwords and accounts themselves are on the server (server/, /auth/login).

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

// TEMPORARY demo shortcut: pressing "Войти" with both fields empty signs in as this
// account (Матвеев Даниил), to make demos quick. Remove together with its use in Login.jsx.
const AUTH_DEMO_LOGIN = "matvveev.dv41";
// TEMPORARY second shortcut: login "a" + password "a" signs in as the teacher Белкова.
const AUTH_DEMO_TEACHER = { login: "a", pass: "a", account: "belkova.ns" };

// Display helpers: "Иван М." for the top bar, "ИМ" for avatars, "Иван Алексеевич" for greetings.
function authShortName(a) { return a ? `${a.firstName} ${a.lastName.charAt(0)}.` : ""; }
function authInitials(a) { return a ? a.firstName.charAt(0) + a.lastName.charAt(0) : ""; }
function authFullName(a) { return a ? [a.lastName, a.firstName, a.middleName].filter(Boolean).join(" ") : ""; }
