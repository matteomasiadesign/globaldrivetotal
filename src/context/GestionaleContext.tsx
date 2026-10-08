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
  /** La scheda economica dell'auto del catalogo, creandola se non esiste. */
  schedaDellAuto: (car: Car) => Veicolo;
  /** Cambia lo stato dell'auto sul sito e, di conseguenza, quello della scheda. */
  cambiaStatoCatalogo: (carId: string, status: CarStatus) => void;
  /** L'auto è stata eliminata dal catalogo: la scheda resta, archiviata. */
  scollegaAuto: (carId: string) => void;
  /** Contratto generato: segna l'auto venduta, aggiorna il catalogo e l'anagrafica. */
  registraVendita: (
    veicoloId: string,
    vendita: { prezzoVendita: number; dataVendita: string; acquirente: DatiAcquirente }
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
  updatePrenotazione: (id: string, patch: Partial<Omit<RentPrenotazione, "id">>) => void;
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

// Un salvataggio incompleto o di una versione vecchia non deve rompere l'admin:
// se la forma non torna si riparte dai dati demo.
function normalizza(raw: unknown): GestionaleData | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<GestionaleData>;
  const n = d.noleggio;
  if (
    !Array.isArray(d.veicoli) ||
    !Array.isArray(d.movimenti) ||
    !Array.isArray(d.contatti) ||
    !Array.isArray(d.storico) ||
    !n ||
    !Array.isArray(n.veicoli) ||
    !Array.isArray(n.prenotazioni) ||
    !Array.isArray(n.tariffe) ||
    !Array.isArray(n.preventivi)
  ) {
    return null;
  }
  return {
    veicoli: d.veicoli,
    movimenti: d.movimenti,
    contatti: d.contatti,
    storico: d.storico,
    noleggio: n,
    // I parametri nuovi aggiunti ai default compaiono anche in chi ha già un salvataggio.
    impostazioni: { ...defaultImpostazioni, ...(d.impostazioni ?? {}) },
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

export function GestionaleProvider({ children }: { children: React.ReactNode }) {
  const { user, today } = useAdmin();
  const { updateCar } = useCars();
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
      const { status, hidden } = catalogoDaStato(stato);
      updateCar(carId, hidden === undefined ? { status } : { status, hidden, ...(hidden && { featured: false }) });
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
        data: { ...d, veicoli: [item, ...d.veicoli] },
        log: { tabella: "auto", azione: "Creato", oggetto: nomeVeicolo(item) },
      }));
      return item;
    },
    [edit]
  );

  const updateVeicolo = useCallback<GestionaleContextValue["updateVeicolo"]>(
    (id, patch) => {
      const current = dataRef.current.veicoli.find((v) => v.id === id);
      if (!current || !hasChanges(current, patch)) return;
      edit((d) => ({
        data: { ...d, veicoli: d.veicoli.map((v) => (v.id === id ? { ...v, ...patch } : v)) },
        log: {
          tabella: "auto",
          azione: "Modificato",
          oggetto: nomeVeicolo({ ...current, ...patch }),
          dettaglio: describeChanges(current, patch),
        },
      }));
      if (current.carId && patch.stato && patch.stato !== current.stato) {
        sincronizzaCatalogo(current.carId, patch.stato);
      }
    },
    [edit, sincronizzaCatalogo]
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
    (car) => {
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
      });
    },
    [addVeicolo]
  );

  const cambiaStatoCatalogo = useCallback<GestionaleContextValue["cambiaStatoCatalogo"]>(
    (carId, status) => {
      updateCar(carId, { status });
      const scheda = dataRef.current.veicoli.find((v) => v.carId === carId);
      if (!scheda) return;
      const stato = statoDaCatalogo(status);
      if (stato === scheda.stato) return;
      // Qui lo stato parte già dal catalogo: non serve risincronizzarlo.
      edit((d) => ({
        data: { ...d, veicoli: d.veicoli.map((v) => (v.id === scheda.id ? { ...v, stato } : v)) },
        log: {
          tabella: "auto",
          azione: "Modificato",
          oggetto: nomeVeicolo(scheda),
          dettaglio: `stato: ${scheda.stato} → ${stato}`,
        },
      }));
    },
    [edit, updateCar]
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
    (veicoloId, { prezzoVendita, dataVendita, acquirente }) => {
      const scheda = dataRef.current.veicoli.find((v) => v.id === veicoloId);
      if (!scheda) return;
      const nome = acquirente.nome.trim();
      const inAnagrafica = (c: Contatto) => c.nome.trim().toLowerCase() === nome.toLowerCase();

      edit((d) => {
        // Il cliente va in anagrafica; se c'è già si completano solo i dati che mancano.
        let contatti = d.contatti;
        if (nome) {
          const dati = {
            telefono: acquirente.telefono,
            email: acquirente.email,
            codiceFiscale: acquirente.codiceFiscale,
            residenza: acquirente.residenza,
            nascitaSede: acquirente.nascitaSede,
          };
          contatti = d.contatti.some(inAnagrafica)
            ? d.contatti.map((c) => {
                if (!inAnagrafica(c)) return c;
                const completato = { ...c };
                (Object.keys(dati) as (keyof typeof dati)[]).forEach((k) => {
                  if (dati[k]) completato[k] = dati[k];
                });
                return completato;
              })
            : [{ ...contattoVuoto(), id: uid("con"), nome, ...dati }, ...d.contatti];
        }
        return {
          data: {
            ...d,
            contatti,
            impostazioni: { ...d.impostazioni, prossimoNumeroContratto: d.impostazioni.prossimoNumeroContratto + 1 },
            veicoli: d.veicoli.map((v) =>
              v.id === veicoloId ? { ...v, prezzoVendita, dataVendita, stato: "Venduta" } : v
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
    },
    [edit, sincronizzaCatalogo]
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
          // Prenotazioni e preventivi restano, senza il collegamento al cliente.
          noleggio: {
            ...d.noleggio,
            prenotazioni: d.noleggio.prenotazioni.map((p) => (p.contattoId === id ? { ...p, contattoId: null } : p)),
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
      const current = dataRef.current.noleggio.prenotazioni.find((p) => p.id === id);
      if (!current || !hasChanges(current, patch)) return;
      const auto = dataRef.current.noleggio.veicoli.find((v) => v.id === current.veicoloId);
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
