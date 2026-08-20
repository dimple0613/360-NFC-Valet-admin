import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Formik, Form } from "formik";
import * as yup from "yup";
import AdminLayout from "@/components/layout/AdminLayout";
import { Badge, Select } from "@/components/ui";
import { BuildingIcon, ChevronRight, LoadingIcon, TrashIcon } from "@/components/icons";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";

const POOLS = [100, 200, 400, 800];

const SCHEMA = yup.object({
  name: yup.string().required("Name is required."),
  area: yup.string().required("Area / city is required."),
  zones: yup
    .number()
    .typeError("Zones must be a number.")
    .integer("Zones must be a whole number.")
    .min(1, "Zones must be at least 1.")
    .max(50, "Zones must be at most 50.")
    .required("Zones are required."),
  slots: yup
    .number()
    .typeError("Slots must be a number.")
    .integer("Slots must be a whole number.")
    .min(1, "Slots must be at least 1.")
    .max(5000, "Slots must be at most 5000.")
    .required("Slots are required."),
  cards: yup
    .number()
    .oneOf(POOLS, "Select a card pool.")
    .required("Select a card pool."),
});

function field(formik, name, label, placeholder, type = "text") {
  return (
    <div>
      <div className="field">
        <label className="field-label" htmlFor={`f-${label}`}>
          {label}
        </label>
        <input
          id={`f-${label}`}
          name={name}
          className="field-value input"
          type={type}
          placeholder={placeholder}
          value={formik.values[name]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
      </div>
      {formik.touched[name] && formik.errors[name] && (
        <div className="field-error">{formik.errors[name]}</div>
      )}
    </div>
  );
}

function CreateLocationForm({ nextUid, onCreated }) {
  const toast = useToast();

  async function onSubmit(values, { setSubmitting, resetForm }) {
    try {
      const res = await api("/api/locations", {
        method: "POST",
        body: {
          name: values.name,
          area: values.area,
          zones: Number(values.zones),
          slots: Number(values.slots),
          cards: Number(values.cards),
        },
      });
      toast.success(`${res.name} created — ${res.zonesCount} zones · ${res.slots} slots · ${res.cards} cards.`);
      resetForm();
      onCreated();
    } catch (err) {
      toast.error(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Formik
      initialValues={{ name: "", area: "", zones: 4, slots: 160, cards: 200 }}
      validationSchema={SCHEMA}
      onSubmit={onSubmit}
    >
      {(formik) => (
        <Form id="loc-form" className="card section" style={panelStyle} noValidate>
          <div style={{ fontSize: 16, fontWeight: 800 }}>New location</div>
          <div style={{ fontSize: 12, color: "#6C7A93", fontWeight: 500, marginTop: 4 }}>
            Creates the property, its NFC web page and card pool.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 18 }}>
            {field(formik, "name", "Hotel / Center name", "Marriott Resort Palm Jumeirah")}
            {field(formik, "area", "Area / City", "Palm Jumeirah, Dubai")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
              {field(formik, "zones", "Zones", "4", "number")}
              {field(formik, "slots", "Slots", "160", "number")}
            </div>
            <Select
              value={formik.values.cards}
              onChange={(v) => formik.setFieldValue("cards", v)}
              label="Card pool"
              variant="field"
              options={POOLS.map((n) => ({
                value: n,
                label: `Assign ${n} cards · UID ${nextUid}–${Number(nextUid) + n - 1}`,
              }))}
            />
            <div>
              {formik.touched.cards && formik.errors.cards && (
                <div className="field-error">{formik.errors.cards}</div>
              )}
            </div>
            <div className="field field-row">
              <div>
                <div className="field-label">Guest page URL</div>
                <div className="field-value link" style={{ fontSize: 13.5 }}>
                  tap.360valet.ae/{formik.values.name ? formik.values.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "new-location"}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#0C9D61" }}>✓ free</span>
            </div>
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: 18, padding: 14, width: "100%", fontSize: 14 }}
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? "Creating…" : "Create location"}
          </button>
        </Form>
      )}
    </Formik>
  );
}

