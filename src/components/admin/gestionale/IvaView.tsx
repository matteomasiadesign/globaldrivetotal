"use client";

import React from "react";
import { BookOpen, Percent } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { formatDate } from "@/lib/admin/dates";
import { useGestionale } from "@/context/GestionaleContext";
import {
  PERIODI_IVA,
  annoNum,
  computeVeicolo,
  euro,
  liquidazioneTrimestre,
  nomeVeicolo,
} from "@/lib/gestionale/calc";
import { Note, SummaryRow } from "../ui/Data";
import { useUrlState } from "../useUrlState";
import { EmptyState, FilterTabs, PageHeader, type TabOption } from "../ui/Layout";
import { tableWrap, tdCls, thCls } from "../ui/styles";

export type IvaTab = "liquidazione" | "vendite" | "acquisti";

function Totali({ imponibile, iva }: { imponibile: number; iva: number }) {
  return (
    <div className="mt-3 flex flex-wrap justify-end gap-x-8 gap-y-1 rounded-xl border border-adm-line bg-adm-surface px-4 py-3 text-sm">
      <span>
        <span className="text-adm-muted">Totale imponibile </span>
        <span className="font-semibold tabular-nums text-white">{euro(imponibile)}</span>
      </span>
      <span>
        <span className="text-adm-muted">Totale IVA </span>
        <span className="font-semibold tabular-nums text-white">{euro(iva)}</span>
      </span>
    </div>
  );
}

function Liquidazione() {
  const { today } = useAdmin();
  const { veicoli, movimenti, impostazioni } = useGestionale();
  const righe = [1, 2, 3, 4].map((t) => liquidazioneTrimestre(t, veicoli, movimenti, impostazioni, today));

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {righe.map((r) => (
          <section key={r.trim} className="rounded-xl border border-adm-line bg-adm-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">T{r.trim}</h2>
              <Percent className="size-4 text-adm-muted" />
            </div>
            <p className="mb-3 text-xs text-adm-muted">
              {PERIODI_IVA[r.trim].periodo} · scade il {PERIODI_IVA[r.trim].scadenza}
            </p>
            <SummaryRow label="IVA regime margine" value={euro(r.ivaMargine)} />
            <SummaryRow label="IVA su commissioni" value={euro(r.ivaCommissioni)} />
            <SummaryRow label="IVA detraibile sui costi" value={`− ${euro(r.ivaDetraibile)}`} />
            <div className="my-2 border-t border-adm-line" />
            <SummaryRow label="Saldo base" value={euro(r.saldoBase)} />
            <SummaryRow label={`Maggiorazione (${Math.round(impostazioni.maggiorazioneTrimestrale * 10000) / 100}%)`} value={euro(r.maggiorazione)} />
            <div className="my-2 border-t border-adm-line" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-white">Da versare</span>
              <span className="text-lg font-semibold tabular-nums text-white">{euro(r.totale)}</span>
            </div>
          </section>
        ))}
      </div>
      <div className="mt-4">
        <Note>
          Il prospetto è gestionale e non sostituisce il calcolo del commercialista. L&apos;IVA del regime del margine è
          stimata come quota incorporata nel margine positivo (prezzo di vendita − prezzo di acquisto); l&apos;IVA
          detraibile è quella indicata come tale nei singoli movimenti. Verifica aliquota, maggiorazione e metodo con il
          tuo commercialista.
        </Note>
      </div>
    </>
  );
}

