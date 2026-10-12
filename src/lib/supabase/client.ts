import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client Supabase del browser, usato oggi solo per il login dell'admin.
// La sessione segue la casella "Resta collegato": in localStorage se è spuntata,
// altrimenti in sessionStorage (sparisce chiudendo la scheda).

const REMEMBER_KEY = "global_drive_admin_remember";

function remember(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setRememberSession(value: boolean) {
  try {
    localStorage.setItem(REMEMBER_KEY, value ? "1" : "0");
  } catch {}
}

const sessionStore = {
  getItem(key: string) {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      const [keep, drop] = remember()
        ? [localStorage, sessionStorage]
        : [sessionStorage, localStorage];
      keep.setItem(key, value);
      drop.removeItem(key);
    } catch {}
  },
  removeItem(key: string) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {}
  },
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** false se mancano le variabili d'ambiente (vedi `.env.local`). */
export const isSupabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null | undefined;

/** null se mancano le variabili d'ambiente. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  client =
    url && key
      ? createClient(url, key, {
          auth: { storage: sessionStore, persistSession: true, autoRefreshToken: true },
        })
      : null;
  return client;
}
