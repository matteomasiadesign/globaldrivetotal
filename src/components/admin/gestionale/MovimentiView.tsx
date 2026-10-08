"use client";

import React, { useState } from "react";
import { Pencil, Plus, Receipt, Search, Trash2 } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { formatDate } from "@/lib/admin/dates";
import { euro, nomeVeicolo } from "@/lib/gestionale/calc";
import type { Movimento } from "@/lib/gestionale/types";
import { useEditors } from "../AdminEditors";
import { Stat, signedText } from "../ui/Data";
import { SelectField } from "../ui/Inputs";
import { EmptyState, FilterTabs, PageHeader, Pill, type TabOption } from "../ui/Layout";
import RowMenu from "../ui/RowMenu";
import { btnPrimary, inputCls, rowDivider } from "../ui/styles";
import { useToast } from "../ui/Toast";

type TipoFiltro = "tutti" | "Entrata" | "Uscita";

export default function MovimentiView({ initialAuto }: { initialAuto?: string }) {
  const { today } = useAdmin();
  const { movimenti, veicoli, deleteMovimento } = useGestionale();
  const { openMovimento } = useEditors();
  const toast = useToast();

  const [tipo, setTipo] = useState<TipoFiltro>("tutti");
  const [auto, setAuto] = useState(initialAuto ?? "");
  const [query, setQuery] = useState("");

  const nomeAuto = (id: string | null) => {
    const v = veicoli.find((x) => x.id === id);
    return v ? nomeVeicolo(v) : "Generale";
  };

  const q = query.trim().toLowerCase();
  const visibili = movimenti
    .filter((m) => tipo === "tutti" || m.tipo === tipo)
    .filter((m) => !auto || (auto === "generale" ? m.autoId === null : m.autoId === auto))
    .filter(
      (m) =>
        !q ||
        `${m.descrizione} ${m.fornitoreCliente} ${m.categoria} ${m.numeroDocumento} ${nomeAuto(m.autoId)}`
          .toLowerCase()
          .includes(q)
    )
    .sort((a, b) => b.data.localeCompare(a.data));

  const entrate = visibili.filter((m) => m.tipo === "Entrata").reduce((s, m) => s + m.totale, 0);
  const uscite = visibili.filter((m) => m.tipo === "Uscita").reduce((s, m) => s + m.totale, 0);

  const tabs: TabOption<TipoFiltro>[] = [
    { id: "tutti", label: "Tutti", count: movimenti.length },
    { id: "Entrata", label: "Entrate", count: movimenti.filter((m) => m.tipo === "Entrata").length },
    { id: "Uscita", label: "Uscite", count: movimenti.filter((m) => m.tipo === "Uscita").length },
  ];

  function stato(m: Movimento) {
    if (m.statoPagamento !== "Da saldare") return null;
    const scaduto = m.dataScadenza && m.dataScadenza < today;
    return <Pill tone={scaduto ? "red" : "amber"}>{scaduto ? "Scaduto" : "Da saldare"}</Pill>;
  }

  return (
    <>
      <PageHeader
        title="Movimenti"
        description="Il libro cassa e banca: ogni entrata e uscita, collegata a un'auto o generale."
        actions={
          <button type="button" onClick={() => openMovimento({ autoId: auto && auto !== "generale" ? auto : undefined })} className={btnPrimary}>
            <Plus className="size-4" />
            Nuovo movimento
          </button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Entrate" value={euro(entrate)} />
        <Stat label="Uscite" value={euro(uscite)} />
        <Stat label="Saldo" value={euro(entrate - uscite)} tone={signedText(entrate - uscite)} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterTabs tabs={tabs} value={tipo} onChange={setTipo} label="Filtra per tipo" />
        <SelectField
          value={auto}
          blank="Tutte le auto"
          options={[
            { value: "generale", label: "Solo generali" },
            ...veicoli.map((v) => ({ value: v.id, label: nomeVeicolo(v) })),
          ]}
          onChange={setAuto}
          aria-label="Filtra per auto"
          className={`${inputCls} sm:w-56`}
        />
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
          icon={Receipt}
          title={movimenti.length === 0 ? "Nessun movimento registrato" : "Nessun movimento trovato"}
          description={movimenti.length === 0 ? "Registra la prima entrata o uscita." : "Prova a cambiare filtri o ricerca."}
        />
      ) : (
        <div className={`rounded-xl border border-adm-line bg-adm-surface ${rowDivider}`}>
          {visibili.map((m) => {
            const nome = m.descrizione || m.categoria;
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => openMovimento({ movimentoId: m.id })}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <span className="block truncate font-medium text-white">{nome}</span>
                  <span className="block truncate text-sm text-adm-muted">
                    {formatDate(m.data)} · {nomeAuto(m.autoId)} · {m.categoria}
                    {m.fornitoreCliente ? ` · ${m.fornitoreCliente}` : ""}
                  </span>
                </button>
                {stato(m)}
                <span className={`min-w-24 text-right font-medium tabular-nums ${m.tipo === "Entrata" ? "text-emerald-400" : "text-slate-100"}`}>
                  {m.tipo === "Entrata" ? "+" : "−"} {euro(m.totale)}
                </span>
                <RowMenu
                  label={`Azioni per ${nome}`}
                  items={[
                    { label: "Modifica", icon: Pencil, onSelect: () => openMovimento({ movimentoId: m.id }) },
                    {
                      label: "Elimina",
                      icon: Trash2,
                      danger: true,
                      confirm: "Conferma: elimina",
                      onSelect: () => {
                        deleteMovimento(m.id);
                        toast("Movimento eliminato");
                      },
                    },
                  ]}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
