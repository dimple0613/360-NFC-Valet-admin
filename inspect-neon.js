const { Client } = require("pg");
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const t = await c.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  console.log("TABLES:", t.rows.map((r) => r.table_name).join(", "));
  const cols = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='nfc_cards' ORDER BY ordinal_position"
  );
  console.log("nfc_cards cols:", cols.rows.map((r) => r.column_name).join(", "));
  await c.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
