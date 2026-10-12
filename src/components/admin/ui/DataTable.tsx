"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, X, type LucideIcon } from "lucide-react";
import RowMenu, { type MenuItem } from "./RowMenu";
import { btnSecondary, focusRing } from "./styles";

// La tabella unica dell'admin: intestazioni, ordinamento per colonna, selezione
// multipla con azioni in blocco, riga di totale e, su telefono, una scheda per riga.
// Le viste dichiarano solo le colonne; il comportamento è lo stesso ovunque.

export interface Colonna<T> {
  id: string;
  titolo: string;
  cella: (riga: T) => React.ReactNode;
  /** Valore con cui ordinare; senza, la colonna non è ordinabile. */
  ordina?: (riga: T) => string | number;
  /** Numeri e importi: allineati a destra. */
  destra?: boolean;
  /** Contenuto della riga di totale (calcolato sulle righe mostrate). */
  totale?: (righe: T[]) => React.ReactNode;
  /** Classe aggiuntiva della colonna (es. larghezza). */
  className?: string;
  /**
   * Su telefono: "titolo" = riga principale della scheda, "sotto" = seconda riga (unite con «·»),
   * "destra" = a destra del titolo (importi, stato), "nascosta" = non si mostra.
   */
  mobile?: "titolo" | "sotto" | "destra" | "nascosta";
}

export interface AzioneMultipla<T> {
  label: string;
  icon?: LucideIcon;
  danger?: boolean;
  esegui: (righe: T[]) => void;
}

type Verso = "asc" | "desc";
const PASSO = 100;

