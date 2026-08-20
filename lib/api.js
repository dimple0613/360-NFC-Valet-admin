const { query } = require("./db");

function notFound(res, message = "Not found") {
  return res.status(404).json({ error: message });
}

function badRequest(res, message = "Invalid request") {
  return res.status(400).json({ error: message });
}

function serverError(res, err) {
  console.error("API error:", err);
  return res.status(500).json({ error: err.message || "Internal server error" });
}

function methodNotAllowed(res) {
  return res.status(405).json({ error: "Method not allowed" });
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function propertiesList() {
  return (await query("SELECT id, name, area, zones_count, slots_count FROM properties ORDER BY id")).rows;
}

module.exports = { notFound, badRequest, serverError, methodNotAllowed, startOfDay, propertiesList };
