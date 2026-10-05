"use client";

import React from "react";

export function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-adm-muted">{hint}</span>}
    </label>
  );
}

export function Section({
  title,
  columns = 2,
  children,
}: {
  title: string;
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
}) {
  const grid =
    columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-adm-muted">
        {title}
      </h3>
      <div className={`grid grid-cols-1 gap-3 ${grid}`}>{children}</div>
    </section>
  );
}

/** Interruttore on/off. `compact` è la versione piccola da usare nelle righe. */
export function Switch({
  checked,
  onChange,
  label,
  compact = false,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-40 ${
        compact ? "h-5 w-9" : "h-6 w-11"
      } ${checked ? "bg-blue-600" : "bg-white/15"}`}
    >
      <span
        className={`inline-block rounded-full bg-white shadow transition-transform ${
          compact ? "size-4" : "size-5"
        } ${
          checked
            ? compact
              ? "translate-x-4.5"
              : "translate-x-5.5"
            : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/** Riga "titolo + spiegazione + interruttore" per le opzioni dei form. */
export function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-adm-line bg-adm-bg px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-adm-muted">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}
