"use client";

import React from "react";
import { CalendarClock, Check } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { euro, nomeVeicolo } from "@/lib/gestionale/calc";
import { formatShortDate } from "@/lib/admin/dates";
import { useEditors } from "../AdminEditors";
import { useUrlState } from "../useUrlState";
import { Note, Stat } from "../ui/Data";
import { EmptyState, FilterTabs, PageHeader, Pill, type TabOption } from "../ui/Layout";
import { btnSecondary, rowDivider } from "../ui/styles";
import { useToast } from "../ui/Toast";

export type ScadenzarioTab = "incassi" | "pagamenti";

export default function ScadenzarioView({ initialTab = "incassi" }: { initialTab?: ScadenzarioTab }) {
  const { today } = useAdmin();
  const { movimenti, veicoli, updateMovimento } = useGestionale();
  const { openMovimento } = useEditors();
  const toast = useToast();
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

  function saldato(id: string) {
    updateMovimento(id, { statoPagamento: "Saldato", dataSaldo: today });
    toast(tab === "incassi" ? "Incasso registrato" : "Pagamento registrato", {
      label: "Annulla",
      onClick: () => updateMovimento(id, { statoPagamento: "Da saldare", dataSaldo: "" }),
    });
  }

  return (
    <>
      <PageHeader title="Scadenzario" description="Incassi e pagamenti ancora da saldare, dal più urgente." />

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

      {lista.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Niente in sospeso qui"
          description="Una scadenza nasce da un movimento segnato «Da saldare» con la data di scadenza."
        />
      ) : (
        <div className={`rounded-xl border border-adm-line bg-adm-surface ${rowDivider}`}>
          {lista.map((m) => {
            const scaduto = Boolean(m.dataScadenza && m.dataScadenza < today);
            const auto = nomeAuto(m.autoId);
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => openMovimento({ movimentoId: m.id })}
                  className="min-w-0 flex-1 basis-48 cursor-pointer text-left"
                >
                  <span className="block truncate font-medium text-white">{m.descrizione || m.categoria}</span>
                  <span className="block truncate text-sm text-adm-muted">
                    {[m.fornitoreCliente, auto].filter(Boolean).join(" · ") || m.categoria}
                  </span>
                </button>
                <Pill tone={scaduto ? "red" : m.dataScadenza ? "slate" : "amber"}>
                  {m.dataScadenza ? `${scaduto ? "Scaduto il " : "Entro il "}${formatShortDate(m.dataScadenza)}` : "Senza scadenza"}
                </Pill>
                <span className="min-w-24 text-right font-medium tabular-nums text-white">{euro(m.totale)}</span>
                <button type="button" onClick={() => saldato(m.id)} className={btnSecondary}>
                  <Check className="size-4" />
                  Segna saldato
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <Note>Per far comparire una voce qui apri il movimento, scegli «Da saldare» e indica la scadenza.</Note>
      </div>
    </>
  );
}
