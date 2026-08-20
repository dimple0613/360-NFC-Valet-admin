import { query } from "../../lib/db";
import { withSession } from "../../lib/session";
import { serverError } from "../../lib/api";

export default withSession(async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    const { rows } = await query(
      "SELECT full_name, email, role FROM admins WHERE id=$1",
      [req.session.adminId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Admin not found" });
    const a = rows[0];
    return res.status(200).json({ name: a.full_name, email: a.email, role: a.role });
  } catch (err) {
    return serverError(res, err);
  }
});
