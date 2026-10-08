// Noleggio (Global Rent): flotta, prenotazioni, tariffe di periodo e preventivi.
// Come calc.ts sono funzioni pure. I clienti non hanno un'anagrafica propria:
// sono i contatti del gestionale (con patente e documento in più).

import { fromDateStr, addDays } from "@/lib/admin/dates";
import type { Avviso, Contatto } from "./types";

export type CategoriaVeicolo = "Economy" | "Compatta" | "Berlina" | "SUV" | "Furgone" | "Altro";
export const CATEGORIE_VEICOLO: CategoriaVeicolo[] = ["Economy", "Compatta", "Berlina", "SUV", "Furgone", "Altro"];

export type StatoVeicoloRent = "Disponibile" | "Noleggiata" | "In manutenzione" | "Fuori servizio";
export const STATI_VEICOLO_RENT: StatoVeicoloRent[] = ["Disponibile", "Noleggiata", "In manutenzione", "Fuori servizio"];

export type StatoPrenotazione = "Prenotata" | "In corso" | "Conclusa" | "Annullata";
export const STATI_PRENOTAZIONE: StatoPrenotazione[] = ["Prenotata", "In corso", "Conclusa", "Annullata"];

export type StatoPreventivo = "Bozza" | "Inviato" | "Accettato" | "Rifiutato" | "Scaduto";
export const STATI_PREVENTIVO: StatoPreventivo[] = ["Bozza", "Inviato", "Accettato", "Rifiutato", "Scaduto"];

export interface RentVeicolo {
  id: string;
  marca: string;
  modello: string;
  targa: string;
  categoria: CategoriaVeicolo;
  kmAttuali: number;
  tariffaGiornaliera: number;
  stato: StatoVeicoloRent;
  dataRevisione: string;
  dataBollo: string;
  dataAssicurazione: string;
  dataTagliando: string;
  note: string;
}

export interface RentPrenotazione {
  id: string;
  veicoloId: string;
  contattoId: string | null;
  dataInizio: string;
  dataFine: string;
  tariffaApplicata: number;
  cauzione: number;
  stato: StatoPrenotazione;
  luogoRitiro: string;
  luogoRiconsegna: string;
  note: string;
}

export interface RentTariffa {
  id: string;
  categoria: CategoriaVeicolo;
  nomePeriodo: string;
  dataInizio: string;
  dataFine: string;
  tariffaGiornaliera: number;
}

export interface RentPreventivo {
  id: string;
  veicoloId: string | null;
  contattoId: string | null;
  clienteNomeLibero: string;
  categoria: CategoriaVeicolo;
  dataInizio: string;
  dataFine: string;
  luogoRitiro: string;
  luogoRiconsegna: string;
  tariffaApplicata: number;
  giorni: number;
  totale: number;
  stato: StatoPreventivo;
  note: string;
}

export const nomeRentVeicolo = (v: Pick<RentVeicolo, "marca" | "modello" | "targa">) =>
  [[v.marca, v.modello].filter(Boolean).join(" "), v.targa].filter(Boolean).join(" · ") || "Auto senza nome";

/** Giorni di noleggio, minimo 1. */
export function giorniNoleggio(dataInizio: string, dataFine: string) {
  if (!dataInizio || !dataFine) return 0;
  const giorni = Math.round(
    (fromDateStr(dataFine).getTime() - fromDateStr(dataInizio).getTime()) / 86_400_000
  );
  return Math.max(1, giorni);
}

export function importoPrenotazione(p: Pick<RentPrenotazione, "dataInizio" | "dataFine" | "tariffaApplicata">) {
  return giorniNoleggio(p.dataInizio, p.dataFine) * (Number(p.tariffaApplicata) || 0);
}

/** Controllo "amichevole" lato interfaccia: l'auto è libera nel periodo scelto? */
export function veicoloLiberoNelPeriodo(
  veicoloId: string,
  dataInizio: string,
  dataFine: string,
  prenotazioni: RentPrenotazione[],
  escludiPrenotazioneId?: string
) {
  return !prenotazioni.some((p) => {
    if (p.veicoloId !== veicoloId || p.id === escludiPrenotazioneId) return false;
    if (p.stato !== "Prenotata" && p.stato !== "In corso") return false;
    return dataInizio <= p.dataFine && dataFine >= p.dataInizio;
  });
}

// Tariffa di una categoria in base alla data di inizio: se più periodi si
// sovrappongono vince l'ultimo inserito (permette di "sovrascrivere" una tariffa
// generica con una speciale). Senza periodi corrispondenti vale la tariffa base
// dell'auto. Per un noleggio a cavallo di due stagioni si applica la tariffa del
// giorno di inizio a tutto il periodo: semplificazione voluta.
export function tariffaPerPeriodo(
  categoria: CategoriaVeicolo,
  dataInizio: string,
  tariffe: RentTariffa[],
  tariffaBaseVeicolo: number
): { tariffa: number; fonte: string } {
  const corrispondenti = tariffe.filter(
    (t) => t.categoria === categoria && dataInizio >= t.dataInizio && dataInizio <= t.dataFine
  );
  if (corrispondenti.length > 0) {
    const scelta = corrispondenti[corrispondenti.length - 1];
    return { tariffa: scelta.tariffaGiornaliera, fonte: scelta.nomePeriodo || "Tariffa di periodo" };
  }
  return { tariffa: tariffaBaseVeicolo, fonte: "Tariffa base auto" };
}

export function computeAvvisiRent(veicoli: RentVeicolo[], contatti: Contatto[], oggi: string): Avviso[] {
  const avvisi: Avviso[] = [];
  const tra30 = addDays(oggi, 30);

  const scadenze: { campo: "dataRevisione" | "dataBollo" | "dataAssicurazione"; label: string }[] = [
    { campo: "dataRevisione", label: "revisione" },
    { campo: "dataBollo", label: "bollo" },
    { campo: "dataAssicurazione", label: "assicurazione" },
  ];
  veicoli.forEach((v) => {
    scadenze.forEach(({ campo, label }) => {
      const data = v[campo];
      if (!data) return;
      if (data < oggi) {
        avvisi.push({ livello: "danger", messaggio: `${nomeRentVeicolo(v)}: ${label} scaduta`, href: "/admin/noleggio?tab=flotta" });
      } else if (data <= tra30) {
        avvisi.push({ livello: "warning", messaggio: `${nomeRentVeicolo(v)}: ${label} in scadenza entro 30 giorni`, href: "/admin/noleggio?tab=flotta" });
      }
    });
  });
  contatti.forEach((c) => {
    if (c.scadenzaPatente && c.scadenzaPatente < oggi) {
      avvisi.push({ livello: "warning", messaggio: `Patente di ${c.nome || "un cliente"} risulta scaduta`, href: "/admin/contatti" });
    }
  });
  return avvisi;
}
