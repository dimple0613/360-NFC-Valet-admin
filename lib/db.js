const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres@localhost:5432/360nfc_valet",
  max: 10,
  idleTimeoutMillis: 30000,
});

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
