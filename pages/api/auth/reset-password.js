import crypto from "crypto";
import { query } from "../../../lib/db";
import { hashPassword } from "../../../lib/auth";
import { badRequest, serverError } from "../../../lib/api";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { token, password } = req.body || {};
  if (!token || !password) return badRequest(res, "Token and new password are required");
  if (String(password).length < 6) return badRequest(res, "Password must be at least 6 characters");

  try {
    const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
    const { rows } = await query(
      `SELECT r.admin_id
       FROM password_resets r
       WHERE r.token_hash = $1 AND r.used = false AND r.expires_at > now()
       ORDER BY r.id DESC LIMIT 1`,
      [tokenHash]
    );
    const reset = rows[0];
    if (!reset) return res.status(400).json({ error: "Reset link is invalid or has expired" });

    await query("UPDATE admins SET password_hash = $2 WHERE id = $1", [
      reset.admin_id,
      hashPassword(String(password)),
    ]);
    await query("UPDATE password_resets SET used = true WHERE token_hash = $1", [tokenHash]);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return serverError(res, err);
  }
}
