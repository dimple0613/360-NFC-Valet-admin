import { query } from "../../lib/db";
import { withSession, setSessionCookie } from "../../lib/session";
import { badRequest, serverError } from "../../lib/api";

export default withSession(async function handler(req, res) {
  try {
    if (req.method !== "PUT") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    const { name, email } = req.body || {};
    if (!name || !String(name).trim()) return badRequest(res, "Name is required.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return badRequest(res, "Enter a valid email address.");
    }
    const { rows: taken } = await query(
      "SELECT id FROM admins WHERE LOWER(email)=$1 AND id<>$2",
      [String(email).trim().toLowerCase(), req.session.adminId]
    );
    if (taken[0]) return badRequest(res, "That email is already in use.");

    await query("UPDATE admins SET full_name=$1, email=LOWER($2) WHERE id=$3", [
      String(name).trim(),
      String(email).trim(),
      req.session.adminId,
    ]);
    setSessionCookie(res, { adminId: req.session.adminId, email: String(email).trim(), name: String(name).trim() });
    return res.status(200).json({ name: String(name).trim(), email: String(email).trim() });
  } catch (err) {
    return serverError(res, err);
  }
});
