// Formule del gestionale: costo totale, margine, IVA, ROI, liquidazione trimestrale,
// avvisi. Funzioni pure (niente React, niente storage): ricalcano il foglio Excel
// originale del titolare, quindi cambiarle significa cambiare i conti.

import { fromDateStr } from "@/lib/admin/dates";
import type { CarStatus } from "@/types/car";
import type { Avviso, Impostazioni, Movimento, Stato, Veicolo } from "./types";

// --- Formattazione -------------------------------------------------------

/** "1.234,50 €" — qui servono i centesimi (a differenza di `eur` dell'admin). */
export function euro(n: number | null | undefined) {
  return (Number(n) || 0).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });
}

export function percento(n: number | null | undefined) {
  return (Number(n) || 0).toLocaleString("it-IT", { style: "percent", maximumFractionDigits: 1 });
}

// --- Date ----------------------------------------------------------------
// Le date sono "YYYY-MM-DD": si leggono dalla stringa, senza passare da Date,
// così il fuso orario non può spostare un movimento di giorno.

export function annoNum(data: string): number | null {
  return /^\d{4}-\d{2}-\d{2}/.test(data) ? Number(data.slice(0, 4)) : null;
}
export function meseNum(data: string): number | null {
  return /^\d{4}-\d{2}-\d{2}/.test(data) ? Number(data.slice(5, 7)) : null;
}
export function trimestre(data: string): number | null {
  const m = meseNum(data);
  return m === null ? null : Math.ceil(m / 3);
}

// --- Auto del catalogo ⇄ scheda economica -----------------------------------

export function nomeVeicolo(v: Pick<Veicolo, "marca" | "modello" | "targa">) {
  const base = [v.marca, v.modello].filter(Boolean).join(" ");
  return [base, v.targa].filter(Boolean).join(" · ") || "Auto senza nome";
}

/** Come lo stato della scheda economica si riflette sul catalogo pubblico. */
export function catalogoDaStato(stato: Stato): { status: CarStatus; hidden?: boolean } {
  switch (stato) {
    case "In vendita":
      return { status: "Disponibile", hidden: false };
    case "Prenotata":
      return { status: "In Trattativa", hidden: false };
    case "Venduta":
      return { status: "Venduta" };
    case "Archiviata":
    case "In valutazione":
    case "Acquistata":
    case "In preparazione":
      return { status: "Disponibile", hidden: true };
  }
}

export function statoDaCatalogo(status: CarStatus): Stato {
  if (status === "In Trattativa") return "Prenotata";
  if (status === "Venduta") return "Venduta";
  return "In vendita";
}

// --- Conti per auto ------------------------------------------------------

// Costi diretti: uscite "Variabile diretto auto" collegate all'auto, esclusa
// la categoria "Acquisto veicolo" (è già nel prezzo di acquisto).
export function costiDiretti(veicoloId: string, movimenti: Movimento[]) {
  return movimenti
    .filter(
      (m) =>
        m.autoId === veicoloId &&
        m.tipo === "Uscita" &&
        m.naturaCosto === "Variabile diretto auto" &&
        m.categoria !== "Acquisto veicolo"
    )
    .reduce((s, m) => s + (Number(m.totale) || 0), 0);
}

export function computeVeicolo(
  v: Veicolo,
  movimenti: Movimento[],
  impostazioni: Impostazioni,
  oggi: string
) {
  const cd = costiDiretti(v.id, movimenti);
  const isContoVendita = v.servizio === "Conto vendita";
  const costoTotale = isContoVendita ? cd : (Number(v.prezzoAcquisto) || 0) + cd;

  const hasVendita = v.prezzoVendita !== null && v.prezzoVendita !== undefined && v.prezzoVendita !== 0;
  const prezzoVendita = hasVendita ? (v.prezzoVendita as number) : 0;

  const commissioneImponibile =
    isContoVendita && hasVendita ? prezzoVendita * v.commissionePercentuale : null;
  const ivaCommissione =
    commissioneImponibile !== null ? commissioneImponibile * impostazioni.aliquotaIva : null;
  const totaleFatturaIntermediazione =
    commissioneImponibile !== null ? commissioneImponibile + (ivaCommissione || 0) : null;

  const margineGestionale = isContoVendita
    ? commissioneImponibile !== null
      ? commissioneImponibile - cd
      : null
    : hasVendita
      ? prezzoVendita - costoTotale
      : null;

  const margineRegimeIva =
    !isContoVendita && hasVendita
      ? Math.max(0, prezzoVendita - (Number(v.prezzoAcquisto) || 0))
      : null;
  const ivaRegimeMargine =
    margineRegimeIva !== null
      ? margineRegimeIva * (impostazioni.aliquotaIva / (1 + impostazioni.aliquotaIva))
      : null;

  const risultatoDopoIva = isContoVendita
    ? margineGestionale
    : margineGestionale !== null
      ? margineGestionale - (ivaRegimeMargine || 0)
      : null;

  const roi = risultatoDopoIva !== null && costoTotale ? risultatoDopoIva / costoTotale : null;

  let giorniStock: number | null = null;
  if (v.dataAcquisto) {
    const start = fromDateStr(v.dataAcquisto).getTime();
    const end = fromDateStr(v.dataVendita || oggi).getTime();
    giorniStock = Math.max(0, Math.round((end - start) / 86_400_000));
  }
  const margineGiorno =
    risultatoDopoIva !== null && giorniStock ? risultatoDopoIva / giorniStock : null;

  return {
    costiDiretti: cd,
    costoTotale,
    commissioneImponibile,
    ivaCommissione,
    totaleFatturaIntermediazione,
    margineGestionale,
    margineRegimeIva,
    ivaRegimeMargine,
    risultatoDopoIva,
    roi,
    giorniStock,
    margineGiorno,
    isContoVendita,
    hasVendita,
  };
}

