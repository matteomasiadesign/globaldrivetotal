"use client";

import React from "react";
import { opzioniPeriodo, type Periodo } from "@/lib/gestionale/periodo";
import { inputCls } from "./styles";

/** Scelta del periodo: tutto, anno, trimestre o mese (vedi lib/gestionale/periodo). */
export function PeriodoSelect({
  value,
  onChange,
  anni,
  label = "Periodo",
  className = `${inputCls} sm:w-52`,
}: {
  value: Periodo;
  onChange: (p: Periodo) => void;
  anni: number[];
  label?: string;
  className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={className}>
      {opzioniPeriodo(anni).map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Scelta del solo anno (IVA, Analisi): non cambia l'anno di gestione delle Impostazioni. */
export function AnnoSelect({
  value,
  onChange,
  anni,
  className = `${inputCls} w-auto`,
}: {
  value: number;
  onChange: (anno: number) => void;
  anni: number[];
  className?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label="Anno" className={className}>
      {anni.map((a) => (
        <option key={a} value={a}>
          {a}
        </option>
      ))}
    </select>
  );
}
