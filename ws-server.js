require("dotenv").config({ path: __dirname + "/.env" });
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.WS_PORT || 3002;
const ALLOWED_ORIGIN = process.env.WS_ORIGIN || "*";

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/broadcast") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const { event, data } = JSON.parse(body);
        if (event && data) {
          const room = data.propertyId ? `property:${data.propertyId}` : "all";
          io.to(room).emit(event, data);
          io.to("admin").emit(event, data);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"ok":true}');
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end('{"error":"invalid json"}');
      }
    });
    return;
  }
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, connections: io.engine.clientsCount }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGIN,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  pingInterval: 25000,
  pingTimeout: 10000,
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  const role = socket.handshake.auth?.role || socket.handshake.query?.role;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  const crypto = require("crypto");
  const SECRET = process.env.JWT_SECRET;
  if (!SECRET) {
    return next(new Error("JWT_SECRET not configured"));
  }
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return next(new Error("Invalid token"));
    const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return next(new Error("Invalid token signature"));
    }
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return next(new Error("Token expired"));
    }
    socket.auth = payload;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const role = socket.auth?.type || "admin";
  console.log(`[WS] ${role} connected (id=${socket.id})`);

  if (role === "admin") {
    socket.join("admin");
    console.log(`[WS] Admin joined "admin" room`);
  }

  socket.on("subscribe:property", (propertyId) => {
    if (propertyId) {
      socket.join(`property:${propertyId}`);
      console.log(`[WS] ${socket.id} subscribed to property:${propertyId}`);
    }
  });

  socket.on("unsubscribe:property", (propertyId) => {
    if (propertyId) {
      socket.leave(`property:${propertyId}`);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[WS] ${role} disconnected (id=${socket.id}, reason=${reason})`);
  });
});

server.listen(PORT, () => {
  console.log(`[WS] WebSocket server running on port ${PORT}`);
  console.log(`[WS] CORS origin: ${ALLOWED_ORIGIN}`);
});
