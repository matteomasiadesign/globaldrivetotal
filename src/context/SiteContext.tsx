"use client";

import React, { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { defaultSiteSettings } from "@/config/site";
import { telLink, toWaNumber } from "@/lib/admin/phone";
import type { SiteSettings } from "@/types/site";

// Contenuti del sito modificabili da /admin/sito. Oggi stanno nel localStorage
// (come le auto); con il database cambiano solo `save` e `getSnapshot`.
// useSyncExternalStore: il server e la prima resa mostrano i valori di partenza,
// poi arrivano quelli salvati senza errori di idratazione, e una modifica fatta
// in una scheda si vede subito nelle altre.

const STORAGE_KEY = "global_drive_site_v1";
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

const getServerSnapshot = (): string | null => null;

function save(value: SiteSettings | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Impossibile salvare i contenuti del sito", e);
  }
  listeners.forEach((l) => l());
}

function parse(raw: string | null): SiteSettings {
  if (!raw) return defaultSiteSettings;
  try {
    // I campi aggiunti dopo il salvataggio prendono il valore di partenza.
    return { ...defaultSiteSettings, ...(JSON.parse(raw) as Partial<SiteSettings>) };
  } catch {
    return defaultSiteSettings;
  }
}

interface SiteContextValue {
  site: SiteSettings;
  updateSite: (next: SiteSettings) => void;
  resetSite: () => void;
  /** "tel:+39…" pronto per un link. */
  phoneHref: string;
  /** Link wa.me al numero dell'azienda, con testo già compilato (facoltativo). */
  whatsappUrl: (text?: string) => string;
}

const SiteContext = createContext<SiteContextValue | undefined>(undefined);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<SiteContextValue>(() => {
    const site = parse(raw);
    const base = `https://wa.me/${toWaNumber(site.phone)}`;
    return {
      site,
      updateSite: save,
      resetSite: () => save(null),
      phoneHref: telLink(site.phone),
      whatsappUrl: (text) => (text ? `${base}?text=${encodeURIComponent(text)}` : base),
    };
  }, [raw]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within a SiteProvider");
  return ctx;
}