function RegistroVendite() {
  const { today } = useAdmin();
  const { veicoli, movimenti, impostazioni } = useGestionale();
  const anno = impostazioni.annoGestione;

  const righe = veicoli
    .filter((v) => v.dataVendita && annoNum(v.dataVendita) === anno)
    .map((v) => {
      const calc = computeVeicolo(v, movimenti, impostazioni, today);
      const contoVendita = v.servizio === "Conto vendita";
      return {
        v,
        imponibile: contoVendita
          ? calc.commissioneImponibile || 0
          : (calc.margineRegimeIva || 0) - (calc.ivaRegimeMargine || 0),
        iva: contoVendita ? calc.ivaCommissione || 0 : calc.ivaRegimeMargine || 0,
      };
    })
    .sort((a, b) => a.v.dataVendita.localeCompare(b.v.dataVendita));

  if (righe.length === 0) {
    return <EmptyState icon={BookOpen} title={`Nessuna vendita registrata nel ${anno}`} description="Compaiono le auto con una data di vendita." />;
  }
  return (
    <>
      <div className={tableWrap}>
        <table className="w-full min-w-[40rem]">
          <thead className="border-b border-adm-line">
            <tr>
              <th className={thCls}>Data</th>
              <th className={thCls}>N. fattura</th>
              <th className={thCls}>Auto</th>
              <th className={thCls}>Servizio</th>
              <th className={`${thCls} text-right`}>Imponibile</th>
              <th className={`${thCls} text-right`}>IVA</th>
              <th className={`${thCls} text-right`}>Totale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-adm-line">
            {righe.map(({ v, imponibile, iva }) => (
              <tr key={v.id}>
                <td className={`${tdCls} whitespace-nowrap tabular-nums`}>{formatDate(v.dataVendita)}</td>
                <td className={tdCls}>{v.numeroFattura || "—"}</td>
                <td className={`${tdCls} font-medium text-white`}>{nomeVeicolo(v)}</td>
                <td className={`${tdCls} text-adm-muted`}>{v.servizio}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{euro(imponibile)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{euro(iva)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{euro(imponibile + iva)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Totali imponibile={righe.reduce((s, r) => s + r.imponibile, 0)} iva={righe.reduce((s, r) => s + r.iva, 0)} />
    </>
  );
}

function RegistroAcquisti() {
  const { movimenti, impostazioni } = useGestionale();
  const anno = impostazioni.annoGestione;
  const righe = movimenti
    .filter((m) => m.tipo === "Uscita" && m.ivaDetraibile && annoNum(m.data) === anno)
    .sort((a, b) => a.data.localeCompare(b.data));

  if (righe.length === 0) {
    return <EmptyState icon={BookOpen} title={`Nessun acquisto con IVA detraibile nel ${anno}`} description="Compaiono le uscite con IVA detraibile." />;
  }
  return (
    <>
      <div className={tableWrap}>
        <table className="w-full min-w-[40rem]">
          <thead className="border-b border-adm-line">
            <tr>
              <th className={thCls}>Data</th>
              <th className={thCls}>N. documento</th>
              <th className={thCls}>Fornitore</th>
              <th className={thCls}>Categoria</th>
              <th className={`${thCls} text-right`}>Imponibile</th>
              <th className={`${thCls} text-right`}>IVA</th>
              <th className={`${thCls} text-right`}>Totale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-adm-line">
            {righe.map((m) => (
              <tr key={m.id}>
                <td className={`${tdCls} whitespace-nowrap tabular-nums`}>{formatDate(m.data)}</td>
                <td className={tdCls}>{m.numeroDocumento || "—"}</td>
                <td className={tdCls}>{m.fornitoreCliente || "—"}</td>
                <td className={`${tdCls} text-adm-muted`}>{m.categoria}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{euro(m.imponibile)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{euro(m.iva)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{euro(m.totale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Totali imponibile={righe.reduce((s, m) => s + m.imponibile, 0)} iva={righe.reduce((s, m) => s + m.iva, 0)} />
    </>
  );
}

export default function IvaView({ initialTab = "liquidazione" }: { initialTab?: IvaTab }) {
  const { impostazioni } = useGestionale();
  const [tab, setTab] = useUrlState<IvaTab>("tab", initialTab);
  const tabs: TabOption<IvaTab>[] = [
    { id: "liquidazione", label: "Liquidazione" },
    { id: "vendite", label: "Registro vendite" },
    { id: "acquisti", label: "Registro acquisti" },
  ];

  return (
    <>
      <PageHeader
        title="IVA"
        description={`Liquidazione trimestrale e registri, anno ${impostazioni.annoGestione}.`}
      />
      <div className="mb-4">
        <FilterTabs tabs={tabs} value={tab} onChange={setTab} label="Sezione IVA" />
      </div>
      {tab === "liquidazione" && <Liquidazione />}
      {tab === "vendite" && <RegistroVendite />}
      {tab === "acquisti" && <RegistroAcquisti />}
      {tab !== "liquidazione" && (
        <div className="mt-4">
          <Note>
            Questo registro è un supporto gestionale: il registro IVA ufficiale ai fini di legge resta quello tenuto dal
            commercialista. Confronta ogni tanto i totali con i suoi per accorgerti di eventuali differenze.
          </Note>
        </div>
      )}
    </>
  );
}
