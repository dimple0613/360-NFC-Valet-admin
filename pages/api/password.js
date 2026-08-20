import { query } from "../../lib/db";
import { withSession } from "../../lib/session";
import { badRequest, serverError } from "../../lib/api";
import { verifyPassword, hashPassword } from "../../lib/auth";

export default withSession(async function handler(req, res) {
  try {
    if (req.method !== "PUT") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    const { current, next } = req.body || {};
    if (!current) return badRequest(res, "Enter your current password.");
    if (!next || next.length < 6) {
      return badRequest(res, "New password must be at least 6 characters.");
    }
    const { rows } = await query("SELECT password_hash FROM admins WHERE id=$1", [
      req.session.adminId,
    ]);
    if (!rows[0] || !verifyPassword(current, rows[0].password_hash)) {
      return badRequest(res, "Current password is incorrect.");
    }
    await query("UPDATE admins SET password_hash=$1 WHERE id=$2", [
      hashPassword(next),
      req.session.adminId,
    ]);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return serverError(res, err);
  }
});
