import type { Contatto, Impostazioni, Movimento, Veicolo } from "./types";

// Record vuoti per i nuovi inserimenti: una sola definizione dei valori di partenza.

export type NuovoVeicolo = Partial<Omit<Veicolo, "id">>;
export type NuovoMovimento = Partial<Omit<Movimento, "id" | "totale">>;
export type NuovoContatto = Partial<Omit<Contatto, "id">>;

export const veicoloVuoto = (impostazioni: Impostazioni): Omit<Veicolo, "id"> => ({
  carId: null,
  marca: "",
  modello: "",
  targa: "",
  versione: "",
  chilometraggio: 0,
  alimentazione: "",
  servizio: "Vendita diretta",
  stato: "In valutazione",
  fatturata: false,
  passaggioProprieta: false,
  garanzia: false,
  dataAcquisto: "",
  dataVendita: "",
  prezzoAcquisto: 0,
  prezzoVendita: null,
  commissionePercentuale: impostazioni.commissionePredefinita,
  numeroFattura: "",
  note: "",
});

export const movimentoVuoto = (oggi: string): Omit<Movimento, "id" | "totale"> => ({
  data: oggi,
  autoId: null,
  descrizione: "",
  fornitoreCliente: "",
  tipo: "Uscita",
  categoria: "Altro",
  naturaCosto: "Variabile diretto auto",
  pagamento: "CONTO",
  imponibile: 0,
  iva: 0,
  ivaDetraibile: false,
  dataScadenza: "",
  statoPagamento: "Saldato",
  dataSaldo: "",
  numeroDocumento: "",
  riconciliato: false,
  riferimentoEstratto: "",
});

export const contattoVuoto = (): Omit<Contatto, "id"> => ({
  tipo: "Cliente",
  nome: "",
  telefono: "",
  email: "",
  codiceFiscale: "",
  residenza: "",
  nascitaSede: "",
  numeroPatente: "",
  scadenzaPatente: "",
  numeroDocumento: "",
  note: "",
});
