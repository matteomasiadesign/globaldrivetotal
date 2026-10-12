"use client";

import React from "react";
import { CalendarClock, Check, Download, Pencil } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { euro, nomeVeicolo } from "@/lib/gestionale/calc";
import { formatDate } from "@/lib/admin/dates";
import { foglioScadenzario } from "@/lib/export/gestionale";
import { nomeFile, scaricaXlsx } from "@/lib/export/scrivi";
import DataTable from "../ui/DataTable";
import { useEditors } from "../AdminEditors";
import { useUrlState } from "../useUrlState";
import { Note, Stat } from "../ui/Data";
import ExportMenu, { useContestoExport } from "../ui/ExportMenu";
import { EmptyState, FilterTabs, PageHeader, Pill, type TabOption } from "../ui/Layout";
import { btnSecondary } from "../ui/styles";
import { useToast } from "../ui/Toast";

export type ScadenzarioTab = "incassi" | "pagamenti";

export default function ScadenzarioView({ initialTab = "incassi" }: { initialTab?: ScadenzarioTab }) {
  const { today } = useAdmin();
  const { movimenti, veicoli, updateMovimento } = useGestionale();
  const { openMovimento } = useEditors();
  const toast = useToast();
  const ctx = useContestoExport();
  const [tab, setTab] = useUrlState<ScadenzarioTab>("tab", initialTab);

  const nomeAuto = (id: string | null) => {
    const v = veicoli.find((x) => x.id === id);
    return v ? nomeVeicolo(v) : null;
  };

  const daSaldare = movimenti
    .filter((m) => m.statoPagamento === "Da saldare")
    .sort((a, b) => (a.dataScadenza || "9999").localeCompare(b.dataScadenza || "9999"));
  const incassi = daSaldare.filter((m) => m.tipo === "Entrata");
  const pagamenti = daSaldare.filter((m) => m.tipo === "Uscita");
  const scaduti = (lista: typeof incassi) => lista.filter((m) => m.dataScadenza && m.dataScadenza < today);

  const lista = tab === "incassi" ? incassi : pagamenti;
  const totale = (l: typeof incassi) => l.reduce((s, m) => s + m.totale, 0);

  const tabs: TabOption<ScadenzarioTab>[] = [
    { id: "incassi", label: "Da incassare", count: incassi.length, alert: scaduti(incassi).length > 0 },
    { id: "pagamenti", label: "Da pagare", count: pagamenti.length, alert: scaduti(pagamenti).length > 0 },
  ];

  function salda(righe: typeof lista) {
    if (righe.length === 0) return;
    righe.forEach((m) => updateMovimento(m.id, { statoPagamento: "Saldato", dataSaldo: today }));
    const msg = tab === "incassi" ? "Incass" : "Pagament";
    toast(righe.length === 1 ? `${msg}o registrato` : `${righe.length} ${msg.toLowerCase()}i registrati`, {
      label: "Annulla",
      onClick: () => righe.forEach((m) => updateMovimento(m.id, { statoPagamento: "Da saldare", dataSaldo: "" })),
    });
  }

  return (
    <>
      <PageHeader
        title="Scadenzario"
        description="Incassi e pagamenti ancora da saldare, dal più urgente."
        actions={
          <ExportMenu
            nome={nomeFile("Scadenzario", today)}
            fogli={() => [
              { ...foglioScadenzario(incassi, ctx, [`Da incassare al ${formatDate(today)}`]), nome: "Da incassare" },
              { ...foglioScadenzario(pagamenti, ctx, [`Da pagare al ${formatDate(today)}`]), nome: "Da pagare" },
            ]}
          />
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Stat
          label="Da incassare"
          value={euro(totale(incassi))}
          hint={scaduti(incassi).length ? `${scaduti(incassi).length} scaduti` : undefined}
          tone={scaduti(incassi).length ? "text-rose-400" : undefined}
        />
        <Stat
          label="Da pagare"
          value={euro(totale(pagamenti))}
          hint={scaduti(pagamenti).length ? `${scaduti(pagamenti).length} scaduti` : undefined}
          tone={scaduti(pagamenti).length ? "text-rose-400" : undefined}
        />
      </div>

      <div className="mb-4">
        <FilterTabs tabs={tabs} value={tab} onChange={setTab} label="Incassi o pagamenti" />
      </div>

      <DataTable
        key={tab}
        etichetta={tab === "incassi" ? "Da incassare" : "Da pagare"}
        righe={lista}
        chiave={(m) => m.id}
        onApri={(m) => openMovimento({ movimentoId: m.id })}
        ordineIniziale={{ id: "scadenza", verso: "asc" }}
        classeRiga={(m) => (m.dataScadenza && m.dataScadenza < today ? "bg-rose-500/[0.05]" : "")}
        vuoto={
          <EmptyState
            icon={CalendarClock}
            title="Niente in sospeso qui"
            description="Una scadenza nasce da un movimento segnato «Da saldare» con la data di scadenza."
          />
        }
        colonne={[
          {
            id: "scadenza",
            titolo: "Scadenza",
            cella: (m) => {
              const scaduto = Boolean(m.dataScadenza && m.dataScadenza < today);
              return (
                <Pill tone={scaduto ? "red" : m.dataScadenza ? "slate" : "amber"}>
                  {m.dataScadenza ? `${scaduto ? "Scaduto il " : "Entro il "}${formatDate(m.dataScadenza)}` : "Senza scadenza"}
                </Pill>
              );
            },
            ordina: (m) => m.dataScadenza || "9999",
            mobile: "destra",
          },
          {
            id: "descrizione",
            titolo: "Descrizione",
            cella: (m) => <span className="block max-w-[18rem] truncate font-medium text-white">{m.descrizione || m.categoria}</span>,
            ordina: (m) => (m.descrizione || m.categoria).toLowerCase(),
            mobile: "titolo",
          },
          {
            id: "controparte",
            titolo: tab === "incassi" ? "Cliente" : "Fornitore",
            cella: (m) => <span className="block max-w-[12rem] truncate">{m.fornitoreCliente || "—"}</span>,
            ordina: (m) => m.fornitoreCliente.toLowerCase(),
            mobile: "sotto",
          },
          {
            id: "auto",
            titolo: "Auto",
            cella: (m) => <span className="block max-w-[11rem] truncate text-adm-muted">{nomeAuto(m.autoId) ?? "—"}</span>,
            mobile: "sotto",
          },
          {
            id: "importo",
            titolo: "Importo",
            destra: true,
            cella: (m) => <span className="whitespace-nowrap font-medium text-white">{euro(m.totale)}</span>,
            ordina: (m) => m.totale,
            totale: (righe) => euro(righe.reduce((s, m) => s + m.totale, 0)),
            mobile: "destra",
          },
          {
            id: "salda",
            titolo: "",
            cella: (m) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  salda([m]);
                }}
                className={btnSecondary}
              >
                <Check className="size-4" />
                {tab === "incassi" ? "Incassato" : "Pagato"}
              </button>
            ),
            className: "w-32 text-right",
            mobile: "nascosta",
          },
        ]}
        azioni={(m) => [
          { label: tab === "incassi" ? "Segna incassato" : "Segna pagato", icon: Check, onSelect: () => salda([m]) },
          { label: "Apri movimento", icon: Pencil, onSelect: () => openMovimento({ movimentoId: m.id }) },
        ]}
        azioniMultiple={[
          { label: tab === "incassi" ? "Segna incassati" : "Segna pagati", icon: Check, esegui: salda },
          {
            label: "Esporta",
            icon: Download,
            esegui: (righe) => void scaricaXlsx([foglioScadenzario(righe, ctx, [`${righe.length} scadenze selezionate`])], nomeFile("Scadenze_selezionate")),
          },
        ]}
      />

      <div className="mt-4">
        <Note>Per far comparire una voce qui apri il movimento, scegli «Da saldare» e indica la scadenza.</Note>
      </div>
    </>
  );
}
