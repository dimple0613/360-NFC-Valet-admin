const crypto = require("crypto");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(candidate, "hex")
    );
  } catch {
    return false;
  }
}

function makeValetId(seq) {
  return `VD-${String(2300 + seq).padStart(4, "0")}`;
}

function makePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

module.exports = { hashPassword, verifyPassword, makeValetId, makePin };
