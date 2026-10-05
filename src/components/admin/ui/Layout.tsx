"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-adm-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Riquadro con titolo e, a destra, un link o pulsante opzionale. */
export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-adm-line bg-adm-surface">
      <header className="flex items-center justify-between gap-3 border-b border-adm-line px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export interface TabOption<T extends string> {
  id: T;
  label: string;
  count?: number;
  /** Evidenzia il numero: c'è qualcosa che richiede attenzione. */
  alert?: boolean;
}

export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: TabOption<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-adm-line bg-adm-bg p-1"
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-adm-raised text-white shadow-sm"
                : "text-adm-muted hover:text-white"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  tab.alert && tab.count > 0
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-slate-300"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-adm-line px-6 py-14 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-white/5 text-adm-muted">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-medium text-white">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-adm-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

const PILL_TONES = {
  blue: "bg-blue-500/15 text-blue-300",
  amber: "bg-amber-500/15 text-amber-300",
  green: "bg-emerald-500/15 text-emerald-300",
  red: "bg-rose-500/15 text-rose-300",
  slate: "bg-white/8 text-slate-300",
} as const;

export type PillTone = keyof typeof PILL_TONES;

export function Pill({
  tone = "slate",
  dot = false,
  children,
}: {
  tone?: PillTone;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${PILL_TONES[tone]}`}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
