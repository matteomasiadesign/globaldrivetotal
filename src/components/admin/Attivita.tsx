"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Attivita } from "@/lib/gestionale/types";

// La gestione aperta nell'admin: Global Drive (vendita) o Global Rent (noleggio). Decide menu,
// colore e pagina «Oggi». Le pagine di una sola gestione la impongono (vedi PAGINE); quelle in
// comune (contatti, agenda, conti…) restano nella gestione scelta per ultima col toggle.

const STORAGE_KEY = "gd_admin_attivita";

export const HOME: Record<Attivita, string> = { Vendita: "/admin", Noleggio: "/admin/noleggio" };

/** Le pagine che appartengono a una sola gestione. */
const PAGINE: { attivita: Attivita; esatta?: string; prefisso?: string }[] = [
  { attivita: "Vendita", esatta: "/admin" },
  { attivita: "Vendita", esatta: "/admin/auto" },
  { attivita: "Noleggio", prefisso: "/admin/noleggio" },
];

export function attivitaDellaPagina(pathname: string): Attivita | null {
  const p = PAGINE.find((x) => pathname === x.esatta || (x.prefisso && (pathname === x.prefisso || pathname.startsWith(`${x.prefisso}/`))));
  return p?.attivita ?? null;
}

interface AttivitaContextValue {
  attivita: Attivita;
  /** Cambia gestione: dalle pagine dell'altra si va alla sua «Oggi», da quelle in comune si resta. */
  cambia: (a: Attivita) => void;
  /** Per le pagine che sanno a quale gestione appartengono solo dai dati (es. la scheda di un'auto). */
  imposta: (a: Attivita) => void;
}

const AttivitaContext = createContext<AttivitaContextValue | undefined>(undefined);

function letta(): Attivita {
  try {
    return localStorage.getItem(STORAGE_KEY) === "Noleggio" ? "Noleggio" : "Vendita";
  } catch {
    return "Vendita";
  }
}

export function AttivitaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const dallaPagina = attivitaDellaPagina(pathname);
  // L'admin si mostra solo dopo aver letto la sessione nel browser: qui il localStorage c'è già.
  const [scelta, setScelta] = useState<Attivita>(() => dallaPagina ?? (typeof window === "undefined" ? "Vendita" : letta()));
  // Dopo un clic sul toggle si mostra subito la gestione scelta, anche prima che arrivi la nuova pagina.
  const [inArrivo, setInArrivo] = useState<Attivita | null>(null);
  const attivita = inArrivo ?? dallaPagina ?? scelta;

  // Aprendo una pagina di una sola gestione, quella diventa la scelta anche per le pagine in comune.
  // (Stato derivato al cambio di pagina, durante il render: niente effetti a cascata.)
  const [paginaVista, setPaginaVista] = useState(pathname);
  if (paginaVista !== pathname) {
    setPaginaVista(pathname);
    setInArrivo(null);
    if (dallaPagina) setScelta(dallaPagina);
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, scelta);
    } catch {
      // Navigazione privata: la scelta vale finché la pagina resta aperta.
    }
  }, [scelta]);

  const salva = useCallback((a: Attivita) => setScelta(a), []);

  // Il colore dell'interfaccia (anche dei pannelli aperti fuori dalla cornice) segue la gestione.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.attivita = attivita;
    return () => {
      delete root.dataset.attivita;
    };
  }, [attivita]);

  const cambia = useCallback(
    (a: Attivita) => {
      salva(a);
      if (dallaPagina && dallaPagina !== a) {
        setInArrivo(a);
        router.push(HOME[a]);
      }
    },
    [dallaPagina, router, salva]
  );

  const value = useMemo(() => ({ attivita, cambia, imposta: salva }), [attivita, cambia, salva]);
  return <AttivitaContext.Provider value={value}>{children}</AttivitaContext.Provider>;
}

export function useAttivita() {
  const ctx = useContext(AttivitaContext);
  if (!ctx) throw new Error("useAttivita must be used within an AttivitaProvider");
  return ctx;
}
