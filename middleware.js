import { NextResponse } from "next/server";

const ALLOWED = (
  process.env.CORS_ORIGINS ||
  "http://localhost:3001,http://localhost:8081,https://360-nfc-valet-mobile.vercel.app"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function middleware(req) {
  const origin = req.headers.get("origin") || "";
  if (!ALLOWED.includes(origin)) return NextResponse.next();

  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Vary", "Origin");
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
