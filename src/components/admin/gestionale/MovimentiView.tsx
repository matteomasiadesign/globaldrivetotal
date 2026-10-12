"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CarFront, Check, Copy, Download, Paperclip, Pencil, Plus, Receipt, Search, Trash2, Upload, UserRound } from "lucide-react";
import { ImportaMovimenti } from "./import/Importa";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { formatDate } from "@/lib/admin/dates";
import { foglioMovimenti, foglioPrimaNota } from "@/lib/export/gestionale";
import { nomeFile, scaricaXlsx } from "@/lib/export/scrivi";
import { euro, nomeVeicolo } from "@/lib/gestionale/calc";
import { anniDisponibili, etichettaPeriodo, inPeriodo, type Periodo } from "@/lib/gestionale/periodo";
import { NOME_ATTIVITA, type Movimento } from "@/lib/gestionale/types";
import { useEditors } from "../AdminEditors";
import { useAttivita } from "../Attivita";
import { useUrlState } from "../useUrlState";
import { Stat, signedText } from "../ui/Data";
import ExportMenu, { useContestoExport } from "../ui/ExportMenu";
import { SelectField } from "../ui/Inputs";
import { EmptyState, FilterTabs, PageHeader, Pill, type TabOption } from "../ui/Layout";
import { PeriodoSelect } from "../ui/PeriodoSelect";
import DataTable from "../ui/DataTable";
import { btnPrimary, btnSecondary, inputCls } from "../ui/styles";
import { useToast } from "../ui/Toast";

type TipoFiltro = "tutti" | "Entrata" | "Uscita";
/** Solo i movimenti della gestione aperta, o quelli di tutta la società (la contabilità è una). */
type Ambito = "gestione" | "societa";

