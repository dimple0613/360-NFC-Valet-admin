import crypto from "crypto";
import { query } from "../../../lib/db";
import { setSessionCookie } from "../../../lib/session";
import { serverError } from "../../../lib/api";

const AUTHORIZE_URL = process.env.SSO_AUTHORIZE_URL;
const CLIENT_ID = process.env.SSO_CLIENT_ID;
const REDIRECT_URI =
  process.env.SSO_CALLBACK_URL || "http://localhost:3000/api/auth/sso/callback";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (AUTHORIZE_URL && CLIENT_ID) {
    const state = crypto.randomBytes(16).toString("hex");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: "openid email profile",
      state,
    });
    res.setHeader(
      "Set-Cookie",
      `sso_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`
    );
    return res.redirect(`${AUTHORIZE_URL}?${params.toString()}`);
  }

  try {
    const { rows } = await query(
      "SELECT id, full_name, email FROM admins ORDER BY id LIMIT 1"
    );
    const admin = rows[0];
    if (!admin) return res.status(500).json({ error: "No admin account found" });

    setSessionCookie(res, { adminId: admin.id, email: admin.email, name: admin.full_name });
    return res.redirect("/dashboard");
  } catch (err) {
    return serverError(res, err);
  }
}
