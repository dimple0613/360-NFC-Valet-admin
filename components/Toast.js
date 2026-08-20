import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckIcon, AlertIcon } from "@/components/icons";

const ToastContext = createContext(null);

let toastSeq = 0;

function CloseIcon({ size = 12, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.6"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback((type, message) => {
    const id = ++toastSeq;
    setToasts((list) => [...list.slice(-3), { id, type, message }]);
    timers.current[id] = setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const toast = {
    success: (msg) => push("success", msg),
    error: (msg) => push("error", msg),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === "success" ? "toast-success" : "toast-error"}`}>
            <div className="toast-icon">
              {t.type === "success" ? <CheckIcon size={12} /> : <AlertIcon size={15} color="#E23D3D" />}
            </div>
            <div className="toast-msg">{t.message}</div>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
            >
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
