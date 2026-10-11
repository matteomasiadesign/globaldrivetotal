// Tipi e calcoli per Global Rent — stesso pattern di lib/calc.ts (Global Drive)

export type CategoriaVeicolo = "Economy" | "Compatta" | "Berlina" | "SUV" | "Furgone" | "Altro";
export const CATEGORIE_VEICOLO: CategoriaVeicolo[] = ["Economy", "Compatta", "Berlina", "SUV", "Furgone", "Altro"];

export type StatoVeicoloRent = "Disponibile" | "Noleggiata" | "In manutenzione" | "Fuori servizio";
export const STATI_VEICOLO_RENT: StatoVeicoloRent[] = ["Disponibile", "Noleggiata", "In manutenzione", "Fuori servizio"];

export type StatoPrenotazione = "Prenotata" | "In corso" | "Conclusa" | "Annullata";
export const STATI_PRENOTAZIONE: StatoPrenotazione[] = ["Prenotata", "In corso", "Conclusa", "Annullata"];

export type RentVeicolo = {
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
};

export type RentCliente = {
  id: string;
  nome: string;
  telefono: string;
  email: string;
  numeroPatente: string;
  scadenzaPatente: string;
  numeroDocumento: string;
  note: string;
};

export type RentPrenotazione = {
  id: string;
  veicoloId: string;
  clienteId: string | null;
  dataInizio: string;
  dataFine: string;
  kmRitiro: number | null;
  kmRiconsegna: number | null;
  carburanteRitiro: string;
  carburanteRiconsegna: string;
  tariffaApplicata: number;
  cauzione: number;
  extra: string;
  stato: StatoPrenotazione;
  note: string;
  luogoRitiro: string;
  luogoRiconsegna: string;
};

export type RentTariffa = {
  id: string;
  categoria: CategoriaVeicolo;
  nomePeriodo: string;
  dataInizio: string;
  dataFine: string;
  tariffaGiornaliera: number;
  note: string;
};

export type StatoPreventivo = "Bozza" | "Inviato" | "Accettato" | "Rifiutato" | "Scaduto";
export const STATI_PREVENTIVO: StatoPreventivo[] = ["Bozza", "Inviato", "Accettato", "Rifiutato", "Scaduto"];

export type RentPreventivo = {
  id: string;
  veicoloId: string | null;
  clienteId: string | null;
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
};

export function eurRent(n: number | null | undefined) {
  const v = Number(n) || 0;
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

// Numero di giorni di noleggio (minimo 1)
export function giorniNoleggio(dataInizio: string, dataFine: string) {
  if (!dataInizio || !dataFine) return 0;
  const giorni = Math.round((new Date(dataFine).getTime() - new Date(dataInizio).getTime()) / 86400000);
  return Math.max(1, giorni);
}

export function importoPrenotazione(p: RentPrenotazione) {
  return giorniNoleggio(p.dataInizio, p.dataFine) * (Number(p.tariffaApplicata) || 0);
}

// Verifica lato client se un'auto è libera nel periodo scelto (controllo "amichevole";
// il vincolo vero e affidabile è comunque nel database, vedi schema_rent_v1.sql)
export function veicoloLiberoNelPeriodo(
  veicoloId: string, dataInizio: string, dataFine: string,
  prenotazioni: RentPrenotazione[], escludiPrenotazioneId?: string
) {
  return !prenotazioni.some((p) => {
    if (p.veicoloId !== veicoloId) return false;
    if (p.id === escludiPrenotazioneId) return false;
    if (p.stato !== "Prenotata" && p.stato !== "In corso") return false;
    return dataInizio <= p.dataFine && dataFine >= p.dataInizio;
  });
}

// Trova la tariffa applicabile per una categoria in base alla data di inizio
// del noleggio: se più periodi si sovrappongono, prende quella più recente
// creata (permette di "sovrascrivere" una tariffa generica con una speciale).
// Se nessun periodo corrisponde, usa la tariffa base dell'auto come ripiego.
// Nota: per soggiorni a cavallo tra due stagioni si usa la tariffa del giorno
// di inizio per tutto il periodo — una semplificazione gestionale volontaria.
export function tariffaPerPeriodo(
  categoria: CategoriaVeicolo, dataInizio: string, tariffe: RentTariffa[], tariffaBaseVeicolo: number
): { tariffa: number; fonte: string } {
  const corrispondenti = tariffe.filter((t) => t.categoria === categoria && dataInizio >= t.dataInizio && dataInizio <= t.dataFine);
  if (corrispondenti.length > 0) {
    const scelta = corrispondenti[corrispondenti.length - 1];
    return { tariffa: scelta.tariffaGiornaliera, fonte: scelta.nomePeriodo || "Tariffa di periodo" };
  }
  return { tariffa: tariffaBaseVeicolo, fonte: "Tariffa base auto" };
}

export type AvvisoRent = { livello: "warning" | "danger"; messaggio: string };

export function computeAvvisiRent(veicoli: RentVeicolo[], clienti: RentCliente[]): AvvisoRent[] {
  const avvisi: AvvisoRent[] = [];
  const oggi = new Date().toISOString().slice(0, 10);
  const tra30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const scadenzeDaControllare: { campo: keyof RentVeicolo; label: string }[] = [
    { campo: "dataRevisione", label: "revisione" },
    { campo: "dataBollo", label: "bollo" },
    { campo: "dataAssicurazione", label: "assicurazione" },
  ];
  veicoli.forEach((v) => {
    scadenzeDaControllare.forEach(({ campo, label }) => {
      const data = v[campo] as string;
      if (!data) return;
      if (data < oggi) avvisi.push({ livello: "danger", messaggio: `${v.targa || `${v.marca} ${v.modello}`.trim() || "Un'auto"}: ${label} scaduta` });
      else if (data <= tra30) avvisi.push({ livello: "warning", messaggio: `${v.targa || `${v.marca} ${v.modello}`.trim() || "Un'auto"}: ${label} in scadenza entro 30 giorni` });
    });
  });
  clienti.forEach((c) => {
    if (c.scadenzaPatente && c.scadenzaPatente < oggi) {
      avvisi.push({ livello: "warning", messaggio: `Patente di ${c.nome} risulta scaduta` });
    }
  });
  return avvisi;
}
