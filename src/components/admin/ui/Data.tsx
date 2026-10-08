"use client";

import React from "react";
import Link from "next/link";
import { Pill, type PillTone } from "./Layout";
import type { Servizio, Stato } from "@/lib/gestionale/types";

/** Verde se positivo, rosso se negativo: per margini e risultati. */
export const signedText = (n: number | null | undefined) =>
  (n ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400";

const STATO_TONE: Record<Stato, PillTone> = {
  "In valutazione": "slate",
  Acquistata: "slate",
  "In preparazione": "amber",
  "In vendita": "blue",
  Prenotata: "amber",
  Venduta: "green",
  Archiviata: "slate",
};

export function StatoPill({ stato }: { stato: Stato }) {
  return (
    <Pill tone={STATO_TONE[stato]} dot>
      {stato}
    </Pill>
  );
}

const SERVIZIO_LABEL: Record<Servizio, string> = {
  "Vendita diretta": "Vendita diretta",
  "Conto vendita": "Conto vendita",
  "Auto su commissione": "Su commissione",
};

export function ServizioTag({ servizio }: { servizio: Servizio }) {
  return <span className="text-xs font-medium text-adm-muted">{SERVIZIO_LABEL[servizio]}</span>;
}

/** Riquadro con una cifra: costo totale, da incassare, ecc. */
export function Stat({
  label,
  value,
  hint,
  tone,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** Classe di colore del valore, es. `signedText(x)`. */
  tone?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-sm text-adm-muted">{label}</p>
      <p className={`mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl ${tone ?? "text-white"}`}>{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-adm-muted">{hint}</p>}
    </>
  );
  const cls = "min-w-0 rounded-xl border border-adm-line bg-adm-surface p-4";
  return href ? (
    <Link href={href} className={`${cls} block transition-colors hover:border-white/20`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Riga "etichetta … valore" dei riepiloghi (conto economico, liquidazione). */
export function SummaryRow({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <span className="text-adm-muted">{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold" : ""} ${tone ?? "text-slate-100"}`}>
        {value}
      </span>
    </div>
  );
}

/** Nota a margine, per i promemoria fiscali. */
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-adm-line bg-adm-surface px-4 py-3 text-xs leading-relaxed text-adm-muted">
      {children}
    </p>
  );
}
