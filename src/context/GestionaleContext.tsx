"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { defaultImpostazioni } from "@/config/gestionale";
import { useAdmin } from "@/context/AdminContext";
import { useCars } from "@/context/CarContext";
import type { Car, CarStatus } from "@/types/car";
import { attivitaDedotta, bloccoCambioAttivita, collegaFlotta, inFlotta, STATO_IN_NOLEGGIO } from "@/lib/gestionale/attivita";
import { annoNum, catalogoDaStato, nomeVeicolo, statoDaCatalogo } from "@/lib/gestionale/calc";
import type { DatiAcquirente } from "@/lib/gestionale/contractPdf";
import type { GestionaleData } from "@/lib/gestionale/data";
import {
  contattoVuoto,
  movimentoVuoto,
  veicoloVuoto,
  type NuovoContatto,
  type NuovoMovimento,
  type NuovoVeicolo,
} from "@/lib/gestionale/defaults";
import {
  importoPrenotazione,
  nomeRentVeicolo,
  prenotazioneVuota,
  rentVeicoloVuoto,
  veicoloLiberoNelPeriodo,
  type NuovaPrenotazione,
  type NuovoRentVeicolo,
  type RentPrenotazione,
  type RentPreventivo,
  type RentTariffa,
  type RentVeicolo,
} from "@/lib/gestionale/rent";
import {
  NOME_ATTIVITA,
  type Attivita,
  type AzioneStorico,
  Contatto,
  Impostazioni,
  Movimento,
  Pagamento,
  TabellaStorico,
  Veicolo,
  VoceStorico,
} from "@/lib/gestionale/types";

// Stato condiviso del gestionale (auto, conti, anagrafica, noleggio). Oggi vive
// nel localStorage del browser come il resto dell'admin: quando arriverà il
// database cambiano solo la lettura iniziale e il salvataggio qui sotto, le
// pagine non se ne accorgono.
//
// Le schede economiche (Veicolo) con `carId` sono le auto del catalogo: stato e
// visibilità sul sito si sincronizzano da qui (vedi `catalogoDaStato`).

type Esito = { ok: true } | { ok: false; errore: string };
/** Rimette com'era ciò che un'eliminazione ha tolto o modificato (per il pulsante «Annulla»). */
export type Annulla = () => void;

/** Numero e anno del contratto di vendita di un'auto. */
export interface NumeroContratto {
  numero: number;
  anno: number;
  /** true = l'auto aveva già un contratto in quell'anno: si ristampa con lo stesso numero. */
  ristampa: boolean;
}

interface GestionaleContextValue {
  ready: boolean;
  veicoli: Veicolo[];
  movimenti: Movimento[];
  contatti: Contatto[];
  impostazioni: Impostazioni;
  storico: VoceStorico[];
  noleggio: GestionaleData["noleggio"];
  /** Le auto del noleggio assegnate oggi a Global Rent (`noleggio.veicoli` ha anche quelle passate alla vendita). */
  flotta: RentVeicolo[];

  // Schede economiche
  addVeicolo: (data?: NuovoVeicolo) => Veicolo;
  updateVeicolo: (id: string, patch: Partial<Omit<Veicolo, "id">>) => void;
  /** Elimina la scheda con i suoi movimenti. Solo per le schede fuori catalogo. */
  deleteVeicolo: (id: string) => Annulla;
  /** La scheda economica dell'auto del catalogo, creandola (con i dati d'acquisto) se non esiste. */
  schedaDellAuto: (car: Car, extra?: NuovoVeicolo) => Veicolo;
  /** Cambia lo stato dell'auto sul sito e, di conseguenza, quello della scheda. */
  cambiaStatoCatalogo: (carId: string, status: CarStatus) => void;
  /** Mostra o nasconde l'auto sul sito e porta la scheda nello stato coerente. */
  impostaVisibilita: (carId: string, hidden: boolean) => void;
  /**
   * Passa un veicolo da Global Drive a Global Rent o viceversa. Al noleggio esce dal catalogo ed
   * entra in flotta; alla vendita torna «In preparazione». Acquisto e spese restano sulla scheda.
   */
  assegnaAttivita: (veicoloId: string, attivita: Attivita) => Esito;
  /** L'auto è stata eliminata dal catalogo: la scheda resta, archiviata. */
  scollegaAuto: (carId: string) => void;
  /**
   * Il numero da stampare sul contratto: progressivo nell'anno di vendita, senza buchi. Se l'auto
   * ha già un contratto in quell'anno si riusa il suo numero (ristampa o correzione).
   */
  prossimoContratto: (veicoloId: string, dataVendita: string) => NumeroContratto;
  /**
   * Contratto generato: segna l'auto venduta, aggiorna il catalogo, collega il cliente
   * (anagrafica) all'auto e registra l'incasso atteso tra i movimenti. Restituisce l'id
   * del contatto acquirente (null se non indicato).
   */
  registraVendita: (
    veicoloId: string,
    vendita: {
      prezzoVendita: number;
      dataVendita: string;
      /** Scadenza dell'incasso; se manca vale la data di vendita. */
      dataConsegna?: string;
      acquirente: DatiAcquirente;
      /** Contatto scelto dall'anagrafica, se c'è. */
      contattoId?: string | null;
      strumentoPagamento?: string;
      contratto: NumeroContratto;
    }
  ) => string | null;

  addMovimento: (data?: NuovoMovimento) => Movimento;
  updateMovimento: (id: string, patch: Partial<Omit<Movimento, "id" | "totale">>) => void;
  deleteMovimento: (id: string) => Annulla;

  addContatto: (data?: NuovoContatto) => Contatto;
  updateContatto: (id: string, patch: Partial<Omit<Contatto, "id">>) => void;
  /** Le auto collegate al contatto (come fornitore o acquirente) ne impediscono l'eliminazione. */
  deleteContatto: (id: string) => Annulla;

  updateImpostazioni: (patch: Partial<Impostazioni>) => void;

  /** Crea l'auto in flotta insieme alla sua scheda nel gestionale (attività Noleggio). */
  addRentVeicolo: (data: NuovoRentVeicolo) => RentVeicolo;
  updateRentVeicolo: (id: string, patch: Partial<Omit<RentVeicolo, "id">>) => void;
  deleteRentVeicolo: (id: string) => Annulla;
  addPrenotazione: (data: NuovaPrenotazione) => Esito;
  updatePrenotazione: (id: string, patch: Partial<Omit<RentPrenotazione, "id">>) => Esito;
  deletePrenotazione: (id: string) => Annulla;
  addTariffa: (data: Omit<RentTariffa, "id">) => void;
  updateTariffa: (id: string, patch: Partial<Omit<RentTariffa, "id">>) => void;
  deleteTariffa: (id: string) => Annulla;
  addPreventivo: (data: Omit<RentPreventivo, "id" | "stato" | "note">) => void;
  updatePreventivo: (id: string, patch: Partial<Omit<RentPreventivo, "id">>) => void;
  deletePreventivo: (id: string) => Annulla;
  convertiPreventivo: (id: string) => Esito;

  // Importazioni da Excel/CSV: un solo passaggio, una voce nello storico, annullabili in blocco.
  importaMovimenti: (righe: NuovoMovimento[], file: string) => Annulla;
  /** `aggiorna`: contatti già presenti di cui completare i campi vuoti. */
  importaContatti: (nuovi: NuovoContatto[], aggiorna: { id: string; dati: NuovoContatto }[], file: string) => Annulla;
  importaVeicoli: (righe: NuovoVeicolo[], file: string) => Annulla;
  importaFlotta: (righe: NuovoRentVeicolo[], file: string) => Annulla;
  /** Estratto conto: movimenti abbinati (riconciliati e, se aperti, saldati) e movimenti nuovi. */
  riconciliaEstratto: (
    abbinati: { movimentoId: string; riferimentoEstratto: string; dataSaldo: string }[],
    nuovi: NuovoMovimento[],
    file: string
  ) => Annulla;
  /** Sostituisce tutto il gestionale con un backup (file JSON scaricato da Impostazioni). */
  ripristinaBackup: (raw: unknown) => Esito;
  /** Tutto il gestionale, per il backup. */
  esportaBackup: () => GestionaleData;
}

const GestionaleContext = createContext<GestionaleContextValue | undefined>(undefined);

