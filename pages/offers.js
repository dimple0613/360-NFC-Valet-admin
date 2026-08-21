import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Formik, Form } from "formik";
import * as yup from "yup";
import AdminLayout from "@/components/layout/AdminLayout";
import { Select, Modal } from "@/components/ui";
import { LoadingIcon } from "@/components/icons";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";
import { useSocket } from "@/hooks/useSocket";

const GUEST_BASE = process.env.NEXT_PUBLIC_GUEST_BASE || "http://localhost:3001";
const GUEST_SAMPLE_UID = process.env.NEXT_PUBLIC_GUEST_SAMPLE_UID || "7001";

const SCHEMA = yup.object({
  title: yup.string().required("Title is required."),
  category: yup.string().required("Category is required."),
  price: yup
    .number()
    .typeError("Price must be a number.")
    .min(1, "Price must be at least 1.")
    .required("Price is required."),
  desc: yup.string(),
});

export default function Offers() {
  const router = useRouter();
  const toast = useToast();
  const [offers, setOffers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [property, setProperty] = useState("all");
  const [properties, setProperties] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [dragOver, setDragOver] = useState(null);

  const { connected } = useSocket({
    "offer.updated": () => load(),
  }, load);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [offerData, propData] = await Promise.all([
        api(`/api/offers?property=${property}`),
        properties.length ? Promise.resolve({ properties }) : api("/api/dashboard?days=1&property=all"),
      ]);
      setOffers(offerData);
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
  }, [property]);

  const categories = useMemo(() => {
    if (!offers) return [];
    return [...new Set(offers.offers.map((o) => o.category))];
  }, [offers]);

  const featuredOffers = useMemo(() => {
    const bySlot = {};
    (offers?.offers || []).forEach((o) => {
      if (o.featured === 1 || o.featured === 2) bySlot[o.featured] = o;
    });
    return bySlot;
  }, [offers]);

  async function setFeatured(id, slot) {
    try {
      await api(`/api/offers/${id}`, { method: "PATCH", body: { featured: slot } });
      toast.success(slot ? "Offer featured on guest page." : "Offer removed from featured.");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function onDrop(slot, e) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) setFeatured(Number(id), slot);
  }

  const filtered = useMemo(() => {
    if (!offers) return [];
    if (filter === "All") return offers.offers;
    return offers.offers.filter((o) => o.category === filter);
  }, [offers, filter]);

  async function toggle(o) {
    const live = o.live ? false : true;
    try {
      await api(`/api/offers/${o.id}`, {
        method: "PATCH",
        body: { live, draft: false },
      });
      toast.success(live ? `${o.title} is live.` : `${o.title} is hidden.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function onSubmit(values, { setSubmitting, resetForm }) {
    try {
      await api("/api/offers", {
        method: "POST",
        body: {
          title: values.title,
          category: values.category,
          price: Number(values.price),
          desc: values.desc,
          propertyId: property !== "all" ? Number(property) : undefined,
        },
      });
      toast.success("Offer created.");
      resetForm();
      setShowNew(false);
      load();
    } catch (err) {
      toast.error(err.message);
      setSubmitting(false);
    }
  }

  async function toggleDraft(o) {
    try {
      await api(`/api/offers/${o.id}`, { method: "PATCH", body: { draft: !o.draft, live: o.draft ? true : false } });
      toast.success(o.draft ? `${o.title} published.` : `${o.title} moved to draft.`);
      load();
    } catch (err) { toast.error(err.message); }
  }

  return (
    <AdminLayout active="/offers">
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1.5, minWidth: 0 }}>
          <div className="header-row">
            <div className="page-title">
              Offers &amp; promotions{" "}
              <span className="muted">· {property === "all" ? "All properties" : properties.find((p) => p.id === Number(property))?.name || ""}</span>
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
              <button className="btn-primary" onClick={() => setShowNew(true)}>
                + New offer
              </button>
            </div>
          </div>

          <Modal open={showNew} onClose={() => setShowNew(false)} title="New offer" width={400} subtitle="Publishes the offer to the guest page immediately.">
            <Formik
              initialValues={{ title: "", category: "Dining", price: 100, desc: "" }}
              validationSchema={SCHEMA}
              onSubmit={onSubmit}
            >
              {(formik) => (
                <Form noValidate>
                  <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                    <div>
                      <div className="field">
                        <label className="field-label" htmlFor="off-title">Title</label>
                        <input
                          id="off-title"
                          name="title"
                          className="field-value input"
                          value={formik.values.title}
                          placeholder="Friday Brunch at Kitchen6"
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </div>
                      {formik.touched.title && formik.errors.title && (
                        <div className="field-error">{formik.errors.title}</div>
                      )}
                    </div>
                    <div>
                      <Select
                        value={formik.values.category}
                        onChange={(c) => formik.setFieldValue("category", c)}
                        label="Category"
                        variant="field"
                        options={["Dining", "Spa", "Deals", "Stay", "Gym", "Entertainment"].map((c) => ({
                          value: c,
                          label: c,
                        }))}
                      />
                      {formik.touched.category && formik.errors.category && (
                        <div className="field-error">{formik.errors.category}</div>
                      )}
                    </div>
                    <div>
                      <div className="field">
                        <label className="field-label" htmlFor="off-price">Price (AED)</label>
                        <input
                          id="off-price"
                          name="price"
                          className="field-value input"
                          type="number"
                          min="1"
                          value={formik.values.price}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </div>
                      {formik.touched.price && formik.errors.price && (
                        <div className="field-error">{formik.errors.price}</div>
                      )}
                    </div>
                    <div>
                      <div className="field">
                        <label className="field-label" htmlFor="off-desc">Description</label>
                        <input
                          id="off-desc"
                          name="desc"
                          className="field-value input"
                          value={formik.values.desc}
                          placeholder="Unlimited brunch with live stations"
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                      </div>
                      {formik.touched.desc && formik.errors.desc && (
                        <div className="field-error">{formik.errors.desc}</div>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ marginTop: 18, padding: 14, width: "100%", fontSize: 14 }}
                    disabled={formik.isSubmitting}
                  >
                    {formik.isSubmitting ? "Creating…" : "Create & publish"}
                  </button>
                </Form>
              )}
            </Formik>
          </Modal>

          <div className="filter-pills" style={{ marginTop: 16 }}>
            <span
              key="All"
              className={`filter-pill ${filter === "All" ? "active" : "inactive"}`}
              onClick={() => setFilter("All")}
            >
              All · {offers ? offers.offers.length : "…"}
            </span>
            {categories.map((c) => (
              <span
                key={c}
                className={`filter-pill ${filter === c ? "active" : "inactive"}`}
                onClick={() => setFilter(c)}
              >
                {c} · {offers ? offers.offers.filter((o) => o.category === c).length : "…"}
              </span>
            ))}
          </div>

          {loading && (
            <div className="page-loading" style={{ minHeight: 280 }}>
              <LoadingIcon />
              <span>Loading offers…</span>
            </div>
          )}
          {error && !loading && (
            <div className="page-loading" style={{ minHeight: 280 }}>
              <span style={{ color: "#C0392B" }}>{error}</span>
              <button className="btn-primary" onClick={load}>Retry</button>
            </div>
          )}

          {offers && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 16 }}>
              {filtered.map((o) => (
                <div
                  key={o.id}
                  className={`card section ${o.live ? "" : "offer-row dim"}`}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", String(o.id))}
                  style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 18px", cursor: "grab" }}
                >
                  <div className="offer-thumb">
                    <span>img</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="offer-title">
                      {o.title}
                      {o.featured && <span className="badge badge-tag-featured orange">FEATURED #{o.featured}</span>}
                    </div>
                    <div className="offer-sub">
                      {o.category} · AED {o.price}
                      {o.validatesValet ? " · validates valet" : ""}
                      {o.endsOn ? ` · ends ${o.endsOn.slice(0, 10)}` : ""}
                    </div>
                  </div>
                  <div className="offer-views">
                    <div className="offer-views-value">
                      {o.draft ? "—" : o.views7d.toLocaleString()}
                    </div>
                    <div className="offer-views-label">{o.draft ? "draft — not visible to guests" : "views · 7d"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {o.draft && (
                      <button className="badge" style={{ cursor: "pointer", border: "none", fontSize: 11, fontWeight: 700, background: "#E7F7EF", color: "#0C9D61", padding: "4px 10px", borderRadius: 6 }}
                        onClick={(e) => { e.stopPropagation(); toggleDraft(o); }}>
                        Publish
                      </button>
                    )}
                    {!o.draft && o.live && (
                      <button className="badge" style={{ cursor: "pointer", border: "none", fontSize: 11, fontWeight: 700, background: "#FDF3E3", color: "#B97B17", padding: "4px 10px", borderRadius: 6 }}
                        onClick={(e) => { e.stopPropagation(); toggleDraft(o); }}>
                        Unpublish
                      </button>
                    )}
                    <div className={`toggle ${o.live ? "on" : "off"}`} onClick={() => toggle(o)} style={{ cursor: "pointer" }}>
                      <div className="toggle-knob" />
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="card section" style={{ padding: 20 }}>
                  <span style={{ color: "#6C7A93", fontSize: 12.5, fontWeight: 600 }}>No offers in this category.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="card section"
          style={{ width: 330, flex: "none", alignSelf: "flex-start", borderRadius: 20, padding: 20 }}
        >
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>Guest page preview</div>
          <div style={{ fontSize: 11, color: "#6C7A93", fontWeight: 600, marginTop: 2 }}>
            Exactly what a card tap shows, live.
          </div>
          <div style={{ marginTop: 14, border: "1.5px solid #E7EAF0", borderRadius: 18, overflow: "hidden" }}>
            <div style={{ height: 92, background: "#F1F3F6", borderBottom: "1px dashed #C3CAD6", display: "flex", alignItems: "center", justifyContent: "center", color: "#9AA6BC", fontSize: 11, fontWeight: 700 }}>
              Banner slot
            </div>
            <div style={{ padding: "10px 12px" }}>
              <a
                href={`${GUEST_BASE}/t/${GUEST_SAMPLE_UID}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  height: 34,
                  borderRadius: 99,
                  background: "linear-gradient(135deg,#F4531F,#FF8A50)",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  textDecoration: "none",
                  boxShadow: "0 6px 16px rgba(244,83,31,.28)",
                }}
                title="Open the live guest page"
              >
                Bring my car
              </a>
              <div style={{ display: "flex", gap: 5, marginTop: 9 }}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 30,
                      borderRadius: 9,
                      background: i === 0 ? "#FEEFE8" : "#F6F7F9",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
                {[1, 2].map((slot) => {
                  const f = featuredOffers[slot];
                  const isOver = dragOver === slot;
                  return (
                    <div
                      key={slot}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(slot);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => onDrop(slot, e)}
                      onClick={() => f && setFeatured(f.id, null)}
                      title={f ? "Click to remove from featured" : "Drag an offer here"}
                      style={{
                        flex: 1,
                        height: 52,
                        borderRadius: 11,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 8px",
                        fontSize: 10,
                        fontWeight: 800,
                        textAlign: "center",
                        background: f ? "#FEEFE8" : "#F1F3F6",
                        border: f ? "1.5px solid #F4A47E" : "1.5px dashed #C3CAD6",
                        color: f ? "#D6430F" : "#9AA6BC",
                        cursor: f ? "pointer" : "grab",
                        outline: isOver ? "2px solid #F4531F" : "none",
                        transition: "outline 0.1s ease",
                      }}
                    >
                      {f ? f.title : `Featured ${slot === 1 ? "#1" : "#2"}`}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#6C7A93", fontWeight: 600, marginTop: 12, lineHeight: 1.6 }}>
            Drag offers into the two featured boxes. Banner, categories and
            listings update on guests&apos; phones immediately.
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
