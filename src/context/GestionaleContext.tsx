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
import { initialGestionale } from "@/data/gestionaleMock";
import type { Car, CarStatus } from "@/types/car";
import { catalogoDaStato, nomeVeicolo, statoDaCatalogo } from "@/lib/gestionale/calc";
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
  nomeRentVeicolo,
  veicoloLiberoNelPeriodo,
  type RentPrenotazione,
  type RentPreventivo,
  type RentTariffa,
  type RentVeicolo,
} from "@/lib/gestionale/rent";
import type {
  AzioneStorico,
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

interface GestionaleContextValue {
  ready: boolean;
  veicoli: Veicolo[];
  movimenti: Movimento[];
  contatti: Contatto[];
  impostazioni: Impostazioni;
  storico: VoceStorico[];
  noleggio: GestionaleData["noleggio"];

  // Schede economiche
  addVeicolo: (data?: NuovoVeicolo) => Veicolo;
  updateVeicolo: (id: string, patch: Partial<Omit<Veicolo, "id">>) => void;
  deleteVeicolo: (id: string) => void;
  /** La scheda economica dell'auto del catalogo, creandola (con i dati d'acquisto) se non esiste. */
  schedaDellAuto: (car: Car, extra?: NuovoVeicolo) => Veicolo;
  /** Cambia lo stato dell'auto sul sito e, di conseguenza, quello della scheda. */
  cambiaStatoCatalogo: (carId: string, status: CarStatus) => void;
  /** Mostra o nasconde l'auto sul sito e porta la scheda nello stato coerente. */
  impostaVisibilita: (carId: string, hidden: boolean) => void;
  /** L'auto è stata eliminata dal catalogo: la scheda resta, archiviata. */
  scollegaAuto: (carId: string) => void;
  /**
   * Contratto generato: segna l'auto venduta, aggiorna il catalogo, collega il cliente
   * (anagrafica) all'auto e registra l'incasso atteso tra i movimenti.
   */
  registraVendita: (
    veicoloId: string,
    vendita: {
      prezzoVendita: number;
      dataVendita: string;
      acquirente: DatiAcquirente;
      /** Contatto scelto dall'anagrafica, se c'è. */
      contattoId?: string | null;
      strumentoPagamento?: string;
    }
  ) => void;

  addMovimento: (data?: NuovoMovimento) => Movimento;
  updateMovimento: (id: string, patch: Partial<Omit<Movimento, "id" | "totale">>) => void;
  deleteMovimento: (id: string) => void;

  addContatto: (data?: NuovoContatto) => Contatto;
  updateContatto: (id: string, patch: Partial<Omit<Contatto, "id">>) => void;
  deleteContatto: (id: string) => void;

  updateImpostazioni: (patch: Partial<Impostazioni>) => void;

  addRentVeicolo: (data: Omit<RentVeicolo, "id">) => RentVeicolo;
  updateRentVeicolo: (id: string, patch: Partial<Omit<RentVeicolo, "id">>) => void;
  deleteRentVeicolo: (id: string) => void;
  addPrenotazione: (data: Omit<RentPrenotazione, "id" | "stato" | "note">) => Esito;
  updatePrenotazione: (id: string, patch: Partial<Omit<RentPrenotazione, "id">>) => Esito;
  deletePrenotazione: (id: string) => void;
  addTariffa: (data: Omit<RentTariffa, "id">) => void;
  updateTariffa: (id: string, patch: Partial<Omit<RentTariffa, "id">>) => void;
  deleteTariffa: (id: string) => void;
  addPreventivo: (data: Omit<RentPreventivo, "id" | "stato" | "note">) => void;
  updatePreventivo: (id: string, patch: Partial<Omit<RentPreventivo, "id">>) => void;
  deletePreventivo: (id: string) => void;
  convertiPreventivo: (id: string) => Esito;

  /** Torna ai dati demo. */
  resetGestionale: () => void;
}

const GestionaleContext = createContext<GestionaleContextValue | undefined>(undefined);

const STORAGE_KEY = "global_drive_gestionale_v1";
const MAX_STORICO = 300;

const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// Un salvataggio di una versione vecchia non deve far perdere i dati: le parti mancanti
// si riempiono con valori vuoti e i campi aggiunti dopo prendono il loro default. Si
// riparte dai dati demo solo se il contenuto non è affatto un salvataggio del gestionale.
const lista = <T,>(v: unknown): T[] =>
  Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as T[]) : [];

