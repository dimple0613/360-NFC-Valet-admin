const crypto = require("crypto");

const SECRET = process.env.JWT_SECRET;
const SESSION_COOKIE = "session";
const MAX_AGE = 60 * 60 * 24; // 24h in seconds

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  try {
    const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function getSession(req) {
  return verifyToken(req.cookies && req.cookies[SESSION_COOKIE]);
}

function requireSession(req, res) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Not signed in" });
    return null;
  }
  return session;
}

function setSessionCookie(res, payload) {
  const token = signToken({ ...payload, exp: Math.floor(Date.now() / 1000) + MAX_AGE });
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`
  );
  return token;
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
}

function withSession(handler) {
  return (req, res) => {
    const session = requireSession(req, res);
    if (!session) return;
    req.session = session;
    return handler(req, res);
  };
}

const DRIVER_SESSION_COOKIE = "driver_session";
const DRIVER_MAX_AGE = 60 * 60 * 8;

function setDriverSessionCookie(res, payload) {
  const token = signToken({ ...payload, type: "driver", exp: Math.floor(Date.now() / 1000) + DRIVER_MAX_AGE });
  res.setHeader(
    "Set-Cookie",
    `${DRIVER_SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${DRIVER_MAX_AGE}; SameSite=Lax`
  );
  return token;
}

function getDriverSession(req) {
  let token = req.cookies && req.cookies[DRIVER_SESSION_COOKIE];
  if (!token) {
    const auth = req.headers && req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) token = auth.slice(7);
  }
  const session = verifyToken(token);
  if (!session || session.type !== "driver") return null;
  return session;
}

function requireDriverSession(req, res) {
  const session = getDriverSession(req);
  if (!session) {
    res.status(401).json({ error: "Not signed in" });
    return null;
  }
  return session;
}

function withDriverSession(handler) {
  return (req, res) => {
    const session = requireDriverSession(req, res);
    if (!session) return;
    req.session = session;
    return handler(req, res);
  };
}

module.exports = {
  signToken,
  verifyToken,
  getSession,
  requireSession,
  setSessionCookie,
  clearSessionCookie,
  withSession,
  setDriverSessionCookie,
  getDriverSession,
  requireDriverSession,
  withDriverSession,
};
