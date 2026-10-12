// I riepiloghi esportabili del gestionale: un foglio per tabella, con le stesse
// colonne in CSV ed Excel. Le formule sono quelle di calc.ts, quindi i numeri sono
// gli stessi che si vedono a video.

import { inFlotta } from "@/lib/gestionale/attivita";
import {
  CATEGORIE_VENDITA,
  PERIODI_IVA,
  annoNum,
  computeVeicolo,
  ivaAltraEntrata,
  ivaDetraibileEffettiva,
  liquidazioneTrimestre,
  nomeVeicolo,
  trimestre,
} from "@/lib/gestionale/calc";
import type { GestionaleData } from "@/lib/gestionale/data";
import { etichettaPeriodo, inPeriodo, limitiPeriodo, parsePeriodo, type Periodo } from "@/lib/gestionale/periodo";
import {
  giorniNoleggio,
  importoPrenotazione,
  nomeRentVeicolo,
  type RentPrenotazione,
  type RentVeicolo,
} from "@/lib/gestionale/rent";
import type { Contatto, Movimento, Veicolo } from "@/lib/gestionale/types";
import { MESI, NOME_ATTIVITA } from "@/lib/gestionale/types";
import { foglio, type Foglio } from "./types";

export interface Contesto extends Pick<GestionaleData, "veicoli" | "movimenti" | "contatti" | "impostazioni" | "noleggio"> {
  oggi: string;
  /** Ragione sociale, per l'intestazione del pacchetto. */
  azienda?: string;
}

function aiutanti(ctx: Contesto) {
  const veicolo = (id: string | null) => ctx.veicoli.find((v) => v.id === id);
  const contatto = (id: string | null) => ctx.contatti.find((c) => c.id === id);
  return {
    veicolo,
    contatto,
    nomeAuto: (id: string | null) => {
      const v = veicolo(id);
      return v ? [v.marca, v.modello].filter(Boolean).join(" ") || "Auto senza nome" : "";
    },
    targa: (id: string | null) => veicolo(id)?.targa ?? "",
    nomeContatto: (id: string | null) => contatto(id)?.nome ?? "",
    cliente: (p: { contattoId: string | null; clienteNomeLibero: string }) =>
      contatto(p.contattoId)?.nome || p.clienteNomeLibero || "",
  };
}

