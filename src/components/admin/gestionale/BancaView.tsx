"use client";

import React, { useState } from "react";
import { Landmark, Search, Upload } from "lucide-react";
import { foglioBanca } from "@/lib/export/gestionale";
import { nomeFile } from "@/lib/export/scrivi";
import ExportMenu, { useContestoExport } from "../ui/ExportMenu";
import ImportEstratto from "./import/ImportEstratto";
import { btnPrimary } from "../ui/styles";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { formatDate } from "@/lib/admin/dates";
import { euro, nomeVeicolo } from "@/lib/gestionale/calc";
import { Stat } from "../ui/Data";
import { Switch } from "../ui/Field";
import { TextField } from "../ui/Inputs";
import { EmptyState, PageHeader } from "../ui/Layout";
import { inputCls, rowDivider } from "../ui/styles";

// Riconciliazione bancaria: i movimenti pagati con un metodo bancario (Impostazioni →
// Banca) si spuntano quando si ritrovano sull'estratto conto, con il riferimento della banca.
export default function BancaView() {
  const { today } = useAdmin();
  const { movimenti, veicoli, impostazioni, updateMovimento } = useGestionale();
  const ctx = useContestoExport();
  const [soloDaFare, setSoloDaFare] = useState(true);
  const [query, setQuery] = useState("");
  const [importa, setImporta] = useState(false);

  const nomeAuto = (id: string | null) => {
    const v = veicoli.find((x) => x.id === id);
    return v ? nomeVeicolo(v) : "Generale";
  };

  const bancari = movimenti.filter((m) => impostazioni.pagamentiBanca.includes(m.pagamento));
  const metodi = impostazioni.pagamentiBanca
    .map((p) => (p === "CASH" ? "Contanti" : p === "CONTO" ? "Conto" : p))
    .map((p) => `«${p}»`)
    .join(", ");

  // Un movimento ritrovato sull'estratto conto è anche pagato: se era "Da saldare" si salda.
  const riconcilia = (m: (typeof movimenti)[number], riconciliato: boolean) =>
    updateMovimento(
      m.id,
      riconciliato && m.statoPagamento === "Da saldare"
        ? { riconciliato, statoPagamento: "Saldato", dataSaldo: m.dataSaldo || today }
        : { riconciliato }
    );
  const daRiconciliare = bancari.filter((m) => !m.riconciliato);
  const q = query.trim().toLowerCase();
  const visibili = bancari
    .filter((m) => !soloDaFare || !m.riconciliato)
    .filter((m) => !q || `${m.descrizione} ${m.fornitoreCliente} ${m.categoria} ${nomeAuto(m.autoId)}`.toLowerCase().includes(q))
    .sort((a, b) => b.data.localeCompare(a.data));

  return (
    <>
      <PageHeader
        title="Banca"
        description="Riconciliazione: spunta i movimenti che ritrovi sull'estratto conto, o importa l'estratto e abbina in automatico."
        actions={
          <>
            <ExportMenu
              nome={nomeFile("Banca", today)}
              fogli={() => [
                foglioBanca(visibili, ctx, [
                  soloDaFare ? `Movimenti bancari da riconciliare al ${formatDate(today)}` : `Movimenti bancari al ${formatDate(today)}`,
                ]),
              ]}
            />
            <button type="button" onClick={() => setImporta(true)} className={btnPrimary}>
              <Upload className="size-4" />
              Importa estratto conto
            </button>
          </>
        }
      />
      {importa && <ImportEstratto onClose={() => setImporta(false)} />}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Stat label="Movimenti bancari" value={bancari.length} />
        <Stat
          label="Da riconciliare"
          value={daRiconciliare.length}
          tone={daRiconciliare.length ? "text-amber-300" : "text-emerald-400"}
          hint={euro(daRiconciliare.reduce((s, m) => s + (m.tipo === "Entrata" ? m.totale : -m.totale), 0))}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={soloDaFare}
            onChange={(e) => setSoloDaFare(e.target.checked)}
            className="size-4 accent-blue-600"
          />
          Solo da riconciliare
        </label>
        <div className="relative w-full sm:w-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-adm-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca descrizione, fornitore…"
            aria-label="Cerca movimento"
            className={`${inputCls} pl-9 sm:w-64`}
          />
        </div>
      </div>

      {visibili.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title={soloDaFare ? "Tutto riconciliato" : "Nessun movimento bancario"}
          description={
            metodi
              ? `Qui compaiono i movimenti pagati con ${metodi} (si cambia da Impostazioni).`
              : "Nessun metodo di pagamento è indicato come bancario: sceglili in Impostazioni."
          }
        />
      ) : (
        <div className={`rounded-xl border border-adm-line bg-adm-surface ${rowDivider}`}>
          {visibili.map((m) => (
            <div key={m.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${m.riconciliato ? "bg-emerald-500/5" : ""}`}>
              <div className="min-w-0 flex-1 basis-48">
                <span className="block truncate font-medium text-white">{m.descrizione || m.categoria}</span>
                <span className="block truncate text-sm text-adm-muted">
                  {formatDate(m.data)} · {nomeAuto(m.autoId)}
                </span>
              </div>
              <span className={`min-w-24 text-right font-medium tabular-nums ${m.tipo === "Entrata" ? "text-emerald-400" : "text-slate-100"}`}>
                {m.tipo === "Entrata" ? "+" : "−"} {euro(m.totale)}
              </span>
              <TextField
                value={m.riferimentoEstratto}
                onCommit={(riferimentoEstratto) => updateMovimento(m.id, { riferimentoEstratto })}
                placeholder="Riferimento banca"
                aria-label={`Riferimento sull'estratto conto per ${m.descrizione || m.categoria}`}
                className={`${inputCls} sm:w-48`}
              />
              <Switch
                compact
                checked={m.riconciliato}
                onChange={(riconciliato) => riconcilia(m, riconciliato)}
                label={
                  m.riconciliato
                    ? "Riconciliato: clic per togliere"
                    : m.statoPagamento === "Da saldare"
                      ? "Segna come riconciliato (diventa anche saldato)"
                      : "Segna come riconciliato"
                }
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
