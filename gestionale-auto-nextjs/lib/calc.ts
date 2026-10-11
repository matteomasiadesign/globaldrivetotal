// Tipi e calcoli condivisi tra tutte le viste del gestionale.
// La logica ricalca fedelmente le formule del foglio Excel originale.

export type Servizio = "Vendita diretta" | "Conto vendita" | "Auto su commissione";
export type Stato = "In valutazione" | "Acquistata" | "In preparazione" | "In vendita" | "Prenotata" | "Venduta" | "Archiviata";
export type TipoMovimento = "Entrata" | "Uscita";
export type NaturaCosto = "Fisso" | "Variabile diretto auto" | "Variabile generale";
export type Pagamento = "CONTO" | "CASH" | "Carta" | "Bonifico" | "Altro";

export const SERVIZI: Servizio[] = ["Vendita diretta", "Conto vendita", "Auto su commissione"];
export const STATI: Stato[] = ["In valutazione", "Acquistata", "In preparazione", "In vendita", "Prenotata", "Venduta", "Archiviata"];
export const NATURE_COSTO: NaturaCosto[] = ["Fisso", "Variabile diretto auto", "Variabile generale"];
export const PAGAMENTI: Pagamento[] = ["CONTO", "CASH", "Carta", "Bonifico", "Altro"];
export const CATEGORIE = [
  "Acquisto veicolo", "Pratiche / Minivoltura", "Trasporto", "Meccanica / Tagliando", "Carrozzeria",
  "Pneumatici / Assetto", "Lavaggio / Detailing", "Garanzia", "Pubblicità", "Ricambi", "Commercialista",
  "Assicurazioni", "Software / Canoni", "Personale", "Banca / Commissioni", "Utenze / Telefonia",
  "Costi generali", "Altro", "Vendita veicolo", "Intermediazione conto vendita",
];

export type Veicolo = {
  id: string;
  nome: string;
  servizio: Servizio;
  stato: Stato;
  fatturata: boolean;
  passaggioProprieta: boolean;
  garanzia: boolean;
  dataAcquisto: string;
  dataVendita: string;
  prezzoAcquisto: number;
  prezzoVendita: number | null;
  commissionePercentuale: number;
  note: string;
  numeroFattura: string;
  chilometraggio: number;
  alimentazione: string;
  versione: string;
};

export type StatoPagamento = "Saldato" | "Da saldare";

export type Movimento = {
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
  totale: number;
  ivaDetraibile: boolean;
  dataScadenza: string;
  statoPagamento: StatoPagamento;
  dataSaldo: string;
  numeroDocumento: string;
  riconciliato: boolean;
  riferimentoEstratto: string;
};

export type Impostazioni = {
  annoGestione: number;
  aliquotaIva: number;
  maggiorazioneTrimestrale: number;
  commissionePredefinita: number;
  sogliaRoi: number;
  sogliaGiorniStock: number;
  ragioneSociale: string;
  partitaIva: string;
  indirizzoAzienda: string;
  telefonoAzienda: string;
  emailAzienda: string;
  pecAzienda: string;
  prossimoNumeroContratto: number;
};

export function eur(n: number | null | undefined) {
  const v = Number(n) || 0;
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}
export function pct(n: number | null | undefined) {
  const v = Number(n) || 0;
  return v.toLocaleString("it-IT", { style: "percent", maximumFractionDigits: 1 });
}

// Costi diretti di un'auto: somma dei movimenti in uscita, natura "Variabile diretto auto",
// esclusa la categoria "Acquisto veicolo" (che è già in prezzoAcquisto).
export function costiDiretti(veicoloId: string, movimenti: Movimento[]) {
  return movimenti
    .filter((m) => m.autoId === veicoloId && m.tipo === "Uscita" && m.naturaCosto === "Variabile diretto auto" && m.categoria !== "Acquisto veicolo")
    .reduce((s, m) => s + (Number(m.totale) || 0), 0);
}

export function computeVeicolo(v: Veicolo, movimenti: Movimento[], impostazioni: Impostazioni) {
  const cd = costiDiretti(v.id, movimenti);
  const isContoVendita = v.servizio === "Conto vendita";
  const costoTotale = isContoVendita ? cd : (Number(v.prezzoAcquisto) || 0) + cd;

  const hasVendita = v.prezzoVendita !== null && v.prezzoVendita !== undefined && v.prezzoVendita !== 0;

  const commissioneImponibile = isContoVendita && hasVendita ? (v.prezzoVendita as number) * v.commissionePercentuale : null;
  const ivaCommissione = commissioneImponibile !== null ? commissioneImponibile * impostazioni.aliquotaIva : null;
  const totaleFatturaIntermediazione = commissioneImponibile !== null ? commissioneImponibile + (ivaCommissione || 0) : null;

  const margineGestionale = isContoVendita
    ? (commissioneImponibile !== null ? commissioneImponibile - cd : null)
    : (hasVendita ? (v.prezzoVendita as number) - costoTotale : null);

  const margineRegimeIva = !isContoVendita && hasVendita ? Math.max(0, (v.prezzoVendita as number) - (Number(v.prezzoAcquisto) || 0)) : null;
  const ivaRegimeMargine = margineRegimeIva !== null ? margineRegimeIva * (impostazioni.aliquotaIva / (1 + impostazioni.aliquotaIva)) : null;

  const risultatoDopoIva = isContoVendita
    ? margineGestionale
    : (margineGestionale !== null ? margineGestionale - (ivaRegimeMargine || 0) : null);

  const roi = risultatoDopoIva !== null && costoTotale ? risultatoDopoIva / costoTotale : null;

  let giorniStock: number | null = null;
  if (v.dataAcquisto) {
    const start = new Date(v.dataAcquisto).getTime();
    const end = v.dataVendita ? new Date(v.dataVendita).getTime() : Date.now();
    giorniStock = Math.max(0, Math.round((end - start) / 86400000));
  }
  const margineGiorno = risultatoDopoIva !== null && giorniStock ? risultatoDopoIva / giorniStock : null;

  return {
    costiDiretti: cd, costoTotale, commissioneImponibile, ivaCommissione, totaleFatturaIntermediazione,
    margineGestionale, margineRegimeIva, ivaRegimeMargine, risultatoDopoIva, roi, giorniStock, margineGiorno,
    isContoVendita, hasVendita,
  };
}