export type CalcoloVeicolo = ReturnType<typeof computeVeicolo>;

// --- Liquidazione IVA trimestrale -------------------------------------------

export const PERIODI_IVA: Record<number, { periodo: string; scadenza: string }> = {
  1: { periodo: "01/01 – 31/03", scadenza: "18 maggio" },
  2: { periodo: "01/04 – 30/06", scadenza: "20 agosto" },
  3: { periodo: "01/07 – 30/09", scadenza: "16 novembre" },
  4: { periodo: "01/10 – 31/12", scadenza: "16 marzo (anno succ.)" },
};

export function liquidazioneTrimestre(
  trim: number,
  veicoli: Veicolo[],
  movimenti: Movimento[],
  impostazioni: Impostazioni,
  oggi: string
) {
  const anno = impostazioni.annoGestione;
  let ivaMargine = 0;
  let ivaCommissioni = 0;
  let ivaDetraibile = 0;

  veicoli.forEach((v) => {
    if (!v.dataVendita || trimestre(v.dataVendita) !== trim || annoNum(v.dataVendita) !== anno) return;
    const c = computeVeicolo(v, movimenti, impostazioni, oggi);
    if (v.servizio === "Conto vendita") ivaCommissioni += c.ivaCommissione || 0;
    else ivaMargine += c.ivaRegimeMargine || 0;
  });
  movimenti.forEach((m) => {
    if (!m.ivaDetraibile || trimestre(m.data) !== trim || annoNum(m.data) !== anno) return;
    ivaDetraibile += m.iva;
  });

  const saldoBase = Math.max(0, ivaMargine + ivaCommissioni - ivaDetraibile);
  const maggiorazione = saldoBase * impostazioni.maggiorazioneTrimestrale;
  return {
    trim,
    ivaMargine,
    ivaCommissioni,
    ivaDetraibile,
    saldoBase,
    maggiorazione,
    totale: saldoBase + maggiorazione,
  };
}

// Scadenza di versamento di ogni trimestre: [mese, giorno]. Il quarto si paga a
// marzo dell'anno dopo.
const SCADENZE_VERSAMENTO: Record<number, [number, number]> = {
  1: [5, 18],
  2: [8, 20],
  3: [11, 16],
  4: [3, 16],
};

// --- Avvisi ----------------------------------------------------------------

export function computeAvvisi(
  veicoli: Veicolo[],
  movimenti: Movimento[],
  impostazioni: Impostazioni,
  oggi: string
): Avviso[] {
  const avvisi: Avviso[] = [];

  veicoli.forEach((v) => {
    if (v.stato === "Venduta" || v.stato === "Archiviata" || !v.dataAcquisto) return;
    const giorni = Math.round(
      (fromDateStr(oggi).getTime() - fromDateStr(v.dataAcquisto).getTime()) / 86_400_000
    );
    if (giorni > impostazioni.sogliaGiorniStock) {
      avvisi.push({
        livello: "warning",
        messaggio: `${nomeVeicolo(v)} è ferma in stock da ${giorni} giorni`,
        href: `/admin/auto/${v.id}`,
      });
    }
  });

  const scaduti = movimenti.filter(
    (m) => m.statoPagamento === "Da saldare" && m.dataScadenza && m.dataScadenza < oggi
  );
  if (scaduti.length > 0) {
    avvisi.push({
      livello: "danger",
      messaggio:
        scaduti.length === 1
          ? "1 movimento ha superato la scadenza di pagamento"
          : `${scaduti.length} movimenti hanno superato la scadenza di pagamento`,
      href: "/admin/scadenzario",
    });
  }

  // Liquidazione IVA in scadenza entro 14 giorni (il quarto trimestre, a marzo dell'anno dopo).
  const anno = Number(oggi.slice(0, 4));
  const trimAttuale = trimestre(oggi) ?? 1;
  const [mese, giorno] = SCADENZE_VERSAMENTO[trimAttuale];
  const annoScadenza = trimAttuale === 4 ? anno + 1 : anno;
  const dataScadenza = `${annoScadenza}-${String(mese).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;
  const giorniAllaScadenza = Math.round(
    (fromDateStr(dataScadenza).getTime() - fromDateStr(oggi).getTime()) / 86_400_000
  );
  if (giorniAllaScadenza >= 0 && giorniAllaScadenza <= 14) {
    avvisi.push({
      livello: "warning",
      messaggio: `La liquidazione IVA del trimestre scade tra ${giorniAllaScadenza} giorni`,
      href: "/admin/iva",
    });
  }

  return avvisi;
}
