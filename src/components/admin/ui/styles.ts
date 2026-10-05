// Classi condivise dell'area admin. Una sola definizione per bottoni e campi,
// così le pagine restano leggibili e coerenti.

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400";

const btnBase = `inline-flex h-10 lg:h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 ${focusRing}`;

export const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-500`;
export const btnSecondary = `${btnBase} border border-adm-line bg-white/5 text-slate-200 hover:bg-white/10`;
export const btnDanger = `${btnBase} bg-rose-600 text-white hover:bg-rose-500`;

/** Bottone quadrato con sola icona: ricordarsi sempre aria-label / title. */
export const btnIcon = `grid size-10 shrink-0 lg:size-8 cursor-pointer place-items-center rounded-lg text-adm-muted transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-40 ${focusRing}`;

export const inputCls =
  "h-11 lg:h-9 w-full rounded-lg border border-adm-line bg-adm-bg px-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none";

export const textareaCls =
  "w-full rounded-lg border border-adm-line bg-adm-bg px-3 py-2 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-blue-500 focus:outline-none";

export const card = "rounded-xl border border-adm-line bg-adm-surface";

export { focusRing };
