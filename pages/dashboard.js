import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/layout/AdminLayout";
import { Select, StatCard } from "@/components/ui";
import { api } from "@/lib/client";
import { useSocket } from "@/hooks/useSocket";
import {
  CarIcon,
  ClockIcon,
  TagIcon,
  UsersIcon,
  AlertIcon,
  LoadingIcon,
} from "@/components/icons";

const RANGES = [
  { value: 1, label: "Today" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
];

const ACTIVITY_DOT = {
  returned: "#0C9D61",
  parked: "#F4531F",
  retrieval: "#4A5FC9",
};

function timeAgo(ts) {
  if (!ts) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  if (mins < 1) return "now";
  return `${mins}m`;
}

function fmtDuration(totalMin) {
  const m = Math.max(0, totalMin || 0);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

function CarsInOutChart({ chart }) {
  const items = chart || [];
  if (items.length === 0) {
    return <div className="chart-empty">No data for this period yet.</div>;
  }
  const max = Math.max(...items.map((c) => Math.max(c.drop || 0, c.ret || 0)), 1);
  const n = items.length;
  const slot = 600 / n;
  const barW = Math.max(3, Math.min(22, slot * 0.26));
  const labelIdx = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1].filter(
    (v, i, a) => a.indexOf(v) === i
  );
  return (
    <div className="chart-wrap">
      <svg width="100%" height="190" viewBox="0 0 640 190" preserveAspectRatio="none">
        <line x1="0" y1="160" x2="640" y2="160" stroke="#EDEFF3" strokeWidth="1" />
        <line x1="0" y1="110" x2="640" y2="110" stroke="#EDEFF3" strokeWidth="1" />
        <line x1="0" y1="60" x2="640" y2="60" stroke="#EDEFF3" strokeWidth="1" />
        {items.map((c, i) => {
          const dropH = Math.round((c.drop / max) * 136);
          const retH = Math.round((c.ret / max) * 136);
          const cx = 20 + i * slot + slot / 2;
          const last = i === items.length - 1;
          return (
            <g key={i}>
              <rect x={cx - barW - 1} y={160 - dropH} width={barW} height={dropH || 2} rx="5" fill="#F4531F" opacity={last ? 0.45 : 1} />
              <rect x={cx + 1} y={160 - retH} width={barW} height={retH || 2} rx="5" fill="#1C2B46" opacity={last ? 0.45 : 1} />
            </g>
          );
        })}
        {labelIdx.map((i) => (
          <text
            key={i}
            x={20 + i * slot + slot / 2}
            y="180"
            fontSize="11"
            fill="#9AA6BC"
            fontWeight="600"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans',sans-serif"
          >
            {items[i].label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [reportRows, setReportRows] = useState([]);
  const [days, setDays] = useState(1);
  const [property, setProperty] = useState("all");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { connected } = useSocket({
    "driver.shift.started": () => load(),
    "driver.shift.ended": () => load(),
    "valet.order.created": () => load(),
    "valet.order.parked": () => load(),
    "valet.order.completed": () => load(),
    "nfc.card.activated": () => load(),
  });

  useEffect(() => {
    api("/api/me")
      .then((m) => setFirstName((m.name || "").split(/\s+/)[0]))
      .catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [dash, reports] = await Promise.all([
        api(`/api/dashboard?days=${days}&property=${property}`),
        api(`/api/reports?days=${days * 2}&property=${property}`),
      ]);
      setData(dash);
      setReportRows(reports.rows);
    } catch (err) {
      if (err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [days, property]);

  if (loading) {
    return (
      <AdminLayout active="/dashboard">
        <div className="page-loading">
          <LoadingIcon />
          <span>Loading dashboard…</span>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout active="/dashboard">
        <div className="page-loading">
          <span style={{ color: "#C0392B" }}>{error || "Failed to load"}</span>
          <button className="btn-primary" onClick={load}>
            Retry
          </button>
        </div>
      </AdminLayout>
    );
  }

  const { stats, byProperty, chart, live, properties } = data;
  const rangeLabel = days === 1 ? "today" : `last ${days} days`;
  const currentLabel = RANGES.find((r) => r.value === days).label;
  const propertyName = properties.find((p) => p.id === Number(property))?.name || "";
  const maxCars = Math.max(...byProperty.map((p) => p.carsToday), 1);

  const prevRows = reportRows.slice(0, days);
  const curRows = reportRows.slice(days);
  const prevTotal = prevRows.reduce((s, r) => s + r.dropOffs, 0);
  const curTotal = curRows.reduce((s, r) => s + r.dropOffs, 0);
  const pct = prevTotal > 0 ? Math.round(((curTotal - prevTotal) / prevTotal) * 100) : null;
  const deltaTone = pct == null || pct >= 0 ? "up" : "down";
  const deltaArrow = pct == null || pct >= 0 ? "▲" : "▼";
  const deltaText =
    pct == null
      ? "▲ New this period"
      : `${deltaArrow} ${Math.abs(pct)}% vs previous ${days === 1 ? "day" : `${days} days`}`;

  const validationPct = stats.carsParked ? Math.round((stats.offersValidated / stats.carsParked) * 100) : 0;
  const targetMin = 480;
  const speedDiff = targetMin - stats.avgReturnTime;
  const speedFast = speedDiff >= 0;
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const chartData = days === 1 ? chart : curRows.map((r) => ({ label: r.day, drop: r.dropOffs, ret: r.returns }));

  return (
    <AdminLayout active="/dashboard">
      <div className="header-row">
        <div>
          <div className="page-title">{greeting}{firstName ? `, ${firstName}` : ""} <div className={`ws-indicator ${connected ? "connected" : "disconnected"}`} style={{ marginLeft: 10, fontSize: 10, verticalAlign: "middle", display: "inline-flex" }}><span className="ws-dot" />{connected ? "Live" : "Offline"}</div></div>
          <div className="page-subtitle">
            {dateStr} · {property === "all" ? "All properties healthy" : propertyName}
          </div>
        </div>
        <div className="header-actions">
          <Select
            value={property}
            onChange={(v) => setProperty(v)}
            options={[
              { value: "all", label: "All properties" },
              ...properties.map((p) => ({ value: p.id, label: p.name })),
            ]}
            variant="pill"
          />
          <Select
            value={days}
            onChange={(v) => setDays(v)}
            options={RANGES}
            variant="pill"
          />
          <button className="btn-primary" onClick={() => router.push("/locations")}>
            + New location
          </button>
        </div>
      </div>

      <div className="grid-4" style={{ marginTop: 22 }}>
        <StatCard
          label="Cars parked"
          icon={<CarIcon />}
          iconBg="#FEEFE8"
          value={stats.carsParked}
          delta={deltaText}
          deltaTone={deltaTone}
        />
        <StatCard
          label="Avg return time"
          icon={<ClockIcon />}
          iconBg="#E7F7EF"
          value={fmtDuration(stats.avgReturnTime)}
          delta={`${speedFast ? "▼" : "▲"} ${fmtDuration(Math.abs(speedDiff))} ${speedFast ? "faster" : "slower"} than target`}
          deltaTone={speedFast ? "up" : "amber"}
        />
        <StatCard
          label="Offers validated"
          icon={<TagIcon size={17} color="#B97B17" />}
          iconBg="#FDF3E3"
          value={
            <>
              <span>{stats.offersValidated}</span> <span className="small">({validationPct}%)</span>
            </>
          }
          delta={`▲ AED ${stats.outletSpend.toLocaleString()} outlet spend`}
        />
        <StatCard
          label="Drivers on shift"
          icon={<UsersIcon size={17} color="#4A5FC9" />}
          iconBg="#EDF0FE"
          value={
            <>
              <span>{stats.driversOnShift}</span>
              <span className="small">/{stats.driversTotal}</span>
            </>
          }
          delta={`${stats.overdue} overdue returns right now`}
          deltaTone="amber"
        />
      </div>

      <div className="grid-2" style={{ marginTop: 14, gridTemplateColumns: "1.7fr 1fr" }}>
        <div className="card" style={{ padding: "20px 22px" }}>
          <div className="header-row">
            <span style={{ fontSize: 14.5, fontWeight: 800 }}>Cars in &amp; out — {rangeLabel}</span>
            <div className="chart-legend">
              <div className="chart-legend-item">
                <div className="chart-legend-swatch" style={{ background: "#F4531F" }} />
                <span className="chart-legend-label">Drop-offs</span>
              </div>
              <div className="chart-legend-item">
                <div className="chart-legend-swatch" style={{ background: "#1C2B46" }} />
                <span className="chart-legend-label">Returns</span>
              </div>
            </div>
          </div>
          <CarsInOutChart chart={chartData} />
        </div>

        <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 14.5, fontWeight: 800 }}>By property — {rangeLabel}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 16 }}>
            {byProperty.map((p) => (
              <div key={p.id}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{p.name}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 800 }}>{p.carsToday}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.round((p.carsToday / maxCars) * 100)}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
          {stats.overdue > 0 && (
            <div className="callout">
              <AlertIcon />
              <span className="callout-text">
                {stats.overdue} returns overdue — check active valet queue
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: "18px 22px", marginTop: 14 }}>
        <div className="header-row">
          <span style={{ fontSize: 14.5, fontWeight: 800 }}>Live activity</span>
          <span
            style={{ fontSize: 12, fontWeight: 700, color: "#F4531F", cursor: "pointer" }}
            onClick={() => router.push("/reports")}
          >
            Open reports →
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 26px", marginTop: 12 }}>
          {live.map((a, i) => (
            <div
              key={a.id || i}
              style={{
                display: "flex",
                gap: 11,
                alignItems: "center",
                padding: "9px 0",
                borderBottom: i < 2 ? "1px solid #F1F3F6" : "none",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 99, background: ACTIVITY_DOT[a.kind] || "#9AA6BC", flex: "none" }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>
                {a.action} — {a.plate} · {a.property}
              </span>
              <span style={{ fontSize: 11, color: "#9AA6BC", fontWeight: 600 }}>
                {timeAgo(a.time)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
