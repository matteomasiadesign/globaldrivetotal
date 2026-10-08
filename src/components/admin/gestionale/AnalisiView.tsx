"use client";

import React, { useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { annoNum, computeVeicolo, euro, meseNum, percento } from "@/lib/gestionale/calc";
import { MESI } from "@/lib/gestionale/types";
import { Stat, signedText } from "../ui/Data";
import { FilterTabs, PageHeader, type TabOption } from "../ui/Layout";
import { tableWrap, tdCls, thCls } from "../ui/styles";

export type AnalisiTab = "costi" | "mensile";

function useAnalisi() {
  const { today } = useAdmin();
  const { veicoli, movimenti, impostazioni } = useGestionale();
  const anno = impostazioni.annoGestione;
  const risultato = (v: (typeof veicoli)[number]) => computeVeicolo(v, movimenti, impostazioni, today);
  const delMese = (data: string, mese: number) => meseNum(data) === mese && annoNum(data) === anno;
  const venduteNelMese = (mese: number) => veicoli.filter((v) => v.dataVendita && delMese(v.dataVendita, mese));
  const somma = (mese: number, tipo: "Entrata" | "Uscita", natura?: string) =>
    movimenti
      .filter((m) => m.tipo === tipo && delMese(m.data, mese) && (!natura || m.naturaCosto === natura))
      .reduce((s, m) => s + m.totale, 0);
  return { veicoli, anno, risultato, venduteNelMese, somma };
}

function Costi() {
  const { veicoli, risultato, venduteNelMese, somma } = useAnalisi();

  const righe = MESI.map((nome, i) => {
    const mese = i + 1;
    const fissi = somma(mese, "Uscita", "Fisso");
    const diretti = somma(mese, "Uscita", "Variabile diretto auto");
    const generali = somma(mese, "Uscita", "Variabile generale");
    const totali = fissi + diretti + generali;
    const vendute = venduteNelMese(mese);
    const risultatoAuto = vendute.reduce((s, v) => s + (risultato(v).risultatoDopoIva || 0), 0);
    const entrate = somma(mese, "Entrata");
    return {
      nome,
      fissi,
      diretti,
      generali,
      totali,
      risultatoAuto,
      risultatoOperativo: risultatoAuto - fissi - generali,
      fissiPerAuto: vendute.length ? fissi / vendute.length : 0,
      incidenza: entrate ? totali / entrate : 0,
    };
  });

  const fissiMedi = righe.reduce((s, r) => s + r.fissi, 0) / 12;
  const vendute = veicoli.filter((v) => v.dataVendita);
  const margineMedio = vendute.length
    ? vendute.reduce((s, v) => s + (risultato(v).risultatoDopoIva || 0), 0) / vendute.length
    : 0;
  const operazioniNecessarie = margineMedio ? fissiMedi / margineMedio : 0;

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Costi fissi medi al mese" value={euro(fissiMedi)} />
        <Stat label="Margine medio per operazione" value={euro(margineMedio)} tone={signedText(margineMedio)} />
        <Stat label="Operazioni al mese per pareggiare" value={operazioniNecessarie.toFixed(1)} hint="Break-even sui costi fissi" />
      </div>
      <div className={tableWrap}>
        <table className="w-full min-w-[56rem]">
          <thead className="border-b border-adm-line">
            <tr>
              <th className={thCls}>Mese</th>
              <th className={`${thCls} text-right`}>Fissi</th>
              <th className={`${thCls} text-right`}>Variabili diretti</th>
              <th className={`${thCls} text-right`}>Variabili generali</th>
              <th className={`${thCls} text-right`}>Totali</th>
              <th className={`${thCls} text-right`}>Risultato auto</th>
              <th className={`${thCls} text-right`}>Risultato operativo</th>
              <th className={`${thCls} text-right`}>Fissi / auto venduta</th>
              <th className={`${thCls} text-right`}>Incidenza</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-adm-line">
            {righe.map((r) => (
              <tr key={r.nome}>
                <td className={`${tdCls} font-medium text-white`}>{r.nome}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{euro(r.fissi)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{euro(r.diretti)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{euro(r.generali)}</td>
                <td className={`${tdCls} text-right font-medium tabular-nums`}>{euro(r.totali)}</td>
                <td className={`${tdCls} text-right tabular-nums ${signedText(r.risultatoAuto)}`}>{euro(r.risultatoAuto)}</td>
                <td className={`${tdCls} text-right tabular-nums ${signedText(r.risultatoOperativo)}`}>{euro(r.risultatoOperativo)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{euro(r.fissiPerAuto)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{Math.round(r.incidenza * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Mensile() {
  const { risultato, venduteNelMese, somma } = useAnalisi();

  const righe = MESI.map((nome, i) => {
    const mese = i + 1;
    const vendute = venduteNelMese(mese);
    const quante = (servizio: string) => vendute.filter((v) => v.servizio === servizio).length;
    const conti = vendute.map(risultato);
    const costoVendute = conti.reduce((s, c) => s + c.costoTotale, 0);
    const risultatoAuto = conti.reduce((s, c) => s + (c.risultatoDopoIva || 0), 0);
    return {
      nome,
      diretta: quante("Vendita diretta"),
      commissione: quante("Auto su commissione"),
      contoVendita: quante("Conto vendita"),
      operazioni: vendute.length,
      ricavi: somma(mese, "Entrata"),
      risultatoAuto,
      roi: costoVendute ? risultatoAuto / costoVendute : 0,
    };
  });
  const totale = righe.reduce(
    (acc, r) => ({ operazioni: acc.operazioni + r.operazioni, ricavi: acc.ricavi + r.ricavi, risultato: acc.risultato + r.risultatoAuto }),
    { operazioni: 0, ricavi: 0, risultato: 0 }
  );

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Operazioni" value={totale.operazioni} />
        <Stat label="Ricavi registrati" value={euro(totale.ricavi)} />
        <Stat label="Risultato auto" value={euro(totale.risultato)} tone={signedText(totale.risultato)} />
      </div>
      <div className={tableWrap}>
        <table className="w-full min-w-[44rem]">
          <thead className="border-b border-adm-line">
            <tr>
              <th className={thCls}>Mese</th>
              <th className={`${thCls} text-right`}>Vendita diretta</th>
              <th className={`${thCls} text-right`}>Su commissione</th>
              <th className={`${thCls} text-right`}>Conto vendita</th>
              <th className={`${thCls} text-right`}>Operazioni</th>
              <th className={`${thCls} text-right`}>Ricavi</th>
              <th className={`${thCls} text-right`}>Risultato auto</th>
              <th className={`${thCls} text-right`}>ROI medio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-adm-line">
            {righe.map((r) => (
              <tr key={r.nome}>
                <td className={`${tdCls} font-medium text-white`}>{r.nome}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{r.diretta}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{r.commissione}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{r.contoVendita}</td>
                <td className={`${tdCls} text-right font-medium tabular-nums`}>{r.operazioni}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{euro(r.ricavi)}</td>
                <td className={`${tdCls} text-right tabular-nums ${signedText(r.risultatoAuto)}`}>{euro(r.risultatoAuto)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{percento(r.roi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function AnalisiView({ initialTab = "mensile" }: { initialTab?: AnalisiTab }) {
  const { impostazioni } = useGestionale();
  const [tab, setTab] = useState<AnalisiTab>(initialTab);
  const tabs: TabOption<AnalisiTab>[] = [
    { id: "mensile", label: "Vendite per mese" },
    { id: "costi", label: "Costi e break-even" },
  ];
  return (
    <>
      <PageHeader title="Analisi" description={`Come sta andando l'attività, anno ${impostazioni.annoGestione}.`} />
      <div className="mb-4">
        <FilterTabs tabs={tabs} value={tab} onChange={setTab} label="Tipo di analisi" />
      </div>
      {tab === "mensile" ? <Mensile /> : <Costi />}
    </>
  );
}
