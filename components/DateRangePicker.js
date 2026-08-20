import React, { useState } from "react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { ChevronDown } from "@/components/icons";

const PRESETS = [
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseISO(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function DateRangePicker({ from, to, onChange, align = "end" }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(() =>
    from && to ? { from: parseISO(from), to: parseISO(to) } : undefined
  );

  const today = new Date();
  const label =
    sel?.from && sel?.to
      ? `${format(sel.from, "d MMM yyyy")} – ${format(sel.to, "d MMM yyyy")}`
      : "Pick a date";

  function applyPreset(days) {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const f = new Date(t.getTime() - (days - 1) * 86400000);
    setSel({ from: f, to: t });
    onChange(iso(f), iso(t));
    setOpen(false);
  }

  function handleSelect(next) {
    setSel(next);
    if (next?.from && next?.to) {
      onChange(iso(next.from), iso(next.to));
      setOpen(false);
    }
  }

  return (
    <div className="drp">
      <button type="button" className="drp-trigger" onClick={() => setOpen((v) => !v)}>
        <span className="drp-label">{label}</span>
        <ChevronDown size={13} color="#6C7A93" />
      </button>
      {open && (
        <>
          <div className="drp-backdrop" onClick={() => setOpen(false)} />
          <div className={`drp-popover align-${align}`}>
            <div className="drp-presets">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="drp-preset"
                  onClick={() => applyPreset(p.days)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="drp-calendar">
              <DayPicker
                mode="range"
                selected={sel}
                onSelect={handleSelect}
                numberOfMonths={2}
                defaultMonth={sel?.from || today}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
