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
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured, setRememberSession } from "@/lib/supabase/client";
import { deleteVehicleFile } from "@/lib/storage/vehicleFiles";
import { toDateStr } from "@/lib/admin/dates";
import { LEAD_COLUMNS, leadFromRow, type LeadRow } from "@/lib/leads/rows";
import type { Appointment, VehicleDocument } from "@/types/admin";
import type { Lead } from "@/types/lead";

// Stato condiviso dell'area admin. Il login è su Supabase Auth e le richieste
// dei clienti arrivano dalla tabella `leads` di Supabase (le scrive /api/leads);
// agenda e documenti vivono ancora nel localStorage del browser (come le auto):
// quando arriverà il database basta cambiare le funzioni qui sotto, le pagine
// non se ne accorgono.

/** admin = tutto; operatore = niente conti (prezzi d'acquisto, margini, IVA, contratti). */
export type StaffRole = "admin" | "operatore";

export interface AdminUser {
  email: string;
  name: string;
  role: StaffRole;
}

/** Rimette com'era ciò che un'eliminazione ha tolto (per il pulsante «Annulla»). */
export type Annulla = () => void;

export type NewAppointment = Omit<Appointment, "id" | "createdAt">;
export type NewDocument = Omit<VehicleDocument, "id" | "dateAdded">;

interface AdminContextValue {
  /** false finché non sono stati letti localStorage e sessione: non mostrare nulla prima. */
  ready: boolean;
  user: AdminUser | null;
  /** Restituisce il messaggio d'errore da mostrare, o null se l'accesso è riuscito. */
  login: (email: string, password: string, remember: boolean) => Promise<string | null>;
  logout: () => void;

  /** Giorno corrente "YYYY-MM-DD" e timestamp, aggiornati ogni minuto. */
  today: string;
  now: number;

  /** true se l'utente vede i conti (ruolo admin). */
  isAdmin: boolean;

  leads: Lead[];
  /** Messaggio da mostrare se le richieste non si riescono a leggere o aggiornare. */
  leadsError: string | null;
  /** Rilegge subito le richieste (si aggiornano comunque da sole ogni minuto). */
  refreshLeads: () => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;

  appointments: Appointment[];
  addAppointment: (data: NewAppointment) => Appointment;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => Annulla;