function UpdateLocationForm({ location, onUpdated, onRemove }) {
  const toast = useToast();

  async function onSubmit(values, { setSubmitting }) {
    try {
      await api(`/api/locations/${location.id}`, {
        method: "PATCH",
        body: {
          name: values.name,
          area: values.area,
          zones: Number(values.zones),
          slots: Number(values.slots),
          cards: Number(values.cards),
        },
      });
      toast.success("Location updated.");
      await onUpdated();
    } catch (err) {
      toast.error(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Formik
      initialValues={{
        name: location.name,
        area: location.area,
        zones: location.zonesCount,
        slots: location.slots,
        cards: location.cardPool,
      }}
      enableReinitialize
      validationSchema={SCHEMA}
      onSubmit={onSubmit}
    >
      {(formik) => (
        <div id="loc-form" className="card section" style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                className="stat-icon"
                style={{ width: 46, height: 46, borderRadius: 13, background: "#FEEFE8", color: "#F4531F" }}
              >
                <BuildingIcon size={22} color="#F4531F" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Update location</div>
                <div style={{ fontSize: 12, color: "#6C7A93", fontWeight: 600, marginTop: 2 }}>
                  {location.name}
                </div>
              </div>
            </div>
            <button
              type="button"
              title="Remove location"
              onClick={() => onRemove(location)}
              disabled={formik.isSubmitting}
              style={{
                width: 38,
                height: 38,
                borderRadius: 99,
                background: "#FDF0F0",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
              }}
            >
              <TrashIcon size={17} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 18 }}>
            {field(formik, "name", "Hotel / Center name")}
            {field(formik, "area", "Area / City")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
              {field(formik, "zones", "Zones", "4", "number")}
              {field(formik, "slots", "Slots", "160", "number")}
            </div>
            <Select
              value={formik.values.cards}
              onChange={(v) => formik.setFieldValue("cards", v)}
              label="Card pool"
              variant="field"
              options={POOLS.map((n) => ({
                value: n,
                label: `Assign ${n} cards · UID ${location.uidStart}–${Number(location.uidStart) + n - 1}`,
              }))}
            />
            <div>
              {formik.touched.cards && formik.errors.cards && (
                <div className="field-error">{formik.errors.cards}</div>
              )}
            </div>
            <div className="field field-row">
              <div>
                <div className="field-label">Guest page URL</div>
                <div className="field-value link" style={{ fontSize: 13.5 }}>
                  tap.360valet.ae/{formik.values.name ? formik.values.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : location.slug}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#0C9D61" }}>✓ free</span>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: 18, padding: 14, width: "100%", fontSize: 14 }}
            onClick={formik.submitForm}
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? "Saving…" : "Update location"}
          </button>
        </div>
      )}
    </Formik>
  );
}

const panelStyle = {
  width: 360,
  flex: "none",
  alignSelf: "flex-start",
  padding: 24,
  borderRadius: 20,
};

export default function Locations() {
  const router = useRouter();
  const toast = useToast();
  const [properties, setProperties] = useState(null);
  const [nextUid, setNextUid] = useState(8000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = await api("/api/locations");
      setProperties(list);
      setNextUid(list.nextUid);
      return list;
    } catch (err) {
      if (err.status === 401) {
        router.replace("/login");
        return null;
      }
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreated() {
    await load();
  }

  async function handleUpdated() {
    const list = await load();
    if (list && selected) {
      const updated = list.properties.find((p) => p.id === selected.id);
      setSelected(updated || null);
    }
  }

  async function onRemove(loc) {
    if (!window.confirm(`Remove "${loc.name}"? This deletes its zones, cards, offers and order history.`)) return;
    try {
      await api(`/api/locations/${loc.id}`, { method: "DELETE" });
      toast.success(`${loc.name} removed.`);
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <AdminLayout active="/locations">
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1.4, minWidth: 0 }}>
          <div className="header-row">
            <div className="page-title">
              Locations <span className="muted">· {properties ? properties.properties.length : "…"}</span>
            </div>
            <button
              className="btn-primary"
              onClick={() => {
                setSelected(null);
                document.getElementById("loc-form").scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
            >
              + New location
            </button>
          </div>

          {loading && (
            <div className="page-loading" style={{ minHeight: 240 }}>
              <LoadingIcon />
              <span>Loading locations…</span>
            </div>
          )}
          {error && !loading && (
            <div className="page-loading" style={{ minHeight: 240 }}>
              <span style={{ color: "#C0392B" }}>{error}</span>
              <button className="btn-primary" onClick={load}>
                Retry
              </button>
            </div>
          )}
          {properties && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
              {properties.properties.map((l) => {
                const isSel = selected && selected.id === l.id;
                const status = l.overdue > 0 ? `● ${l.overdue} overdue` : "● Live";
                const tone = l.overdue > 0 ? "amber" : "green";
                return (
                  <div
                    key={l.id}
                    className="card section"
                    onClick={() => {
                      setSelected(l);
                      document.getElementById("loc-form").scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }}
                    style={{
                      padding: "18px 20px",
                      display: "flex",
                      gap: 16,
                      alignItems: "center",
                      cursor: "pointer",
                      border: "1px solid #E7EAF0",
                      background: "#fff",
                      transition: "border-color .15s ease, background .15s ease",
                    }}
                  >
                    <div
                      className="stat-icon"
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 15,
                        background: isSel ? "#FEEFE8" : "#F6F7F9",
                        color: isSel ? "#F4531F" : "#48566E",
                        flex: "none",
                      }}
                    >
                      <BuildingIcon size={24} color={isSel ? "#F4531F" : "#48566E"} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 800 }}>{l.name}</div>
                      <div style={{ fontSize: 12, color: "#6C7A93", fontWeight: 600, marginTop: 2 }}>
                        {l.area} · {l.drivers} drivers · {l.zonesCount} zones · {l.slots} slots
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 17, fontWeight: 800 }}>{l.occupied}</div>
                        <div style={{ fontSize: 10.5, color: "#6C7A93", fontWeight: 600 }}>cars today</div>
                      </div>
                      <Badge tone={tone}>{status}</Badge>
                      <ChevronRight />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selected ? (
          <UpdateLocationForm location={selected} onUpdated={handleUpdated} onRemove={onRemove} />
        ) : (
          <CreateLocationForm nextUid={nextUid} onCreated={handleCreated} />
        )}
      </div>
    </AdminLayout>
  );
}
