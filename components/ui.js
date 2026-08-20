import React, { useState } from "react";
import { ChevronDown, CheckIcon, XIcon } from "@/components/icons";

export const Badge = ({ tone = "green", children }) => (
  <span className={`badge ${tone}`}>{children}</span>
);

export const Pill = ({ children, muted }) => (
  <div className={`pill ${muted ? "muted-text" : ""}`}>
    {children}
    <span className="chev">
      <ChevronDown />
    </span>
  </div>
);

export const Select = ({
  value,
  options,
  onChange,
  placeholder = "Select…",
  width,
  variant = "box",
  label,
}) => {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) || null;
  return (
    <div className="select" style={width ? { width } : undefined}>
      <button
        type="button"
        className={`select-trigger ${variant}${current ? "" : " empty"}`}
        onClick={() => setOpen((v) => !v)}
      >
        {label ? (
          <span className="select-fields">
            <span className="field-label">{label}</span>
            <span className={current ? "select-value" : "select-value placeholder"}>
              {current ? current.label : placeholder}
            </span>
          </span>
        ) : (
          <span className={current ? "select-value" : "select-value placeholder"}>
            {current ? current.label : placeholder}
          </span>
        )}
        <span className="chev">
          <ChevronDown />
        </span>
      </button>
      {open && (
        <>
          <div className="select-backdrop" onClick={() => setOpen(false)} />
          <div className="select-menu">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`select-item${o.value === value ? " selected" : ""}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <span>{o.label}</span>
                {o.value === value && <CheckIcon size={13} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const StatCard = ({ label, icon, iconBg, iconColor, value, delta, deltaTone = "up" }) => (
  <div className="stat-card">
    <div className="stat-label-row">
      <span className="stat-label">{label}</span>
      <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
    </div>
    <div className="stat-value">{value}</div>
    {delta && <div className={`stat-delta ${deltaTone}`}>{delta}</div>}
  </div>
);

export const SectionTitle = ({ title, right, subtitle }) => (
  <div className="header-row">
    <div>
      <div className="page-title">{title}</div>
      {subtitle && <div className="page-subtitle">{subtitle}</div>}
    </div>
    {right}
  </div>
);

export const Modal = ({ open, onClose, title, subtitle, children, width = 460 }) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{title}</div>
            {subtitle && <div className="modal-sub">{subtitle}</div>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <XIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
