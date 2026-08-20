import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Formik, Form } from "formik";
import * as yup from "yup";
import AdminLayout from "@/components/layout/AdminLayout";
import { Select, Modal } from "@/components/ui";
import { SearchIcon, LoadingIcon } from "@/components/icons";
import { DataTable } from "@/components/DataTable";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { useSocket } from "@/hooks/useSocket";

const SCHEMA = yup.object({
  propertyId: yup.string().required("Select a property."),
  count: yup
    .number()
    .typeError("Count must be a number.")
    .integer("Count must be a whole number.")
    .min(1, "Count must be at least 1.")
    .max(500, "Count must be at most 500.")
    .required("Enter a count."),
});

export default function Cards() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [property, setProperty] = useState("all");
  const [showRegister, setShowRegister] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (property !== "all") params.set("property", property);
      setData(await api(`/api/cards?${params.toString()}`));
    } catch (err) {
      if (err.status === 401) { router.replace("/login"); return; }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [property]);

  const { connected } = useSocket({
    "nfc.card.activated": () => load(),
    "nfc.card.blocked": () => load(),
    "nfc.card.unblocked": () => load(),
    "valet.order.parked": () => load(),
    "valet.order.completed": () => load(),
  });

  async function onSubmit(values, { setSubmitting, resetForm }) {
    try {
      const res = await api("/api/cards", {
        method: "POST",
        body: { propertyId: Number(values.propertyId), count: Number(values.count) },
      });
      toast.success(`${res.created} cards registered (UID ${res.from}–${res.to}).`);
      resetForm();
      setShowRegister(false);
      load();
    } catch (err) {
      toast.error(err.message);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout active="/cards">
        <div className="page-loading"><LoadingIcon /><span>Loading cards…</span></div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout active="/cards">
        <div className="page-loading">
          <span style={{ color: "#C0392B" }}>{error || "Failed to load"}</span>
          <button className="btn-primary" onClick={load}>Retry</button>
        </div>
      </AdminLayout>
    );
  }

  const stats = property === "all"
    ? data.stats
    : data.stats.perProperty[property] || { total: 0, inValet: 0, ready: 0, blocked: 0 };
  const propName = property === "all" ? "All properties" : data.properties.find((p) => String(p.id) === String(property))?.name;

  const columns = [
    {
      key: "uid",
      header: "UID",
      width: 100,
      accessor: (r) => r.uid,
      sortable: true,
      render: (r) => <span className="uid">{r.uid}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: 130,
      accessor: (r) => r.statusLabel,
      sortable: true,
      render: (r) => <span className={`badge ${r.statusTone}`}>{r.statusLabel}</span>,
    },
    {
      key: "order",
      header: "Current order",
      accessor: (r) => r.order,
      render: (r) => (
        <span style={{ fontSize: 12.5, fontWeight: r.orderMuted ? 600 : 700, color: r.orderMuted ? "#9AA6BC" : "#1C2B46" }}>
          {r.order}
        </span>
      ),
    },
    {
      key: "by",
      header: "Last activated by",
      accessor: (r) => r.by,
      render: (r) => <span style={{ fontSize: 12.5, fontWeight: 600, color: "#48566E" }}>{r.by}</span>,
    },
    {
      key: "uses",
      header: "Uses",
      width: 70,
      accessor: (r) => r.uses,
      sortable: true,
      render: (r) => <span style={{ fontSize: 12.5, fontWeight: 800 }}>{r.uses}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      width: 90,
      render: (r) => (
        <div>
          {r.status === "ready" && (
            <button className="badge red" style={{ cursor: "pointer", border: "none", fontSize: 11, fontWeight: 700 }}
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await api(`/api/cards/${r.id}`, { method: "PATCH", body: { action: "block" } });
                  toast.success(`Card ${r.uid} blocked`);
                  load();
                } catch (err) { toast.error(err.message); }
              }}>Block</button>
          )}
          {r.status === "blocked" && (
            <button className="badge green" style={{ cursor: "pointer", border: "none", fontSize: 11, fontWeight: 700 }}
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await api(`/api/cards/${r.id}`, { method: "PATCH", body: { action: "unblock" } });
                  toast.success(`Card ${r.uid} unblocked`);
                  load();
                } catch (err) { toast.error(err.message); }
              }}>Unblock</button>
          )}
          {r.status === "with_guest" && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "#9AA6BC" }}>In use</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout active="/cards">
      <div className="header-row">
        <div className="page-title">
          NFC cards <span className="muted">· {propName}</span>
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
              ...data.properties.map((p) => ({ value: p.id, label: p.name })),
            ]}
            variant="pill"
          />
          <button className="btn-primary" onClick={() => setShowRegister(true)}>+ Register card batch</button>
        </div>
      </div>

      <Modal open={showRegister} onClose={() => setShowRegister(false)} title="Register card batch" width={400} subtitle="Registers NFC cards into a property's pool with sequential UIDs.">
        <Formik initialValues={{ propertyId: "", count: 100 }} validationSchema={SCHEMA} onSubmit={onSubmit}>
          {(formik) => (
            <Form noValidate>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <div>
                  <Select value={formik.values.propertyId} onChange={(v) => formik.setFieldValue("propertyId", v)} label="Property" variant="field"
                    options={[{ value: "", label: "Select…" }, ...data.properties.map((p) => ({ value: p.id, label: p.name }))]} />
                  {formik.touched.propertyId && formik.errors.propertyId && <div className="field-error">{formik.errors.propertyId}</div>}
                </div>
                <div>
                  <div className="field"><label className="field-label" htmlFor="reg-count">Count</label>
                    <input id="reg-count" name="count" className="field-value input" type="number" min="1" max="500" value={formik.values.count} onChange={formik.handleChange} onBlur={formik.handleBlur} /></div>
                  {formik.touched.count && formik.errors.count && <div className="field-error">{formik.errors.count}</div>}
                </div>
              </div>
              <button className="btn-primary" style={{ marginTop: 18, padding: 14, width: "100%", fontSize: 14 }} disabled={formik.isSubmitting}>
                {formik.isSubmitting ? "Registering…" : "Register"}
              </button>
            </Form>
          )}
        </Formik>
      </Modal>

      <div className="grid-4" style={{ marginTop: 20 }}>
        <div className="stat-card"><div style={{ fontSize: 26, fontWeight: 800 }}>{stats.total}</div><div style={{ fontSize: 11.5, color: "#6C7A93", fontWeight: 600 }}>Total in pool</div></div>
        <div className="stat-card"><div style={{ fontSize: 26, fontWeight: 800, color: "#F4531F" }}>{stats.inValet}</div><div style={{ fontSize: 11.5, color: "#6C7A93", fontWeight: 600 }}>Active — with guests now</div></div>
        <div className="stat-card"><div style={{ fontSize: 26, fontWeight: 800, color: "#0C9D61" }}>{stats.ready}</div><div style={{ fontSize: 11.5, color: "#6C7A93", fontWeight: 600 }}>At the stand — ready</div></div>
        <div className="stat-card"><div style={{ fontSize: 26, fontWeight: 800, color: "#E23D3D" }}>{stats.blocked}</div><div style={{ fontSize: 11.5, color: "#6C7A93", fontWeight: 600 }}>Lost / damaged</div></div>
      </div>

      <div style={{ marginTop: 12 }}>
        <DataTable columns={columns} data={data.cards} searchPlaceholder="Search UID or plate…" pageSize={25} emptyMessage="No cards match." />
      </div>
    </AdminLayout>
  );
}
