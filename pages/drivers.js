import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Formik, Form } from "formik";
import * as yup from "yup";
import AdminLayout from "@/components/layout/AdminLayout";
import { Select, Modal } from "@/components/ui";
import { SearchIcon, BoltIcon, ShieldIcon, LoadingIcon } from "@/components/icons";
import { DataTable } from "@/components/DataTable";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { useSocket } from "@/hooks/useSocket";

const STATUS_TONE = { on_shift: "green", on_break: "amber", off_duty: "gray" };

const ADD_SCHEMA = yup.object({
  name: yup.string().required("Full name is required."),
  password: yup.string().min(6, "Password must be at least 6 characters.").required("Password is required."),
  confirmPassword: yup.string().oneOf([yup.ref("password"), null], "Passwords do not match.").required("Confirm password is required."),
  email: yup.string().email("Enter a valid email address."),
  phone: yup.string().matches(/^[0-9+ ]{7,15}$/, "Enter a valid phone number."),
  emiratesId: yup.string(),
  licenseNumber: yup.string(),
  nationality: yup.string(),
  emergencyContact: yup.string(),
});

const EDIT_SCHEMA = yup.object({
  name: yup.string().required("Full name is required."),
  email: yup.string().email("Enter a valid email address."),
  phone: yup.string().matches(/^[0-9+ ]{7,15}$/, "Enter a valid phone number."),
  emiratesId: yup.string(),
  licenseNumber: yup.string(),
  nationality: yup.string(),
  emergencyContact: yup.string(),
});

