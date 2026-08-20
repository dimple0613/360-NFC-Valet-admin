import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/layout/AdminLayout";
import { Select } from "@/components/ui";
import DateRangePicker from "@/components/DateRangePicker";
import { DownloadIcon, LoadingIcon } from "@/components/icons";
import { api } from "@/lib/client";
import { useSocket } from "@/hooks/useSocket";

const AVG_TONE = { green: "#0C9D61", amber: "#E9A23B" };

function fmtDuration(totalMin) {
  const m = Math.max(0, totalMin || 0);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

function shortDate(dateStr) {
  if (!dateStr) return "";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function ddMMyyyy(isoStr) {
  if (!isoStr) return "";
  return `${isoStr.slice(8, 10)}-${isoStr.slice(5, 7)}-${isoStr.slice(0, 4)}`;
}

export default function Reports() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = new Date();
  const past = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000);
  const [from, setFrom] = useState(iso(past));
  const [to, setTo] = useState(iso(today));
  const [property, setProperty] = useState("all");
  const [properties, setProperties] = useState([]);
  const [exportOpen, setExportOpen] = useState(false);

  const { connected } = useSocket({
    "valet.order.parked": () => load(),
    "valet.order.completed": () => load(),
    "driver.shift.started": () => load(),
    "driver.shift.ended": () => load(),
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [reportData, propData] = await Promise.all([
        api(`/api/reports?from=${from}&to=${to}&property=${property}`),
        properties.length ? Promise.resolve({ properties }) : api("/api/dashboard?days=1&property=all"),
      ]);
      setRows(reportData);
      if (propData.properties) setProperties(propData.properties);
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
  }, [from, to, property]);

  function exportCsv() {
    if (!rows) return;
    const head = "Day,Drop-offs,Returns,Avg return (min),Overdue,Validations,Outlet spend";
    const body = rows.rows
      .map((r) =>
        [`${r.day} ${ddMMyyyy(r.date)}`, r.dropOffs, r.returns, r.avgMin, r.overdue, r.validations, r.spend].join(",")
      )
      .join("\n");
    const blob = new Blob([`${head}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "360nfc-valet-reports.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    if (!rows) return;
    const data = rows.rows;
    const tr = (cells, bold) =>
      `<tr>${cells
        .map(
          (c) =>
            `<td style="padding:9px 12px;border-bottom:1px solid #E7EAF0;font-size:12px;font-weight:${bold ? 800 : 700};${bold ? "color:#1C2B46" : ""}">${c}</td>`
        )
        .join("")}</tr>`;
    const body = data
      .map((r) =>
        tr([
          `${r.day} ${ddMMyyyy(r.date)}`,
          r.dropOffs,
          r.returns,
          r.avgMin ? fmtDuration(r.avgMin) : "—",
          r.overdue,
          r.validations,
          `AED ${r.spend.toLocaleString()}`,
        ])
      )
      .join("");
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>360 NFC Valet — Daily report</title><style>
      body{font-family:'Plus Jakarta Sans',Arial,sans-serif;padding:32px;color:#1C2B46}
      h1{font-size:20px;margin:0 0 2px}
      .sub{font-size:12px;color:#6C7A93;margin-bottom:18px}
      table{border-collapse:collapse;width:100%}
      th{font-size:10px;text-align:left;text-transform:uppercase;letter-spacing:1px;color:#6C7A93;padding:9px 12px;border-bottom:1px solid #EDEFF3;background:#FAFBFC}
      .tot td{border-bottom:none;font-weight:800;background:#FAFBFC}
    </style></head><body>
      <h1>360 NFC Valet — Daily report</h1>
      <div class="sub">${shortDate(data[0]?.date)} – ${shortDate(data[data.length - 1]?.date)}</div>
      <table>
        <tr><th>Day</th><th>Drop-offs</th><th>Returns</th><th>Avg return</th><th>Overdue</th><th>Validations</th><th>Outlet spend</th></tr>
        ${body}
      </table>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  if (loading) {
    return (
      <AdminLayout active="/reports">
        <div className="page-loading">
          <LoadingIcon />
          <span>Loading reports…</span>
        </div>
      </AdminLayout>
    );
  }

  if (error || !rows) {
    return (
      <AdminLayout active="/reports">
        <div className="page-loading">
          <span style={{ color: "#C0392B" }}>{error || "Failed to load"}</span>
          <button className="btn-primary" onClick={load}>Retry</button>
        </div>
      </AdminLayout>
    );
  }

  const data = rows.rows;
  const totals = {
    drop: data.reduce((s, r) => s + r.dropOffs, 0),
    ret: data.reduce((s, r) => s + r.returns, 0),
    avg: data.reduce((s, r) => s + r.avgMin, 0) / data.length,
    overdue: data.reduce((s, r) => s + r.overdue, 0),
    val: data.reduce((s, r) => s + r.validations, 0),
    spend: data.reduce((s, r) => s + r.spend, 0),
  };
  const valPct = totals.drop ? Math.round((totals.val / totals.drop) * 100) : 0;
  const range = `${shortDate(from) || ""} – ${shortDate(to) || ""} ${to.slice(0, 4) || ""}`;

  return (
    <AdminLayout active="/reports">
      <div className="header-row">
        <div className="page-title">
          Reports
          <div className={`ws-indicator ${connected ? "connected" : "disconnected"}`} style={{ marginLeft: 10, fontSize: 10, verticalAlign: "middle" }}>
            <span className="ws-dot" />{connected ? "Live" : "Offline"}
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
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
          <div className="select">
            <button type="button" className="btn-dark" onClick={() => setExportOpen((v) => !v)}>
              <DownloadIcon />
              <span>Export CSV / PDF</span>
            </button>
            {exportOpen && (
              <>
                <div className="select-backdrop" onClick={() => setExportOpen(false)} />
                <div className="select-menu">
                  <button type="button" className="select-item" onClick={() => { exportCsv(); setExportOpen(false); }}>
                    Export CSV
                  </button>
                  <button type="button" className="select-item" onClick={() => { exportPdf(); setExportOpen(false); }}>
                    Export PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="table-card">
        <div
          className="table-head"
          style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 1.2fr 1.2fr" }}
        >
          <span>Day</span>
          <span>Drop-offs</span>
          <span>Returns</span>
          <span>Avg return</span>
          <span>Overdue</span>
          <span>Validations</span>
          <span>Outlet spend</span>
        </div>
        {data.map((r) => (
          <div
            key={r.date}
            className="table-row"
            style={{
              gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 1.2fr 1.2fr",
              borderBottom: "1px solid #F1F3F6",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 800 }}>
              {r.day} {r.date.slice(5)}{" "}
              {r.isToday && <span className="badge badge-tag-featured orange">TODAY</span>}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{r.dropOffs}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{r.returns}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: r.avgMin > 8 ? AVG_TONE.amber : AVG_TONE.green }}>
              {r.avgMin ? fmtDuration(r.avgMin) : "—"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: r.overdue > 8 ? "#E23D3D" : "#1C2B46" }}>
              {r.overdue}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {r.validations}
              {r.dropOffs ? ` (${Math.round((r.validations / r.dropOffs) * 100)}%)` : ""}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{`AED ${r.spend.toLocaleString()}`}</span>
          </div>
        ))}
        <div
          className="table-row"
          style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 1.2fr 1.2fr", background: "#FAFBFC" }}
        >
          <span style={{ fontSize: 13, fontWeight: 800 }}>Period total</span>
          <span style={{ fontSize: 13, fontWeight: 800 }}>{totals.drop.toLocaleString()}</span>
          <span style={{ fontSize: 13, fontWeight: 800 }}>{totals.ret.toLocaleString()}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#0C9D61" }}>{fmtDuration(totals.avg)}</span>
          <span style={{ fontSize: 13, fontWeight: 800 }}>{totals.overdue}</span>
          <span style={{ fontSize: 13, fontWeight: 800 }}>{`${totals.val} (${valPct}%)`}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#F4531F" }}>{`AED ${totals.spend.toLocaleString()}`}</span>
        </div>
      </div>

      <div className="mini-note">
        {range} · Columns are per selected property or aggregated. “Outlet spend” = revenue
        at hotel outlets attributed to valet-validated visits — the number that
        sells this system to hotels.
      </div>
    </AdminLayout>
  );
}