const STORAGE_KEY = "global_drive_gestionale_v2";
/** Versione precedente (con i dati demo) e la sua copia: si cancellano alla prima apertura. */
const LEGACY_KEYS = ["global_drive_gestionale_v1", "global_drive_gestionale_v1_backup"];

const gestionaleVuoto = (): GestionaleData => ({
  veicoli: [],
  movimenti: [],
  contatti: [],
  impostazioni: { ...defaultImpostazioni },
  storico: [],
  noleggio: { veicoli: [], prenotazioni: [], tariffe: [], preventivi: [] },
});
const MAX_STORICO = 300;

const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// Un salvataggio di una versione vecchia non deve far perdere i dati: le parti mancanti
// si riempiono con valori vuoti e i campi aggiunti dopo prendono il loro default. Si
// riparte da un gestionale vuoto solo se il contenuto non è affatto un salvataggio.
const lista = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as T[]) : [];

function normalizza(raw: unknown): GestionaleData | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (!Array.isArray(d.veicoli) && !Array.isArray(d.movimenti) && !Array.isArray(d.contatti)) return null;
  const n = (d.noleggio && typeof d.noleggio === "object" ? d.noleggio : {}) as Record<string, unknown>;
  // I parametri nuovi aggiunti ai default compaiono anche in chi ha già un salvataggio.
  const salvate = (d.impostazioni as Partial<Impostazioni>) ?? {};
  const impostazioni: Impostazioni = {
    ...defaultImpostazioni,
    ...salvate,
    pagamentiBanca: Array.isArray(salvate.pagamentiBanca) ? salvate.pagamentiBanca : defaultImpostazioni.pagamentiBanca,
  };
  const base: GestionaleData = collegaFlotta(
    {
      impostazioni,
      veicoli: lista<Veicolo>(d.veicoli).map((v) => ({ ...veicoloVuoto(impostazioni), ...v })),
      movimenti: [],
      contatti: lista<Contatto>(d.contatti).map((c) => ({ ...contattoVuoto(), ...c })),
      storico: lista<VoceStorico>(d.storico),
      noleggio: {
        veicoli: lista<RentVeicolo>(n.veicoli).map((v) => ({ ...rentVeicoloVuoto(), ...v, veicoloId: v.veicoloId ?? null })),
        prenotazioni: [],
        tariffe: [],
        preventivi: [],
      },
    },
    () => uid("veh")
  );
  // I movimenti di prima della separazione Drive/Rent prendono l'attività dall'auto o dalla categoria.
  const movimenti = lista<Movimento>(d.movimenti).map((m) =>
    withTotale({ ...movimentoVuoto(""), ...m, attivita: m.attivita ?? attivitaDedotta(m, base.veicoli) })
  );
  return {
    ...base,
    movimenti,
    noleggio: {
      veicoli: base.noleggio.veicoli,
      prenotazioni: lista<RentPrenotazione>(n.prenotazioni).map((p) => ({
        ...prenotazioneVuota,
        ...p,
        clienteNomeLibero: p.clienteNomeLibero ?? "",
      })),
      tariffe: lista<RentTariffa>(n.tariffe),
      preventivi: lista<RentPreventivo>(n.preventivi),
    },
  };
}

const humanize = (key: string) => key.replace(/([A-Z])/g, " $1").toLowerCase();

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "sì" : "no";
  return String(v);
}

/** "stato: In vendita → Venduta, prezzo vendita: — → 16500" (al massimo 3 campi). */
function describeChanges<T extends object>(before: T, patch: Partial<T>): string {
  const changed = (Object.keys(patch) as (keyof T)[]).filter((k) => before[k] !== patch[k]);
  const parts = changed
    .slice(0, 3)
    .map((k) => `${humanize(String(k))}: ${formatValue(before[k])} → ${formatValue(patch[k])}`);
  if (changed.length > 3) parts.push(`e altri ${changed.length - 3}`);
  return parts.join(" · ");
}

const hasChanges = <T extends object>(before: T, patch: Partial<T>) =>
  (Object.keys(patch) as (keyof T)[]).some((k) => before[k] !== patch[k]);

interface LogInput {
  tabella: TabellaStorico;
  azione: AzioneStorico;
  oggetto: string;
  dettaglio?: string;
}

function conStorico(d: GestionaleData, utente: string, log: LogInput): GestionaleData {
  const voce: VoceStorico = {
    id: uid("log"),
    tabella: log.tabella,
    azione: log.azione,
    oggetto: log.oggetto,
    dettaglio: log.dettaglio ?? "",
    utente,
    quando: new Date().toISOString(),
  };
  return { ...d, storico: [voce, ...d.storico].slice(0, MAX_STORICO) };
}

const withTotale = <T extends { imponibile: number; iva: number }>(m: T) => ({
  ...m,
  totale: (Number(m.imponibile) || 0) + (Number(m.iva) || 0),
});

// --- Annulla dopo un'eliminazione -------------------------------------------
// Si confronta il prima e il dopo di ogni elenco: i record tolti si rimettono al loro posto,
// quelli modificati (es. il collegamento tolto a un contatto eliminato) tornano com'erano,
// ma solo se nel frattempo nessuno li ha toccati.

type ConId = { id: string };
interface Collezione {
  get: (d: GestionaleData) => ConId[];
  set: (d: GestionaleData, lista: ConId[]) => GestionaleData;
}
const COLLEZIONI: Collezione[] = [
  { get: (d) => d.veicoli, set: (d, l) => ({ ...d, veicoli: l as Veicolo[] }) },
  { get: (d) => d.movimenti, set: (d, l) => ({ ...d, movimenti: l as Movimento[] }) },
  { get: (d) => d.contatti, set: (d, l) => ({ ...d, contatti: l as Contatto[] }) },
  { get: (d) => d.noleggio.veicoli, set: (d, l) => ({ ...d, noleggio: { ...d.noleggio, veicoli: l as RentVeicolo[] } }) },
  { get: (d) => d.noleggio.prenotazioni, set: (d, l) => ({ ...d, noleggio: { ...d.noleggio, prenotazioni: l as RentPrenotazione[] } }) },
  { get: (d) => d.noleggio.tariffe, set: (d, l) => ({ ...d, noleggio: { ...d.noleggio, tariffe: l as RentTariffa[] } }) },
  { get: (d) => d.noleggio.preventivi, set: (d, l) => ({ ...d, noleggio: { ...d.noleggio, preventivi: l as RentPreventivo[] } }) },
];

interface Differenza {
  collezione: number;
  indice: number;
  /** null = il record è stato aggiunto (es. da un'importazione). */
  prima: ConId | null;
  /** null = il record è stato eliminato. */
  dopo: ConId | null;
}

const uguali = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

function differenze(prima: GestionaleData, dopo: GestionaleData): Differenza[] {
  const out: Differenza[] = [];
  COLLEZIONI.forEach((c, collezione) => {
    const a = c.get(prima);
    const b = c.get(dopo);
    if (a === b) return;
    const perId = new Map(b.map((x) => [x.id, x]));
    const idPrima = new Set(a.map((x) => x.id));
    a.forEach((record, indice) => {
      const nuovo = perId.get(record.id) ?? null;
      if (nuovo === record) return;
      if (nuovo === null || !uguali(nuovo, record)) out.push({ collezione, indice, prima: record, dopo: nuovo });
    });
    b.forEach((record, indice) => {
      if (!idPrima.has(record.id)) out.push({ collezione, indice, prima: null, dopo: record });
    });
  });
  return out;
}

function ripristina(d: GestionaleData, diff: Differenza[]): GestionaleData {
  return diff.reduce((acc, { collezione, indice, prima, dopo }) => {
    const c = COLLEZIONI[collezione];
    const lista = c.get(acc);
    if (prima === null) {
      // Aggiunto: si toglie, ma solo se nel frattempo nessuno l'ha modificato.
      return dopo && lista.some((x) => x.id === dopo.id && uguali(x, dopo))
        ? c.set(acc, lista.filter((x) => x.id !== dopo.id))
        : acc;
    }
    const i = lista.findIndex((x) => x.id === prima.id);
    if (dopo === null) {
      if (i !== -1) return acc;
      const l = [...lista];
      l.splice(Math.min(indice, l.length), 0, prima);
      return c.set(acc, l);
    }
    if (i === -1 || !uguali(lista[i], dopo)) return acc;
    return c.set(acc, lista.map((x, j) => (j === i ? prima : x)));
  }, d);
}

