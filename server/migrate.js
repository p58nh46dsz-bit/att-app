// Creates the database named in DATABASE_URL if it doesn't exist, then applies
// server/schema.sql. Run: npm run migrate
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const pool = require("./db");

async function ensureDatabase() {
  const url = new URL(process.env.DATABASE_URL || "postgres://localhost:5432/att");
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`unsafe database name: ${name}`);
  url.pathname = "/postgres"; // connect to the maintenance DB to create ours
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (!exists.rowCount) {
    await admin.query(`CREATE DATABASE ${name} ENCODING 'UTF8' TEMPLATE template0`);
    console.log(`database "${name}" created`);
  }
  await admin.end();
}

(async () => {
  await ensureDatabase();
  await pool.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
  console.log("schema applied");
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
