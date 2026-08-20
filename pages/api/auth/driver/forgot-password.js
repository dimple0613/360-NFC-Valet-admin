import crypto from "crypto";
import { query } from "../../../../lib/db";
import { badRequest, serverError } from "../../../../lib/api";
import { sendMail, buildResetEmail } from "../../../../lib/mail";

const RESET_BASE_URL = process.env.RESET_URL || "http://localhost:3001";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { email } = req.body || {};
  if (!email) return badRequest(res, "Email is required");

  try {
    const { rows } = await query(
      "SELECT id, full_name FROM drivers WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [String(email).trim()]
    );
    if (rows[0]) {
      const token = crypto.randomBytes(32).toString("hex");
      const hash = crypto.createHash("sha256").update(token).digest("hex");
      await query(
        "INSERT INTO password_resets (driver_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
        [rows[0].id, hash]
      );

      const resetUrl = `${RESET_BASE_URL}/reset-password?token=${token}`;
      const html = buildResetEmail({ driverName: rows[0].full_name, resetUrl });
      const result = await sendMail({
        to: email,
        subject: "Reset Your 360 NFC Valet Password",
        html,
      });

      if (!result.sent) {
        console.log(`[driver-forgot-password] reset token (SMTP unavailable): ${token}`);
        return res.status(200).json({ ok: true, resetToken: token });
      }
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return serverError(res, err);
  }
}
