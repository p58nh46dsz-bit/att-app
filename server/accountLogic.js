// Login/password rules live in ONE place: src/components/Login/auth.js (also used by the
// site and by scripts/gen-accounts.js). This file loads that exact source in Node and
// exposes the pure parts, so the server never re-implements them.
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "../src/components/Login/auth.js"), "utf8");
const api = new Function(src + "\n;return { authSpellings, authNormalizeLogin, authLoginSuffix, authRandomDigits };")();

// First free login for a person: spellings are tried in order (matveev → matweev → …).
// `taken` is a Set of lower-cased logins already in the database.
function pickLogin(person, taken) {
  const suffix = api.authLoginSuffix(person);
  const spelling = api.authSpellings(person.lastName).find(sp => !taken.has(sp + "." + suffix));
  return { login: spelling + "." + suffix, spelling };
}

// Password = Surname-NNNN, built on the same spelling as the login. The caller checks it
// against existing hashes (argon2 verify) and asks again on a collision.
function makePassword(spelling) {
  return spelling.charAt(0).toUpperCase() + spelling.slice(1) + "-" + api.authRandomDigits(4);
}

module.exports = { pickLogin, makePassword, normalizeLogin: api.authNormalizeLogin };