  documents: VehicleDocument[];
  addDocument: (data: NewDocument) => void;
  /** Il file caricato si cancella dopo qualche secondo, così «Annulla» lo ritrova. */
  deleteDocument: (id: string) => Annulla;
  deleteDocumentsOfCar: (carId: string) => void;
  /** Sposta il dossier da un'auto a un'altra chiave (es. all'uscita dal catalogo passa alla scheda economica). */
  reassignDocuments: (fromId: string, toId: string) => void;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

const KEYS = {
  appointments: "global_drive_appointments_v3",
  documents: "global_drive_documents_v3",
  /**
   * Richiesta → contatto in anagrafica. L'anagrafica è ancora nel browser (id non uuid), quindi
   * il collegamento non può stare nella colonna leads.contatto_id: resta qui finché non migra.
   */
  leadLinks: "global_drive_lead_links_v1",
} as const;

/** Chiavi delle versioni precedenti (login finto, dati demo, richieste nel browser): si cancellano alla prima apertura. */
const LEGACY_KEYS = [
  "global_drive_admin_session",
  "global_drive_appointments_v2",
  "global_drive_documents_v2",
  "global_drive_leads_v1",
  "global_drive_leads_v2",
];

const LEADS_REFRESH_MS = 60_000;
/** Quanto resta disponibile «Annulla» (come il toast) prima di cancellare davvero un file. */
const UNDO_MS = 8_000;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Impossibile salvare ${key}`, e);
  }
}

/**
 * Un utente Supabase entra nell'admin solo se ha un profilo staff attivo
 * (tabella staff_profiles, vedi supabase/schema.sql): avere un account non basta.
 */
async function staffUser(
  supabase: SupabaseClient,
  u: User
): Promise<{ user: AdminUser } | { error: string }> {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("full_name, active, role")
    .eq("id", u.id)
    .maybeSingle();
  if (error) {
    return error.code === "PGRST205"
      ? { error: "Il database non è ancora pronto: va eseguito supabase/schema.sql su Supabase." }
      : { error: "Impossibile verificare l'account. Riprova tra poco." };
  }
  if (!data?.active) return { error: "Questo account non è abilitato all'area admin." };
  const role: StaffRole = data.role === "admin" ? "admin" : "operatore";
  return { user: { email: u.email ?? "", name: data.full_name || (role === "admin" ? "Admin" : "Operatore"), role } };
}

function loginErrorMessage(message: string): string {
  if (message === "Invalid login credentials") return "Email o password non corrette.";
  if (message === "Email not confirmed") return "Questo account non ha ancora confermato l'email.";
  if (message.toLowerCase().includes("fetch")) return "Impossibile contattare il server. Controlla la connessione.";
  return message;
}

const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [dataReady, setDataReady] = useState(false);
  // Senza Supabase non c'è sessione da aspettare: si mostra subito il login (che spiega l'errore).
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [leadRows, setLeadRows] = useState<Lead[]>([]);
  const [leadLinks, setLeadLinks] = useState<Record<string, string>>({});
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);

  // Lettura iniziale. Va fatta dopo il montaggio: il localStorage non esiste sul
  // server e leggerlo nel render darebbe errori di idratazione.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {}

    const storedApps = read<Appointment[]>(KEYS.appointments);
    if (Array.isArray(storedApps)) setAppointments(storedApps);

    const storedDocs = read<VehicleDocument[]>(KEYS.documents);
    if (Array.isArray(storedDocs)) setDocuments(storedDocs);

    const storedLinks = read<Record<string, string>>(KEYS.leadLinks);
    if (storedLinks && typeof storedLinks === "object") setLeadLinks(storedLinks);

    setNow(Date.now());
    setDataReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Sessione Supabase: getSession legge quella salvata (e la rinnova se scaduta),
  // poi si ricontrolla il profilo staff (potrebbe essere stato disattivato).
  // onAuthStateChange serve solo per l'uscita, anche da un'altra scheda: l'entrata
  // passa sempre dal controllo del profilo.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      console.error("Supabase non configurato: mancano NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      const res = u ? await staffUser(supabase, u) : null;
      if (cancelled) return;
      if (res && "user" in res) setUser(res.user);
      else if (u) await supabase.auth.signOut();
      setAuthReady(true);
    })();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setUser(null);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (dataReady) write(KEYS.appointments, appointments);
  }, [appointments, dataReady]);
  useEffect(() => {
    if (dataReady) write(KEYS.documents, documents);
  }, [documents, dataReady]);
  useEffect(() => {
    if (dataReady) write(KEYS.leadLinks, leadLinks);
  }, [leadLinks, dataReady]);

  // Richieste dal database: all'accesso, ogni minuto e quando si torna sulla scheda.
  const fetchLeads = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from("leads")
      .select(LEAD_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      console.error("Richieste non lette", error);
      setLeadsError("Non riesco a leggere le richieste dal database. Riprovo tra poco.");
      return;
    }
    setLeadsError(null);
    setLeadRows((data as LeadRow[]).map(leadFromRow));
  }, []);

  useEffect(() => {
    if (!user) return;
    // fetchLeads aggiorna lo stato solo dopo la risposta del database, non durante l'effetto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLeads();
    const t = setInterval(() => void fetchLeads(), LEADS_REFRESH_MS);
    const onFocus = () => document.visibilityState === "visible" && void fetchLeads();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user, fetchLeads]);

  // Dopo l'uscita non resta niente a video (all'accesso successivo si rileggono).
  const leads = useMemo(
    () => (user ? leadRows.map((l) => (leadLinks[l.id] ? { ...l, contattoId: leadLinks[l.id] } : l)) : []),
    [user, leadRows, leadLinks]
  );

  // Tiene "oggi" e i "x min fa" aggiornati anche se la scheda resta aperta.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const supabase = getSupabase();
    if (!supabase) return "Accesso non configurato: mancano le chiavi Supabase.";
    setRememberSession(remember);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return loginErrorMessage(error.message);
      const res = await staffUser(supabase, data.user);
      if ("error" in res) {
        await supabase.auth.signOut();
        return res.error;
      }
      setUser(res.user);
      return null;
    } catch {
      return "Impossibile contattare il server. Controlla la connessione.";
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    void getSupabase()?.auth.signOut();
  }, []);

  // Lo stato si salva nel database (subito a video, poi confermato); il collegamento al
  // contatto resta nel browser come l'anagrafica.
  const updateLead = useCallback((id: string, patch: Partial<Lead>) => {
    const { contattoId, ...resto } = patch;
    if (contattoId !== undefined) {
      setLeadLinks((prev) => {
        const next = { ...prev };
        if (contattoId) next[id] = contattoId;
        else delete next[id];
        return next;
      });
    }
    if (resto.status === undefined) return;
    const status = resto.status;
    let previous: Lead["status"] | undefined;
    setLeadRows((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        previous = l.status;
        return { ...l, status };
      })
    );
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase
      .from("leads")
      .update({ status })
      .eq("id", id)
      .then(({ error }) => {
        if (!error) return;
        console.error("Stato della richiesta non salvato", error);
        setLeadsError("Una modifica alle richieste non è stata salvata: controlla la connessione e riprova.");
        if (previous) {
          const back = previous;
          setLeadRows((prev) => prev.map((l) => (l.id === id ? { ...l, status: back } : l)));
        }
      });
  }, []);

  const refreshLeads = useCallback(() => void fetchLeads(), [fetchLeads]);

  const addAppointment = useCallback((data: NewAppointment) => {
    const item: Appointment = {
      ...data,
      id: uid("app"),
      createdAt: toDateStr(new Date()),
    };
    setAppointments((prev) => [item, ...prev]);
    return item;
  }, []);

  const updateAppointment = useCallback((id: string, patch: Partial<Appointment>) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const appointmentsRef = useRef(appointments);
  useEffect(() => {
    appointmentsRef.current = appointments;
  }, [appointments]);

  const deleteAppointment = useCallback((id: string): Annulla => {
    const index = appointmentsRef.current.findIndex((a) => a.id === id);
    const removed = appointmentsRef.current[index];
    if (!removed) return () => {};
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    return () =>
      setAppointments((prev) => {
        if (prev.some((a) => a.id === id)) return prev;
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, removed);
        return next;
      });
  }, []);

  const addDocument = useCallback((data: NewDocument) => {
    const item: VehicleDocument = {
      ...data,
      id: uid("doc"),
      dateAdded: toDateStr(new Date()),
    };
    setDocuments((prev) => [item, ...prev]);
  }, []);

  // Serve a sapere quali file caricati vanno cancellati insieme ai documenti.
  const documentsRef = useRef(documents);
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  const deleteDocument = useCallback((id: string): Annulla => {
    const index = documentsRef.current.findIndex((d) => d.id === id);
    const doc = documentsRef.current[index];
    if (!doc) return () => {};
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    // Il file si cancella solo quando «Annulla» non è più disponibile.
    const storagePath = doc.storagePath;
    const timer = storagePath ? setTimeout(() => void deleteVehicleFile(storagePath), UNDO_MS) : undefined;
    return () => {
      clearTimeout(timer);
      setDocuments((prev) => {
        if (prev.some((d) => d.id === id)) return prev;
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, doc);
        return next;
      });
    };
  }, []);

  const reassignDocuments = useCallback((fromId: string, toId: string) => {
    setDocuments((prev) => prev.map((d) => (d.carId === fromId ? { ...d, carId: toId } : d)));
  }, []);

  const deleteDocumentsOfCar = useCallback((carId: string) => {
    documentsRef.current
      .filter((d) => d.carId === carId && d.storagePath)
      .forEach((d) => void deleteVehicleFile(d.storagePath as string));
    setDocuments((prev) => prev.filter((d) => d.carId !== carId));
  }, []);

  const value = useMemo<AdminContextValue>(
    () => ({
      ready: dataReady && authReady,
      user,
      login,
      logout,
      today: toDateStr(new Date(now)),
      now,
      isAdmin: user?.role === "admin",
      leads,
      leadsError,
      refreshLeads,
      updateLead,
      appointments,
      addAppointment,
      updateAppointment,
      deleteAppointment,
      documents,
      addDocument,
      deleteDocument,
      deleteDocumentsOfCar,
      reassignDocuments,
    }),
    [
      dataReady,
      authReady,
      user,
      login,
      logout,
      now,
      leads,
      leadsError,
      refreshLeads,
      updateLead,
      appointments,
      addAppointment,
      updateAppointment,
      deleteAppointment,
      documents,
      addDocument,
      deleteDocument,
      deleteDocumentsOfCar,
      reassignDocuments,
    ]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within an AdminProvider");
  return ctx;
}