function normalizza(raw: unknown): GestionaleData | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (!Array.isArray(d.veicoli) && !Array.isArray(d.movimenti) && !Array.isArray(d.contatti)) return null;
  const n = (d.noleggio && typeof d.noleggio === "object" ? d.noleggio : {}) as Record<string, unknown>;
  // I parametri nuovi aggiunti ai default compaiono anche in chi ha già un salvataggio.
  const impostazioni = { ...defaultImpostazioni, ...((d.impostazioni as Partial<Impostazioni>) ?? {}) };
  return {
    impostazioni,
    veicoli: lista<Veicolo>(d.veicoli).map((v) => ({ ...veicoloVuoto(impostazioni), ...v })),
    movimenti: lista<Movimento>(d.movimenti).map((m) => withTotale({ ...movimentoVuoto(""), ...m })),
    contatti: lista<Contatto>(d.contatti).map((c) => ({ ...contattoVuoto(), ...c })),
    storico: lista<VoceStorico>(d.storico),
    noleggio: {
      veicoli: lista<RentVeicolo>(n.veicoli),
      prenotazioni: lista<RentPrenotazione>(n.prenotazioni).map((p) => ({ ...p, clienteNomeLibero: p.clienteNomeLibero ?? "" })),
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

export function GestionaleProvider({ children }: { children: React.ReactNode }) {
  const { user, today, leads, updateLead } = useAdmin();
  const { cars, updateCar } = useCars();
  const utente = user?.name || user?.email || "Admin";

  const [ready, setReady] = useState(false);
  const [data, setData] = useState<GestionaleData>(initialGestionale);

  // Serve a leggere lo stato più recente dentro le azioni che toccano anche il catalogo.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Lettura iniziale dopo il montaggio: il localStorage non esiste sul server.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
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

  /** Riflette sul sito lo stato di una scheda collegata a un'auto del catalogo. */
  const sincronizzaCatalogo = useCallback(
    (carId: string, stato: Veicolo["stato"]) => {
      const { status, hidden, featured } = catalogoDaStato(stato);
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
      // Se la vendita viene annullata, la data si toglie.
      const effettivo = { ...patch };
      if (patch.stato === "Venduta" && current.stato !== "Venduta" && !current.dataVendita && patch.dataVendita === undefined) {
        effettivo.dataVendita = today;
      }
      if (patch.stato && patch.stato !== "Venduta" && current.stato === "Venduta" && patch.dataVendita === undefined) {
        effettivo.dataVendita = "";
      }
      if (!hasChanges(current, effettivo)) return;
      const toccaAcquisto = "prezzoAcquisto" in effettivo || "fornitoreId" in effettivo || "dataAcquisto" in effettivo;
      edit((d) => {
        const aggiornato = { ...current, ...effettivo };
        const base = { ...d, veicoli: d.veicoli.map((v) => (v.id === id ? aggiornato : v)) };
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
        sincronizzaCatalogo(current.carId, effettivo.stato);
      }
    },
    [edit, sincronizzaCatalogo, today]
  );

  const deleteVeicolo = useCallback<GestionaleContextValue["deleteVeicolo"]>(
    (id) => {
      const current = dataRef.current.veicoli.find((v) => v.id === id);
      if (!current) return;
      edit((d) => ({
        data: {
          ...d,
          veicoli: d.veicoli.filter((v) => v.id !== id),
          movimenti: d.movimenti.filter((m) => m.autoId !== id),
        },
        log: { tabella: "auto", azione: "Eliminato", oggetto: nomeVeicolo(current), dettaglio: "con i suoi movimenti" },
      }));
    },
    [edit]
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
      if (catalogoDaStato(scheda.stato).status === status) return;
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

  const registraVendita = useCallback<GestionaleContextValue["registraVendita"]>(
    (veicoloId, { prezzoVendita, dataVendita, acquirente, contattoId = null, strumentoPagamento = "" }) => {
      const scheda = dataRef.current.veicoli.find((v) => v.id === veicoloId);
      if (!scheda) return;
      const nome = acquirente.nome.trim();

      edit((d) => {
        const dati = {
          telefono: acquirente.telefono,
          email: acquirente.email,
          codiceFiscale: acquirente.codiceFiscale,
          residenza: acquirente.residenza,
          nascitaSede: acquirente.nascitaSede,
        };
        // Il cliente: quello scelto in anagrafica, o chi ha lo stesso nome, o uno nuovo.
        const trovato =
          d.contatti.find((c) => c.id === contattoId) ??
          (nome ? d.contatti.find((c) => c.nome.trim().toLowerCase() === nome.toLowerCase()) : undefined);
        let contatti = d.contatti;
        let acquirenteId: string | null = trovato?.id ?? null;
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
          const nuovo: Contatto = { ...contattoVuoto(), id: uid("con"), nome, ...dati };
          acquirenteId = nuovo.id;
          contatti = [nuovo, ...d.contatti];
        }

        // L'incasso atteso entra nei movimenti (da saldare). Nel conto vendita si incassa solo
        // la commissione, con la sua IVA; la vendita è del proprietario.
        const contoVendita = scheda.servizio === "Conto vendita";
        const categoria = contoVendita ? "Intermediazione conto vendita" : "Vendita veicolo";
        let movimenti = d.movimenti;
        if (!d.movimenti.some((m) => m.autoId === veicoloId && m.tipo === "Entrata" && m.categoria === categoria)) {
          const imponibile = contoVendita ? prezzoVendita * scheda.commissionePercentuale : prezzoVendita;
          const incasso: Movimento = withTotale({
            ...movimentoVuoto(today),
            id: uid("mov"),
            data: dataVendita,
            autoId: veicoloId,
            contattoId: acquirenteId,
            fornitoreCliente: nome || trovato?.nome || "",
            descrizione: `Vendita ${nomeVeicolo(scheda)}`,
            tipo: "Entrata" as const,
            categoria,
            naturaCosto: "Variabile generale" as const,
            pagamento: pagamentoDa(strumentoPagamento),
            imponibile,
            iva: contoVendita ? imponibile * d.impostazioni.aliquotaIva : 0,
            statoPagamento: "Da saldare" as const,
            numeroDocumento: scheda.numeroFattura,
          });
          movimenti = [incasso, ...d.movimenti];
        }

        return {
          data: {
            ...d,
            contatti,
            movimenti,
            impostazioni: { ...d.impostazioni, prossimoNumeroContratto: d.impostazioni.prossimoNumeroContratto + 1 },
            veicoli: d.veicoli.map((v) =>
              v.id === veicoloId ? { ...v, prezzoVendita, dataVendita, stato: "Venduta", acquirenteId } : v
            ),
          },
          log: {
            tabella: "auto",
            azione: "Modificato",
            oggetto: nomeVeicolo(scheda),
            dettaglio: `venduta${nome ? ` a ${nome}` : ""} · contratto generato`,
          },
        };
      });
      if (scheda.carId) sincronizzaCatalogo(scheda.carId, "Venduta");
      // La richiesta di chi ha comprato è chiusa.
      const telefono = soloCifre(acquirente.telefono);
      if (telefono) {
        leads
          .filter((l) => (l.status === "nuovo" || l.status === "in_gestione") && soloCifre(l.phone) === telefono)
          .forEach((l) => updateLead(l.id, { status: "completato" }));
      }
    },
    [edit, sincronizzaCatalogo, today, leads, updateLead]
  );

  // --- Movimenti -------------------------------------------------------------

  const addMovimento = useCallback<GestionaleContextValue["addMovimento"]>(
    (init = {}) => {
      const item: Movimento = withTotale({ ...movimentoVuoto(today), ...init, id: uid("mov") });
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
      if (!current) return;
      edit((d) => ({
        data: { ...d, movimenti: d.movimenti.filter((m) => m.id !== id) },
        log: { tabella: "movimenti", azione: "Eliminato", oggetto: current.descrizione || current.categoria },
      }));
    },
    [edit]
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
      edit((d) => ({
        data: { ...d, contatti: d.contatti.map((c) => (c.id === id ? { ...c, ...patch } : c)) },
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
      if (!current) return;
      edit((d) => ({
        data: {
          ...d,
          contatti: d.contatti.filter((c) => c.id !== id),
          // Auto, movimenti, prenotazioni e preventivi restano, con il nome in chiaro al posto del collegamento.
          veicoli: d.veicoli.map((v) => ({
            ...v,
            fornitoreId: v.fornitoreId === id ? null : v.fornitoreId,
            acquirenteId: v.acquirenteId === id ? null : v.acquirenteId,
          })),
          movimenti: d.movimenti.map((m) => (m.contattoId === id ? { ...m, contattoId: null } : m)),
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
        log: { tabella: "contatti", azione: "Eliminato", oggetto: current.nome || "Contatto senza nome" },
      }));
    },
    [edit]
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
      const item: RentVeicolo = { ...init, id: uid("rv") };
      edit((d) => ({
        data: { ...d, noleggio: { ...d.noleggio, veicoli: [item, ...d.noleggio.veicoli] } },
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
      edit((d) => ({
        data: {
          ...d,
          noleggio: { ...d.noleggio, veicoli: d.noleggio.veicoli.map((v) => (v.id === id ? { ...v, ...patch } : v)) },
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
      if (!current) return;
      edit((d) => ({
        data: {
          ...d,
          noleggio: {
            ...d.noleggio,
            veicoli: d.noleggio.veicoli.filter((v) => v.id !== id),
            prenotazioni: d.noleggio.prenotazioni.filter((p) => p.veicoloId !== id),
            preventivi: d.noleggio.preventivi.map((p) => (p.veicoloId === id ? { ...p, veicoloId: null } : p)),
          },
        },
        log: { tabella: "noleggio", azione: "Eliminato", oggetto: nomeRentVeicolo(current), dettaglio: "con le sue prenotazioni" },
      }));
    },
    [edit]
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
      const item: RentPrenotazione = { ...init, id: uid("rp"), stato: "Prenotata", note: "" };
      const auto = veicoli.find((v) => v.id === init.veicoloId);
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
      edit((d) => ({
        data: {
          ...d,
          noleggio: {
            ...d.noleggio,
            prenotazioni: d.noleggio.prenotazioni.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          },
        },
        log: {
          tabella: "noleggio",
          azione: "Modificato",
          oggetto: `Prenotazione ${auto ? nomeRentVeicolo(auto) : ""}`.trim(),
          dettaglio: describeChanges(current, patch),
        },
      }));
      return { ok: true };
    },
    [edit]
  );

  const deletePrenotazione = useCallback<GestionaleContextValue["deletePrenotazione"]>(
    (id) => {
      const current = dataRef.current.noleggio.prenotazioni.find((p) => p.id === id);
      if (!current) return;
      const auto = dataRef.current.noleggio.veicoli.find((v) => v.id === current.veicoloId);
      edit((d) => ({
        data: {
          ...d,
          noleggio: { ...d.noleggio, prenotazioni: d.noleggio.prenotazioni.filter((p) => p.id !== id) },
        },
        log: { tabella: "noleggio", azione: "Eliminato", oggetto: `Prenotazione ${auto ? nomeRentVeicolo(auto) : ""}`.trim() },
      }));
    },
    [edit]
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
    (id) => {
      edit((d) => ({
        data: { ...d, noleggio: { ...d.noleggio, tariffe: d.noleggio.tariffe.filter((t) => t.id !== id) } },
      }));
    },
    [edit]
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
    (id) => {
      edit((d) => ({
        data: { ...d, noleggio: { ...d.noleggio, preventivi: d.noleggio.preventivi.filter((p) => p.id !== id) } },
      }));
    },
    [edit]
  );

  const convertiPreventivo = useCallback<GestionaleContextValue["convertiPreventivo"]>(
    (id) => {
      const pv = dataRef.current.noleggio.preventivi.find((p) => p.id === id);
      if (!pv) return { ok: false, errore: "Preventivo non trovato." };
      if (!pv.veicoloId) {
        return { ok: false, errore: "Assegna un'auto specifica al preventivo prima di convertirlo in prenotazione." };
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

  const resetGestionale = useCallback(() => setData(initialGestionale), []);

  const value = useMemo<GestionaleContextValue>(
    () => ({
      ready,
      veicoli: data.veicoli,
      movimenti: data.movimenti,
      contatti: data.contatti,
      impostazioni: data.impostazioni,
      storico: data.storico,
      noleggio: data.noleggio,
      addVeicolo,
      updateVeicolo,
      deleteVeicolo,
      schedaDellAuto,
      cambiaStatoCatalogo,
      impostaVisibilita,
      scollegaAuto,
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
      resetGestionale,
    }),
    [
      ready,
      data,
      addVeicolo,
      updateVeicolo,
      deleteVeicolo,
      schedaDellAuto,
      cambiaStatoCatalogo,
      impostaVisibilita,
      scollegaAuto,
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
      resetGestionale,
    ]
  );

  return <GestionaleContext.Provider value={value}>{children}</GestionaleContext.Provider>;
}

export function useGestionale() {
  const ctx = useContext(GestionaleContext);
  if (!ctx) throw new Error("useGestionale must be used within a GestionaleProvider");
  return ctx;
}
