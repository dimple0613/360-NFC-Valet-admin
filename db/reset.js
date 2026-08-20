require("dotenv").config();
const { pool, query } = require("../lib/db");

const TABLES = [
  "password_resets",
  "validations",
  "activity_log",
  "orders",
  "offers",
  "nfc_cards",
  "drivers",
  "zones",
  "properties",
  "admins",
];

async function reset() {
  for (const t of TABLES) {
    await query(`DROP TABLE IF EXISTS ${t} CASCADE`);
  }
  console.log("Dropped all tables.");
  await pool.end();
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});
