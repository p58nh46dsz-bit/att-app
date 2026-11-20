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
  // schema.sql is the baseline (v1 + v2). It runs once on a new database; after migration 003 it must not run
  // again (it describes the old shape). Numbered files in migrations/ then run once each, in order, every one
  // inside its own transaction; schema_migrations remembers which are done.
  await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const applied = new Set((await pool.query("SELECT version FROM schema_migrations")).rows.map(r => r.version));
  if (!applied.has("000_baseline")) {
    if (!applied.has("003_normalize.sql")) await pool.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
    await pool.query("INSERT INTO schema_migrations (version) VALUES ('000_baseline')");
    applied.add("000_baseline");
  }
  const dir = path.join(__dirname, "migrations");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^\d+_.*\.sql$/.test(f)).sort() : [];
  for (const f of files) {
    if (applied.has(f)) continue;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(fs.readFileSync(path.join(dir, f), "utf8"));
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [f]);
      await client.query("COMMIT");
      console.log(`migration ${f} applied`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw new Error(`migration ${f} failed, nothing changed: ${e.message}`);
    } finally {
      client.release();
    }
  }
  console.log("schema up to date");
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
