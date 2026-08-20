import crypto from "crypto";
import { query } from "../../../lib/db";
import { badRequest, serverError } from "../../../lib/api";
import { sendMail, buildResetEmail } from "../../../lib/mail";

const BASE_URL = process.env.ADMIN_URL || "http://localhost:3000";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { email } = req.body || {};
  if (!email) return badRequest(res, "Email is required");

  try {
    const { rows } = await query(
      "SELECT id, name FROM admins WHERE email = LOWER($1) LIMIT 1",
      [String(email).trim()]
    );
    if (rows[0]) {
      const token = crypto.randomBytes(32).toString("hex");
      const hash = crypto.createHash("sha256").update(token).digest("hex");
      await query(
        "INSERT INTO password_resets (admin_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
        [rows[0].id, hash]
      );
      const resetUrl = `${BASE_URL}/reset-password?token=${token}`;
      const html = buildResetEmail({ driverName: rows[0].name, resetUrl });
      const result = await sendMail({
        to: email,
        subject: "Reset Your 360 NFC Valet Password",
        html,
      });
      if (!result.sent) {
        console.log(`[admin-forgot-password] reset link: ${resetUrl}`);
      }
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return serverError(res, err);
  }
}
