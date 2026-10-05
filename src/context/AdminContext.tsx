"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useCars } from "@/context/CarContext";
import { initialAppointments, initialDocuments, initialLeads } from "@/data/adminMock";
import { toDateStr } from "@/lib/admin/dates";
import type { Appointment, VehicleDocument } from "@/types/admin";
import type { Lead } from "@/types/lead";

// Stato condiviso dell'area admin. Oggi vive nel localStorage del browser (come
// le auto): quando arriverà il database basta cambiare le funzioni qui sotto,
// le pagine non se ne accorgono.

export interface AdminUser {
  email: string;
  name: string;
}

export type NewAppointment = Omit<Appointment, "id" | "createdAt">;
export type NewDocument = Omit<VehicleDocument, "id" | "dateAdded">;

interface AdminContextValue {
  /** false finché non è stato letto il localStorage: non mostrare nulla prima. */
  ready: boolean;
  user: AdminUser | null;
  login: (user: AdminUser, remember: boolean) => void;
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

  resetDemoData: () => void;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

const KEYS = {
  session: "global_drive_admin_session",
  appointments: "global_drive_appointments_v2",
  documents: "global_drive_documents_v2",
  leads: "global_drive_leads_v1",
} as const;

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

const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { resetToDefault } = useCars();

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [documents, setDocuments] = useState<VehicleDocument[]>(initialDocuments);

  // Lettura iniziale. Un elenco salvato ma vuoto è un dato valido (hai cancellato
  // tutto): solo l'assenza della chiave fa ripartire dai dati demo.
  // Va fatta dopo il montaggio: il localStorage non esiste sul server e leggerlo
  // nel render darebbe errori di idratazione.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const session = read<AdminUser>(KEYS.session);
    if (session?.email) setUser(session);

    const storedApps = read<Appointment[]>(KEYS.appointments);
    if (Array.isArray(storedApps)) setAppointments(storedApps);

    const storedDocs = read<VehicleDocument[]>(KEYS.documents);
    if (Array.isArray(storedDocs)) setDocuments(storedDocs);

    const storedLeads = read<Lead[]>(KEYS.leads);
    if (Array.isArray(storedLeads)) setLeads(storedLeads);

    setNow(Date.now());
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (ready) write(KEYS.appointments, appointments);
  }, [appointments, ready]);
  useEffect(() => {
    if (ready) write(KEYS.documents, documents);
  }, [documents, ready]);
  useEffect(() => {
    if (ready) write(KEYS.leads, leads);
  }, [leads, ready]);

  // Tiene "oggi" e i "x min fa" aggiornati anche se la scheda resta aperta.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const login = useCallback((u: AdminUser, remember: boolean) => {
    if (remember) write(KEYS.session, u);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(KEYS.session);
    } catch {}
    setUser(null);
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

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const deleteDocumentsOfCar = useCallback((carId: string) => {
    setDocuments((prev) => prev.filter((d) => d.carId !== carId));
  }, []);

  const resetDemoData = useCallback(() => {
    resetToDefault();
    setLeads(initialLeads);
    setAppointments(initialAppointments);
    setDocuments(initialDocuments);
  }, [resetToDefault]);

  const value = useMemo<AdminContextValue>(
    () => ({
      ready,
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
      resetDemoData,
    }),
    [
      ready,
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
      resetDemoData,
    ]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within an AdminProvider");
  return ctx;
}
