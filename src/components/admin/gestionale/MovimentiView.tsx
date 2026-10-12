"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CarFront, Check, Copy, Paperclip, Pencil, Plus, Receipt, Search, Trash2, Upload, UserRound } from "lucide-react";
import { ImportaMovimenti } from "./import/Importa";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { formatDate } from "@/lib/admin/dates";
import { foglioMovimenti, foglioPrimaNota } from "@/lib/export/gestionale";
import { nomeFile } from "@/lib/export/scrivi";
import { euro, nomeVeicolo } from "@/lib/gestionale/calc";
import { anniDisponibili, etichettaPeriodo, inPeriodo, type Periodo } from "@/lib/gestionale/periodo";
import type { Movimento } from "@/lib/gestionale/types";
import { useEditors } from "../AdminEditors";
import { useUrlState } from "../useUrlState";
import { Stat, signedText } from "../ui/Data";
import ExportMenu, { useContestoExport } from "../ui/ExportMenu";
import { SelectField } from "../ui/Inputs";
import { EmptyState, FilterTabs, PageHeader, Pill, type TabOption } from "../ui/Layout";
import { PeriodoSelect } from "../ui/PeriodoSelect";
import RowMenu from "../ui/RowMenu";
import { btnPrimary, btnSecondary, inputCls, rowDivider } from "../ui/styles";
import { useToast } from "../ui/Toast";

type TipoFiltro = "tutti" | "Entrata" | "Uscita";

export default function MovimentiView({ initialAuto }: { initialAuto?: string }) {
  const router = useRouter();
  const { today, isAdmin } = useAdmin();
  const { movimenti, veicoli, deleteMovimento, updateMovimento } = useGestionale();
  const { openMovimento, openContatto } = useEditors();
  const toast = useToast();

  const ctx = useContestoExport();
  const [tipo, setTipo] = useUrlState<TipoFiltro>("tipo", "tutti");
  const [periodo, setPeriodo] = useUrlState<Periodo>("periodo", "tutto");
  const [auto, setAuto] = useState(initialAuto ?? "");
  const [query, setQuery] = useState("");
  const [importa, setImporta] = useState(false);
  const anni = anniDisponibili(movimenti.map((m) => m.data), Number(today.slice(0, 4)));

  const nomeAuto = (id: string | null) => {
    const v = veicoli.find((x) => x.id === id);
    return v ? nomeVeicolo(v) : "Generale";
  };

  const q = query.trim().toLowerCase();
  const visibili = movimenti
    .filter((m) => inPeriodo(m.data, periodo))
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

  const nelPeriodo = movimenti.filter((m) => inPeriodo(m.data, periodo));
  const tabs: TabOption<TipoFiltro>[] = [
    { id: "tutti", label: "Tutti", count: nelPeriodo.length },
    { id: "Entrata", label: "Entrate", count: nelPeriodo.filter((m) => m.tipo === "Entrata").length },
    { id: "Uscita", label: "Uscite", count: nelPeriodo.filter((m) => m.tipo === "Uscita").length },
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
          <>
            <ExportMenu
              nome={nomeFile("Movimenti", periodo === "tutto" ? undefined : periodo)}
              fogli={() => [
                foglioMovimenti(visibili, ctx, [
                  `Movimenti · ${etichettaPeriodo(periodo)}${tipo !== "tutti" ? ` · ${tipo === "Entrata" ? "entrate" : "uscite"}` : ""}${
                    auto ? ` · ${auto === "generale" ? "solo generali" : nomeAuto(auto)}` : ""
                  }${q ? ` · ricerca "${query.trim()}"` : ""}`,
                ]),
                foglioPrimaNota(ctx, periodo),
              ]}
            />
            <button type="button" onClick={() => setImporta(true)} className={btnSecondary}>
              <Upload className="size-4" />
              <span className="hidden sm:inline">Importa</span>
            </button>
            <button type="button" onClick={() => openMovimento({ autoId: auto && auto !== "generale" ? auto : undefined })} className={btnPrimary}>
              <Plus className="size-4" />
              Nuovo movimento
            </button>
          </>
        }
      />

      {importa && <ImportaMovimenti onClose={() => setImporta(false)} />}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Entrate" value={euro(entrate)} />
        <Stat label="Uscite" value={euro(uscite)} />
        <Stat label="Saldo" value={euro(entrate - uscite)} tone={signedText(entrate - uscite)} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterTabs tabs={tabs} value={tipo} onChange={setTipo} label="Filtra per tipo" />
        <PeriodoSelect value={periodo} onChange={setPeriodo} anni={anni} />
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
                {m.allegatoPath && <Paperclip className="size-4 shrink-0 text-adm-muted" aria-label="Con allegato" />}
                {stato(m)}
                <span className={`min-w-24 text-right font-medium tabular-nums ${m.tipo === "Entrata" ? "text-emerald-400" : "text-slate-100"}`}>
                  {m.tipo === "Entrata" ? "+" : "−"} {euro(m.totale)}
                </span>
                <RowMenu
                  label={`Azioni per ${nome}`}
                  items={[
                    { label: "Modifica", icon: Pencil, onSelect: () => openMovimento({ movimentoId: m.id }) },
                    ...(m.statoPagamento === "Da saldare"
                      ? [
                          {
                            label: m.tipo === "Entrata" ? "Segna incassato" : "Segna pagato",
                            icon: Check,
                            onSelect: () => {
                              updateMovimento(m.id, { statoPagamento: "Saldato", dataSaldo: today });
                              toast(m.tipo === "Entrata" ? "Incasso registrato" : "Pagamento registrato", {
                                label: "Annulla",
                                onClick: () => updateMovimento(m.id, { statoPagamento: "Da saldare", dataSaldo: "" }),
                              });
                            },
                          },
                        ]
                      : []),
                    { label: "Duplica", icon: Copy, onSelect: () => openMovimento({ duplicaDa: m.id }) },
                    ...(m.autoId && isAdmin
                      ? [{ label: "Apri scheda auto", icon: CarFront, onSelect: () => router.push(`/admin/auto/${m.autoId}`) }]
                      : []),
                    ...(m.contattoId
                      ? [{ label: "Apri contatto", icon: UserRound, onSelect: () => openContatto({ contattoId: m.contattoId as string }) }]
                      : []),
                    {
                      label: "Elimina",
                      icon: Trash2,
                      danger: true,
                      confirm: "Conferma: elimina",
                      onSelect: () => {
                        toast("Movimento eliminato", { label: "Annulla", onClick: deleteMovimento(m.id) });
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