export function trimestre(dataStr: string): number | null {
  if (!dataStr) return null;
  const m = new Date(dataStr).getMonth() + 1;
  return Math.ceil(m / 3);
}
export function meseNum(dataStr: string): number | null {
  if (!dataStr) return null;
  return new Date(dataStr).getMonth() + 1;
}
export function annoNum(dataStr: string): number | null {
  if (!dataStr) return null;
  return new Date(dataStr).getFullYear();
}

export const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

export const SCADENZE_TRIMESTRE: Record<number, string> = {
  1: "18/05", 2: "20/08", 3: "16/11", 4: "16/03 (anno succ.)",
};

// --- Blocco 1: contatti e storico modifiche ---
export type TipoContatto = "Cliente" | "Fornitore" | "Entrambi";
export const TIPI_CONTATTO: TipoContatto[] = ["Cliente", "Fornitore", "Entrambi"];

export type Contatto = {
  id: string;
  tipo: TipoContatto;
  nome: string;
  telefono: string;
  email: string;
  note: string;
  codiceFiscale: string;
  residenza: string;
  nascitaSede: string;
};

export type AuditEntry = {
  id: string;
  tabella: string;
  recordId: string | null;
  azione: "INSERT" | "UPDATE" | "DELETE";
  datiPrecedenti: any;
  datiNuovi: any;
  utenteEmail: string | null;
  avvenutoIl: string;
};

// --- Blocco 3: documenti e avvisi ---
export type TipoDocumento = "Foto" | "Libretto" | "Fattura acquisto" | "Fattura vendita" | "Assicurazione" | "Altro";
export const TIPI_DOCUMENTO: TipoDocumento[] = ["Foto", "Libretto", "Fattura acquisto", "Fattura vendita", "Assicurazione", "Altro"];

export type Documento = {
  id: string;
  autoId: string;
  nomeFile: string;
  tipo: TipoDocumento;
  storagePath: string;
};

export type Avviso = { livello: "warning" | "danger"; messaggio: string; view?: string };

export function computeAvvisi(veicoli: Veicolo[], movimenti: Movimento[], impostazioni: Impostazioni): Avviso[] {
  const avvisi: Avviso[] = [];
  const oggi = new Date();

  // Auto ferme in stock oltre la soglia
  veicoli.forEach((v) => {
    if (v.stato === "Venduta" || v.stato === "Archiviata" || !v.dataAcquisto) return;
    const giorni = Math.round((oggi.getTime() - new Date(v.dataAcquisto).getTime()) / 86400000);
    if (giorni > impostazioni.sogliaGiorniStock) {
      avvisi.push({ livello: "warning", messaggio: `${v.nome || "Un'auto"} è ferma in stock da ${giorni} giorni`, view: "veicoli" });
    }
  });

  // Movimenti scaduti non saldati
  const scaduti = movimenti.filter((m) => m.statoPagamento === "Da saldare" && m.dataScadenza && m.dataScadenza < oggi.toISOString().slice(0, 10));
  if (scaduti.length > 0) {
    avvisi.push({ livello: "danger", messaggio: `${scaduti.length} movimenti hanno superato la scadenza di pagamento`, view: "scadenzario" });
  }

  // Scadenza liquidazione IVA vicina (entro 14 giorni)
  const trimAttuale = Math.ceil((oggi.getMonth() + 1) / 3);
  const scadenzeGiorno: Record<number, [number, number]> = { 1: [4, 18], 2: [7, 20], 3: [10, 16], 4: [2, 16] };
  const [meseScad, giornoScad] = scadenzeGiorno[trimAttuale];
  const dataScad = new Date(oggi.getFullYear(), meseScad - 1, giornoScad);
  const giorniAllaScadenza = Math.round((dataScad.getTime() - oggi.getTime()) / 86400000);
  if (giorniAllaScadenza >= 0 && giorniAllaScadenza <= 14) {
    avvisi.push({ livello: "warning", messaggio: `La liquidazione IVA del trimestre scade tra ${giorniAllaScadenza} giorni`, view: "iva" });
  }

  return avvisi;
}
