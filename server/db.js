// PostgreSQL connection pool, configured from the environment (see .env.example).
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://localhost:5432/att",
});

module.exports = pool;
