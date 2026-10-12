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
import type { Appointment, VehicleDocument } from "@/types/admin";
import type { Lead } from "@/types/lead";

// Stato condiviso dell'area admin. Il login è su Supabase Auth; i dati vivono
// ancora nel localStorage del browser (come le auto): quando arriverà il
// database basta cambiare le funzioni qui sotto, le pagine non se ne accorgono.

export interface AdminUser {
  email: string;
  name: string;
}

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

  leads: Lead[];
  updateLead: (id: string, patch: Partial<Lead>) => void;

  appointments: Appointment[];
  addAppointment: (data: NewAppointment) => Appointment;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;

  documents: VehicleDocument[];
  addDocument: (data: NewDocument) => void;
  deleteDocument: (id: string) => void;
  deleteDocumentsOfCar: (carId: string) => void;
  /** Sposta il dossier da un'auto a un'altra chiave (es. all'uscita dal catalogo passa alla scheda economica). */
  reassignDocuments: (fromId: string, toId: string) => void;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

const KEYS = {
  appointments: "global_drive_appointments_v3",
  documents: "global_drive_documents_v3",
  leads: "global_drive_leads_v2",
} as const;

/** Chiavi delle versioni precedenti (login finto e dati demo): si cancellano alla prima apertura. */
const LEGACY_KEYS = [
  "global_drive_admin_session",
  "global_drive_appointments_v2",
  "global_drive_documents_v2",
  "global_drive_leads_v1",
];

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
    .select("full_name, active")
    .eq("id", u.id)
    .maybeSingle();
  if (error) {
    return error.code === "PGRST205"
      ? { error: "Il database non è ancora pronto: va eseguito supabase/schema.sql su Supabase." }
      : { error: "Impossibile verificare l'account. Riprova tra poco." };
  }
  if (!data?.active) return { error: "Questo account non è abilitato all'area admin." };
  return { user: { email: u.email ?? "", name: data.full_name || "Admin" } };
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
  const [leads, setLeads] = useState<Lead[]>([]);
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

    const storedLeads = read<Lead[]>(KEYS.leads);
    if (Array.isArray(storedLeads)) setLeads(storedLeads);

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
    if (dataReady) write(KEYS.leads, leads);
  }, [leads, dataReady]);

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

  const updateLead = useCallback((id: string, patch: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

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

  const deleteAppointment = useCallback((id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
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

  const deleteDocument = useCallback((id: string) => {
    const doc = documentsRef.current.find((d) => d.id === id);
    if (doc?.storagePath) void deleteVehicleFile(doc.storagePath);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
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
      leads,
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
