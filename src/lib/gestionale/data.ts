import type { RentPreventivo, RentPrenotazione, RentTariffa, RentVeicolo } from "./rent";
import type { Contatto, Impostazioni, Movimento, Veicolo, VoceStorico } from "./types";

/** Tutto ciò che il gestionale salva: è la forma dell'unico documento in memoria. */
export interface GestionaleData {
  veicoli: Veicolo[];
  movimenti: Movimento[];
  contatti: Contatto[];
  impostazioni: Impostazioni;
  storico: VoceStorico[];
  noleggio: {
    veicoli: RentVeicolo[];
    prenotazioni: RentPrenotazione[];
    tariffe: RentTariffa[];
    preventivi: RentPreventivo[];
  };
}
