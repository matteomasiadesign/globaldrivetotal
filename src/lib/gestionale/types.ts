// Tipi e costanti della parte gestionale dell'admin (contabilità del parco auto).
// Le formule che li usano stanno in calc.ts. Le date sono sempre "YYYY-MM-DD",
// stringa vuota se non impostate.

export type Servizio = "Vendita diretta" | "Conto vendita" | "Auto su commissione";
export type Stato =
  | "In valutazione"
  | "Acquistata"
  | "In preparazione"
  | "In vendita"
  | "Prenotata"
  | "Venduta"
  | "Archiviata";
export type TipoMovimento = "Entrata" | "Uscita";
export type NaturaCosto = "Fisso" | "Variabile diretto auto" | "Variabile generale";
export type Pagamento = "CONTO" | "CASH" | "Carta" | "Bonifico" | "Altro";
export type StatoPagamento = "Saldato" | "Da saldare";

export const SERVIZI: Servizio[] = ["Vendita diretta", "Conto vendita", "Auto su commissione"];
export const STATI: Stato[] = [
  "In valutazione",
  "Acquistata",
  "In preparazione",
  "In vendita",
  "Prenotata",
  "Venduta",
  "Archiviata",
];
export const NATURE_COSTO: NaturaCosto[] = ["Fisso", "Variabile diretto auto", "Variabile generale"];
export const PAGAMENTI: Pagamento[] = ["CONTO", "CASH", "Carta", "Bonifico", "Altro"];
export const CATEGORIE_MOVIMENTO = [
  "Acquisto veicolo",
  "Pratiche / Minivoltura",
  "Trasporto",
  "Meccanica / Tagliando",
  "Carrozzeria",
  "Pneumatici / Assetto",
  "Lavaggio / Detailing",
  "Garanzia",
  "Pubblicità",
  "Ricambi",
  "Commercialista",
  "Assicurazioni",
  "Software / Canoni",
  "Personale",
  "Banca / Commissioni",
  "Utenze / Telefonia",
  "Costi generali",
  "Altro",
  "Vendita veicolo",
  "Intermediazione conto vendita",
];
export const ALIMENTAZIONI = ["Benzina", "Diesel", "GPL", "Metano", "Ibrida", "Elettrica"];

/** Scheda economica di un'auto. Se `carId` è valorizzato è l'auto del catalogo. */
export interface Veicolo {
  id: string;
  /** Auto del catalogo pubblico a cui è collegata (stato e visibilità si sincronizzano). */
  carId: string | null;
  marca: string;
  modello: string;
  targa: string;
  versione: string;
  chilometraggio: number;
  alimentazione: string;
  servizio: Servizio;
  stato: Stato;
  fatturata: boolean;
  passaggioProprieta: boolean;
  garanzia: boolean;
  dataAcquisto: string;
  dataVendita: string;
  prezzoAcquisto: number;
  prezzoVendita: number | null;
  /** Frazione (0.07 = 7%), usata solo dal conto vendita. */
  commissionePercentuale: number;
  numeroFattura: string;
  note: string;
}

export interface Movimento {
  id: string;
  data: string;
  autoId: string | null;
  descrizione: string;
  fornitoreCliente: string;
  tipo: TipoMovimento;
  categoria: string;
  naturaCosto: NaturaCosto;
  pagamento: Pagamento;
  imponibile: number;
  iva: number;
  /** Sempre imponibile + iva: lo calcola il contesto a ogni salvataggio. */
  totale: number;
  ivaDetraibile: boolean;
  dataScadenza: string;
  statoPagamento: StatoPagamento;
  dataSaldo: string;
  numeroDocumento: string;
  riconciliato: boolean;
  riferimentoEstratto: string;
}

export type TipoContatto = "Cliente" | "Fornitore" | "Entrambi";
export const TIPI_CONTATTO: TipoContatto[] = ["Cliente", "Fornitore", "Entrambi"];

export interface Contatto {
  id: string;
  tipo: TipoContatto;
  nome: string;
  telefono: string;
  email: string;
  codiceFiscale: string;
  residenza: string;
  nascitaSede: string;
  /** Solo per chi noleggia un'auto. */
  numeroPatente: string;
  scadenzaPatente: string;
  numeroDocumento: string;
  note: string;
}

/** Parametri di calcolo e contratti. I dati dell'azienda stanno in /admin/sito. */
export interface Impostazioni {
  annoGestione: number;
  aliquotaIva: number;
  maggiorazioneTrimestrale: number;
  commissionePredefinita: number;
  sogliaRoi: number;
  sogliaGiorniStock: number;
  pecAzienda: string;
  prossimoNumeroContratto: number;
}

export type AzioneStorico = "Creato" | "Modificato" | "Eliminato";
export type TabellaStorico = "auto" | "movimenti" | "contatti" | "noleggio";

export interface VoceStorico {
  id: string;
  tabella: TabellaStorico;
  azione: AzioneStorico;
  /** Cosa è stato toccato, in parole ("Fiat Panda", "Tagliando"). */
  oggetto: string;
  /** Per le modifiche: i campi cambiati ("stato: In vendita → Venduta"). */
  dettaglio: string;
  utente: string;
  quando: string; // ISO 8601
}

export interface Avviso {
  livello: "warning" | "danger";
  messaggio: string;
  /** Pagina dell'admin dove sistemare la cosa. */
  href?: string;
}

export const MESI = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];
