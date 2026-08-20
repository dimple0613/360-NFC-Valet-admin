import React from "react";
import Link from "next/link";
import { LogoIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="login">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-logo">
            <LogoIcon size={22} />
          </div>
          <span className="login-brand-name">360 NFC Valet</span>
        </div>
        <div>
          <div className="login-headline">
            Every car back at the curb before the guest is.
          </div>
          <div className="login-sub">
            Run every property, driver and NFC card from one console — and see
            the day&apos;s numbers as they happen.
          </div>
        </div>
        <div className="login-footer">© 2026 We Want 360 · Dubai, UAE</div>
      </div>
      <div className="login-right">
        <div style={{ width: 380, maxWidth: "100%", textAlign: "center" }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: "-3px",
              lineHeight: 1,
              background: "linear-gradient(135deg,#F4531F,#FF8A50)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            404
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }}>
            Page not found
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#6C7A93",
              fontWeight: 500,
              marginTop: 8,
              lineHeight: 1.6,
            }}
          >
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Head back to the console to keep running your operations.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 26, justifyContent: "center" }}>
            <Link
              href="/dashboard"
              style={{
                padding: "12px 22px",
                borderRadius: 99,
                background: "#1C2B46",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Go to dashboard
            </Link>
            <Link
              href="/login"
              style={{
                padding: "12px 22px",
                borderRadius: 99,
                border: "1.5px solid #E7EAF0",
                color: "#1C2B46",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
