import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/layout/AdminLayout";
import { Select, Modal, Badge } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { CarIcon, LoadingIcon, ClockIcon } from "@/components/icons";
import { api } from "@/lib/client";
import { useSocket } from "@/hooks/useSocket";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "to_park", label: "To park" },
  { key: "parked", label: "Parked" },
  { key: "onway", label: "On the way" },
  { key: "overdue", label: "Overdue" },
  { key: "done", label: "Done" },
];

const RANGES = [
  { value: 1, label: "Today" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
];

function statusMeta(o, now) {
  const etaPassed = o.guestEta && new Date(o.guestEta).getTime() < now;
  const stuck = !o.guestEta && ["active", "parked"].includes(o.status)
    && new Date(o.createdAt).getTime() < now - 2 * 60 * 60 * 1000;
  if (o.status === "returned") return { label: "DONE", tone: "green", overdue: false };
  if ((etaPassed || stuck) && o.status !== "active") return { label: "OVERDUE", tone: "red", overdue: true };
  if (stuck) return { label: "OVERDUE", tone: "red", overdue: true };
  switch (o.status) {
    case "active": return { label: "TO PARK", tone: "orange", overdue: false };
    case "parked": return { label: "PARKED", tone: "navy", overdue: false };
    case "returning": return { label: "ON THE WAY", tone: "amber", overdue: false };
    case "retrieving": return { label: "RETRIEVING", tone: "amber", overdue: false };
    default: return { label: String(o.status).toUpperCase(), tone: "gray", overdue: false };
  }
}

function fmtTime(d) {
  return d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—";
}

function fmtDuration(min) {
  const m = Math.max(0, Math.round(min || 0));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

export default function Queue() {
  const router = useRouter();
  const [orders, setOrders] = useState(null);
  const [properties, setProperties] = useState([]);
  const [property, setProperty] = useState("all");
  const [days, setDays] = useState(1);
  const [statusTab, setStatusTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [orderData, propData] = await Promise.all([
        api(`/api/orders?days=${days}&property=${property}`),
        properties.length ? Promise.resolve({ properties }) : api("/api/dashboard?days=1&property=all"),
      ]);
      setOrders(orderData.orders);
      if (propData.properties) setProperties(propData.properties);
    } catch (err) {
      if (err.status === 401) { router.replace("/login"); return; }
      setError(err.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [days, property]);

  const { connected } = useSocket({
    "valet.order.created": () => load(),
    "valet.order.parked": () => load(),
    "valet.order.completed": () => load(),
    "valet.order.return.requested": () => load(),
    "valet.delay.notified": () => load(),
  }, load);

  const withMeta = useMemo(
    () => (orders || []).map((o) => ({ ...o, meta: statusMeta(o, now) })),
    [orders, now]
  );

  const counts = useMemo(() => {
    const c = { all: withMeta.length, to_park: 0, parked: 0, onway: 0, overdue: 0, done: 0 };
    for (const o of withMeta) {
      if (o.meta.overdue) c.overdue += 1;
      if (o.status === "active") c.to_park += 1;
      else if (o.status === "parked") c.parked += 1;
      else if (o.status === "returning" || o.status === "retrieving") c.onway += 1;
      else if (o.status === "returned") c.done += 1;
    }
    return c;
  }, [withMeta]);

  const filtered = useMemo(() => {
    if (statusTab === "all") return withMeta;
    if (statusTab === "overdue") return withMeta.filter((o) => o.meta.overdue);
    if (statusTab === "to_park") return withMeta.filter((o) => o.status === "active");
    if (statusTab === "parked") return withMeta.filter((o) => o.status === "parked");
    if (statusTab === "onway") return withMeta.filter((o) => o.status === "returning" || o.status === "retrieving");
    return withMeta.filter((o) => o.status === "returned");
  }, [withMeta, statusTab]);

  function timerCell(o) {
    if (o.status === "returned" && o.droppedAt && o.returnedAt) {
      return fmtDuration((new Date(o.returnedAt) - new Date(o.droppedAt)) / 60000);
    }
    if (o.guestEta) {
      const left = new Date(o.guestEta).getTime() - now;
      if (left <= 0) return "waiting";
      return `ETA ${Math.ceil(left / 60000)} min`;
    }
    return "—";
  }

  const columns = useMemo(() => [
    {
      key: "order", header: "Order", sortable: true, sortAccessor: (r) => r.id,
      render: (r) => (
        <div>
          <div className="table-main">#{r.id}</div>
          <div className="table-sub">{fmtDate(r.createdAt)} · {fmtTime(r.createdAt)}</div>
        </div>
      ),
    },
    {
      key: "car", header: "Vehicle", accessor: (r) => r.plate, sortable: true,
      render: (r) => (
        <div>
          <div className="table-main">{r.plate}</div>
          <div className="table-sub">{r.car || "—"}</div>
        </div>
      ),
    },
    { key: "card", header: "Card", accessor: (r) => r.cardUid || "", render: (r) => <span className="table-sub">{r.cardUid ? `#${r.cardUid}` : "—"}</span> },
    { key: "property", header: "Property", accessor: (r) => r.property, sortable: true, render: (r) => <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.property}</span> },
    { key: "driver", header: "Driver", accessor: (r) => r.driver, sortable: true, render: (r) => <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.driver}</span> },
    { key: "zone", header: "Zone · Slot", accessor: (r) => `${r.zone || ""}${r.slot || ""}`, render: (r) => <span className="table-sub">{r.zone ? `${r.zone} · ${r.slot ?? "—"}` : "—"}</span> },
    { key: "status", header: "Status", accessor: (r) => r.meta.label, render: (r) => <Badge tone={r.meta.tone}>{r.meta.label}</Badge> },
    { key: "timer", header: "Timer", accessor: (r) => timerCell(r), align: "right", render: (r) => (
      <span style={{ fontSize: 12.5, fontWeight: 800, color: r.meta.overdue ? "#E23D3D" : r.status === "returned" ? "#6C7A93" : "#1C2B46" }}>{timerCell(r)}</span>
    ) },
  ], [now]);

  const detailMeta = detail ? statusMeta(detail, now) : null;

  return (
    <AdminLayout active="/queue">
      <div className="header-row">
        <div>
          <div className="page-title">Live queue</div>
          <div className="page-subtitle">
            Every order across all properties
            <span className={`ws-indicator ${connected ? "connected" : "disconnected"}`} style={{ marginLeft: 10, fontSize: 10, display: "inline-flex" }}>
              <span className="ws-dot" />{connected ? "Live" : "Auto-refresh"}
            </span>
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
          <Select value={days} onChange={(v) => setDays(v)} options={RANGES} variant="pill" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatusTab(t.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 99,
              border: "1px solid #E7EAF0",
              background: statusTab === t.key ? "#1C2B46" : "#fff",
              color: statusTab === t.key ? "#fff" : t.key === "overdue" && counts.overdue > 0 ? "#E23D3D" : "#48566E",
              fontSize: 12.5,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {t.label} · {counts[t.key]}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        {loading && !orders ? (
          <div className="page-loading">
            <LoadingIcon />
            <span>Loading queue…</span>
          </div>
        ) : error ? (
          <div className="page-loading">
            <span style={{ color: "#C0392B" }}>{error}</span>
            <button className="btn-primary" onClick={load}>Retry</button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            searchable
            searchPlaceholder="Search plate, card or driver…"
            pageSize={20}
            emptyMessage="No orders for this filter."
            onRowClick={(row) => setDetail(row)}
          />
        )}
      </div>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Order #${detail.id}` : ""}
        subtitle={detail ? `${detail.plate}${detail.car ? ` · ${detail.car}` : ""}` : ""}
        width={480}
      >
        {detail && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <Badge tone={detailMeta.tone}>{detailMeta.label}</Badge>
              {detail.validations > 0 && <Badge tone="green">{detail.validations} offer validation{detail.validations > 1 ? "s" : ""}</Badge>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Card", detail.cardUid ? `#${detail.cardUid}` : "—"],
                ["Property", detail.property],
                ["Driver", detail.driver],
                ["Zone · Slot", detail.zone ? `${detail.zone} · ${detail.slot ?? "—"}` : "—"],
              ].map(([k, v]) => (
                <div key={k} style={{ background: "#F6F7F9", borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "#6C7A93", textTransform: "uppercase" }}>{k}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, borderTop: "1px solid #F1F3F6", paddingTop: 12 }}>
              {[
                { label: "Order created", at: detail.createdAt, Icon: CarIcon },
                { label: "Car dropped in zone", at: detail.droppedAt, Icon: ClockIcon },
                ...(detail.guestEta ? [{ label: "Guest ETA", at: detail.guestEta, Icon: ClockIcon }] : []),
                { label: "Car returned", at: detail.returnedAt, Icon: null },
              ].map((s, i, arr) => (
                <div key={s.label} style={{ display: "flex", gap: 10, alignItems: "center", padding: "5px 0" }}>
                  <span
                    style={{
                      width: 9, height: 9, borderRadius: 99, flex: "none",
                      background: s.at ? "#0C9D61" : "#E7EAF0",
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: s.at ? "#1C2B46" : "#9AA6BC" }}>{s.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.at ? "#48566E" : "#C4CBD6" }}>
                    {s.at ? `${fmtDate(s.at)} · ${fmtTime(s.at)}` : "pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
