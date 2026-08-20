const http = require("http");

const WS_URL = process.env.WS_BROADCAST_URL || "http://localhost:3002";

function broadcast(event, data) {
  try {
    const payload = JSON.stringify({ event, data });
    const url = new URL("/broadcast", WS_URL);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          console.error(`[broadcast] ${event} — WS returned ${res.statusCode}`);
        }
      }
    );
    req.on("error", (err) => {
      console.error(`[broadcast] ${event} — WS unreachable:`, err.message);
    });
    req.write(payload);
    req.end();
  } catch (err) {
    console.error(`[broadcast] ${event} — unexpected error:`, err.message);
  }
}

module.exports = { broadcast };
