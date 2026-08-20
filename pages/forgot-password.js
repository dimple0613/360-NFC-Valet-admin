import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Formik, Form } from "formik";
import * as yup from "yup";
import { LogoIcon } from "@/components/icons";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";

const SCHEMA = yup.object({
  email: yup.string().email("Enter a valid email address.").required("Work email is required."),
});

export default function ForgotPassword() {
  const router = useRouter();
  const toast = useToast();
  const [resetUrl, setResetUrl] = useState("");

  useEffect(() => {
    api("/api/dashboard")
      .then(() => router.replace("/dashboard"))
      .catch(() => {});
  }, []);

  async function onSubmit(values, { setSubmitting }) {
    setResetUrl("");
    try {
      const res = await api("/api/auth/forgot-password", { method: "POST", body: { email: values.email } });
      if (res.resetUrl) {
        setResetUrl(res.resetUrl);
      } else {
        toast.success("If that email is registered, a reset link has been sent.");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

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
            Reset your password to get back into the operations console.
          </div>
        </div>
        <div className="login-footer">© 2026 We Want 360 · Dubai, UAE</div>
      </div>
      <div className="login-right">
        <Formik
          initialValues={{ email: "" }}
          validationSchema={SCHEMA}
          onSubmit={onSubmit}
        >
          {({ isSubmitting, handleChange, handleBlur, values, errors, touched }) => (
            <Form className="login-form" noValidate>
              <div className="login-title">Reset your password</div>
              <div className="login-desc">Enter your work email and we&apos;ll send you a reset link.</div>
              {resetUrl && (
                <div className="login-success" role="status">
                  A reset link was generated (email sending is stubbed in development):
                  <div>
                    <Link className="reset-link" href={resetUrl}>
                      Open reset page →
                    </Link>
                  </div>
                </div>
              )}
              <div className="login-fields">
                <div>
                  <div className="field">
                    <label className="field-label" htmlFor="fp-email">
                      Work email
                    </label>
                    <input
                      id="fp-email"
                      name="email"
                      type="email"
                      className="field-value input"
                      placeholder="admin@wewant360.com"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="username"
                    />
                  </div>
                  {touched.email && errors.email && (
                    <div className="field-error">{errors.email}</div>
                  )}
                </div>
              </div>
              <button className="btn-login" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send reset link"}
              </button>
              <Link className="btn-sso back-link" href="/login">
                ← Back to sign in
              </Link>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
