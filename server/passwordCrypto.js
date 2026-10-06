// Reversible encryption for the passwords an administrator may look up (AES-256-GCM).
// The key comes from PASSWORD_KEY (64 hex chars) in server/.env — it is never stored in the database.
const crypto = require("crypto");

function key() {
  const hex = process.env.PASSWORD_KEY || "";
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error("PASSWORD_KEY must be 64 hex characters (see .env.example)");
  return Buffer.from(hex, "hex");
}

// → "iv.tag.ciphertext" (base64 parts); a fresh random IV for every value.
function encryptPassword(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map(b => b.toString("base64")).join(".");
}

// → the password, or null if the value is empty or cannot be authenticated (wrong key / tampered).
function decryptPassword(stored) {
  if (!stored) return null;
  try {
    const [iv, tag, data] = stored.split(".").map(s => Buffer.from(s, "base64"));
    const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString("utf8");
  } catch { return null; }
}

module.exports = { encryptPassword, decryptPassword };
