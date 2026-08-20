import { query } from "../../../lib/db";
import { verifyPassword } from "../../../lib/auth";
import { setSessionCookie } from "../../../lib/session";
import { badRequest, serverError } from "../../../lib/api";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { email, password } = req.body || {};
  if (!email || !password) return badRequest(res, "Email and password are required");

  try {
    const { rows } = await query(
      "SELECT id, full_name, email, password_hash FROM admins WHERE email = LOWER($1) LIMIT 1",
      [String(email).trim()]
    );
    const admin = rows[0];
    if (!admin || !verifyPassword(password, admin.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    setSessionCookie(res, { adminId: admin.id, email: admin.email, name: admin.full_name });
    return res.status(200).json({
      name: admin.full_name,
      email: admin.email,
      signedIn: true,
    });
  } catch (err) {
    return serverError(res, err);
  }
}