// L'acquisto di un'auto è un movimento d'uscita "Acquisto veicolo" collegato alla scheda e al
// fornitore. Lo crea e lo tiene allineato il prezzo d'acquisto della scheda, che resta l'unica
// fonte del dato (i costi diretti della scheda escludono questa categoria per non contarlo due volte).
function conAcquisto(d: GestionaleData, v: Veicolo, oggi: string): GestionaleData {
  if (!(v.prezzoAcquisto > 0)) return d;
  const fornitore = d.contatti.find((c) => c.id === v.fornitoreId);
  const esistente = d.movimenti.find((m) => m.autoId === v.id && m.categoria === "Acquisto veicolo");
  const campi = {
    data: v.dataAcquisto || esistente?.data || oggi,
    contattoId: v.fornitoreId,
    fornitoreCliente: fornitore?.nome ?? esistente?.fornitoreCliente ?? "",
    imponibile: v.prezzoAcquisto,
  };
  if (esistente) {
    return { ...d, movimenti: d.movimenti.map((m) => (m.id === esistente.id ? withTotale({ ...m, ...campi }) : m)) };
  }
  const nuovo: Movimento = withTotale({
    ...movimentoVuoto(oggi),
    ...campi,
    id: uid("mov"),
    autoId: v.id,
    tipo: "Uscita" as const,
    categoria: "Acquisto veicolo",
    naturaCosto: "Variabile diretto auto" as const,
    descrizione: `Acquisto ${nomeVeicolo(v)}`,
  });
  return { ...d, movimenti: [nuovo, ...d.movimenti] };
}

const pagamentoDa = (strumento: string): Pagamento =>
  strumento === "Bonifico bancario" ? "Bonifico" : strumento === "Contanti" ? "CASH" : "CONTO";

const soloCifre = (p: string) => p.replace(/\D/g, "");

/** Toglie la parte di noleggio di un veicolo eliminato: l'auto in flotta, le sue prenotazioni, il legame coi preventivi. */
function senzaNoleggioDi(d: GestionaleData, veicoloId: string | null, rentId?: string): Pick<GestionaleData, "noleggio"> {
  const via = new Set(
    d.noleggio.veicoli.filter((r) => r.id === rentId || (veicoloId && r.veicoloId === veicoloId)).map((r) => r.id)
  );
  if (via.size === 0) return { noleggio: d.noleggio };
  return {
    noleggio: {
      ...d.noleggio,
      veicoli: d.noleggio.veicoli.filter((r) => !via.has(r.id)),
      prenotazioni: d.noleggio.prenotazioni.filter((p) => !via.has(p.veicoloId)),
      preventivi: d.noleggio.preventivi.map((p) => (p.veicoloId && via.has(p.veicoloId) ? { ...p, veicoloId: null } : p)),
    },
  };
}

