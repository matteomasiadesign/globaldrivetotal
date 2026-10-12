// Lettura "tollerante" dei valori dei fogli importati, scritti alla italiana o in
// altri modi comuni. Ogni funzione restituisce null se il valore non si capisce.

/** "Data Operazione" → "data operazione": minuscole, senza accenti né punteggiatura. */
export function normTesto(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/€/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Importo: "1.234,56", "1234,56", "1,234.56", "€ -1.234,56", "1.234,56-", "(1.234,56)", 1234.56.
 * Se ci sono sia punto sia virgola, l'ultimo dei due separa i decimali; con uno solo dei due
 * decide `preferenza` (default italiano: la virgola è decimale, il punto delle migliaia).
 */
export function parseImporto(v: unknown, preferenza: "it" | "en" = "it"): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v ?? "").trim();
  if (!s) return null;
  let negativo = false;
  if (/^\(.*\)$/.test(s)) {
    negativo = true;
    s = s.slice(1, -1);
  }
  if (/-\s*$/.test(s)) {
    negativo = true;
    s = s.replace(/-\s*$/, "");
  }
  s = s.replace(/(eur|euro|€)/gi, "").replace(/\s|'/g, "");
  if (s.startsWith("-")) {
    negativo = !negativo;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) return null;
  const virgola = s.lastIndexOf(",");
  const punto = s.lastIndexOf(".");
  let decimale: "," | "." | null = null;
  if (virgola >= 0 && punto >= 0) decimale = virgola > punto ? "," : ".";
  else if (virgola >= 0) decimale = s.split(",").length === 2 && (preferenza === "it" || s.length - virgola !== 4) ? "," : null;
  else if (punto >= 0) decimale = s.split(".").length === 2 && (preferenza === "en" || s.length - punto !== 4) ? "." : null;
  const migliaia = decimale === "," ? "." : decimale === "." ? "," : virgola >= 0 ? "," : ".";
  s = s.split(migliaia).join("");
  if (decimale) s = s.replace(decimale, ".");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round((negativo ? -n : n) * 100) / 100;
}

const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const pad = (n: number) => String(n).padStart(2, "0");

function dataValida(a: number, m: number, g: number): string | null {
  if (a < 100) a += a < 70 ? 2000 : 1900;
  const d = new Date(Date.UTC(a, m - 1, g));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== g) return null;
  return `${a}-${pad(m)}-${pad(g)}`;
}

/**
 * Data → "YYYY-MM-DD". Numero di serie di Excel, gg/mm/aaaa, gg-mm-aa, gg.mm.aaaa, ISO,
 * "12 ott 2026". Mai mese/giorno all'americana: in Italia il giorno viene prima.
 */
export function parseData(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  if (typeof v === "number") {
    if (v < 1 || v > 80000) return null;
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(v ?? "").trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return dataValida(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/.exec(s);
  if (m) return dataValida(+m[3], +m[2], +m[1]);
  m = /^(\d{1,2})\s+([a-zà-ù]+)\.?\s+(\d{2,4})/i.exec(s);
  if (m) {
    const mese = MESI_BREVI.indexOf(normTesto(m[2]).slice(0, 3));
    if (mese >= 0) return dataValida(+m[3], mese + 1, +m[1]);
  }
  if (/^\d{5}$/.test(s)) return parseData(Number(s));
  return null;
}

export function parseBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  const s = normTesto(v);
  if (!s) return null;
  if (["si", "s", "x", "vero", "true", "1", "yes", "y", "ok"].includes(s)) return true;
  if (["no", "n", "falso", "false", "0"].includes(s)) return false;
  return null;
}

/** "22%", "22", "0,22" → 0.22. */
export function parsePercento(v: unknown): number | null {
  const n = parseImporto(String(v ?? "").replace("%", ""));
  if (n === null) return null;
  return n > 1 ? n / 100 : n;
}

export const normTarga = (s: unknown) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Solo cifre, senza prefisso internazionale italiano. */
export function normTelefono(s: unknown): string {
  const cifre = String(s ?? "").replace(/\D/g, "");
  return cifre.startsWith("0039") ? cifre.slice(4) : cifre.startsWith("39") && cifre.length > 10 ? cifre.slice(2) : cifre;
}

/** Somiglianza tra due testi (coefficiente di Dice sui bigrammi), da 0 a 1. */
export function somiglianza(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrammi = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return m;
  };
  const ba = bigrammi(a);
  const bb = bigrammi(b);
  let comuni = 0;
  ba.forEach((n, g) => (comuni += Math.min(n, bb.get(g) ?? 0)));
  return (2 * comuni) / (a.length - 1 + (b.length - 1));
}
