// Dalla griglia del file ai record: trova la riga d'intestazione, abbina ogni colonna
// al campo giusto (anche con nomi diversi: "Causale" = descrizione, "Dare" = uscite…)
// e valuta riga per riga con errori, avvisi e doppioni.

import type { GestionaleData } from "@/lib/gestionale/data";
import type { Griglia } from "./leggi";
import { normTesto, somiglianza } from "./normalizza";

export interface Campo {
  id: string;
  etichetta: string;
  /** Nomi di colonna riconosciuti (già in minuscolo e senza accenti). */
  sinonimi: string[];
  obbligatorio?: boolean;
  /** Valore d'esempio per il file modello. */
  esempio?: string;
}

export type ContestoImport = Pick<GestionaleData, "veicoli" | "movimenti" | "contatti" | "noleggio" | "impostazioni"> & {
  oggi: string;
};

export interface Esito<T> {
  record: T | null;
  errori: string[];
  avvisi: string[];
}

export interface Doppione {
  motivo: string;
  /** Record già presente con cui coincide (per "aggiorna"). */
  idEsistente?: string;
}

export interface Schema<T> {
  entita: "movimenti" | "contatti" | "veicoli" | "flotta" | "estratto";
  /** "movimenti", "contatti"… per i testi dell'interfaccia. */
  nome: string;
  campi: Campo[];
  /** Almeno un campo di ciascun gruppo deve essere abbinato (es. importo oppure entrate/uscite). */
  gruppiRichiesti?: { campi: string[]; messaggio: string }[];
  costruisci(valori: Record<string, unknown>, ctx: ContestoImport): Esito<T>;
  /** `chiavi` raccoglie le chiavi già viste nel file, per i doppioni interni. */
  doppione?(record: T, ctx: ContestoImport, chiavi: Set<string>): Doppione | null;
  /** Le righe doppie si possono anche aggiornare (solo i campi vuoti). */
  aggiornabile?: boolean;
  /** Una riga leggibile del record, per l'anteprima. */
  riassunto(record: T): string;
}

export interface RigaValutata<T> extends Esito<T> {
  /** Numero di riga nel file (da 1, come in Excel). */
  n: number;
  doppione: Doppione | null;
}

function punteggio(intestazione: string, campo: Campo): number {
  const h = normTesto(intestazione);
  if (!h) return 0;
  let best = 0;
  for (const s of [campo.id.toLowerCase(), normTesto(campo.etichetta), ...campo.sinonimi]) {
    if (!s) continue;
    if (h === s) return 1;
    if (s.length >= 3 && (` ${h} `.includes(` ${s} `) || h.startsWith(s))) best = Math.max(best, 0.8);
    else if (h.length >= 4 && s.includes(h)) best = Math.max(best, 0.6);
    else {
      const d = somiglianza(h, s);
      if (d >= 0.75) best = Math.max(best, 0.7 * d);
    }
  }
  return best;
}

/** La riga (tra le prime 25) che somiglia di più a un'intestazione: le banche mettono righe di preambolo. */
export function trovaIntestazione(griglia: Griglia, campi: Campo[]): number {
  let migliore = 0;
  let max = 0;
  griglia.slice(0, 25).forEach((riga, i) => {
    const n = riga.filter((cella) => campi.some((c) => punteggio(String(cella ?? ""), c) >= 0.8)).length;
    if (n > max) {
      max = n;
      migliore = i;
    }
  });
  return migliore;
}

/** Per ogni colonna l'id del campo abbinato ("" = ignorata). Ogni campo si usa una volta sola. */
export function mappaAutomatica(intestazioni: unknown[], campi: Campo[]): string[] {
  const coppie: { col: number; campo: string; p: number }[] = [];
  intestazioni.forEach((h, col) =>
    campi.forEach((c) => {
      const p = punteggio(String(h ?? ""), c);
      if (p >= 0.5) coppie.push({ col, campo: c.id, p });
    })
  );
  coppie.sort((a, b) => b.p - a.p);
  const mappa = intestazioni.map(() => "");
  const usati = new Set<string>();
  coppie.forEach(({ col, campo }) => {
    if (mappa[col] || usati.has(campo)) return;
    mappa[col] = campo;
    usati.add(campo);
  });
  return mappa;
}

/** Problemi della mappatura che impediscono di procedere. */
export function erroriMappatura(mappa: string[], schema: Schema<unknown>): string[] {
  const presenti = new Set(mappa.filter(Boolean));
  const errori = schema.campi
    .filter((c) => c.obbligatorio && !presenti.has(c.id))
    .map((c) => `Manca la colonna «${c.etichetta}»`);
  schema.gruppiRichiesti?.forEach((g) => {
    if (!g.campi.some((c) => presenti.has(c))) errori.push(g.messaggio);
  });
  return errori;
}

const vuota = (riga: unknown[]) => riga.every((c) => String(c ?? "").trim() === "");

export function valutaRighe<T>(
  griglia: Griglia,
  rigaIntestazione: number,
  mappa: string[],
  schema: Schema<T>,
  ctx: ContestoImport
): RigaValutata<T>[] {
  const chiavi = new Set<string>();
  const out: RigaValutata<T>[] = [];
  griglia.slice(rigaIntestazione + 1).forEach((riga, i) => {
    if (vuota(riga)) return;
    const valori: Record<string, unknown> = {};
    mappa.forEach((campo, col) => {
      if (campo) valori[campo] = riga[col];
    });
    // Righe di totale o di saldo in fondo all'estratto (la prima cella piena lo dice): si saltano.
    const prima = String(riga.find((c) => String(c ?? "").trim() !== "") ?? "").trim();
    if (/^(totale|totali|saldo (finale|iniziale|contabile|disponibile))\b/i.test(prima)) return;
    const esito = schema.costruisci(valori, ctx);
    const doppione = esito.record && schema.doppione ? schema.doppione(esito.record, ctx, chiavi) : null;
    out.push({ ...esito, n: rigaIntestazione + i + 2, doppione });
  });
  return out;
}

/** Chiave per ricordare la mappatura scelta per file con le stesse intestazioni (es. la stessa banca). */
export function chiaveMappatura(entita: string, intestazioni: unknown[]): string {
  return `global_drive_import_${entita}_${intestazioni.map(normTesto).join("|").slice(0, 300)}`;
}