export function GestionaleProvider({ children }: { children: React.ReactNode }) {
  const { user, today, leads, updateLead } = useAdmin();
  const { cars, updateCar } = useCars();
  const utente = user?.name || user?.email || "Admin";

  const [ready, setReady] = useState(false);
  const [data, setData] = useState<GestionaleData>(gestionaleVuoto);

  const flotta = useMemo(
    () => data.noleggio.veicoli.filter((r) => inFlotta(r, data.veicoli)),
    [data.noleggio.veicoli, data.veicoli]
  );

  // Serve a leggere lo stato più recente dentro le azioni che toccano anche il catalogo.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Lettura iniziale dopo il montaggio: il localStorage non esiste sul server.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
      const raw = localStorage.getItem(STORAGE_KEY);
      // Copia di sicurezza di ciò che c'era prima di questa sessione, per non perderlo mai in silenzio.
      if (raw) localStorage.setItem(STORAGE_KEY + "_backup", raw);
      const stored = raw ? normalizza(JSON.parse(raw)) : null;
      if (stored) setData(stored);
    } catch (e) {
      console.error("Impossibile leggere il gestionale", e);
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Impossibile salvare il gestionale", e);
    }
  }, [data, ready]);

  /** Applica una modifica e, se ne restituisce una, la registra nello storico. */
  const edit = useCallback(
    (recipe: (d: GestionaleData) => { data: GestionaleData; log?: LogInput } | null) => {
      setData((prev) => {
        const out = recipe(prev);
        if (!out) return prev;
        return out.log ? conStorico(out.data, utente, out.log) : out.data;
      });
    },
    [utente]
  );

  /**
   * Come `edit`, per le eliminazioni: restituisce la funzione che le annulla. L'annullamento
   * rimette solo i record toccati, senza perdere quello che è cambiato nel frattempo.
   */
  const editAnnullabile = useCallback(
    (recipe: (d: GestionaleData) => { data: GestionaleData; log?: LogInput } | null, oggetto?: LogInput): Annulla => {
      let diff: Differenza[] = [];
      edit((d) => {
        const out = recipe(d);
        if (out) diff = differenze(d, out.data);
        return out;
      });
      return () => {
        if (diff.length === 0) return;
        const daRipristinare = diff;
        diff = [];
        edit((d) => ({
          data: ripristina(d, daRipristinare),
          log: oggetto && { dettaglio: "eliminazione annullata", ...oggetto },
        }));
      };
    },
    [edit]
  );

  /** Riflette sul sito lo stato di una scheda collegata a un'auto del catalogo. */
  const sincronizzaCatalogo = useCallback(
    (carId: string, stato: Veicolo["stato"], venduta = false) => {
      const { status, hidden, featured } = catalogoDaStato(stato, venduta);
      updateCar(carId, {
        status,
        ...(hidden !== undefined && { hidden }),
        ...(featured === false && { featured: false }),
      });
    },
    [updateCar]
  );

  // --- Schede economiche -----------------------------------------------------

  const addVeicolo = useCallback<GestionaleContextValue["addVeicolo"]>(
    (init = {}) => {
      const item: Veicolo = {
        ...veicoloVuoto(dataRef.current.impostazioni),
        ...init,
        id: uid("veh"),
      };
      edit((d) => ({
        data: conAcquisto({ ...d, veicoli: [item, ...d.veicoli] }, item, today),
        log: { tabella: "auto", azione: "Creato", oggetto: nomeVeicolo(item) },
      }));
      return item;
    },
    [edit, today]
  );

  const updateVeicolo = useCallback<GestionaleContextValue["updateVeicolo"]>(
    (id, patch) => {
      const current = dataRef.current.veicoli.find((v) => v.id === id);
      if (!current) return;
      // Venduta senza passare dal contratto: la data di vendita serve a IVA e analisi.
      // Se la vendita viene annullata (torna in uno stato prima della vendita), la data si toglie.
      // Archiviare un'auto venduta invece la tiene: la vendita resta in IVA e analisi.
      const effettivo = { ...patch };
      // Lo stato di vendita di un'auto a noleggio resta fermo: la si porta prima a Global Drive.
      if (current.attivita === "Noleggio" && patch.attivita === undefined) delete effettivo.stato;
      if (effettivo.stato === "Venduta" && current.stato !== "Venduta" && !current.dataVendita && patch.dataVendita === undefined) {
        effettivo.dataVendita = today;
      }
      if (
        effettivo.stato &&
        effettivo.stato !== "Venduta" &&
        effettivo.stato !== "Archiviata" &&
        current.stato === "Venduta" &&
        patch.dataVendita === undefined
      ) {
        effettivo.dataVendita = "";
      }
      if (!hasChanges(current, effettivo)) return;
      const toccaAcquisto = "prezzoAcquisto" in effettivo || "fornitoreId" in effettivo || "dataAcquisto" in effettivo;
      edit((d) => {
        const aggiornato = { ...current, ...effettivo };
        let base = { ...d, veicoli: d.veicoli.map((v) => (v.id === id ? aggiornato : v)) };
        // Nome, targa e km valgono anche per la parte di noleggio dell'auto.
        if (["marca", "modello", "targa", "chilometraggio"].some((k) => k in effettivo)) {
          const { marca, modello, targa, chilometraggio } = aggiornato;
          base = {
            ...base,
            noleggio: {
              ...base.noleggio,
              veicoli: base.noleggio.veicoli.map((r) =>
                r.veicoloId === id ? { ...r, marca, modello, targa, kmAttuali: Math.max(r.kmAttuali, chilometraggio) } : r
              ),
            },
          };
        }
        return {
          data: toccaAcquisto ? conAcquisto(base, aggiornato, today) : base,
          log: {
            tabella: "auto",
            azione: "Modificato",
            oggetto: nomeVeicolo(aggiornato),
            dettaglio: describeChanges(current, effettivo),
          },
        };
      });
      if (current.carId && effettivo.stato && effettivo.stato !== current.stato) {
        const dataVendita = effettivo.dataVendita ?? current.dataVendita;
        sincronizzaCatalogo(current.carId, effettivo.stato, Boolean(dataVendita));
      }
    },
    [edit, sincronizzaCatalogo, today]
  );

  const deleteVeicolo = useCallback<GestionaleContextValue["deleteVeicolo"]>(
    (id) => {
      const current = dataRef.current.veicoli.find((v) => v.id === id);
      // Un'auto del catalogo si elimina da Parco auto (la scheda resta archiviata).
      if (!current || current.carId) return () => {};
      const oggetto = nomeVeicolo(current);
      return editAnnullabile(
        (d) => ({
          data: {
            ...d,
            ...senzaNoleggioDi(d, id),
            veicoli: d.veicoli.filter((v) => v.id !== id),
            movimenti: d.movimenti.filter((m) => m.autoId !== id),
          },
          log: { tabella: "auto", azione: "Eliminato", oggetto, dettaglio: "con i suoi movimenti" },
        }),
        { tabella: "auto", azione: "Creato", oggetto }
      );
    },
    [editAnnullabile]
  );

  const assegnaAttivita = useCallback<GestionaleContextValue["assegnaAttivita"]>(
    (veicoloId, attivita) => {
      const d0 = dataRef.current;
      const current = d0.veicoli.find((v) => v.id === veicoloId);
      if (!current) return { ok: false, errore: "Auto non trovata." };
      if (current.attivita === attivita) return { ok: true };
      const blocco = bloccoCambioAttivita(current, attivita, d0);
      if (blocco) return { ok: false, errore: blocco };
      // Al noleggio l'auto esce dal catalogo; tornando alla vendita va prima preparata.
      const stato: Veicolo["stato"] = attivita === "Noleggio" ? STATO_IN_NOLEGGIO : "In preparazione";
      const profilo = d0.noleggio.veicoli.find((r) => r.veicoloId === veicoloId);
      edit((d) => {
        const km = Math.max(current.chilometraggio, profilo?.kmAttuali ?? 0);
        const veicoli = d.veicoli.map((v) => (v.id === veicoloId ? { ...v, attivita, stato, chilometraggio: km } : v));
        let flottaNuova = d.noleggio.veicoli;
        if (attivita === "Noleggio") {
          const dati = { marca: current.marca, modello: current.modello, targa: current.targa, kmAttuali: km };
          // Se l'auto era già stata a noleggio ritrova categoria, tariffa e scadenze di allora.
          flottaNuova = profilo
            ? flottaNuova.map((r) => (r.id === profilo.id ? { ...r, ...dati, stato: "Disponibile" as const } : r))
            : [{ ...rentVeicoloVuoto(), ...dati, id: uid("rv"), veicoloId }, ...flottaNuova];
        }
        return {
          data: { ...d, veicoli, noleggio: { ...d.noleggio, veicoli: flottaNuova } },
          log: {
            tabella: "auto",
            azione: "Modificato",
            oggetto: nomeVeicolo(current),
            dettaglio: `da ${NOME_ATTIVITA[current.attivita]} a ${NOME_ATTIVITA[attivita]}`,
          },
        };
      });
      if (current.carId) sincronizzaCatalogo(current.carId, stato);
      return { ok: true };
    },
    [edit, sincronizzaCatalogo]
  );

  const schedaDellAuto = useCallback<GestionaleContextValue["schedaDellAuto"]>(
    (car, extra = {}) => {
      const esistente = dataRef.current.veicoli.find((v) => v.carId === car.id);
      if (esistente) return esistente;
      // Un'auto nascosta dal catalogo non è ancora pronta alla vendita.
      const stato = car.hidden && car.status !== "Venduta" ? "In preparazione" : statoDaCatalogo(car.status);
      return addVeicolo({
        carId: car.id,
        marca: car.brand,
        modello: car.model,
        versione: car.version,
        chilometraggio: car.mileage,
        alimentazione: car.fuel,
        stato,
        ...extra,
      });
    },
    [addVeicolo]
  );

  const cambiaStatoCatalogo = useCallback<GestionaleContextValue["cambiaStatoCatalogo"]>(
    (carId, status) => {
      updateCar(carId, { status });
      const scheda = dataRef.current.veicoli.find((v) => v.carId === carId);
      if (!scheda) return;
      // Se la scheda già corrisponde allo stato scelto non si tocca: un'auto "In preparazione"
      // resta tale anche se sul sito il suo stato è "Disponibile".
      if (catalogoDaStato(scheda.stato, Boolean(scheda.dataVendita)).status === status) return;
      updateVeicolo(scheda.id, { stato: statoDaCatalogo(status) });
    },
    [updateCar, updateVeicolo]
  );

  const impostaVisibilita = useCallback<GestionaleContextValue["impostaVisibilita"]>(
    (carId, hidden) => {
      updateCar(carId, hidden ? { hidden: true, featured: false } : { hidden: false });
      const scheda = dataRef.current.veicoli.find((v) => v.carId === carId);
      if (!scheda) return;
      let stato = scheda.stato;
      if (hidden && (stato === "In vendita" || stato === "Prenotata")) {
        stato = "In preparazione";
      } else if (!hidden && (stato === "In valutazione" || stato === "Acquistata" || stato === "In preparazione")) {
        const car = cars.find((c) => c.id === carId);
        stato = car ? statoDaCatalogo(car.status) : "In vendita";
      }
      if (stato !== scheda.stato) updateVeicolo(scheda.id, { stato });
    },
    [cars, updateCar, updateVeicolo]
  );

  const scollegaAuto = useCallback<GestionaleContextValue["scollegaAuto"]>(
    (carId) => {
      const scheda = dataRef.current.veicoli.find((v) => v.carId === carId);
      if (!scheda) return;
      edit((d) => ({
        data: {
          ...d,
          veicoli: d.veicoli.map((v) =>
            v.id === scheda.id
              ? { ...v, carId: null, stato: v.stato === "Venduta" ? v.stato : "Archiviata" }
              : v
          ),
        },
        log: { tabella: "auto", azione: "Modificato", oggetto: nomeVeicolo(scheda), dettaglio: "tolta dal catalogo" },
      }));
    },
    [edit]
  );

  const prossimoContratto = useCallback<GestionaleContextValue["prossimoContratto"]>(
    (veicoloId, dataVendita) => {
      const d = dataRef.current;
      const anno = annoNum(dataVendita) ?? Number(today.slice(0, 4));
      const scheda = d.veicoli.find((v) => v.id === veicoloId);
      if (scheda?.numeroContratto && scheda.annoContratto === anno) {
        return { numero: scheda.numeroContratto, anno, ristampa: true };
      }
      const ultimo = d.veicoli.reduce(
        (max, v) => (v.annoContratto === anno && v.numeroContratto ? Math.max(max, v.numeroContratto) : max),
        0
      );
      // Il numero di partenza impostato a mano (es. si prosegue una numerazione su carta) vale per l'anno di gestione.
      const minimo = anno === d.impostazioni.annoGestione ? d.impostazioni.prossimoNumeroContratto : 1;
      return { numero: Math.max(minimo, ultimo + 1), anno, ristampa: false };
    },
    [today]
  );

  const registraVendita = useCallback<GestionaleContextValue["registraVendita"]>(
    (
      veicoloId,
      { prezzoVendita, dataVendita, dataConsegna = "", acquirente, contattoId = null, strumentoPagamento = "", contratto }
    ) => {
      const scheda = dataRef.current.veicoli.find((v) => v.id === veicoloId);
      if (!scheda) return null;
      const nome = acquirente.nome.trim();
      // Il cliente: quello scelto in anagrafica, o chi ha lo stesso nome, o uno nuovo (id deciso qui,
      // così si conosce anche fuori dall'aggiornamento).
      const esistente =
        dataRef.current.contatti.find((c) => c.id === contattoId) ??
        (nome ? dataRef.current.contatti.find((c) => c.nome.trim().toLowerCase() === nome.toLowerCase()) : undefined);
      const nuovoId = uid("con");
      const acquirenteId: string | null = esistente?.id ?? (nome ? nuovoId : null);

      edit((d) => {
        const dati = {
          telefono: acquirente.telefono,
          email: acquirente.email,
          codiceFiscale: acquirente.codiceFiscale,
          residenza: acquirente.residenza,
          nascitaSede: acquirente.nascitaSede,
        };
        const trovato = esistente ? d.contatti.find((c) => c.id === esistente.id) : undefined;
        let contatti = d.contatti;
        if (trovato) {
          // Si completano solo i dati che mancano; un fornitore che compra diventa "Entrambi".
          contatti = d.contatti.map((c) => {
            if (c.id !== trovato.id) return c;
            const completato: Contatto = { ...c, tipo: c.tipo === "Fornitore" ? "Entrambi" : c.tipo };
            (Object.keys(dati) as (keyof typeof dati)[]).forEach((k) => {
              if (dati[k] && !c[k]) completato[k] = dati[k];
            });
            return completato;
          });
        } else if (nome) {
          const nuovo: Contatto = { ...contattoVuoto(), id: nuovoId, nome, ...dati };
          contatti = [nuovo, ...d.contatti];
        }

        // L'incasso atteso entra nei movimenti (da saldare), con scadenza alla consegna (o alla
        // vendita) così compare nello scadenzario e negli avvisi. Nel conto vendita si incassa solo
        // la commissione, con la sua IVA; la vendita è del proprietario.
        const contoVendita = scheda.servizio === "Conto vendita";
        const categoria = contoVendita ? "Intermediazione conto vendita" : "Vendita veicolo";
        const imponibile = contoVendita ? prezzoVendita * scheda.commissionePercentuale : prezzoVendita;
        const campiIncasso = {
          data: dataVendita,
          contattoId: acquirenteId,
          fornitoreCliente: nome || trovato?.nome || "",
          pagamento: pagamentoDa(strumentoPagamento),
          imponibile,
          iva: contoVendita ? imponibile * d.impostazioni.aliquotaIva : 0,
          dataScadenza: dataConsegna || dataVendita,
        };
        const incassoEsistente = d.movimenti.find(
          (m) => m.autoId === veicoloId && m.tipo === "Entrata" && m.categoria === categoria
        );
        let movimenti = d.movimenti;
        if (!incassoEsistente) {
          const incasso: Movimento = withTotale({
            ...movimentoVuoto(today),
            ...campiIncasso,
            id: uid("mov"),
            autoId: veicoloId,
            descrizione: `Vendita ${nomeVeicolo(scheda)}`,
            tipo: "Entrata" as const,
            categoria,
            naturaCosto: "Variabile generale" as const,
            statoPagamento: "Da saldare" as const,
            numeroDocumento: scheda.numeroFattura,
          });
          movimenti = [incasso, ...d.movimenti];
        } else if (incassoEsistente.statoPagamento === "Da saldare") {
          // Contratto ristampato con dati corretti: l'incasso ancora aperto si allinea.
          movimenti = d.movimenti.map((m) => (m.id === incassoEsistente.id ? withTotale({ ...m, ...campiIncasso }) : m));
        }

        const impostazioni =
          !contratto.ristampa && contratto.anno === d.impostazioni.annoGestione
            ? { ...d.impostazioni, prossimoNumeroContratto: Math.max(d.impostazioni.prossimoNumeroContratto, contratto.numero + 1) }
            : d.impostazioni;

        return {
          data: {
            ...d,
            contatti,
            movimenti,
            impostazioni,
            veicoli: d.veicoli.map((v) =>
              v.id === veicoloId
                ? {
                    ...v,
                    prezzoVendita,
                    dataVendita,
                    stato: "Venduta",
                    acquirenteId,
                    numeroContratto: contratto.numero,
                    annoContratto: contratto.anno,
                  }
                : v
            ),
          },
          log: {
            tabella: "auto",
            azione: "Modificato",
            oggetto: nomeVeicolo(scheda),
            dettaglio: `venduta${nome ? ` a ${nome}` : ""} · contratto N° ${contratto.numero}/${contratto.anno}${
              contratto.ristampa ? " ristampato" : ""
            }`,
          },
        };
      });
      if (scheda.carId) sincronizzaCatalogo(scheda.carId, "Venduta");
      // Le richieste aperte di chi ha comprato si chiudono: collegate al contatto o con lo stesso telefono.
      const telefono = soloCifre(acquirente.telefono);
      leads
        .filter(
          (l) =>
            (l.status === "nuovo" || l.status === "in_gestione") &&
            ((acquirenteId && l.contattoId === acquirenteId) || (telefono && soloCifre(l.phone) === telefono))
        )
        .forEach((l) => updateLead(l.id, { status: "completato" }));
      return acquirenteId;
    },
    [edit, sincronizzaCatalogo, today, leads, updateLead]
  );

  // --- Movimenti -------------------------------------------------------------

  const addMovimento = useCallback<GestionaleContextValue["addMovimento"]>(
    (init = {}) => {
      const attivita = init.attivita ?? attivitaDedotta({ autoId: init.autoId ?? null, categoria: init.categoria ?? "" }, dataRef.current.veicoli);
      const item: Movimento = withTotale({ ...movimentoVuoto(today), ...init, attivita, id: uid("mov") });
      edit((d) => ({
        data: { ...d, movimenti: [item, ...d.movimenti] },
        log: { tabella: "movimenti", azione: "Creato", oggetto: item.descrizione || item.categoria },
      }));
      return item;
    },
    [edit, today]
  );

  const updateMovimento = useCallback<GestionaleContextValue["updateMovimento"]>(
    (id, patch) => {
      const current = dataRef.current.movimenti.find((m) => m.id === id);
      if (!current || !hasChanges(current, patch)) return;
      edit((d) => ({
        data: { ...d, movimenti: d.movimenti.map((m) => (m.id === id ? withTotale({ ...m, ...patch }) : m)) },
        log: {
          tabella: "movimenti",
          azione: "Modificato",
          oggetto: (patch.descrizione ?? current.descrizione) || current.categoria,
          dettaglio: describeChanges(current, patch),
        },
      }));
    },
    [edit]
  );

  const deleteMovimento = useCallback<GestionaleContextValue["deleteMovimento"]>(
    (id) => {
      const current = dataRef.current.movimenti.find((m) => m.id === id);
      if (!current) return () => {};
      const oggetto = current.descrizione || current.categoria;
      return editAnnullabile(
        (d) => ({
          data: { ...d, movimenti: d.movimenti.filter((m) => m.id !== id) },
          log: { tabella: "movimenti", azione: "Eliminato", oggetto },
        }),
        { tabella: "movimenti", azione: "Creato", oggetto }
      );
    },
    [editAnnullabile]
  );

  // --- Contatti --------------------------------------------------------------

  const addContatto = useCallback<GestionaleContextValue["addContatto"]>(
    (init = {}) => {
      const item: Contatto = { ...contattoVuoto(), ...init, id: uid("con") };
      edit((d) => ({
        data: { ...d, contatti: [item, ...d.contatti] },
        log: { tabella: "contatti", azione: "Creato", oggetto: item.nome || "Contatto senza nome" },
      }));
      return item;
    },
    [edit]
  );

  const updateContatto = useCallback<GestionaleContextValue["updateContatto"]>(
    (id, patch) => {
      const current = dataRef.current.contatti.find((c) => c.id === id);
      if (!current || !hasChanges(current, patch)) return;
      // Un nome corretto si vede anche sui movimenti collegati (il loro nome in chiaro era il vecchio).
      const rinomina = patch.nome !== undefined && patch.nome.trim() !== "" && patch.nome !== current.nome;
      edit((d) => ({
        data: {
          ...d,
          contatti: d.contatti.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          movimenti: rinomina
            ? d.movimenti.map((m) =>
                m.contattoId === id && (m.fornitoreCliente === current.nome || !m.fornitoreCliente)
                  ? { ...m, fornitoreCliente: patch.nome as string }
                  : m
              )
            : d.movimenti,
        },
        log: {
          tabella: "contatti",
          azione: "Modificato",
          oggetto: (patch.nome ?? current.nome) || "Contatto senza nome",
          dettaglio: describeChanges(current, patch),
        },
      }));
    },
    [edit]
  );

  const deleteContatto = useCallback<GestionaleContextValue["deleteContatto"]>(
    (id) => {
      const current = dataRef.current.contatti.find((c) => c.id === id);
      // Chi ha venduto o comprato un'auto resta: la scheda (e il contratto) perderebbero la controparte.
      if (!current || dataRef.current.veicoli.some((v) => v.fornitoreId === id || v.acquirenteId === id)) {
        return () => {};
      }
      const oggetto = current.nome || "Contatto senza nome";
      return editAnnullabile((d) => ({
        data: {
          ...d,
          contatti: d.contatti.filter((c) => c.id !== id),
          // Movimenti, prenotazioni e preventivi restano, con il nome in chiaro al posto del collegamento.
          movimenti: d.movimenti.map((m) =>
            m.contattoId === id ? { ...m, contattoId: null, fornitoreCliente: m.fornitoreCliente || current.nome } : m
          ),
          noleggio: {
            ...d.noleggio,
            prenotazioni: d.noleggio.prenotazioni.map((p) =>
              p.contattoId === id ? { ...p, contattoId: null, clienteNomeLibero: p.clienteNomeLibero || current.nome } : p
            ),
            preventivi: d.noleggio.preventivi.map((p) =>
              p.contattoId === id ? { ...p, contattoId: null, clienteNomeLibero: p.clienteNomeLibero || current.nome } : p
            ),
          },
        },
        log: { tabella: "contatti", azione: "Eliminato", oggetto },
      }), { tabella: "contatti", azione: "Creato", oggetto });
    },
    [editAnnullabile]
  );

  // --- Impostazioni ----------------------------------------------------------

  const updateImpostazioni = useCallback<GestionaleContextValue["updateImpostazioni"]>(
    (patch) => {
      edit((d) => {
        if (!hasChanges(d.impostazioni, patch)) return null;
        return { data: { ...d, impostazioni: { ...d.impostazioni, ...patch } } };
      });
    },
    [edit]
  );

  // --- Noleggio --------------------------------------------------------------

  const addRentVeicolo = useCallback<GestionaleContextValue["addRentVeicolo"]>(
    (init) => {
      const scheda: Veicolo = {
        ...veicoloVuoto(dataRef.current.impostazioni),
        id: uid("veh"),
        attivita: "Noleggio",
        stato: STATO_IN_NOLEGGIO,
        marca: init.marca,
        modello: init.modello,
        targa: init.targa,
        chilometraggio: init.kmAttuali,
      };
      const item: RentVeicolo = { ...init, id: uid("rv"), veicoloId: scheda.id };
      edit((d) => ({
        data: { ...d, veicoli: [scheda, ...d.veicoli], noleggio: { ...d.noleggio, veicoli: [item, ...d.noleggio.veicoli] } },
        log: { tabella: "noleggio", azione: "Creato", oggetto: nomeRentVeicolo(item), dettaglio: "auto in flotta" },
      }));
      return item;
    },
    [edit]
  );

  const updateRentVeicolo = useCallback<GestionaleContextValue["updateRentVeicolo"]>(
    (id, patch) => {
      const current = dataRef.current.noleggio.veicoli.find((v) => v.id === id);
      if (!current || !hasChanges(current, patch)) return;
      const aggiornato = { ...current, ...patch };
      edit((d) => ({
        data: {
          ...d,
          // Nome, targa e km si scrivono anche sulla scheda dell'auto.
          veicoli: d.veicoli.map((v) =>
            v.id === current.veicoloId
              ? {
                  ...v,
                  marca: aggiornato.marca,
                  modello: aggiornato.modello,
                  targa: aggiornato.targa,
                  chilometraggio: Math.max(v.chilometraggio, aggiornato.kmAttuali),
                }
              : v
          ),
          noleggio: { ...d.noleggio, veicoli: d.noleggio.veicoli.map((v) => (v.id === id ? aggiornato : v)) },
        },
        log: {
          tabella: "noleggio",
          azione: "Modificato",
          oggetto: nomeRentVeicolo({ ...current, ...patch }),
          dettaglio: describeChanges(current, patch),
        },
      }));
    },
    [edit]
  );

  const deleteRentVeicolo = useCallback<GestionaleContextValue["deleteRentVeicolo"]>(
    (id) => {
      const current = dataRef.current.noleggio.veicoli.find((v) => v.id === id);
      if (!current) return () => {};
      const oggetto = nomeRentVeicolo(current);
      // Si elimina il veicolo intero: anche la scheda con i suoi movimenti, se non è un'auto del catalogo.
      const scheda = dataRef.current.veicoli.find((v) => v.id === current.veicoloId);
      const via = scheda && !scheda.carId ? scheda.id : null;
      return editAnnullabile(
        (d) => ({
          data: {
            ...d,
            ...senzaNoleggioDi(d, current.veicoloId, id),
            // Un'auto del catalogo resta: torna a Global Drive, da preparare.
            veicoli: via
              ? d.veicoli.filter((v) => v.id !== via)
              : d.veicoli.map((v) =>
                  v.id === current.veicoloId ? { ...v, attivita: "Vendita" as const, stato: "In preparazione" as const } : v
                ),
            movimenti: via ? d.movimenti.filter((m) => m.autoId !== via) : d.movimenti,
          },
          log: { tabella: "noleggio", azione: "Eliminato", oggetto, dettaglio: "con le sue prenotazioni e i suoi movimenti" },
        }),
        { tabella: "noleggio", azione: "Creato", oggetto }
      );
    },
    [editAnnullabile]
  );

  const addPrenotazione = useCallback<GestionaleContextValue["addPrenotazione"]>(
    (init) => {
      const { prenotazioni, veicoli } = dataRef.current.noleggio;
      if (init.dataFine < init.dataInizio) {
        return { ok: false, errore: "La data di fine non può precedere quella di inizio." };
      }
      if (!veicoloLiberoNelPeriodo(init.veicoloId, init.dataInizio, init.dataFine, prenotazioni)) {
        return { ok: false, errore: "Questa auto è già prenotata in tutto o in parte del periodo scelto." };
      }
      const auto = veicoli.find((v) => v.id === init.veicoloId);
      if (auto && !inFlotta(auto, dataRef.current.veicoli)) {
        return { ok: false, errore: `${nomeRentVeicolo(auto)} è passata alla vendita: non è più in flotta.` };
      }
      if (auto && (auto.stato === "Fuori servizio" || auto.stato === "In manutenzione")) {
        return { ok: false, errore: `${nomeRentVeicolo(auto)} è «${auto.stato}»: rimettila disponibile dalla Flotta prima di prenotarla.` };
      }
      const item: RentPrenotazione = { ...prenotazioneVuota, ...init, id: uid("rp"), stato: "Prenotata" };
      edit((d) => ({
        data: { ...d, noleggio: { ...d.noleggio, prenotazioni: [item, ...d.noleggio.prenotazioni] } },
        log: {
          tabella: "noleggio",
          azione: "Creato",
          oggetto: `Prenotazione ${auto ? nomeRentVeicolo(auto) : ""}`.trim(),
          dettaglio: `dal ${init.dataInizio} al ${init.dataFine}`,
        },
      }));
      return { ok: true };
    },
    [edit]
  );

  const updatePrenotazione = useCallback<GestionaleContextValue["updatePrenotazione"]>(
    (id, patch) => {
      const { prenotazioni, veicoli } = dataRef.current.noleggio;
      const current = prenotazioni.find((p) => p.id === id);
      if (!current) return { ok: false, errore: "Prenotazione non trovata." };
      if (!hasChanges(current, patch)) return { ok: true };
      // Riattivare una prenotazione annullata (o spostarne le date) non deve creare un doppio impegno.
      const dopo = { ...current, ...patch };
      if (dopo.stato === "Prenotata" || dopo.stato === "In corso") {
        if (dopo.dataFine < dopo.dataInizio) {
          return { ok: false, errore: "La data di fine non può precedere quella di inizio." };
        }
        if (!veicoloLiberoNelPeriodo(dopo.veicoloId, dopo.dataInizio, dopo.dataFine, prenotazioni, id)) {
          return { ok: false, errore: "L'auto risulta già prenotata in questo periodo." };
        }
      }
      const auto = veicoli.find((v) => v.id === current.veicoloId);
      const nomeAuto = auto ? nomeRentVeicolo(auto) : "";
      const cambiaStato = patch.stato !== undefined && patch.stato !== current.stato;
      const nuovoMovId = uid("mov");
      edit((d) => {
        let { movimenti } = d;
        let flotta = d.noleggio.veicoli;
        let aggiornata: RentPrenotazione = { ...current, ...patch };
        if (cambiaStato) {
          // La flotta segue il noleggio: in corso = noleggiata, concluso o annullato = di nuovo disponibile
          // (con i km della riconsegna, se scritti).
          flotta = flotta.map((v) => {
            if (v.id !== aggiornata.veicoloId) return v;
            if (aggiornata.stato === "In corso" && v.stato === "Disponibile") return { ...v, stato: "Noleggiata" as const };
            if (aggiornata.stato !== "In corso" && current.stato === "In corso" && v.stato === "Noleggiata") {
              const km = aggiornata.kmRiconsegna && aggiornata.kmRiconsegna > v.kmAttuali ? aggiornata.kmRiconsegna : v.kmAttuali;
              return { ...v, stato: "Disponibile" as const, kmAttuali: km };
            }
            return v;
          });
          // Noleggio concluso: l'incasso entra nei movimenti (da saldare alla riconsegna), una volta sola.
          const esistente = d.movimenti.find((m) => m.id === aggiornata.movimentoId);
          if (aggiornata.stato === "Conclusa" && !esistente) {
            const totale = importoPrenotazione(aggiornata);
            const aliquota = d.impostazioni.aliquotaIva;
            const imponibile = d.impostazioni.noleggioIvaInclusa
              ? Math.round((totale / (1 + aliquota)) * 100) / 100
              : totale;
            const iva = d.impostazioni.noleggioIvaInclusa
              ? Math.round((totale - imponibile) * 100) / 100
              : Math.round(totale * aliquota * 100) / 100;
            const cliente = d.contatti.find((c) => c.id === aggiornata.contattoId);
            const incasso: Movimento = withTotale({
              ...movimentoVuoto(today),
              id: nuovoMovId,
              attivita: "Noleggio" as const,
              // L'incasso va sulla scheda dell'auto: così si vede quanto ha reso.
              autoId: flotta.find((v) => v.id === aggiornata.veicoloId)?.veicoloId ?? null,
              data: aggiornata.dataFine,
              contattoId: aggiornata.contattoId,
              fornitoreCliente: cliente?.nome || aggiornata.clienteNomeLibero,
              descrizione: `Noleggio ${nomeAuto} dal ${aggiornata.dataInizio.split("-").reverse().join("/")} al ${aggiornata.dataFine.split("-").reverse().join("/")}`,
              tipo: "Entrata" as const,
              categoria: "Noleggio",
              naturaCosto: "Variabile generale" as const,
              imponibile,
              iva,
              statoPagamento: "Da saldare" as const,
              dataScadenza: aggiornata.dataFine,
            });
            movimenti = [incasso, ...movimenti];
            aggiornata = { ...aggiornata, movimentoId: incasso.id };
          }
          // Riaperto o annullato dopo la conclusione: l'incasso ancora da saldare si toglie.
          if (aggiornata.stato !== "Conclusa" && esistente && esistente.statoPagamento === "Da saldare") {
            movimenti = movimenti.filter((m) => m.id !== esistente.id);
            aggiornata = { ...aggiornata, movimentoId: null };
          }
        }
        return {
          data: {
            ...d,
            movimenti,
            noleggio: {
              ...d.noleggio,
              veicoli: flotta,
              prenotazioni: d.noleggio.prenotazioni.map((p) => (p.id === id ? aggiornata : p)),
            },
          },
          log: {
            tabella: "noleggio",
            azione: "Modificato",
            oggetto: `Prenotazione ${nomeAuto}`.trim(),
            dettaglio: describeChanges(current, patch),
          },
        };
      });
      return { ok: true };
    },
    [edit, today]
  );

  const deletePrenotazione = useCallback<GestionaleContextValue["deletePrenotazione"]>(
    (id) => {
      const current = dataRef.current.noleggio.prenotazioni.find((p) => p.id === id);
      if (!current) return () => {};
      const auto = dataRef.current.noleggio.veicoli.find((v) => v.id === current.veicoloId);
      const oggetto = `Prenotazione ${auto ? nomeRentVeicolo(auto) : ""}`.trim();
      return editAnnullabile(
        (d) => ({
          data: {
            ...d,
            noleggio: { ...d.noleggio, prenotazioni: d.noleggio.prenotazioni.filter((p) => p.id !== id) },
          },
          log: { tabella: "noleggio", azione: "Eliminato", oggetto },
        }),
        { tabella: "noleggio", azione: "Creato", oggetto }
      );
    },
    [editAnnullabile]
  );

  // Tariffe e preventivi sono documenti di lavoro: non finiscono nello storico.
  const addTariffa = useCallback<GestionaleContextValue["addTariffa"]>(
    (init) => {
      edit((d) => ({
        data: { ...d, noleggio: { ...d.noleggio, tariffe: [...d.noleggio.tariffe, { ...init, id: uid("rt") }] } },
      }));
    },
    [edit]
  );

  const updateTariffa = useCallback<GestionaleContextValue["updateTariffa"]>(
    (id, patch) => {
      edit((d) => ({
        data: {
          ...d,
          noleggio: { ...d.noleggio, tariffe: d.noleggio.tariffe.map((t) => (t.id === id ? { ...t, ...patch } : t)) },
        },
      }));
    },
    [edit]
  );

  const deleteTariffa = useCallback<GestionaleContextValue["deleteTariffa"]>(
    (id) =>
      editAnnullabile((d) => ({
        data: { ...d, noleggio: { ...d.noleggio, tariffe: d.noleggio.tariffe.filter((t) => t.id !== id) } },
      })),
    [editAnnullabile]
  );

  const addPreventivo = useCallback<GestionaleContextValue["addPreventivo"]>(
    (init) => {
      const item: RentPreventivo = { ...init, id: uid("rq"), stato: "Bozza", note: "" };
      edit((d) => ({
        data: { ...d, noleggio: { ...d.noleggio, preventivi: [item, ...d.noleggio.preventivi] } },
      }));
    },
    [edit]
  );

  const updatePreventivo = useCallback<GestionaleContextValue["updatePreventivo"]>(
    (id, patch) => {
      edit((d) => ({
        data: {
          ...d,
          noleggio: {
            ...d.noleggio,
            preventivi: d.noleggio.preventivi.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          },
        },
      }));
    },
    [edit]
  );

  const deletePreventivo = useCallback<GestionaleContextValue["deletePreventivo"]>(
    (id) =>
      editAnnullabile((d) => ({
        data: { ...d, noleggio: { ...d.noleggio, preventivi: d.noleggio.preventivi.filter((p) => p.id !== id) } },
      })),
    [editAnnullabile]
  );

  const convertiPreventivo = useCallback<GestionaleContextValue["convertiPreventivo"]>(
    (id) => {
      const pv = dataRef.current.noleggio.preventivi.find((p) => p.id === id);
      if (!pv) return { ok: false, errore: "Preventivo non trovato." };
      if (!pv.veicoloId) {
        return { ok: false, errore: "Assegna un'auto specifica al preventivo prima di convertirlo in prenotazione." };
      }
      if (pv.stato === "Rifiutato" || pv.stato === "Scaduto") {
        return { ok: false, errore: `Il preventivo è «${pv.stato}»: riportalo a «Inviato» se il cliente ha cambiato idea.` };
      }
      const esito = addPrenotazione({
        veicoloId: pv.veicoloId,
        contattoId: pv.contattoId,
        clienteNomeLibero: pv.clienteNomeLibero,
        dataInizio: pv.dataInizio,
        dataFine: pv.dataFine,
        tariffaApplicata: pv.tariffaApplicata,
        cauzione: 0,
        luogoRitiro: pv.luogoRitiro,
        luogoRiconsegna: pv.luogoRiconsegna,
      });
      if (esito.ok) updatePreventivo(id, { stato: "Accettato" });
      return esito;
    },
    [addPrenotazione, updatePreventivo]
  );


  // --- Importazioni ------------------------------------------------------------

  const importaMovimenti = useCallback<GestionaleContextValue["importaMovimenti"]>(
    (righe, file) => {
      const { veicoli } = dataRef.current;
      const nuovi = righe.map((r) =>
        withTotale({
          ...movimentoVuoto(today),
          ...r,
          attivita: r.attivita ?? attivitaDedotta({ autoId: r.autoId ?? null, categoria: r.categoria ?? "" }, veicoli),
          id: uid("mov"),
        })
      );
      const log: LogInput = { tabella: "movimenti", azione: "Creato", oggetto: `Importazione da ${file}`, dettaglio: `${nuovi.length} movimenti` };
      return editAnnullabile(
        (d) => ({ data: { ...d, movimenti: [...nuovi, ...d.movimenti] }, log }),
        { ...log, azione: "Eliminato", dettaglio: "importazione annullata" }
      );
    },
    [editAnnullabile, today]
  );

  const importaContatti = useCallback<GestionaleContextValue["importaContatti"]>(
    (nuovi, aggiorna, file) => {
      const creati = nuovi.map((c) => ({ ...contattoVuoto(), ...c, id: uid("con") }));
      const log: LogInput = {
        tabella: "contatti",
        azione: "Creato",
        oggetto: `Importazione da ${file}`,
        dettaglio: `${creati.length} nuovi${aggiorna.length ? `, ${aggiorna.length} completati` : ""}`,
      };
      return editAnnullabile(
        (d) => ({
          data: {
            ...d,
            contatti: [
              ...creati,
              ...d.contatti.map((c) => {
                const agg = aggiorna.find((a) => a.id === c.id);
                if (!agg) return c;
                // Si completano solo i campi vuoti: quello che c'è già in anagrafica non si tocca.
                const completato = { ...c };
                (Object.keys(agg.dati) as (keyof NuovoContatto)[]).forEach((k) => {
                  const nuovo = agg.dati[k];
                  if (nuovo && !c[k]) (completato as Record<string, unknown>)[k] = nuovo;
                });
                return completato;
              }),
            ],
          },
          log,
        }),
        { ...log, azione: "Eliminato", dettaglio: "importazione annullata" }
      );
    },
    [editAnnullabile]
  );

  const importaVeicoli = useCallback<GestionaleContextValue["importaVeicoli"]>(
    (righe, file) => {
      const imp = dataRef.current.impostazioni;
      const nuovi = righe.map((r) => ({ ...veicoloVuoto(imp), ...r, id: uid("veh") }));
      const log: LogInput = { tabella: "auto", azione: "Creato", oggetto: `Importazione da ${file}`, dettaglio: `${nuovi.length} schede auto` };
      return editAnnullabile(
        (d) => ({
          // Ogni auto con prezzo d'acquisto ha il suo movimento "Acquisto veicolo" (vedi conAcquisto).
          data: nuovi.reduce((acc, v) => conAcquisto(acc, v, today), { ...d, veicoli: [...nuovi, ...d.veicoli] }),
          log,
        }),
        { ...log, azione: "Eliminato", dettaglio: "importazione annullata" }
      );
    },
    [editAnnullabile, today]
  );

  const importaFlotta = useCallback<GestionaleContextValue["importaFlotta"]>(
    (righe, file) => {
      const nuovi: RentVeicolo[] = righe.map((r) => ({ ...r, id: uid("rv"), veicoloId: null }));
      const log: LogInput = { tabella: "noleggio", azione: "Creato", oggetto: `Importazione da ${file}`, dettaglio: `${nuovi.length} auto in flotta` };
      return editAnnullabile(
        // Ogni auto importata riceve la sua scheda nel gestionale (attività Noleggio).
        (d) => ({ data: collegaFlotta({ ...d, noleggio: { ...d.noleggio, veicoli: [...nuovi, ...d.noleggio.veicoli] } }, () => uid("veh")), log }),
        { ...log, azione: "Eliminato", dettaglio: "importazione annullata" }
      );
    },
    [editAnnullabile]
  );

  const riconciliaEstratto = useCallback<GestionaleContextValue["riconciliaEstratto"]>(
    (abbinati, righeNuove, file) => {
      const nuovi = righeNuove.map((r) =>
        withTotale({ ...movimentoVuoto(today), ...r, riconciliato: true, id: uid("mov") })
      );
      const perId = new Map(abbinati.map((a) => [a.movimentoId, a]));
      const log: LogInput = {
        tabella: "movimenti",
        azione: "Modificato",
        oggetto: `Estratto conto ${file}`,
        dettaglio: `${abbinati.length} riconciliati${nuovi.length ? `, ${nuovi.length} nuovi` : ""}`,
      };
      return editAnnullabile(
        (d) => ({
          data: {
            ...d,
            movimenti: [
              ...nuovi,
              ...d.movimenti.map((m) => {
                const a = perId.get(m.id);
                if (!a) return m;
                // Ritrovato sull'estratto: è anche pagato.
                return m.statoPagamento === "Da saldare"
                  ? { ...m, riconciliato: true, riferimentoEstratto: a.riferimentoEstratto, statoPagamento: "Saldato" as const, dataSaldo: a.dataSaldo }
                  : { ...m, riconciliato: true, riferimentoEstratto: a.riferimentoEstratto, dataSaldo: m.dataSaldo || a.dataSaldo };
              }),
            ],
          },
          log,
        }),
        { ...log, dettaglio: "riconciliazione annullata" }
      );
    },
    [editAnnullabile, today]
  );

  const ripristinaBackup = useCallback<GestionaleContextValue["ripristinaBackup"]>(
    (raw) => {
      const dati = normalizza(raw);
      if (!dati) return { ok: false, errore: "Il file non è un backup del gestionale." };
      edit(() => ({
        data: dati,
        log: { tabella: "auto", azione: "Modificato", oggetto: "Ripristino da backup", dettaglio: `${dati.veicoli.length} auto, ${dati.movimenti.length} movimenti, ${dati.contatti.length} contatti` },
      }));
      return { ok: true };
    },
    [edit]
  );

  const esportaBackup = useCallback(() => dataRef.current, []);

  const value = useMemo<GestionaleContextValue>(
    () => ({
      ready,
      veicoli: data.veicoli,
      movimenti: data.movimenti,
      contatti: data.contatti,
      impostazioni: data.impostazioni,
      storico: data.storico,
      noleggio: data.noleggio,
      flotta,
      addVeicolo,
      updateVeicolo,
      deleteVeicolo,
      schedaDellAuto,
      cambiaStatoCatalogo,
      impostaVisibilita,
      assegnaAttivita,
      scollegaAuto,
      prossimoContratto,
      registraVendita,
      addMovimento,
      updateMovimento,
      deleteMovimento,
      addContatto,
      updateContatto,
      deleteContatto,
      updateImpostazioni,
      addRentVeicolo,
      updateRentVeicolo,
      deleteRentVeicolo,
      addPrenotazione,
      updatePrenotazione,
      deletePrenotazione,
      addTariffa,
      updateTariffa,
      deleteTariffa,
      addPreventivo,
      updatePreventivo,
      deletePreventivo,
      convertiPreventivo,
      importaMovimenti,
      importaContatti,
      importaVeicoli,
      importaFlotta,
      riconciliaEstratto,
      ripristinaBackup,
      esportaBackup,
    }),
    [
      ready,
      data,
      flotta,
      addVeicolo,
      updateVeicolo,
      deleteVeicolo,
      schedaDellAuto,
      cambiaStatoCatalogo,
      impostaVisibilita,
      assegnaAttivita,
      scollegaAuto,
      prossimoContratto,
      registraVendita,
      addMovimento,
      updateMovimento,
      deleteMovimento,
      addContatto,
      updateContatto,
      deleteContatto,
      updateImpostazioni,
      addRentVeicolo,
      updateRentVeicolo,
      deleteRentVeicolo,
      addPrenotazione,
      updatePrenotazione,
      deletePrenotazione,
      addTariffa,
      updateTariffa,
      deleteTariffa,
      addPreventivo,
      updatePreventivo,
      deletePreventivo,
      convertiPreventivo,
      importaMovimenti,
      importaContatti,
      importaVeicoli,
      importaFlotta,
      riconciliaEstratto,
      ripristinaBackup,
      esportaBackup,
    ]
  );

  return <GestionaleContext.Provider value={value}>{children}</GestionaleContext.Provider>;
}

export function useGestionale() {
  const ctx = useContext(GestionaleContext);
  if (!ctx) throw new Error("useGestionale must be used within a GestionaleProvider");
  return ctx;
}