export default function DataTable<T>({
  righe,
  colonne,
  chiave,
  etichetta,
  onApri,
  azioni,
  azioniMultiple,
  ordineIniziale,
  classeRiga,
  vuoto,
}: {
  righe: T[];
  colonne: Colonna<T>[];
  chiave: (riga: T) => string;
  /** Nome della tabella per i lettori di schermo ("Movimenti"). */
  etichetta: string;
  /** Clic sulla riga: apre il dettaglio. */
  onApri?: (riga: T) => void;
  /** Voci del menu «…» di ogni riga. */
  azioni?: (riga: T) => MenuItem[];
  /** Con queste azioni compare la casella di selezione su ogni riga. */
  azioniMultiple?: AzioneMultipla<T>[];
  ordineIniziale?: { id: string; verso: Verso };
  /** Classe di sfondo di una riga (es. scaduta, riconciliata). */
  classeRiga?: (riga: T) => string;
  /** Cosa mostrare se non ci sono righe. */
  vuoto?: React.ReactNode;
}) {
  const [ordine, setOrdine] = useState(ordineIniziale ?? null);
  const [scelte, setScelte] = useState<Set<string>>(new Set());
  const [quante, setQuante] = useState(PASSO);
  const selezionabile = Boolean(azioniMultiple?.length);

  const ordinate = useMemo(() => {
    const col = ordine && colonne.find((c) => c.id === ordine.id);
    if (!ordine || !col?.ordina) return righe;
    const segno = ordine.verso === "asc" ? 1 : -1;
    const valore = col.ordina;
    return [...righe].sort((a, b) => {
      const x = valore(a);
      const y = valore(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "it")) * segno;
    });
  }, [righe, colonne, ordine]);

  // La selezione vale solo per le righe ancora presenti (i filtri possono averne tolte).
  const idPresenti = new Set(righe.map(chiave));
  const selezionate = righe.filter((r) => scelte.has(chiave(r)));
  const tutteScelte = righe.length > 0 && selezionate.length === righe.length;
  const mostrate = ordinate.slice(0, quante);
  const conTotali = colonne.some((c) => c.totale);

  function cambiaOrdine(c: Colonna<T>) {
    if (!c.ordina) return;
    setOrdine((o) =>
      o?.id === c.id ? { id: c.id, verso: o.verso === "asc" ? "desc" : "asc" } : { id: c.id, verso: c.destra ? "desc" : "asc" }
    );
  }

  function scegli(id: string, si: boolean) {
    setScelte((prev) => {
      const next = new Set([...prev].filter((x) => idPresenti.has(x)));
      if (si) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  if (righe.length === 0) return <>{vuoto}</>;

  const casella = (r: T) => (
    <input
      type="checkbox"
      checked={scelte.has(chiave(r))}
      onChange={(e) => scegli(chiave(r), e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      aria-label="Seleziona riga"
      className="size-4 cursor-pointer accent-acc-600"
    />
  );
  const menu = (r: T) => {
    const voci = azioni?.(r) ?? [];
    return voci.length > 0 ? (
      <div onClick={(e) => e.stopPropagation()}>
        <RowMenu items={voci} label="Azioni" />
      </div>
    ) : null;
  };
  const apribile = Boolean(onApri);

  return (
    <div className="space-y-3">
      {/* Tabella (da tablet in su) */}
      <div className="hidden max-h-[calc(100vh-15rem)] min-h-40 overflow-auto rounded-xl border border-adm-line bg-adm-surface md:block">
        <table className="w-full text-sm" aria-label={etichetta}>
          <thead className="sticky top-0 z-10 bg-adm-surface shadow-[0_1px_0_var(--color-adm-line)]">
            <tr>
              {selezionabile && (
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={tutteScelte}
                    onChange={(e) => setScelte(e.target.checked ? new Set(righe.map(chiave)) : new Set())}
                    aria-label="Seleziona tutte le righe"
                    className="size-4 cursor-pointer accent-acc-600"
                  />
                </th>
              )}
              {colonne.map((c) => {
                const attivo = ordine?.id === c.id;
                const Icona = attivo ? (ordine?.verso === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={attivo ? (ordine?.verso === "asc" ? "ascending" : "descending") : undefined}
                    className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium text-adm-muted ${c.destra ? "text-right" : "text-left"} ${c.className ?? ""}`}
                  >
                    {c.ordina ? (
                      <button
                        type="button"
                        onClick={() => cambiaOrdine(c)}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded hover:text-white ${attivo ? "text-white" : ""} ${focusRing}`}
                      >
                        {c.titolo}
                        <Icona className={`size-3.5 ${attivo ? "" : "opacity-40"}`} />
                      </button>
                    ) : (
                      c.titolo
                    )}
                  </th>
                );
              })}
              {azioni && <th className="w-12" aria-label="Azioni" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-adm-line">
            {mostrate.map((r) => (
              <tr
                key={chiave(r)}
                onClick={apribile ? () => onApri?.(r) : undefined}
                className={`${apribile ? "cursor-pointer hover:bg-white/[0.03]" : ""} ${scelte.has(chiave(r)) ? "bg-acc-500/10" : (classeRiga?.(r) ?? "")}`}
              >
                {selezionabile && <td className="px-3 py-2.5">{casella(r)}</td>}
                {colonne.map((c) => (
                  <td key={c.id} className={`px-3 py-2.5 align-middle text-slate-200 ${c.destra ? "text-right tabular-nums" : ""} ${c.className ?? ""}`}>
                    {c.cella(r)}
                  </td>
                ))}
                {azioni && <td className="px-2 py-1.5 text-right">{menu(r)}</td>}
              </tr>
            ))}
          </tbody>
          {conTotali && (
            <tfoot className="sticky bottom-0 bg-adm-raised shadow-[0_-1px_0_var(--color-adm-line)]">
              <tr>
                {selezionabile && <td />}
                {colonne.map((c, i) => (
                  <td key={c.id} className={`px-3 py-2.5 text-sm font-semibold text-white ${c.destra ? "text-right tabular-nums" : ""}`}>
                    {c.totale ? c.totale(ordinate) : i === 0 ? `Totale (${righe.length})` : null}
                  </td>
                ))}
                {azioni && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Schede (telefono) */}
      <div className="divide-y divide-adm-line rounded-xl border border-adm-line bg-adm-surface md:hidden" aria-label={etichetta}>
        {mostrate.map((r) => {
          const titolo = colonne.filter((c) => c.mobile === "titolo");
          const sotto = colonne.filter((c) => c.mobile === "sotto");
          const destra = colonne.filter((c) => c.mobile === "destra");
          return (
            <div
              key={chiave(r)}
              onClick={apribile ? () => onApri?.(r) : undefined}
              className={`flex items-start gap-3 px-4 py-3 ${apribile ? "cursor-pointer" : ""} ${scelte.has(chiave(r)) ? "bg-acc-500/10" : (classeRiga?.(r) ?? "")}`}
            >
              {selezionabile && <div className="pt-1">{casella(r)}</div>}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-white">
                  {titolo.map((c) => (
                    <React.Fragment key={c.id}>{c.cella(r)}</React.Fragment>
                  ))}
                </div>
                {sotto.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-x-1.5 text-sm text-adm-muted">
                    {sotto.map((c, i) => (
                      <span key={c.id} className="min-w-0">
                        {i > 0 && "· "}
                        {c.cella(r)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {destra.length > 0 && (
                <div className="flex shrink-0 flex-col items-end gap-1 text-right tabular-nums">
                  {destra.map((c) => (
                    <div key={c.id}>{c.cella(r)}</div>
                  ))}
                </div>
              )}
              {azioni && <div className="-mr-2">{menu(r)}</div>}
            </div>
          );
        })}
        {conTotali && (
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 bg-adm-raised px-4 py-3 text-sm">
            <span className="font-semibold text-white">Totale ({righe.length})</span>
            {colonne
              .filter((c) => c.totale)
              .map((c) => (
                <span key={c.id} className="tabular-nums">
                  <span className="text-adm-muted">{c.titolo} </span>
                  <span className="font-semibold text-white">{c.totale?.(ordinate)}</span>
                </span>
              ))}
          </div>
        )}
      </div>

      {ordinate.length > quante && (
        <div className="flex justify-center">
          <button type="button" onClick={() => setQuante((q) => q + PASSO)} className={btnSecondary}>
            Mostra altri {Math.min(PASSO, ordinate.length - quante)} (di {ordinate.length - quante})
          </button>
        </div>
      )}

      {/* Barra delle azioni in blocco: compare quando si seleziona qualcosa */}
      {selezionate.length > 0 && azioniMultiple && (
        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center gap-2 rounded-xl border border-acc-500/40 bg-adm-raised px-3 py-2 shadow-2xl lg:bottom-4">
          <span className="px-1 text-sm font-medium text-white">
            {selezionate.length} {selezionate.length === 1 ? "selezionato" : "selezionati"}
          </span>
          {azioniMultiple.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  a.esegui(selezionate);
                  setScelte(new Set());
                }}
                className={`${btnSecondary} ${a.danger ? "text-rose-300" : ""}`}
              >
                {Icon && <Icon className="size-4" />}
                {a.label}
              </button>
            );
          })}
          <button type="button" onClick={() => setScelte(new Set())} className={`${btnSecondary} ml-auto`} aria-label="Deseleziona">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
