import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Formik, Form } from "formik";
import * as yup from "yup";
import { LogoIcon } from "@/components/icons";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";

const SCHEMA = yup.object({
  token: yup.string().required("Reset token is required."),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters.")
    .required("New password is required."),
});

export default function ResetPassword() {
  const router = useRouter();
  const toast = useToast();
  const [token, setToken] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (router.query.token) setToken(String(router.query.token));
  }, [router.query.token]);

  async function onSubmit(values, { setSubmitting }) {
    try {
      await api("/api/auth/reset-password", { method: "POST", body: { token: values.token, password: values.password } });
      setDone(true);
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
            Choose a new password, then sign back in.
          </div>
        </div>
        <div className="login-footer">© 2026 We Want 360 · Dubai, UAE</div>
      </div>
      <div className="login-right">
        <Formik
          initialValues={{ token, password: "" }}
          enableReinitialize
          validationSchema={SCHEMA}
          onSubmit={onSubmit}
        >
          {({ isSubmitting, handleChange, handleBlur, values, errors, touched }) => (
            <Form className="login-form" noValidate>
              <div className="login-title">Set a new password</div>
              <div className="login-desc">It must be at least 6 characters.</div>
              {done && (
                <div className="login-success" role="status">
                  Password updated.{" "}
                  <Link className="reset-link" href="/login">
                    Sign in →
                  </Link>
                </div>
              )}
              {!done && (
                <>
                  <div className="login-fields">
                    <div>
                      <div className="field">
                        <label className="field-label" htmlFor="rp-token">
                          Reset token
                        </label>
                        <input
                          id="rp-token"
                          name="token"
                          type="text"
                          className="field-value input"
                          placeholder="Paste the token from your email"
                          value={values.token}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      </div>
                      {touched.token && errors.token && (
                        <div className="field-error">{errors.token}</div>
                      )}
                    </div>
                    <div>
                      <div className="field">
                        <label className="field-label" htmlFor="rp-pw">
                          New password
                        </label>
                        <input
                          id="rp-pw"
                          name="password"
                          type="password"
                          className="field-value input"
                          placeholder="••••••••••"
                          value={values.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          autoComplete="new-password"
                        />
                      </div>
                      {touched.password && errors.password && (
                        <div className="field-error">{errors.password}</div>
                      )}
                    </div>
                  </div>
                  <button className="btn-login" disabled={isSubmitting}>
                    {isSubmitting ? "Updating…" : "Update password"}
                  </button>
                  <Link className="btn-sso back-link" href="/login">
                    ← Back to sign in
                  </Link>
                </>
              )}
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