export default function MovimentiView({ initialAuto }: { initialAuto?: string }) {
  const router = useRouter();
  const { today, isAdmin } = useAdmin();
  const { movimenti: tuttiIMovimenti, veicoli, deleteMovimento, updateMovimento } = useGestionale();
  const { attivita } = useAttivita();
  const [ambito, setAmbito] = useUrlState<Ambito>("ambito", "gestione");
  const movimenti = ambito === "societa" ? tuttiIMovimenti : tuttiIMovimenti.filter((m) => m.attivita === attivita);
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

  // Saldare uno o più movimenti in un colpo, con «Annulla».
  function salda(lista: Movimento[]) {
    if (lista.length === 0) return;
    lista.forEach((m) => updateMovimento(m.id, { statoPagamento: "Saldato", dataSaldo: today }));
    toast(lista.length === 1 ? (lista[0].tipo === "Entrata" ? "Incasso registrato" : "Pagamento registrato") : `${lista.length} movimenti saldati`, {
      label: "Annulla",
      onClick: () => lista.forEach((m) => updateMovimento(m.id, { statoPagamento: "Da saldare", dataSaldo: m.dataSaldo })),
    });
  }

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
        <FilterTabs
          tabs={[
            { id: "gestione", label: NOME_ATTIVITA[attivita], count: tuttiIMovimenti.filter((m) => m.attivita === attivita).length },
            { id: "societa", label: "Tutta la società", count: tuttiIMovimenti.length },
          ]}
          value={ambito}
          onChange={setAmbito}
          label="Movimenti di quale gestione"
        />
        <FilterTabs tabs={tabs} value={tipo} onChange={setTipo} label="Filtra per tipo" />
        <PeriodoSelect value={periodo} onChange={setPeriodo} anni={anni} />
        <SelectField
          value={auto}
          blank="Tutte le auto"
          options={[
            { value: "generale", label: "Solo generali" },
            ...veicoli
              .filter((v) => ambito === "societa" || v.attivita === attivita || v.id === auto)
              .map((v) => ({ value: v.id, label: nomeVeicolo(v) })),
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

      <DataTable
        etichetta="Movimenti"
        righe={visibili}
        chiave={(m) => m.id}
        onApri={(m) => openMovimento({ movimentoId: m.id })}
        ordineIniziale={{ id: "data", verso: "desc" }}
        classeRiga={(m) => (m.statoPagamento === "Da saldare" && m.dataScadenza && m.dataScadenza < today ? "bg-rose-500/[0.04]" : "")}
        vuoto={
          <EmptyState
            icon={Receipt}
            title={movimenti.length === 0 ? "Nessun movimento registrato" : "Nessun movimento trovato"}
            description={movimenti.length === 0 ? "Registra la prima entrata o uscita, o importala da Excel." : "Prova a cambiare filtri o ricerca."}
            action={
              movimenti.length === 0 ? (
                <button type="button" onClick={() => openMovimento()} className={btnPrimary}>
                  <Plus className="size-4" />
                  Nuovo movimento
                </button>
              ) : undefined
            }
          />
        }
        colonne={[
          {
            id: "data",
            titolo: "Data",
            cella: (m) => <span className="whitespace-nowrap tabular-nums">{formatDate(m.data)}</span>,
            ordina: (m) => m.data,
            mobile: "sotto",
            className: "w-28",
          },
          {
            id: "descrizione",
            titolo: "Descrizione",
            cella: (m) => (
              <span className="flex min-w-0 items-center gap-1.5 font-medium text-white">
                {ambito === "societa" && (
                  <span
                    className={`shrink-0 rounded px-1.5 text-[10px] font-semibold uppercase tracking-wide ${
                      m.attivita === "Noleggio" ? "bg-violet-500/15 text-violet-300" : "bg-blue-500/15 text-blue-300"
                    }`}
                  >
                    {m.attivita === "Noleggio" ? "Rent" : "Drive"}
                  </span>
                )}
                <span className="truncate">{m.descrizione || m.categoria}</span>
                {m.allegatoPath && <Paperclip className="size-3.5 shrink-0 text-adm-muted" aria-label="Con allegato" />}
              </span>
            ),
            ordina: (m) => (m.descrizione || m.categoria).toLowerCase(),
            mobile: "titolo",
            className: "max-w-[18rem]",
          },
          {
            id: "controparte",
            titolo: "Fornitore / cliente",
            cella: (m) => <span className="block max-w-[12rem] truncate">{m.fornitoreCliente || "—"}</span>,
            ordina: (m) => m.fornitoreCliente.toLowerCase(),
            mobile: "sotto",
          },
          {
            id: "auto",
            titolo: "Auto",
            cella: (m) => <span className="block max-w-[11rem] truncate text-adm-muted">{nomeAuto(m.autoId)}</span>,
            ordina: (m) => nomeAuto(m.autoId),
            mobile: "nascosta",
          },
          {
            id: "categoria",
            titolo: "Categoria",
            cella: (m) => <span className="text-adm-muted">{m.categoria}</span>,
            ordina: (m) => m.categoria,
            mobile: "nascosta",
          },
          {
            id: "stato",
            titolo: "Stato",
            cella: (m) => stato(m) ?? <span className="text-xs text-adm-muted">Saldato</span>,
            ordina: (m) => (m.statoPagamento === "Da saldare" ? 0 : 1),
            mobile: "destra",
          },
          {
            id: "importo",
            titolo: "Importo",
            destra: true,
            cella: (m) => (
              <span className={`whitespace-nowrap font-medium ${m.tipo === "Entrata" ? "text-emerald-400" : "text-slate-100"}`}>
                {m.tipo === "Entrata" ? "+" : "−"} {euro(m.totale)}
              </span>
            ),
            ordina: (m) => (m.tipo === "Entrata" ? m.totale : -m.totale),
            totale: (righe) => {
              const saldo = righe.reduce((s, m) => s + (m.tipo === "Entrata" ? m.totale : -m.totale), 0);
              return <span className={signedText(saldo)}>{euro(saldo)}</span>;
            },
            mobile: "destra",
          },
        ]}
        azioni={(m) => [
          { label: "Modifica", icon: Pencil, onSelect: () => openMovimento({ movimentoId: m.id }) },
          ...(m.statoPagamento === "Da saldare"
            ? [
                {
                  label: m.tipo === "Entrata" ? "Segna incassato" : "Segna pagato",
                  icon: Check,
                  onSelect: () => salda([m]),
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
            onSelect: () => toast("Movimento eliminato", { label: "Annulla", onClick: deleteMovimento(m.id) }),
          },
        ]}
        azioniMultiple={[
          { label: "Segna saldati", icon: Check, esegui: (righe) => salda(righe.filter((m) => m.statoPagamento === "Da saldare")) },
          {
            label: "Esporta",
            icon: Download,
            esegui: (righe) => void scaricaXlsx([foglioMovimenti(righe, ctx, [`${righe.length} movimenti selezionati`])], nomeFile("Movimenti_selezionati")),
          },
          {
            label: "Elimina",
            icon: Trash2,
            danger: true,
            esegui: (righe) => {
              const annulla = righe.map((m) => deleteMovimento(m.id));
              toast(`${righe.length} movimenti eliminati`, { label: "Annulla", onClick: () => annulla.reverse().forEach((a) => a()) });
            },
          },
        ]}
      />
    </>
  );
}
