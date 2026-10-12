// Cosa vede chi ha il ruolo "operatore" (staff_profiles.role): sito, richieste, agenda,
// parco auto, documenti, contatti e noleggio. I conti (prezzi d'acquisto, margini, IVA,
// contratti, impostazioni, storico) restano all'admin, come le policy di supabase/schema.sql.

const SOLO_ADMIN = [
  "/admin/movimenti",
  "/admin/scadenzario",
  "/admin/iva",
  "/admin/banca",
  "/admin/analisi",
  "/admin/impostazioni",
  "/admin/storico",
  // La scheda economica di un'auto (/admin/auto/[id]); la lista /admin/auto resta a tutti.
  "/admin/auto/",
];

export function isAdminOnlyPath(pathname: string): boolean {
  return SOLO_ADMIN.some((p) => (p.endsWith("/") ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`)));
}
