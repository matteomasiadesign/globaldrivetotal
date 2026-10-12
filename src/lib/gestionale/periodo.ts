// Periodi per filtri ed export: "tutto", un anno ("2026"), un trimestre ("2026-T3")
// o un mese ("2026-03"). Una sola stringa, così sta anche nell'indirizzo della pagina.

import { MESI } from "./types";

export type Periodo = string;

const RE = /^(\d{4})(?:-(T[1-4]|\d{2}))?$/;

export function parsePeriodo(p: Periodo): { anno: number; trim?: number; mese?: number } | null {
  const m = RE.exec(p);
  if (!m) return null;
  const anno = Number(m[1]);
  if (!m[2]) return { anno };
  if (m[2].startsWith("T")) return { anno, trim: Number(m[2].slice(1)) };
  return { anno, mese: Number(m[2]) };
}

/** Primo e ultimo giorno del periodo ("YYYY-MM-DD"); null = nessun limite. */
export function limitiPeriodo(p: Periodo): { dal: string; al: string } | null {
  const x = parsePeriodo(p);
  if (!x) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const fineMese = (anno: number, mese: number) => pad(new Date(Date.UTC(anno, mese, 0)).getUTCDate());
  if (x.mese) return { dal: `${x.anno}-${pad(x.mese)}-01`, al: `${x.anno}-${pad(x.mese)}-${fineMese(x.anno, x.mese)}` };
  if (x.trim) {
    const da = (x.trim - 1) * 3 + 1;
    const a = da + 2;
    return { dal: `${x.anno}-${pad(da)}-01`, al: `${x.anno}-${pad(a)}-${fineMese(x.anno, a)}` };
  }
  return { dal: `${x.anno}-01-01`, al: `${x.anno}-12-31` };
}

export function inPeriodo(data: string, p: Periodo): boolean {
  const l = limitiPeriodo(p);
  if (!l) return true;
  return Boolean(data) && data.slice(0, 10) >= l.dal && data.slice(0, 10) <= l.al;
}

export function etichettaPeriodo(p: Periodo): string {
  const x = parsePeriodo(p);
  if (!x) return "Tutto il periodo";
  if (x.mese) return `${MESI[x.mese - 1]} ${x.anno}`;
  if (x.trim) return `${x.trim}° trimestre ${x.anno}`;
  return `Anno ${x.anno}`;
}

/** Gli anni presenti nelle date, più quello corrente, dal più recente. */
export function anniDisponibili(date: string[], annoCorrente: number): number[] {
  const anni = new Set<number>([annoCorrente]);
  date.forEach((d) => {
    const a = Number(d?.slice(0, 4));
    if (a > 1990 && a < 2200) anni.add(a);
  });
  return [...anni].sort((a, b) => b - a);
}

export function opzioniPeriodo(anni: number[]): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [{ value: "tutto", label: "Tutto il periodo" }];
  anni.forEach((anno) => {
    out.push({ value: String(anno), label: `Anno ${anno}` });
    [1, 2, 3, 4].forEach((t) => out.push({ value: `${anno}-T${t}`, label: `  ${t}° trimestre ${anno}` }));
    MESI.forEach((m, i) => out.push({ value: `${anno}-${String(i + 1).padStart(2, "0")}`, label: `  ${m} ${anno}` }));
  });
  return out;
}
