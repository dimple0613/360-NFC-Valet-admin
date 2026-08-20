import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Formik, Form } from "formik";
import * as yup from "yup";
import { LogoIcon, EyeIcon, CheckIcon } from "@/components/icons";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";

const SCHEMA = yup.object({
  email: yup.string().email("Enter a valid email address.").required("Work email is required."),
  password: yup.string().required("Password is required."),
});

const SSO_ERRORS = {
  sso_denied: "You denied the sign-in request.",
  sso_missing_code: "The identity provider did not return an authorization code.",
  sso_invalid_state: "The sign-in request did not match. Please try again.",
  sso_not_configured: "SSO is not configured on this server.",
  sso_token_failed: "Could not exchange the code for tokens.",
  sso_no_id_token: "The identity provider did not return an ID token.",
  sso_invalid_token: "The identity provider returned an invalid token.",
  sso_bad_issuer: "The token issuer is not trusted.",
  sso_bad_audience: "The token audience does not match this application.",
  sso_no_email: "The identity provider did not return an email.",
  sso_unknown_user: "No admin account matches this SSO email.",
  sso_failed: "Something went wrong during sign-in.",
};

export default function Login() {
  const router = useRouter();
  const toast = useToast();
  const [showPw, setShowPw] = useState(false);
  const [keep, setKeep] = useState(true);
  const [ssoBusy, setSsoBusy] = useState(false);
  const ssoError = router.query.error;

  useEffect(() => {
    api("/api/dashboard")
      .then(() => router.replace("/dashboard"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (ssoError && SSO_ERRORS[ssoError]) toast.error(SSO_ERRORS[ssoError]);
  }, [ssoError]);

  async function sso() {
    setSsoBusy(true);
    window.location.href = "/api/auth/sso";
  }

  async function onSubmit(values, { setSubmitting }) {
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: { email: values.email, password: values.password, keep },
      });
      toast.success("Signed in. Welcome back!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err.message);
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
            Run every property, driver and NFC card from one console — and see
            the day&apos;s numbers as they happen.
          </div>
          <div className="login-stats">
            <div>
              <div className="login-stat-value">6:40</div>
              <div className="login-stat-label">avg return time</div>
            </div>
            <div>
              <div className="login-stat-value">248</div>
              <div className="login-stat-label">cars today</div>
            </div>
            <div>
              <div className="login-stat-value">31%</div>
              <div className="login-stat-label">offers validated</div>
            </div>
          </div>
        </div>
        <div className="login-footer">© 2026 We Want 360 · Dubai, UAE</div>
      </div>
      <div className="login-right">
        <Formik
          initialValues={{ email: "admin@wewant360.com", password: "" }}
          validationSchema={SCHEMA}
          onSubmit={onSubmit}
        >
          {({ isSubmitting, handleChange, handleBlur, values, errors, touched }) => (
            <Form className="login-form" noValidate>
              <div className="login-title">Welcome back</div>
              <div className="login-desc">Sign in to the operations console.</div>
              <div className="login-fields">
                <div>
                  <div className="login-field">
                    <div style={{ flex: 1 }}>
                      <label className="login-field-label" htmlFor="email">
                        Work email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        className="login-field-input"
                        placeholder="admin@wewant360.com"
                        value={values.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        autoComplete="username"
                      />
                    </div>
                  </div>
                  {touched.email && errors.email && (
                    <div className="field-error">{errors.email}</div>
                  )}
                </div>
                <div>
                  <div className="login-field">
                    <div style={{ flex: 1 }}>
                      <label className="login-field-label" htmlFor="password">
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type={showPw ? "text" : "password"}
                        className="login-field-input dots"
                        placeholder="••••••••••"
                        value={values.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        autoComplete="current-password"
                      />
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPw((v) => !v)}
                    >
                      <EyeIcon />
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <div className="field-error">{errors.password}</div>
                  )}
                </div>
              </div>
              <div className="login-row">
                <button
                  type="button"
                  className="checkbox"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  onClick={() => setKeep((v) => !v)}
                >
                  <div className={`checkbox-box${keep ? " checked" : ""}`}>
                    <CheckIcon />
                  </div>
                  <span className="checkbox-label">Keep me signed in</span>
                </button>
                <Link className="forgot" href="/forgot-password">
                  Forgot password?
                </Link>
              </div>
              <button className="btn-login" disabled={isSubmitting}>
                {isSubmitting ? "Signing in…" : "Sign in"}
              </button>
              <button type="button" className="btn-sso" onClick={sso} disabled={ssoBusy}>
                Sign in with SSO
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
