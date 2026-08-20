import crypto from "crypto";
import { query } from "../../../../lib/db";
import { setSessionCookie } from "../../../../lib/session";

const TOKEN_URL = process.env.SSO_TOKEN_URL;
const JWKS_URL = process.env.SSO_JWKS_URL;
const CLIENT_ID = process.env.SSO_CLIENT_ID;
const CLIENT_SECRET = process.env.SSO_CLIENT_SECRET;
const ISSUER = process.env.SSO_ISSUER;
const REDIRECT_URI =
  process.env.SSO_CALLBACK_URL || "http://localhost:3000/api/auth/sso/callback";

export default async function handler(req, res) {
  const { code, state, error } = req.query || {};

  if (error) return res.redirect("/login?error=sso_denied");
  if (!code) return res.redirect("/login?error=sso_missing_code");
  if (!state || !req.cookies || state !== req.cookies.sso_state) {
    return res.redirect("/login?error=sso_invalid_state");
  }
  res.setHeader("Set-Cookie", "sso_state=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");

  if (!TOKEN_URL || !CLIENT_ID || !CLIENT_SECRET || !JWKS_URL) {
    return res.redirect("/login?error=sso_not_configured");
  }

  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
    if (!tokenRes.ok) return res.redirect("/login?error=sso_token_failed");
    const tokens = await tokenRes.json();
    if (!tokens.id_token) return res.redirect("/login?error=sso_no_id_token");

    const payload = await verifyJwt(tokens.id_token, JWKS_URL);
    if (!payload) return res.redirect("/login?error=sso_invalid_token");
    if (ISSUER && payload.iss !== ISSUER) return res.redirect("/login?error=sso_bad_issuer");
    const audOk = Array.isArray(payload.aud)
      ? payload.aud.includes(CLIENT_ID)
      : payload.aud === CLIENT_ID;
    if (!audOk) return res.redirect("/login?error=sso_bad_audience");

    const email = String(payload.email || "").toLowerCase();
    if (!email) return res.redirect("/login?error=sso_no_email");

    const { rows } = await query(
      "SELECT id, full_name, email FROM admins WHERE LOWER(email) = $1 LIMIT 1",
      [email]
    );
    const admin = rows[0];
    if (!admin) return res.redirect("/login?error=sso_unknown_user");

    setSessionCookie(res, { adminId: admin.id, email: admin.email, name: admin.full_name });
    return res.redirect("/dashboard");
  } catch {
    return res.redirect("/login?error=sso_failed");
  }
}

async function verifyJwt(token, jwksUrl) {
  const [h, p, s] = String(token).split(".");
  if (!h || !p || !s) return null;

  let header, payload;
  try {
    header = JSON.parse(Buffer.from(h, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp * 1000 < Date.now()) return null;

  const jwksRes = await fetch(jwksUrl);
  if (!jwksRes.ok) return null;
  const { keys } = await jwksRes.json();
  const key = keys.find((k) => k.kid === header.kid);
  if (!key) return null;

  try {
    const publicKey = crypto.createPublicKey({ key, format: "jwk" });
    const verifier = crypto.createVerify("sha256");
    verifier.update(Buffer.from(`${h}.${p}`));
    verifier.end();
    return verifier.verify(publicKey, Buffer.from(s, "base64url")) ? payload : null;
  } catch {
    return null;
  }
}
