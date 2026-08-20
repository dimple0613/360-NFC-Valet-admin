const buckets = new Map();

function getKey(req, windowMs) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const path = req.url || "";
  return `${ip}:${path}`;
}

export function rateLimit(req, { max = 20, windowMs = 60000 } = {}) {
  const key = getKey(req, windowMs);
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return true;
  }

  entry.count++;
  return entry.count <= max;
}

const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now - entry.start > CLEANUP_INTERVAL) buckets.delete(key);
  }
}, CLEANUP_INTERVAL).unref();
