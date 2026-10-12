// Global Drive (vendita) e Global Rent (noleggio): a quale attività appartengono veicoli e
// movimenti, e come un veicolo passa dall'una all'altra. Funzioni pure, come calc.ts.

import type { GestionaleData } from "./data";
import { veicoloVuoto } from "./defaults";
import type { RentVeicolo } from "./rent";
import type { Attivita, Movimento, Veicolo } from "./types";

/** Attività di un movimento che non la indica: quella dell'auto collegata, poi la categoria. */
export function attivitaDedotta(m: Pick<Movimento, "autoId" | "categoria">, veicoli: Veicolo[]): Attivita {
  const v = m.autoId ? veicoli.find((x) => x.id === m.autoId) : undefined;
  if (v) return v.attivita;
  return m.categoria === "Noleggio" ? "Noleggio" : "Vendita";
}

/** L'auto è nella flotta attiva: la sua scheda è assegnata a Global Rent. */
export function inFlotta(rv: Pick<RentVeicolo, "veicoloId">, veicoli: Veicolo[]): boolean {
  const v = veicoli.find((x) => x.id === rv.veicoloId);
  return !v || v.attivita === "Noleggio";
}

/** Stato della scheda di un'auto che fa noleggio: è dell'azienda, ma non è in vendita. */
export const STATO_IN_NOLEGGIO = "Acquistata" as const;

/**
 * Perché un veicolo non può passare all'altra attività (null = può). Al noleggio vanno solo le
 * auto dell'azienda non ancora vendute; alla vendita solo quelle senza noleggi aperti.
 */
export function bloccoCambioAttivita(v: Veicolo, verso: Attivita, d: Pick<GestionaleData, "noleggio">): string | null {
  if (v.attivita === verso) return null;
  if (verso === "Noleggio") {
    if (v.servizio !== "Vendita diretta") return `«${v.servizio}»: l'auto non è dell'azienda, non può andare a noleggio.`;
    if (v.stato === "Venduta" || v.stato === "Archiviata") return `L'auto è «${v.stato}».`;
    if (v.stato === "Prenotata") return "L'auto è prenotata da un cliente: annulla la trattativa prima.";
    if (v.stato === "In valutazione") return "L'auto è ancora in valutazione: registrane l'acquisto prima.";
    return null;
  }
  const profilo = d.noleggio.veicoli.find((r) => r.veicoloId === v.id);
  const aperte = profilo
    ? d.noleggio.prenotazioni.filter((p) => p.veicoloId === profilo.id && (p.stato === "Prenotata" || p.stato === "In corso"))
    : [];
  if (aperte.length > 0) {
    return `Ha ${aperte.length === 1 ? "un noleggio aperto" : `${aperte.length} noleggi aperti`}: concludili o annullali prima.`;
  }
  return null;
}

/**
 * Ogni auto del noleggio deve avere la sua scheda nel gestionale. I salvataggi di prima della
 * separazione Drive/Rent avevano una flotta a parte: qui le schede mancanti si creano.
 */
export function collegaFlotta(d: GestionaleData, nuovoId: () => string): GestionaleData {
  const ids = new Set(d.veicoli.map((v) => v.id));
  const nuove: Veicolo[] = [];
  const flotta = d.noleggio.veicoli.map((rv) => {
    if (rv.veicoloId && ids.has(rv.veicoloId)) return rv;
    const v: Veicolo = {
      ...veicoloVuoto(d.impostazioni),
      id: nuovoId(),
      attivita: "Noleggio",
      stato: STATO_IN_NOLEGGIO,
      marca: rv.marca,
      modello: rv.modello,
      targa: rv.targa,
      chilometraggio: rv.kmAttuali,
    };
    nuove.push(v);
    return { ...rv, veicoloId: v.id };
  });
  if (nuove.length === 0) return d;
  return { ...d, veicoli: [...d.veicoli, ...nuove], noleggio: { ...d.noleggio, veicoli: flotta } };
}
