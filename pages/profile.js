import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Formik, Form } from "formik";
import * as yup from "yup";
import AdminLayout from "@/components/layout/AdminLayout";
import { LoadingIcon } from "@/components/icons";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";

const PROFILE_SCHEMA = yup.object({
  name: yup.string().required("Name is required."),
  email: yup.string().email("Enter a valid email address.").required("Email is required."),
});

const PASSWORD_SCHEMA = yup.object({
  current: yup.string().required("Enter your current password."),
  next: yup
    .string()
    .min(6, "New password must be at least 6 characters.")
    .required("Enter a new password."),
  confirm: yup
    .string()
    .oneOf([yup.ref("next")], "Passwords do not match.")
    .required("Confirm your new password."),
});

export default function Profile() {
  const router = useRouter();
  const toast = useToast();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/me")
      .then((data) => setMe(data))
      .catch((err) => {
        if (err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (router.query.tab === "password" && me) {
      document.getElementById("password-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [router.query.tab, me]);

  async function saveProfile(values, { setSubmitting }) {
    try {
      const res = await api("/api/profile", {
        method: "PUT",
        body: { name: values.name, email: values.email },
      });
      setMe(res);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function changePassword(values, { setSubmitting, resetForm }) {
    try {
      await api("/api/password", {
        method: "PUT",
        body: { current: values.current, next: values.next },
      });
      toast.success("Password changed.");
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout active="/profile">
        <div className="page-loading">
          <LoadingIcon />
          <span>Loading profile…</span>
        </div>
      </AdminLayout>
    );
  }

  if (error || !me) {
    return (
      <AdminLayout active="/profile">
        <div className="page-loading">
          <span style={{ color: "#C0392B" }}>{error || "Failed to load"}</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="/profile">
      <div className="header-row">
        <div className="page-title">Profile</div>
      </div>

      <div style={{ display: "flex", gap: 20, marginTop: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div className="card section" style={{ flex: 1, minWidth: 300, maxWidth: "50%", padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Edit profile</div>
          <div style={{ fontSize: 12, color: "#6C7A93", fontWeight: 500, marginTop: 4 }}>
            Update your name and work email.
          </div>
          <Formik
            initialValues={{ name: me.name, email: me.email }}
            validationSchema={PROFILE_SCHEMA}
            onSubmit={saveProfile}
          >
            {(formik) => (
              <Form noValidate style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 11 }}>
                <div>
                  <div className="field">
                    <label className="field-label" htmlFor="pf-name">Full name</label>
                    <input
                      id="pf-name"
                      name="name"
                      className="field-value input"
                      value={formik.values.name}
                      placeholder="Sara Al Amiri"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                  {formik.touched.name && formik.errors.name && (
                    <div className="field-error">{formik.errors.name}</div>
                  )}
                </div>
                <div>
                  <div className="field">
                    <label className="field-label" htmlFor="pf-email">Work email</label>
                    <input
                      id="pf-email"
                      name="email"
                      className="field-value input"
                      value={formik.values.email}
                      placeholder="admin@wewant360.com"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                  {formik.touched.email && formik.errors.email && (
                    <div className="field-error">{formik.errors.email}</div>
                  )}
                </div>
                <button className="btn-primary" style={{ marginTop: 7, padding: 13, fontSize: 13.5 }} disabled={formik.isSubmitting}>
                  {formik.isSubmitting ? "Saving…" : "Save changes"}
                </button>
              </Form>
            )}
          </Formik>
        </div>

        <div className="card section" id="password-card" style={{ flex: 1, minWidth: 300, maxWidth: "50%", padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Change password</div>
          <div style={{ fontSize: 12, color: "#6C7A93", fontWeight: 500, marginTop: 4 }}>
            Choose a strong password you don&apos;t use elsewhere.
          </div>
          <Formik
            initialValues={{ current: "", next: "", confirm: "" }}
            validationSchema={PASSWORD_SCHEMA}
            onSubmit={changePassword}
          >
            {(formik) => (
              <Form noValidate style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 11 }}>
                <div>
                  <div className="field">
                    <label className="field-label" htmlFor="pw-current">Current password</label>
                    <input
                      id="pw-current"
                      name="current"
                      type="password"
                      className="field-value input dots"
                      value={formik.values.current}
                      placeholder="••••••••••"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      autoComplete="current-password"
                    />
                  </div>
                  {formik.touched.current && formik.errors.current && (
                    <div className="field-error">{formik.errors.current}</div>
                  )}
                </div>
                <div>
                  <div className="field">
                    <label className="field-label" htmlFor="pw-next">New password</label>
                    <input
                      id="pw-next"
                      name="next"
                      type="password"
                      className="field-value input dots"
                      value={formik.values.next}
                      placeholder="••••••••••"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      autoComplete="new-password"
                    />
                  </div>
                  {formik.touched.next && formik.errors.next && (
                    <div className="field-error">{formik.errors.next}</div>
                  )}
                </div>
                <div>
                  <div className="field">
                    <label className="field-label" htmlFor="pw-confirm">Confirm new password</label>
                    <input
                      id="pw-confirm"
                      name="confirm"
                      type="password"
                      className="field-value input dots"
                      value={formik.values.confirm}
                      placeholder="••••••••••"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      autoComplete="new-password"
                    />
                  </div>
                  {formik.touched.confirm && formik.errors.confirm && (
                    <div className="field-error">{formik.errors.confirm}</div>
                  )}
                </div>
                <button className="btn-primary" style={{ marginTop: 7, padding: 13, fontSize: 13.5 }} disabled={formik.isSubmitting}>
                  {formik.isSubmitting ? "Updating…" : "Update password"}
                </button>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </AdminLayout>
  );
}
