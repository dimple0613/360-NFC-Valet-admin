import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  LogoIcon,
  DashboardIcon,
  BuildingIcon,
  UsersIcon,
  CardIcon,
  TagIcon,
  ReportIcon,
  BoltIcon,
  ChevronDown,
  UserIcon,
  LockIcon,
  LogoutIcon,
} from "@/components/icons";
import { api } from "@/lib/client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/queue", label: "Live Queue", Icon: BoltIcon },
  { href: "/locations", label: "Locations", Icon: BuildingIcon },
  { href: "/drivers", label: "Drivers", Icon: UsersIcon },
  { href: "/cards", label: "NFC Cards", Icon: CardIcon },
  { href: "/offers", label: "Offers", Icon: TagIcon },
  { href: "/reports", label: "Reports", Icon: ReportIcon },
];

const ROLE_LABEL = { super_admin: "Super Admin", admin: "Admin", manager: "Manager" };

function initials(name) {
  return (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AdminLayout = ({ active, children }) => {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    api("/api/me")
      .then(setMe)
      .catch(() => {});
  }, []);

  async function signOut() {
    setUserOpen(false);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {}
    router.replace("/login");
  }

  const name = me?.name || "Admin";
  const email = me?.email || "";
  const role = me?.role || "super_admin";

  return (
    <div className="console">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <LogoIcon size={18} />
          </div>
          <span className="sidebar-brand-name">360 Valet</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-item ${active === href ? "active" : ""}`}
            >
              <Icon size={17} color="currentColor" sw={active === href ? 2.2 : 2} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-user-menu">
          <button type="button" className="sidebar-user" onClick={() => setUserOpen((v) => !v)}>
            <div className="sidebar-avatar">{initials(name)}</div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div className="sidebar-user-name">{name}</div>
              <div className="sidebar-user-role">{ROLE_LABEL[role] || role}</div>
            </div>
            <ChevronDown size={13} color="#9FB0CC" />
          </button>
          {userOpen && (
            <>
              <div className="dropdown-backdrop" onClick={() => setUserOpen(false)} />
              <div className="dropdown-menu">
                <div className="dropdown-head">
                  <div className="dropdown-avatar">{initials(name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="dropdown-name">{name}</div>
                    <div className="dropdown-email">{email || "—"}</div>
                  </div>
                </div>
                <div className="dropdown-sep" />
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setUserOpen(false);
                    router.push("/profile");
                  }}
                >
                  <UserIcon size={15} />
                  <span>Edit profile</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setUserOpen(false);
                    router.push("/profile?tab=password");
                  }}
                >
                  <LockIcon size={15} />
                  <span>Change password</span>
                </button>
                <div className="dropdown-sep" />
                <button type="button" className="dropdown-item danger" onClick={signOut}>
                  <LogoutIcon size={15} />
                  <span>Log out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
      <main className="main">
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