const giorniTra = (da: string, a: string) =>
  Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${da}T00:00:00Z`)) / 86_400_000);

const pagamentoIt = (p: string) => (p === "CASH" ? "Contanti" : p === "CONTO" ? "Conto" : p);

// --- Movimenti --------------------------------------------------------------

export function foglioMovimenti(righe: Movimento[], ctx: Contesto, intro?: string[]): Foglio {
  const h = aiutanti(ctx);
  const ordinate = [...righe].sort((a, b) => a.data.localeCompare(b.data));
  return foglio<Movimento>({
    nome: "Movimenti",
    intro,
    righe: ordinate,
    colonne: [
      { titolo: "Data", formato: "data", valore: (m) => m.data, larghezza: 11 },
      { titolo: "N. documento", valore: (m) => m.numeroDocumento, larghezza: 14 },
      { titolo: "Tipo", valore: (m) => m.tipo },
      { titolo: "Gestione", valore: (m) => NOME_ATTIVITA[m.attivita], larghezza: 13 },
      { titolo: "Categoria", valore: (m) => m.categoria, larghezza: 24 },
      { titolo: "Natura costo", valore: (m) => m.naturaCosto, larghezza: 20 },
      { titolo: "Descrizione", valore: (m) => m.descrizione, larghezza: 32 },
      { titolo: "Fornitore / cliente", valore: (m) => m.fornitoreCliente, larghezza: 24 },
      { titolo: "Auto", valore: (m) => h.nomeAuto(m.autoId) || "Generale", larghezza: 20 },
      { titolo: "Targa", valore: (m) => h.targa(m.autoId) },
      { titolo: "Pagamento", valore: (m) => pagamentoIt(m.pagamento) },
      { titolo: "Imponibile", formato: "euro", valore: (m) => m.imponibile, totale: true, larghezza: 13 },
      { titolo: "IVA", formato: "euro", valore: (m) => m.iva, totale: true, larghezza: 12 },
      { titolo: "Totale", formato: "euro", valore: (m) => m.totale, totale: true, larghezza: 13 },
      { titolo: "Entrate", formato: "euro", valore: (m) => (m.tipo === "Entrata" ? m.totale : null), totale: true, larghezza: 13 },
      { titolo: "Uscite", formato: "euro", valore: (m) => (m.tipo === "Uscita" ? m.totale : null), totale: true, larghezza: 13 },
      { titolo: "IVA detraibile", formato: "sino", valore: (m) => m.tipo === "Uscita" && m.ivaDetraibile },
      { titolo: "Stato pagamento", valore: (m) => m.statoPagamento },
      { titolo: "Scadenza", formato: "data", valore: (m) => m.dataScadenza, larghezza: 11 },
      { titolo: "Data saldo", formato: "data", valore: (m) => m.dataSaldo, larghezza: 11 },
      { titolo: "Riconciliato", formato: "sino", valore: (m) => m.riconciliato },
      { titolo: "Rif. estratto conto", valore: (m) => m.riferimentoEstratto, larghezza: 18 },
    ],
  });
}

/** Prima nota cassa/banca: solo i movimenti saldati, alla data del saldo, con i saldi progressivi. */
export function foglioPrimaNota(ctx: Contesto, periodo: Periodo): Foglio {
  const banca = new Set(ctx.impostazioni.pagamentiBanca);
  const quando = (m: Movimento) => m.dataSaldo || m.data;
  const righe = ctx.movimenti
    .filter((m) => m.statoPagamento === "Saldato" && inPeriodo(quando(m), periodo))
    .sort((a, b) => quando(a).localeCompare(quando(b)));
  let cassa = 0;
  let conto = 0;
  const conSaldi = righe.map((m) => {
    const segno = m.tipo === "Entrata" ? 1 : -1;
    const inBanca = banca.has(m.pagamento);
    if (inBanca) conto += segno * m.totale;
    else cassa += segno * m.totale;
    return { m, inBanca, cassa, conto };
  });
  type R = (typeof conSaldi)[number];
  const imp = (r: R, banca: boolean, tipo: "Entrata" | "Uscita") =>
    r.inBanca === banca && r.m.tipo === tipo ? r.m.totale : null;
  return foglio<R>({
    nome: "Prima nota",
    intro: [`Prima nota cassa e banca · ${etichettaPeriodo(periodo)}`, "Movimenti saldati, alla data del saldo. I saldi partono da zero all'inizio del periodo."],
    righe: conSaldi,
    colonne: [
      { titolo: "Data", formato: "data", valore: (r) => quando(r.m), larghezza: 11 },
      { titolo: "Descrizione", valore: (r) => r.m.descrizione || r.m.categoria, larghezza: 32 },
      { titolo: "Controparte", valore: (r) => r.m.fornitoreCliente, larghezza: 22 },
      { titolo: "N. documento", valore: (r) => r.m.numeroDocumento },
      { titolo: "Pagamento", valore: (r) => pagamentoIt(r.m.pagamento) },
      { titolo: "Cassa entrate", formato: "euro", valore: (r) => imp(r, false, "Entrata"), totale: true, larghezza: 13 },
      { titolo: "Cassa uscite", formato: "euro", valore: (r) => imp(r, false, "Uscita"), totale: true, larghezza: 13 },
      { titolo: "Banca entrate", formato: "euro", valore: (r) => imp(r, true, "Entrata"), totale: true, larghezza: 13 },
      { titolo: "Banca uscite", formato: "euro", valore: (r) => imp(r, true, "Uscita"), totale: true, larghezza: 13 },
      { titolo: "Saldo cassa", formato: "euro", valore: (r) => r.cassa, larghezza: 13 },
      { titolo: "Saldo banca", formato: "euro", valore: (r) => r.conto, larghezza: 13 },
    ],
  });
}

export function foglioScadenzario(righe: Movimento[], ctx: Contesto, intro?: string[]): Foglio {
  const h = aiutanti(ctx);
  const ordinate = [...righe].sort((a, b) => (a.dataScadenza || "9999").localeCompare(b.dataScadenza || "9999"));
  const ritardo = (m: Movimento) => (m.dataScadenza && m.dataScadenza < ctx.oggi ? giorniTra(m.dataScadenza, ctx.oggi) : 0);
  return foglio<Movimento>({
    nome: "Scadenzario",
    intro,
    righe: ordinate,
    colonne: [
      { titolo: "Scadenza", formato: "data", valore: (m) => m.dataScadenza, larghezza: 11 },
      { titolo: "Giorni di ritardo", formato: "intero", valore: (m) => ritardo(m) || null },
      { titolo: "Stato", valore: (m) => (!m.dataScadenza ? "Senza scadenza" : ritardo(m) > 0 ? "Scaduto" : "Da saldare") },
      { titolo: "Tipo", valore: (m) => (m.tipo === "Entrata" ? "Da incassare" : "Da pagare") },
      { titolo: "Controparte", valore: (m) => m.fornitoreCliente || h.nomeContatto(m.contattoId), larghezza: 22 },
      { titolo: "Descrizione", valore: (m) => m.descrizione || m.categoria, larghezza: 30 },
      { titolo: "N. documento", valore: (m) => m.numeroDocumento },
      { titolo: "Auto", valore: (m) => h.nomeAuto(m.autoId), larghezza: 18 },
      { titolo: "Data movimento", formato: "data", valore: (m) => m.data, larghezza: 11 },
      { titolo: "Pagamento", valore: (m) => pagamentoIt(m.pagamento) },
      { titolo: "Imponibile", formato: "euro", valore: (m) => m.imponibile, totale: true, larghezza: 13 },
      { titolo: "IVA", formato: "euro", valore: (m) => m.iva, totale: true, larghezza: 12 },
      { titolo: "Totale", formato: "euro", valore: (m) => m.totale, totale: true, larghezza: 13 },
    ],
  });
}

export function foglioBanca(righe: Movimento[], ctx: Contesto, intro?: string[]): Foglio {
  const h = aiutanti(ctx);
  return foglio<Movimento>({
    nome: "Banca",
    intro,
    righe: [...righe].sort((a, b) => a.data.localeCompare(b.data)),
    colonne: [
      { titolo: "Data", formato: "data", valore: (m) => m.data, larghezza: 11 },
      { titolo: "Data saldo", formato: "data", valore: (m) => m.dataSaldo, larghezza: 11 },
      { titolo: "Descrizione", valore: (m) => m.descrizione || m.categoria, larghezza: 30 },
      { titolo: "Controparte", valore: (m) => m.fornitoreCliente, larghezza: 22 },
      { titolo: "Auto", valore: (m) => h.nomeAuto(m.autoId) || "Generale", larghezza: 18 },
      { titolo: "Pagamento", valore: (m) => pagamentoIt(m.pagamento) },
      { titolo: "Entrate", formato: "euro", valore: (m) => (m.tipo === "Entrata" ? m.totale : null), totale: true, larghezza: 13 },
      { titolo: "Uscite", formato: "euro", valore: (m) => (m.tipo === "Uscita" ? m.totale : null), totale: true, larghezza: 13 },
      { titolo: "Stato pagamento", valore: (m) => m.statoPagamento },
      { titolo: "Riconciliato", formato: "sino", valore: (m) => m.riconciliato },
      { titolo: "Rif. estratto conto", valore: (m) => m.riferimentoEstratto, larghezza: 18 },
      { titolo: "N. documento", valore: (m) => m.numeroDocumento },
    ],
  });
}

// --- IVA --------------------------------------------------------------------

export function foglioLiquidazione(anno: number, ctx: Contesto, trimestri = [1, 2, 3, 4]): Foglio {
  const righe = trimestri.map((t) => liquidazioneTrimestre(t, ctx.veicoli, ctx.movimenti, ctx.impostazioni, ctx.oggi, anno));
  type R = (typeof righe)[number];
  return foglio<R>({
    nome: "Liquidazione IVA",
    intro: [
      `Liquidazione IVA trimestrale ${anno}`,
      `Aliquota ${Math.round(ctx.impostazioni.aliquotaIva * 100)}% · maggiorazione ${ctx.impostazioni.maggiorazioneTrimestrale * 100}% · margine ${
        ctx.impostazioni.margineConSpese ? "al netto delle spese dell'auto" : "vendita − acquisto"
      }`,
      "Prospetto gestionale: non sostituisce il calcolo del commercialista.",
    ],
    righe,
    colonne: [
      { titolo: "Trimestre", valore: (r) => `T${r.trim}` },
      { titolo: "Periodo", valore: (r) => PERIODI_IVA[r.trim].periodo, larghezza: 15 },
      { titolo: "Versamento entro", valore: (r) => PERIODI_IVA[r.trim].scadenza, larghezza: 22 },
      { titolo: "IVA regime margine", formato: "euro", valore: (r) => r.ivaMargine, totale: true, larghezza: 16 },
      { titolo: "IVA commissioni", formato: "euro", valore: (r) => r.ivaCommissioni, totale: true, larghezza: 15 },
      { titolo: "IVA altre entrate", formato: "euro", valore: (r) => r.ivaAltreEntrate, totale: true, larghezza: 15 },
      { titolo: "IVA detraibile", formato: "euro", valore: (r) => r.ivaDetraibile, totale: true, larghezza: 14 },
      { titolo: "Saldo", formato: "euro", valore: (r) => r.saldoBase, totale: true, larghezza: 13 },
      { titolo: "Maggiorazione", formato: "euro", valore: (r) => r.maggiorazione, totale: true, larghezza: 13 },
      { titolo: "Da versare", formato: "euro", valore: (r) => r.totale, totale: true, larghezza: 13 },
    ],
  });
}

export function foglioRegistroVendite(periodo: Periodo, ctx: Contesto): Foglio {
  const h = aiutanti(ctx);
  const righe = ctx.veicoli
    .filter((v) => v.dataVendita && inPeriodo(v.dataVendita, periodo))
    .sort((a, b) => a.dataVendita.localeCompare(b.dataVendita))
    .map((v) => ({ v, c: computeVeicolo(v, ctx.movimenti, ctx.impostazioni, ctx.oggi) }));
  type R = (typeof righe)[number];
  const cv = (r: R) => r.v.servizio === "Conto vendita";
  const imponibile = (r: R) => (cv(r) ? r.c.commissioneImponibile || 0 : (r.c.margineRegimeIva || 0) - (r.c.ivaRegimeMargine || 0));
  const iva = (r: R) => (cv(r) ? r.c.ivaCommissione || 0 : r.c.ivaRegimeMargine || 0);
  return foglio<R>({
    nome: "Registro vendite",
    intro: [`Registro vendite · ${etichettaPeriodo(periodo)}`],
    righe,
    colonne: [
      { titolo: "Data vendita", formato: "data", valore: (r) => r.v.dataVendita, larghezza: 11 },
      { titolo: "Trimestre", valore: (r) => `T${trimestre(r.v.dataVendita)}` },
      { titolo: "N. fattura", valore: (r) => r.v.numeroFattura },
      { titolo: "N. contratto", valore: (r) => (r.v.numeroContratto ? `${r.v.numeroContratto}/${r.v.annoContratto}` : "") },
      { titolo: "Auto", valore: (r) => nomeVeicolo({ ...r.v, targa: "" }), larghezza: 20 },
      { titolo: "Targa", valore: (r) => r.v.targa },
      { titolo: "Servizio", valore: (r) => r.v.servizio, larghezza: 18 },
      { titolo: "Acquirente", valore: (r) => h.nomeContatto(r.v.acquirenteId), larghezza: 22 },
      { titolo: "CF / P.IVA acquirente", valore: (r) => h.contatto(r.v.acquirenteId)?.codiceFiscale ?? "", larghezza: 18 },
      { titolo: "Prezzo vendita", formato: "euro", valore: (r) => r.v.prezzoVendita, totale: true, larghezza: 14 },
      { titolo: "Prezzo acquisto", formato: "euro", valore: (r) => (cv(r) ? null : r.v.prezzoAcquisto), totale: true, larghezza: 14 },
      { titolo: "Spese auto", formato: "euro", valore: (r) => r.c.costiDiretti, totale: true, larghezza: 12 },
      { titolo: "Margine (base IVA)", formato: "euro", valore: (r) => (cv(r) ? null : r.c.margineRegimeIva), totale: true, larghezza: 15 },
      { titolo: "Imponibile", formato: "euro", valore: imponibile, totale: true, larghezza: 13 },
      { titolo: "IVA", formato: "euro", valore: iva, totale: true, larghezza: 12 },
      { titolo: "Totale", formato: "euro", valore: (r) => imponibile(r) + iva(r), totale: true, larghezza: 13 },
    ],
  });
}

/** Acquisti con IVA che si detrae davvero (vedi ivaDetraibileEffettiva) e altre entrate con IVA. */
export function foglioRegistroAcquisti(periodo: Periodo, ctx: Contesto): Foglio {
  const h = aiutanti(ctx);
  const righe = ctx.movimenti
    .filter((m) => inPeriodo(m.data, periodo) && ivaDetraibileEffettiva(m, ctx.veicoli, ctx.impostazioni) > 0)
    .sort((a, b) => a.data.localeCompare(b.data));
  return foglio<Movimento>({
    nome: "Registro acquisti",
    intro: [`Registro acquisti (IVA detraibile) · ${etichettaPeriodo(periodo)}`],
    righe,
    colonne: [
      { titolo: "Data", formato: "data", valore: (m) => m.data, larghezza: 11 },
      { titolo: "Trimestre", valore: (m) => `T${trimestre(m.data)}` },
      { titolo: "N. documento", valore: (m) => m.numeroDocumento },
      { titolo: "Fornitore", valore: (m) => m.fornitoreCliente || h.nomeContatto(m.contattoId), larghezza: 24 },
      { titolo: "CF / P.IVA", valore: (m) => h.contatto(m.contattoId)?.codiceFiscale ?? "", larghezza: 18 },
      { titolo: "Categoria", valore: (m) => m.categoria, larghezza: 22 },
      { titolo: "Auto", valore: (m) => h.nomeAuto(m.autoId) || "Generale", larghezza: 18 },
      { titolo: "Imponibile", formato: "euro", valore: (m) => m.imponibile, totale: true, larghezza: 13 },
      { titolo: "IVA", formato: "euro", valore: (m) => m.iva, totale: true, larghezza: 12 },
      { titolo: "Totale", formato: "euro", valore: (m) => m.totale, totale: true, larghezza: 13 },
    ],
  });
}

export function foglioAltreEntrate(periodo: Periodo, ctx: Contesto): Foglio {
  const righe = ctx.movimenti
    .filter((m) => m.tipo === "Entrata" && !CATEGORIE_VENDITA.includes(m.categoria) && inPeriodo(m.data, periodo))
    .sort((a, b) => a.data.localeCompare(b.data));
  return foglio<Movimento>({
    nome: "Altre entrate",
    intro: [`Entrate diverse dalla vendita di auto (noleggi, servizi…) · ${etichettaPeriodo(periodo)}`],
    righe,
    colonne: [
      { titolo: "Data", formato: "data", valore: (m) => m.data, larghezza: 11 },
      { titolo: "N. documento", valore: (m) => m.numeroDocumento },
      { titolo: "Cliente", valore: (m) => m.fornitoreCliente, larghezza: 24 },
      { titolo: "Categoria", valore: (m) => m.categoria, larghezza: 18 },
      { titolo: "Descrizione", valore: (m) => m.descrizione, larghezza: 30 },
      { titolo: "Imponibile", formato: "euro", valore: (m) => m.imponibile, totale: true, larghezza: 13 },
      { titolo: "IVA", formato: "euro", valore: (m) => ivaAltraEntrata(m), totale: true, larghezza: 12 },
      { titolo: "Totale", formato: "euro", valore: (m) => m.totale, totale: true, larghezza: 13 },
      { titolo: "Stato pagamento", valore: (m) => m.statoPagamento },
    ],
  });
}

// --- Auto -------------------------------------------------------------------

export function foglioContoEconomico(veicoli: Veicolo[], ctx: Contesto, intro?: string[]): Foglio {
  const h = aiutanti(ctx);
  const righe = veicoli.map((v) => ({ v, c: computeVeicolo(v, ctx.movimenti, ctx.impostazioni, ctx.oggi) }));
  type R = (typeof righe)[number];
  return foglio<R>({
    nome: "Conto economico auto",
    intro,
    righe,
    colonne: [
      { titolo: "Auto", valore: (r) => nomeVeicolo({ ...r.v, targa: "" }), larghezza: 22 },
      { titolo: "Targa", valore: (r) => r.v.targa },
      { titolo: "Servizio", valore: (r) => r.v.servizio, larghezza: 18 },
      { titolo: "Stato", valore: (r) => r.v.stato, larghezza: 14 },
      { titolo: "Fornitore / proprietario", valore: (r) => h.nomeContatto(r.v.fornitoreId), larghezza: 22 },
      { titolo: "Acquirente", valore: (r) => h.nomeContatto(r.v.acquirenteId), larghezza: 22 },
      { titolo: "Data acquisto", formato: "data", valore: (r) => r.v.dataAcquisto, larghezza: 11 },
      { titolo: "Data vendita", formato: "data", valore: (r) => r.v.dataVendita, larghezza: 11 },
      { titolo: "Giorni in stock", formato: "intero", valore: (r) => r.c.giorniStock },
      { titolo: "Prezzo acquisto", formato: "euro", valore: (r) => (r.c.isContoVendita ? null : r.v.prezzoAcquisto), totale: true, larghezza: 14 },
      { titolo: "Costi diretti", formato: "euro", valore: (r) => r.c.costiDiretti, totale: true, larghezza: 13 },
      { titolo: "Costo totale", formato: "euro", valore: (r) => r.c.costoTotale, totale: true, larghezza: 13 },
      { titolo: "Prezzo vendita", formato: "euro", valore: (r) => r.v.prezzoVendita, totale: true, larghezza: 14 },
      { titolo: "Commissione %", formato: "percento", valore: (r) => (r.c.isContoVendita ? r.v.commissionePercentuale : null) },
      { titolo: "Commissione imponibile", formato: "euro", valore: (r) => r.c.commissioneImponibile, totale: true, larghezza: 15 },
      { titolo: "IVA commissione", formato: "euro", valore: (r) => r.c.ivaCommissione, totale: true, larghezza: 13 },
      { titolo: "Margine gestionale", formato: "euro", valore: (r) => r.c.margineGestionale, totale: true, larghezza: 15 },
      { titolo: "Margine regime IVA", formato: "euro", valore: (r) => r.c.margineRegimeIva, totale: true, larghezza: 15 },
      { titolo: "IVA regime margine", formato: "euro", valore: (r) => r.c.ivaRegimeMargine, totale: true, larghezza: 15 },
      { titolo: "Risultato dopo IVA", formato: "euro", valore: (r) => r.c.risultatoDopoIva, totale: true, larghezza: 15 },
      { titolo: "ROI", formato: "percento", valore: (r) => r.c.roi },
      { titolo: "Margine al giorno", formato: "euro", valore: (r) => r.c.margineGiorno, larghezza: 13 },
      {
        titolo: "Sotto ROI obiettivo",
        formato: "sino",
        valore: (r) => (r.c.roi === null ? null : r.c.roi < ctx.impostazioni.sogliaRoi),
      },
      {
        titolo: "Oltre giorni di stock",
        formato: "sino",
        valore: (r) => (r.c.giorniStock === null ? null : r.c.giorniStock > ctx.impostazioni.sogliaGiorniStock),
      },
    ],
  });
}

/** I costi di una sola auto (secondo foglio della scheda singola). */
export function foglioCostiAuto(v: Veicolo, ctx: Contesto): Foglio {
  return {
    ...foglioMovimenti(ctx.movimenti.filter((m) => m.autoId === v.id), ctx),
    nome: "Movimenti dell'auto",
  };
}

/** Registro dei beni usati in regime del margine: acquisti e vendite del periodo. */
export function foglioRegistroUsati(periodo: Periodo, ctx: Contesto): Foglio {
  const h = aiutanti(ctx);
  const righe = ctx.veicoli
    .filter((v) => v.servizio !== "Conto vendita")
    .filter((v) => (v.dataAcquisto && inPeriodo(v.dataAcquisto, periodo)) || (v.dataVendita && inPeriodo(v.dataVendita, periodo)))
    .sort((a, b) => (a.dataAcquisto || a.dataVendita).localeCompare(b.dataAcquisto || b.dataVendita))
    .map((v, i) => ({ n: i + 1, v, c: computeVeicolo(v, ctx.movimenti, ctx.impostazioni, ctx.oggi) }));
  type R = (typeof righe)[number];
  const docAcquisto = (v: Veicolo) =>
    ctx.movimenti.find((m) => m.autoId === v.id && m.categoria === "Acquisto veicolo")?.numeroDocumento ?? "";
  return foglio<R>({
    nome: "Registro beni usati",
    intro: [
      `Registro dei beni usati (regime del margine, art. 36 DL 41/1995) · ${etichettaPeriodo(periodo)}`,
      `Margine calcolato ${ctx.impostazioni.margineConSpese ? "al netto delle spese di riparazione e accessorie" : "come vendita − acquisto"}.`,
    ],
    righe,
    colonne: [
      { titolo: "N.", formato: "intero", valore: (r) => r.n },
      { titolo: "Data acquisto", formato: "data", valore: (r) => r.v.dataAcquisto, larghezza: 11 },
      { titolo: "Fornitore", valore: (r) => h.nomeContatto(r.v.fornitoreId), larghezza: 22 },
      { titolo: "CF / P.IVA fornitore", valore: (r) => h.contatto(r.v.fornitoreId)?.codiceFiscale ?? "", larghezza: 18 },
      { titolo: "Doc. acquisto", valore: (r) => docAcquisto(r.v) },
      { titolo: "Marca", valore: (r) => r.v.marca },
      { titolo: "Modello", valore: (r) => r.v.modello },
      { titolo: "Versione", valore: (r) => r.v.versione, larghezza: 16 },
      { titolo: "Targa", valore: (r) => r.v.targa },
      { titolo: "Km", formato: "intero", valore: (r) => r.v.chilometraggio },
      { titolo: "Prezzo acquisto", formato: "euro", valore: (r) => r.v.prezzoAcquisto, totale: true, larghezza: 14 },
      { titolo: "Spese accessorie", formato: "euro", valore: (r) => r.c.costiDiretti, totale: true, larghezza: 14 },
      { titolo: "Data vendita", formato: "data", valore: (r) => r.v.dataVendita, larghezza: 11 },
      { titolo: "Acquirente", valore: (r) => h.nomeContatto(r.v.acquirenteId), larghezza: 22 },
      { titolo: "CF / P.IVA acquirente", valore: (r) => h.contatto(r.v.acquirenteId)?.codiceFiscale ?? "", larghezza: 18 },
      { titolo: "N. fattura", valore: (r) => r.v.numeroFattura },
      { titolo: "Prezzo vendita", formato: "euro", valore: (r) => r.v.prezzoVendita, totale: true, larghezza: 14 },
      { titolo: "Margine", formato: "euro", valore: (r) => r.c.margineRegimeIva, totale: true, larghezza: 13 },
      { titolo: "IVA incorporata", formato: "euro", valore: (r) => r.c.ivaRegimeMargine, totale: true, larghezza: 13 },
      {
        titolo: "Imponibile margine",
        formato: "euro",
        valore: (r) => (r.c.margineRegimeIva === null ? null : r.c.margineRegimeIva - (r.c.ivaRegimeMargine || 0)),
        totale: true,
        larghezza: 15,
      },
    ],
  });
}

export function foglioContoVendita(periodo: Periodo, ctx: Contesto): Foglio {
  const h = aiutanti(ctx);
  const righe = ctx.veicoli
    .filter((v) => v.servizio === "Conto vendita" && v.dataVendita && inPeriodo(v.dataVendita, periodo))
    .sort((a, b) => a.dataVendita.localeCompare(b.dataVendita))
    .map((v) => ({ v, c: computeVeicolo(v, ctx.movimenti, ctx.impostazioni, ctx.oggi) }));
  type R = (typeof righe)[number];
  return foglio<R>({
    nome: "Conto vendita",
    intro: [`Vendite in conto vendita (fatture di intermediazione) · ${etichettaPeriodo(periodo)}`],
    righe,
    colonne: [
      { titolo: "Data vendita", formato: "data", valore: (r) => r.v.dataVendita, larghezza: 11 },
      { titolo: "Proprietario", valore: (r) => h.nomeContatto(r.v.fornitoreId), larghezza: 22 },
      { titolo: "Auto", valore: (r) => nomeVeicolo({ ...r.v, targa: "" }), larghezza: 20 },
      { titolo: "Targa", valore: (r) => r.v.targa },
      { titolo: "Acquirente", valore: (r) => h.nomeContatto(r.v.acquirenteId), larghezza: 22 },
      { titolo: "Prezzo vendita", formato: "euro", valore: (r) => r.v.prezzoVendita, totale: true, larghezza: 14 },
      { titolo: "Commissione %", formato: "percento", valore: (r) => r.v.commissionePercentuale },
      { titolo: "Imponibile", formato: "euro", valore: (r) => r.c.commissioneImponibile, totale: true, larghezza: 13 },
      { titolo: "IVA", formato: "euro", valore: (r) => r.c.ivaCommissione, totale: true, larghezza: 12 },
      { titolo: "Totale fattura", formato: "euro", valore: (r) => r.c.totaleFatturaIntermediazione, totale: true, larghezza: 14 },
      {
        titolo: "Spettante al proprietario",
        formato: "euro",
        valore: (r) => (r.v.prezzoVendita ?? 0) - (r.c.totaleFatturaIntermediazione ?? 0),
        totale: true,
        larghezza: 16,
      },
    ],
  });
}

/** Auto acquistate e non ancora vendute alla fine del periodo, al costo. */
export function foglioRimanenze(periodo: Periodo, ctx: Contesto): Foglio {
  const fine = limitiPeriodo(periodo)?.al ?? ctx.oggi;
  const righe = ctx.veicoli
    .filter((v) => v.servizio !== "Conto vendita" && v.dataAcquisto && v.dataAcquisto <= fine)
    .filter((v) => !v.dataVendita || v.dataVendita > fine)
    .map((v) => {
      const costi = ctx.movimenti
        .filter(
          (m) =>
            m.autoId === v.id &&
            m.tipo === "Uscita" &&
            m.naturaCosto === "Variabile diretto auto" &&
            m.categoria !== "Acquisto veicolo" &&
            m.data <= fine
        )
        .reduce((s, m) => s + m.totale, 0);
      return { v, costi };
    });
  type R = (typeof righe)[number];
  return foglio<R>({
    nome: "Rimanenze",
    intro: [`Rimanenze al ${fine.split("-").reverse().join("/")} (auto in stock, al costo)`],
    righe,
    colonne: [
      { titolo: "Auto", valore: (r) => nomeVeicolo({ ...r.v, targa: "" }), larghezza: 22 },
      { titolo: "Targa", valore: (r) => r.v.targa },
      { titolo: "Data acquisto", formato: "data", valore: (r) => r.v.dataAcquisto, larghezza: 11 },
      { titolo: "Prezzo acquisto", formato: "euro", valore: (r) => r.v.prezzoAcquisto, totale: true, larghezza: 14 },
      { titolo: "Costi sostenuti", formato: "euro", valore: (r) => r.costi, totale: true, larghezza: 14 },
      { titolo: "Valore al costo", formato: "euro", valore: (r) => r.v.prezzoAcquisto + r.costi, totale: true, larghezza: 14 },
    ],
  });
}

export function foglioContratti(periodo: Periodo, ctx: Contesto): Foglio {
  const h = aiutanti(ctx);
  const righe = ctx.veicoli
    .filter((v) => v.numeroContratto && v.dataVendita && inPeriodo(v.dataVendita, periodo))
    .sort((a, b) => (a.annoContratto ?? 0) - (b.annoContratto ?? 0) || (a.numeroContratto ?? 0) - (b.numeroContratto ?? 0));
  return foglio<Veicolo>({
    nome: "Contratti di vendita",
    intro: [`Registro dei contratti di vendita · ${etichettaPeriodo(periodo)}`],
    righe,
    colonne: [
      { titolo: "N.", valore: (v) => `${v.numeroContratto}/${v.annoContratto}` },
      { titolo: "Data vendita", formato: "data", valore: (v) => v.dataVendita, larghezza: 11 },
      { titolo: "Auto", valore: (v) => nomeVeicolo({ ...v, targa: "" }), larghezza: 20 },
      { titolo: "Targa", valore: (v) => v.targa },
      { titolo: "Servizio", valore: (v) => v.servizio, larghezza: 18 },
      { titolo: "Acquirente", valore: (v) => h.nomeContatto(v.acquirenteId), larghezza: 22 },
      { titolo: "CF / P.IVA", valore: (v) => h.contatto(v.acquirenteId)?.codiceFiscale ?? "", larghezza: 18 },
      { titolo: "Residenza", valore: (v) => h.contatto(v.acquirenteId)?.residenza ?? "", larghezza: 26 },
      { titolo: "Telefono", valore: (v) => h.contatto(v.acquirenteId)?.telefono ?? "" },
      { titolo: "Prezzo", formato: "euro", valore: (v) => v.prezzoVendita, totale: true, larghezza: 13 },
      { titolo: "Fatturata", formato: "sino", valore: (v) => v.fatturata },
      { titolo: "Passaggio di proprietà", formato: "sino", valore: (v) => v.passaggioProprieta },
      { titolo: "Garanzia", formato: "sino", valore: (v) => v.garanzia },
    ],
  });
}

// --- Anagrafica e noleggio --------------------------------------------------

export function foglioContatti(righe: Contatto[], ctx: Contesto, conDocumenti: boolean): Foglio {
  const contaAuto = (id: string, campo: "fornitoreId" | "acquirenteId") => ctx.veicoli.filter((v) => v[campo] === id).length;
  return foglio<Contatto>({
    nome: "Contatti",
    righe: [...righe].sort((a, b) => a.nome.localeCompare(b.nome, "it")),
    colonne: [
      { titolo: "Nome", valore: (c) => c.nome, larghezza: 26 },
      { titolo: "Tipo", valore: (c) => c.tipo },
      { titolo: "Telefono", valore: (c) => c.telefono, larghezza: 15 },
      { titolo: "Email", valore: (c) => c.email, larghezza: 26 },
      { titolo: "CF / P.IVA", valore: (c) => c.codiceFiscale, larghezza: 18 },
      { titolo: "Residenza", valore: (c) => c.residenza, larghezza: 28 },
      { titolo: "Luogo e data di nascita", valore: (c) => c.nascitaSede, larghezza: 22 },
      ...(conDocumenti
        ? [
            { titolo: "N. patente", valore: (c: Contatto) => c.numeroPatente },
            { titolo: "Scadenza patente", formato: "data" as const, valore: (c: Contatto) => c.scadenzaPatente, larghezza: 11 },
            { titolo: "N. documento", valore: (c: Contatto) => c.numeroDocumento },
          ]
        : []),
      { titolo: "Auto fornite", formato: "intero", valore: (c) => contaAuto(c.id, "fornitoreId") },
      { titolo: "Auto acquistate", formato: "intero", valore: (c) => contaAuto(c.id, "acquirenteId") },
      { titolo: "Noleggi", formato: "intero", valore: (c) => ctx.noleggio.prenotazioni.filter((p) => p.contattoId === c.id).length },
      { titolo: "Note", valore: (c) => c.note, larghezza: 30 },
    ],
  });
}

export function foglioPrenotazioni(righe: RentPrenotazione[], ctx: Contesto, intro?: string[]): Foglio {
  const h = aiutanti(ctx);
  const auto = (id: string) => ctx.noleggio.veicoli.find((v) => v.id === id);
  return foglio<RentPrenotazione>({
    nome: "Prenotazioni noleggio",
    intro,
    righe: [...righe].sort((a, b) => a.dataInizio.localeCompare(b.dataInizio)),
    colonne: [
      { titolo: "Ritiro", formato: "data", valore: (p) => p.dataInizio, larghezza: 11 },
      { titolo: "Riconsegna", formato: "data", valore: (p) => p.dataFine, larghezza: 11 },
      { titolo: "Giorni", formato: "intero", valore: (p) => giorniNoleggio(p.dataInizio, p.dataFine), totale: true },
      { titolo: "Auto", valore: (p) => (auto(p.veicoloId) ? nomeRentVeicolo(auto(p.veicoloId) as RentVeicolo) : ""), larghezza: 24 },
      { titolo: "Categoria", valore: (p) => auto(p.veicoloId)?.categoria ?? "" },
      { titolo: "Cliente", valore: (p) => h.cliente(p), larghezza: 22 },
      { titolo: "Telefono", valore: (p) => h.contatto(p.contattoId)?.telefono ?? "" },
      { titolo: "Tariffa al giorno", formato: "euro", valore: (p) => p.tariffaApplicata, larghezza: 13 },
      { titolo: "Importo", formato: "euro", valore: (p) => importoPrenotazione(p), totale: true, larghezza: 13 },
      { titolo: "Cauzione", formato: "euro", valore: (p) => p.cauzione, larghezza: 12 },
      { titolo: "Stato", valore: (p) => p.stato },
      { titolo: "Luogo ritiro", valore: (p) => p.luogoRitiro, larghezza: 16 },
      { titolo: "Luogo riconsegna", valore: (p) => p.luogoRiconsegna, larghezza: 16 },
      { titolo: "Note", valore: (p) => p.note, larghezza: 24 },
    ],
  });
}

export function foglioFlotta(ctx: Contesto): Foglio {
  return foglio<RentVeicolo>({
    nome: "Flotta noleggio",
    righe: ctx.noleggio.veicoli.filter((v) => inFlotta(v, ctx.veicoli)),
    colonne: [
      { titolo: "Marca", valore: (v) => v.marca },
      { titolo: "Modello", valore: (v) => v.modello },
      { titolo: "Targa", valore: (v) => v.targa },
      { titolo: "Categoria", valore: (v) => v.categoria },
      { titolo: "Km", formato: "intero", valore: (v) => v.kmAttuali },
      { titolo: "Tariffa base al giorno", formato: "euro", valore: (v) => v.tariffaGiornaliera, larghezza: 14 },
      { titolo: "Stato", valore: (v) => v.stato, larghezza: 14 },
      { titolo: "Revisione", formato: "data", valore: (v) => v.dataRevisione, larghezza: 11 },
      { titolo: "Bollo", formato: "data", valore: (v) => v.dataBollo, larghezza: 11 },
      { titolo: "Assicurazione", formato: "data", valore: (v) => v.dataAssicurazione, larghezza: 11 },
      { titolo: "Tagliando", formato: "data", valore: (v) => v.dataTagliando, larghezza: 11 },
      { titolo: "Note", valore: (v) => v.note, larghezza: 24 },
    ],
  });
}

/** Giorni noleggiati e importo per mese e per auto, delle prenotazioni non annullate. */
export function foglioNoleggioPerMese(anno: number, ctx: Contesto): Foglio {
  const valide = ctx.noleggio.prenotazioni.filter((p) => p.stato !== "Annullata" && annoNum(p.dataInizio) === anno);
  const righe = ctx.noleggio.veicoli.flatMap((v) =>
    MESI.map((mese, i) => {
      const del = valide.filter((p) => p.veicoloId === v.id && Number(p.dataInizio.slice(5, 7)) === i + 1);
      return {
        auto: nomeRentVeicolo(v),
        mese,
        noleggi: del.length,
        giorni: del.reduce((s, p) => s + giorniNoleggio(p.dataInizio, p.dataFine), 0),
        importo: del.reduce((s, p) => s + importoPrenotazione(p), 0),
      };
    }).filter((r) => r.noleggi > 0)
  );
  type R = (typeof righe)[number];
  return foglio<R>({
    nome: "Noleggio per mese",
    intro: [`Noleggi per auto e mese di ritiro · ${anno}`],
    righe,
    colonne: [
      { titolo: "Auto", valore: (r) => r.auto, larghezza: 24 },
      { titolo: "Mese", valore: (r) => r.mese },
      { titolo: "Noleggi", formato: "intero", valore: (r) => r.noleggi, totale: true },
      { titolo: "Giorni", formato: "intero", valore: (r) => r.giorni, totale: true },
      { titolo: "Importo", formato: "euro", valore: (r) => r.importo, totale: true, larghezza: 13 },
    ],
  });
}

// --- Pacchetto per il commercialista ---------------------------------------

/** Tutti i registri di un trimestre o di un anno in un solo file Excel. */
export function pacchettoCommercialista(periodo: Periodo, ctx: Contesto): Foglio[] {
  const p = parsePeriodo(periodo);
  if (!p) throw new Error("Periodo non valido");
  const etichetta = etichettaPeriodo(periodo);
  const fine = limitiPeriodo(periodo)?.al ?? ctx.oggi;
  const finePeriodoAnno = !p.trim || p.trim === 4;
  const aperti = ctx.movimenti.filter((m) => m.statoPagamento === "Da saldare" && m.data <= fine);
  const bancari = ctx.movimenti.filter(
    (m) => ctx.impostazioni.pagamentiBanca.includes(m.pagamento) && inPeriodo(m.data, periodo)
  );
  const venduteOInStock = ctx.veicoli.filter(
    (v) => (v.dataVendita && inPeriodo(v.dataVendita, periodo)) || (!v.dataVendita && v.stato !== "Archiviata")
  );

  const leggimi = foglio<[string, string]>({
    nome: "Leggimi",
    righe: [
      ["Azienda", ctx.azienda || ""],
      ["Periodo", etichetta],
      ["Generato il", ctx.oggi.split("-").reverse().join("/")],
      ["Aliquota IVA", `${Math.round(ctx.impostazioni.aliquotaIva * 100)}%`],
      ["Maggiorazione trimestrale", `${ctx.impostazioni.maggiorazioneTrimestrale * 100}%`],
      ["Regime del margine", ctx.impostazioni.margineConSpese ? "margine al netto delle spese di riparazione e accessorie" : "margine = vendita − acquisto"],
      ["Metodi di pagamento bancari", ctx.impostazioni.pagamentiBanca.map(pagamentoIt).join(", ")],
      ["Nota", "Prospetti gestionali generati dal gestionale Global Drive: non sostituiscono i registri ufficiali."],
    ],
    colonne: [
      { titolo: "Voce", valore: (r) => r[0], larghezza: 28 },
      { titolo: "Valore", valore: (r) => r[1], larghezza: 70 },
    ],
  });

  return [
    leggimi,
    foglioLiquidazione(p.anno, ctx, p.trim ? [p.trim] : [1, 2, 3, 4]),
    foglioRegistroVendite(periodo, ctx),
    foglioRegistroAcquisti(periodo, ctx),
    foglioAltreEntrate(periodo, ctx),
    foglioPrimaNota(ctx, periodo),
    foglioMovimenti(ctx.movimenti.filter((m) => inPeriodo(m.data, periodo)), ctx, [`Tutti i movimenti · ${etichetta}`]),
    foglioRegistroUsati(periodo, ctx),
    foglioContoVendita(periodo, ctx),
    foglioContratti(periodo, ctx),
    foglioScadenzario(aperti, ctx, [`Incassi e pagamenti aperti al ${fine.split("-").reverse().join("/")}`]),
    foglioBanca(bancari.filter((m) => !m.riconciliato), ctx, [`Movimenti bancari da riconciliare · ${etichetta}`]),
    foglioPrenotazioni(
      ctx.noleggio.prenotazioni.filter((x) => x.stato !== "Annullata" && inPeriodo(x.dataInizio, periodo)),
      ctx,
      [`Noleggi · ${etichetta}`]
    ),
    foglioContoEconomico(venduteOInStock, ctx, [`Auto vendute nel periodo e in stock · ${etichetta}`]),
    ...(finePeriodoAnno ? [foglioRimanenze(periodo, ctx)] : []),
  ];
}