function fmtDuration(totalMin) {
  const m = Math.max(0, totalMin || 0);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Drivers() {
  const router = useRouter();
  const toast = useToast();
  const [drivers, setDrivers] = useState(null);
  const [properties, setProperties] = useState([]);
  const [property, setProperty] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [createdDriver, setCreatedDriver] = useState(null);
  const [detailDriver, setDetailDriver] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resetPwdId, setResetPwdId] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [removeDriver, setRemoveDriver] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [driverData, propData] = await Promise.all([
        api(`/api/drivers?property=${property}`),
        properties.length ? Promise.resolve({ properties }) : api("/api/dashboard?days=1&property=all"),
      ]);
      setDrivers(driverData);
      if (propData.properties) setProperties(propData.properties);
    } catch (err) {
      if (err.status === 401) { router.replace("/login"); return; }
      setError(err.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [property]);

  const { connected } = useSocket({
    "driver.shift.started": () => load(),
    "driver.shift.ended": () => load(),
    "driver.created": () => load(),
    "valet.order.created": () => load(),
    "valet.order.parked": () => load(),
    "valet.order.completed": () => load(),
  });

  async function loadDetail(d) {
    setDetailDriver(d);
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await api(`/api/drivers?id=${d.id}`);
      setDetail(data);
    } catch (err) { toast.error(err.message); }
    finally { setDetailLoading(false); }
  }

  async function onSubmitAdd(values, { setSubmitting, resetForm }) {
    try {
      const res = await api("/api/drivers", {
        method: "POST",
        body: { name: values.name, password: values.password, email: values.email || undefined, phone: values.phone || undefined, emiratesId: values.emiratesId || undefined, licenseNumber: values.licenseNumber || undefined, nationality: values.nationality || undefined, emergencyContact: values.emergencyContact || undefined },
      });
      setCreatedDriver({ valetId: res.valetId, password: res.password, name: res.name });
      resetForm(); setShowAdd(false); load();
    } catch (err) { toast.error(err.message); setSubmitting(false); }
  }

  function toggleShift(d) {
    const on = d.status !== "on_shift";
    api("/api/drivers", { method: "PATCH", body: { id: d.id, shift: on } })
      .then(() => { toast.success(on ? `${d.name} is now on shift.` : `${d.name} is now off shift.`); load(); })
      .catch((err) => toast.error(err.message));
  }

  async function handleResetPassword() {
    if (!resetPwdId || !newPassword.trim()) return;
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setResetting(true);
    try {
      await api("/api/drivers", { method: "PATCH", body: { id: resetPwdId, newPassword: newPassword.trim() } });
      toast.success("Password updated successfully."); setResetPwdId(null); setNewPassword("");
    } catch (err) { toast.error(err.message); }
    finally { setResetting(false); }
  }

  function handleRemove() {
    if (!removeDriver) return;
    api("/api/drivers", { method: "PATCH", body: { id: removeDriver.id, remove: true } })
      .then(() => { toast.success(`${removeDriver.name} has been removed.`); setRemoveDriver(null); load(); })
      .catch((err) => toast.error(err.message));
  }

  const columns = useMemo(() => [
    {
      key: "driver", header: "Driver", accessor: (r) => r.name, sortable: true,
      render: (r) => (
        <div className="avatar-row">
          <div className="avatar" style={{ background: r.color }}>{r.initials}</div>
          <div><div className="table-main">{r.name}</div><div className="table-sub">{r.valetId}</div></div>
        </div>
      ),
    },
    { key: "email", header: "Email", accessor: (r) => r.email || "", render: (r) => <span style={{ fontSize: 12.5, fontWeight: 600, color: "#6C7A93" }}>{r.email || "—"}</span> },
    { key: "today", header: "Today", accessor: (r) => r.today || 0, sortable: true, align: "center", render: (r) => <span style={{ fontSize: 12.5, fontWeight: 800 }}>{r.status === "off_duty" ? "—" : r.today}</span> },
    {
      key: "avgMin", header: "Avg return", accessor: (r) => r.avgMin || 0, sortable: true, align: "center",
      render: (r) => <span style={{ fontSize: 12.5, fontWeight: 800, color: r.avgMin > 8 ? "#E9A23B" : r.status === "off_duty" ? "#6C7A93" : "#0C9D61" }}>{r.status === "off_duty" ? "—" : fmtDuration(r.avgMin)}</span>,
    },
    { key: "status", header: "Status", accessor: (r) => r.statusLabel, render: (r) => <span className={`badge ${STATUS_TONE[r.status] || "gray"}`}>{r.statusLabel}</span> },
    {
      key: "actions", header: "", width: 100,
      render: (r) => (
        <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
          <span className="link-primary" style={{ cursor: "pointer" }} onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}>Manage</span>
          {openMenuId === r.id && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpenMenuId(null)} />
              <div className="select-menu" style={{ position: "absolute", top: "100%", right: 0, zIndex: 50, display: "block", minWidth: 160 }}>
                <button type="button" className="select-item" onClick={() => { setOpenMenuId(null); loadDetail(r); }}>View details</button>
                <button type="button" className="select-item" onClick={() => { setOpenMenuId(null); toggleShift(r); }}>{r.status === "on_shift" ? "End shift" : "Start shift"}</button>
                <button type="button" className="select-item" onClick={() => { setOpenMenuId(null); setResetPwdId(r.id); setNewPassword(""); }}>Reset password</button>
                <button type="button" className="select-item" onClick={() => { setOpenMenuId(null); setEditDriver(r); }}>Edit details</button>
                <button type="button" className="select-item" style={{ color: "#C0392B" }} onClick={() => { setOpenMenuId(null); setRemoveDriver(r); }}>Remove driver</button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ], [openMenuId]);

  return (
    <AdminLayout active="/drivers">
      <div className="header-row">
        <div className="page-title">
          Valet drivers <span className="muted">· {drivers ? drivers.drivers.length : "…"}</span>
          <div className={`ws-indicator ${connected ? "connected" : "disconnected"}`} style={{ marginLeft: 10, fontSize: 10, verticalAlign: "middle" }}>
            <span className="ws-dot" />{connected ? "Live" : "Offline"}
          </div>
        </div>
        <div className="header-actions">
          <Select value={property} onChange={(v) => setProperty(v)} options={[{ value: "all", label: "All properties" }, ...properties.map((p) => ({ value: p.id, label: p.name }))]} variant="pill" />
          <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add driver</button>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add driver" width={440} subtitle="Creates a driver account with auto-generated ID. Set a custom password.">
        <Formik initialValues={{ name: "", password: "", confirmPassword: "", email: "", phone: "", emiratesId: "", licenseNumber: "", nationality: "", emergencyContact: "" }} validationSchema={ADD_SCHEMA} onSubmit={onSubmitAdd}>
          {(formik) => (
            <Form noValidate>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <div><div className="field"><label className="field-label">Full name *</label><input name="name" className="field-value input" value={formik.values.name} placeholder="Ramesh Kumar" onChange={formik.handleChange} onBlur={formik.handleBlur} /></div>{formik.touched.name && formik.errors.name && <div className="field-error">{formik.errors.name}</div>}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                  <div><div className="field"><label className="field-label">Password *</label><input name="password" className="field-value input" type="password" value={formik.values.password} placeholder="Min 6 characters" onChange={formik.handleChange} onBlur={formik.handleBlur} /></div>{formik.touched.password && formik.errors.password && <div className="field-error">{formik.errors.password}</div>}</div>
                  <div><div className="field"><label className="field-label">Confirm password *</label><input name="confirmPassword" className="field-value input" type="password" value={formik.values.confirmPassword} placeholder="Re-enter password" onChange={formik.handleChange} onBlur={formik.handleBlur} /></div>{formik.touched.confirmPassword && formik.errors.confirmPassword && <div className="field-error">{formik.errors.confirmPassword}</div>}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                  <div><div className="field"><label className="field-label">Email</label><input name="email" className="field-value input" type="email" value={formik.values.email} placeholder="ramesh@360valet.com" onChange={formik.handleChange} onBlur={formik.handleBlur} /></div>{formik.touched.email && formik.errors.email && <div className="field-error">{formik.errors.email}</div>}</div>
                  <div><div className="field"><label className="field-label">Phone</label><input name="phone" className="field-value input" value={formik.values.phone} placeholder="+971 5xx xxx xxxx" onChange={formik.handleChange} onBlur={formik.handleBlur} /></div>{formik.touched.phone && formik.errors.phone && <div className="field-error">{formik.errors.phone}</div>}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                  <div className="field"><label className="field-label">Emirates ID</label><input name="emiratesId" className="field-value input" value={formik.values.emiratesId} placeholder="784-XXXX-XXXXXXX-X" onChange={formik.handleChange} /></div>
                  <div className="field"><label className="field-label">License number</label><input name="licenseNumber" className="field-value input" value={formik.values.licenseNumber} placeholder="DL-XXXXXXX" onChange={formik.handleChange} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                  <div className="field"><label className="field-label">Nationality</label><input name="nationality" className="field-value input" value={formik.values.nationality} placeholder="Indian" onChange={formik.handleChange} /></div>
                  <div className="field"><label className="field-label">Emergency contact</label><input name="emergencyContact" className="field-value input" value={formik.values.emergencyContact} placeholder="+971 5xx xxx xxxx" onChange={formik.handleChange} /></div>
                </div>
              </div>
              <button className="btn-primary" style={{ marginTop: 18, padding: 14, width: "100%", fontSize: 14 }} disabled={formik.isSubmitting}>{formik.isSubmitting ? "Adding…" : "Add driver"}</button>
            </Form>
          )}
        </Formik>
      </Modal>

      <Modal open={!!createdDriver} onClose={() => setCreatedDriver(null)} title="Driver created" width={420}>
        {createdDriver && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: "#6C7A93", fontWeight: 600 }}>Share these credentials with the driver:</p>
            <div style={{ background: "#F6F7F9", borderRadius: 12, padding: 16 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#6C7A93", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Driver ID</div><div style={{ fontSize: 18, fontWeight: 800, color: "#1C2B46" }}>{createdDriver.valetId}</div></div>
            <div style={{ background: "#F6F7F9", borderRadius: 12, padding: 16 }}><div style={{ fontSize: 12, fontWeight: 700, color: "#6C7A93", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Password</div><div style={{ fontSize: 18, fontWeight: 800, color: "#1C2B46", fontFamily: "monospace" }}>{createdDriver.password}</div></div>
            <button className="btn-primary" style={{ padding: 14, width: "100%", fontSize: 14 }} onClick={() => setCreatedDriver(null)}>Done</button>
          </div>
        )}
      </Modal>

      <Modal open={!!resetPwdId} onClose={() => { setResetPwdId(null); setNewPassword(""); }} title="Reset password" width={380}>
        <p style={{ fontSize: 13, color: "#6C7A93", fontWeight: 600, marginBottom: 14 }}>Enter a new password for this driver:</p>
        <input className="field-value input" type="password" placeholder="New password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
        <button className="btn-primary" style={{ marginTop: 14, padding: 14, width: "100%", fontSize: 14 }} disabled={resetting} onClick={handleResetPassword}>{resetting ? "Updating…" : "Update password"}</button>
      </Modal>

      <Modal open={!!detailDriver} onClose={() => { setDetailDriver(null); setDetail(null); }} title={detailDriver ? `${detailDriver.name} — ${detailDriver.valetId}` : "Driver details"} width={640}>
        {detailLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}><LoadingIcon /><span style={{ marginLeft: 8, color: "#6C7A93", fontSize: 13 }}>Loading…</span></div>
        ) : detail ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#6C7A93", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Profile</div>
              <div style={{ fontSize: 12, color: "#6C7A93", lineHeight: 2 }}>
                <div><b>Phone:</b> {detail.driver.phone || "—"}</div>
                <div><b>Emirates ID:</b> {detail.driver.emiratesId || "—"}</div>
                <div><b>License:</b> {detail.driver.licenseNumber || "—"}</div>
                <div><b>Nationality:</b> {detail.driver.nationality || "—"}</div>
                <div><b>Emergency:</b> {detail.driver.emergencyContact || "—"}</div>
                <div><b>Joined:</b> {fmtDate(detail.driver.createdAt)}</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#6C7A93", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Active Orders</div>
              {(detail.activeOrders || []).length === 0 ? <div style={{ fontSize: 12, color: "#6C7A93" }}>No active orders</div> : (detail.activeOrders || []).map((o) => (
                <div key={o.id} style={{ background: "#FFFFFF", border: "1px solid #E7EAF0", borderRadius: 10, padding: 10, marginBottom: 6, fontSize: 12 }}>
                  <div style={{ fontWeight: 800 }}>{o.plate} · {o.car}</div>
                  <div style={{ color: "#6C7A93", marginTop: 2 }}>{o.status} · Zone {o.zone || "?"} · Slot {o.slot || "?"}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#6C7A93", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Today&apos;s Returns</div>
              {(detail.recentReturned || []).length === 0 ? <div style={{ fontSize: 12, color: "#6C7A93" }}>No returns yet</div> : (detail.recentReturned || []).map((o) => (
                <div key={o.id} style={{ background: "#FFFFFF", border: "1px solid #E7EAF0", borderRadius: 10, padding: 10, marginBottom: 6, fontSize: 12 }}>
                  <div style={{ fontWeight: 800 }}>{o.plate} · {o.car}</div>
                  <div style={{ color: "#6C7A93", marginTop: 2 }}>Returned · {fmtDuration(o.returnMin)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={!!editDriver} onClose={() => setEditDriver(null)} title={`Edit ${editDriver?.name || "driver"}`} width={440}>
        {editDriver && (
          <Formik enableReinitialize initialValues={{ name: editDriver.name || "", email: editDriver.email || "", phone: editDriver.phone || "", emiratesId: editDriver.emiratesId || "", licenseNumber: editDriver.licenseNumber || "", nationality: editDriver.nationality || "", emergencyContact: editDriver.emergencyContact || "" }} validationSchema={EDIT_SCHEMA}
            onSubmit={(values, { setSubmitting }) => { api("/api/drivers", { method: "PATCH", body: { id: editDriver.id, name: values.name, email: values.email || null, phone: values.phone || null, emiratesId: values.emiratesId || null, licenseNumber: values.licenseNumber || null, nationality: values.nationality || null, emergencyContact: values.emergencyContact || null } }).then(() => { toast.success("Driver updated."); setEditDriver(null); load(); }).catch((err) => toast.error(err.message)).finally(() => setSubmitting(false)); }}>
            {(formik) => (
              <Form noValidate>
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  <div><div className="field"><label className="field-label">Full name *</label><input name="name" className="field-value input" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur} /></div>{formik.touched.name && formik.errors.name && <div className="field-error">{formik.errors.name}</div>}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                    <div><div className="field"><label className="field-label">Email</label><input name="email" className="field-value input" type="email" value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur} /></div>{formik.touched.email && formik.errors.email && <div className="field-error">{formik.errors.email}</div>}</div>
                    <div><div className="field"><label className="field-label">Phone</label><input name="phone" className="field-value input" value={formik.values.phone} onChange={formik.handleChange} onBlur={formik.handleBlur} /></div>{formik.touched.phone && formik.errors.phone && <div className="field-error">{formik.errors.phone}</div>}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                    <div className="field"><label className="field-label">Emirates ID</label><input name="emiratesId" className="field-value input" value={formik.values.emiratesId} onChange={formik.handleChange} /></div>
                    <div className="field"><label className="field-label">License number</label><input name="licenseNumber" className="field-value input" value={formik.values.licenseNumber} onChange={formik.handleChange} /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
                    <div className="field"><label className="field-label">Nationality</label><input name="nationality" className="field-value input" value={formik.values.nationality} onChange={formik.handleChange} /></div>
                    <div className="field"><label className="field-label">Emergency contact</label><input name="emergencyContact" className="field-value input" value={formik.values.emergencyContact} onChange={formik.handleChange} /></div>
                  </div>
                </div>
                <button className="btn-primary" style={{ marginTop: 18, padding: 14, width: "100%", fontSize: 14 }} disabled={formik.isSubmitting}>{formik.isSubmitting ? "Saving…" : "Save changes"}</button>
              </Form>
            )}
          </Formik>
        )}
      </Modal>

      <Modal open={!!removeDriver} onClose={() => setRemoveDriver(null)} title="Remove driver" width={380}>
        {removeDriver && (
          <div>
            <p style={{ fontSize: 13, color: "#6C7A93", fontWeight: 600, marginBottom: 14 }}>Are you sure you want to remove <b>{removeDriver.name}</b>?</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1, padding: 12, fontSize: 14 }} onClick={() => setRemoveDriver(null)}>Cancel</button>
              <button className="btn-danger" style={{ flex: 1, padding: 12, fontSize: 14, background: "#C0392B", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }} onClick={handleRemove}>Remove</button>
            </div>
          </div>
        )}
      </Modal>

      {loading && <div className="page-loading" style={{ minHeight: 280 }}><LoadingIcon /><span>Loading drivers…</span></div>}
      {error && !loading && <div className="page-loading" style={{ minHeight: 280 }}><span style={{ color: "#C0392B" }}>{error}</span><button className="btn-primary" onClick={load}>Retry</button></div>}

      {drivers && !loading && (
        <DataTable columns={columns} data={drivers.drivers} searchPlaceholder="Search name, ID, email…" pageSize={25} emptyMessage="No drivers match." />
      )}

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card section" style={{ padding: "16px 20px", display: "flex", gap: 14, alignItems: "center" }}>
          <div className="stat-icon" style={{ background: "#FEEFE8", color: "#F4531F" }}><BoltIcon /></div>
          <div><div style={{ fontSize: 13.5, fontWeight: 800 }}>Add driver = 30 seconds</div><div style={{ fontSize: 11.5, color: "#6C7A93", fontWeight: 600, marginTop: 2 }}>Name + details → auto-generates VD-ID and default password.</div></div>
        </div>
        <div className="card section" style={{ padding: "16px 20px", display: "flex", gap: 14, alignItems: "center" }}>
          <div className="stat-icon" style={{ background: "#E7F7EF", color: "#0C9D61" }}><ShieldIcon /></div>
          <div><div style={{ fontSize: 13.5, fontWeight: 800 }}>Per-driver accountability</div><div style={{ fontSize: 11.5, color: "#6C7A93", fontWeight: 600, marginTop: 2 }}>Every activation, park and return is stamped with the driver ID.</div></div>
        </div>
      </div>
    </AdminLayout>
  );
}
