import type { Colonna, Foglio, Formato, Valore } from "./types";

// Scrittura dei file. Il CSV è pensato per Excel in italiano: BOM UTF-8, separatore
// ";", virgola decimale, date gg/mm/aaaa. L'Excel vero (.xlsx) usa SheetJS, caricato
// solo quando si preme il pulsante: importi e date sono numeri veri (si possono
// sommare e filtrare) e la riga TOTALE è una formula SUBTOTALE che segue i filtri.

const ISO = /^(\d{4})-(\d{2})-(\d{2})/;

/** "2026-03-15" → "15/03/2026"; altro testo invariato. */
export function dataIt(v: string): string {
  const m = ISO.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

const numIt = (n: number, decimali: number) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: decimali, maximumFractionDigits: decimali, useGrouping: false });

// Un testo che inizia con = + - @ verrebbe eseguito da Excel come formula.
const sicuro = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);

function testoCella(v: Valore, formato: Formato = "testo"): string {
  if (v === null || v === undefined || v === "") return "";
  switch (formato) {
    case "euro":
    case "numero":
      return typeof v === "number" ? numIt(v, 2) : String(v);
    case "intero":
      return typeof v === "number" ? numIt(v, 0) : String(v);
    case "percento":
      return typeof v === "number" ? `${numIt(v * 100, 1)}%` : String(v);
    case "data":
      return dataIt(String(v));
    case "sino":
      return v ? "Sì" : "No";
    default:
      return sicuro(String(v));
  }
}

const csvCampo = (s: string) => (/[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

function totali<T>(f: Foglio<T>): (number | null)[] | null {
  if (!f.colonne.some((c) => c.totale)) return null;
  return f.colonne.map((c) =>
    c.totale ? f.righe.reduce((s, r) => s + (Number(c.valore(r)) || 0), 0) : null
  );
}

export function toCsv(f: Foglio): string {
  const righe: string[][] = [];
  f.intro?.forEach((t) => righe.push([sicuro(t)]));
  if (f.intro?.length) righe.push([]);
  righe.push(f.colonne.map((c) => c.titolo));
  f.righe.forEach((r) => righe.push(f.colonne.map((c) => testoCella(c.valore(r), c.formato))));
  const tot = totali(f);
  if (tot) righe.push(tot.map((t, i) => (i === 0 && t === null ? "TOTALE" : t === null ? "" : numIt(t, 2))));
  return "﻿" + righe.map((r) => r.map(csvCampo).join(";")).join("\r\n") + "\r\n";
}

export function scaricaBlob(blob: Blob, nomeFile: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function scaricaCsv(f: Foglio, nomeBase: string) {
  scaricaBlob(new Blob([toCsv(f)], { type: "text/csv;charset=utf-8" }), `${nomeBase}.csv`);
}

/** Nome file pulito: "GlobalDrive_Movimenti_2026-T1". */
export function nomeFile(...parti: (string | number | undefined)[]): string {
  return ["GlobalDrive", ...parti]
    .filter((p) => p !== undefined && p !== "")
    .map((p) => String(p).replace(/[^\w\-]+/g, "_"))
    .join("_");
}

// --- Excel ------------------------------------------------------------------

const FORMATO_XLSX: Partial<Record<Formato, string>> = {
  euro: '#,##0.00 "€";-#,##0.00 "€"',
  numero: "#,##0.00",
  intero: "#,##0",
  percento: "0.0%",
  data: "dd/mm/yyyy",
};

/** "YYYY-MM-DD" → numero di serie di Excel (giorni dal 30/12/1899), senza fusi orari. */
function serialeExcel(iso: string): number | null {
  const m = ISO.exec(iso);
  if (!m) return null;
  return (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

type Cella = { t: "s" | "n" | "b"; v: string | number | boolean; z?: string; f?: string };

function cella<T>(c: Colonna<T>, v: Valore): Cella | null {
  if (v === null || v === undefined || v === "") return null;
  const formato = c.formato ?? "testo";
  if (formato === "data") {
    const n = serialeExcel(String(v));
    return n === null ? { t: "s", v: String(v) } : { t: "n", v: n, z: FORMATO_XLSX.data };
  }
  if (formato === "sino") return { t: "s", v: v ? "Sì" : "No" };
  if (typeof v === "number" && formato !== "testo") return { t: "n", v, z: FORMATO_XLSX[formato] };
  return { t: "s", v: String(v) };
}

// Lettera di colonna Excel (0 → A, 26 → AA).
function lettera(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export async function scaricaXlsx(fogli: Foglio[], nomeBase: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const usati = new Set<string>();

  fogli.forEach((f) => {
    const ws: Record<string, unknown> = {};
    let r = 0;
    f.intro?.forEach((t) => {
      ws[`A${r + 1}`] = { t: "s", v: t };
      r++;
    });
    if (f.intro?.length) r++;
    const intestazione = r;
    f.colonne.forEach((c, i) => (ws[`${lettera(i)}${r + 1}`] = { t: "s", v: c.titolo }));
    r++;
    const primaDati = r;
    f.righe.forEach((riga) => {
      f.colonne.forEach((c, i) => {
        const x = cella(c, c.valore(riga));
        if (x) ws[`${lettera(i)}${r + 1}`] = x;
      });
      r++;
    });
    const ultimaDati = r - 1;
    const tot = totali(f);
    if (tot && f.righe.length > 0) {
      f.colonne.forEach((c, i) => {
        const col = lettera(i);
        if (c.totale) {
          ws[`${col}${r + 1}`] = {
            t: "n",
            v: tot[i] ?? 0,
            f: `SUBTOTAL(9,${col}${primaDati + 1}:${col}${ultimaDati + 1})`,
            z: FORMATO_XLSX[c.formato ?? "euro"] ?? FORMATO_XLSX.euro,
          };
        } else if (i === 0) {
          ws[`${col}${r + 1}`] = { t: "s", v: "TOTALE" };
        }
      });
      r++;
    }
    const ultimaColonna = lettera(Math.max(0, f.colonne.length - 1));
    ws["!ref"] = `A1:${ultimaColonna}${Math.max(1, r)}`;
    if (f.righe.length > 0) ws["!autofilter"] = { ref: `A${intestazione + 1}:${ultimaColonna}${ultimaDati + 1}` };
    ws["!cols"] = f.colonne.map((c) => ({ wch: c.larghezza ?? Math.max(10, Math.min(40, c.titolo.length + 2)) }));

    // Nome del foglio: massimo 31 caratteri, senza caratteri vietati, unico.
    let nome = f.nome.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Foglio";
    for (let n = 2; usati.has(nome); n++) nome = `${f.nome.slice(0, 27)} (${n})`;
    usati.add(nome);
    XLSX.utils.book_append_sheet(wb, ws as never, nome);
  });

  const dati = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  scaricaBlob(
    new Blob([dati], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${nomeBase}.xlsx`
  );
}
