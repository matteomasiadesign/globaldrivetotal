"use client";

import React from "react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { annoNum, computeVeicolo, euro, meseNum, percento } from "@/lib/gestionale/calc";
import { MESI } from "@/lib/gestionale/types";
import { Stat, signedText } from "../ui/Data";
import { useUrlState } from "../useUrlState";
import { FilterTabs, PageHeader, type TabOption } from "../ui/Layout";
import { tableWrap, tdCls, thCls } from "../ui/styles";
import ExportMenu from "../ui/ExportMenu";
import { AnnoSelect } from "../ui/PeriodoSelect";
import { nomeFile } from "@/lib/export/scrivi";
import { foglio } from "@/lib/export/types";
import { anniDisponibili } from "@/lib/gestionale/periodo";

const tfCls = "px-3 py-2.5 text-sm font-semibold text-white tabular-nums";

export type AnalisiTab = "costi" | "mensile";

function useAnalisi(anno: number) {
  const { today } = useAdmin();
  const { veicoli, movimenti, impostazioni } = useGestionale();
  const risultato = (v: (typeof veicoli)[number]) => computeVeicolo(v, movimenti, impostazioni, today);
  const delMese = (data: string, mese: number) => meseNum(data) === mese && annoNum(data) === anno;
  const venduteNelMese = (mese: number) => veicoli.filter((v) => v.dataVendita && delMese(v.dataVendita, mese));
  const somma = (mese: number, tipo: "Entrata" | "Uscita", natura?: string) =>
    movimenti
      .filter((m) => m.tipo === tipo && delMese(m.data, mese) && (!natura || m.naturaCosto === natura))
      .reduce((s, m) => s + m.totale, 0);
  return { veicoli, anno, risultato, venduteNelMese, somma };
}

function useRigheCosti(anno: number) {
  const { veicoli, risultato, venduteNelMese, somma } = useAnalisi(anno);

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
  const vendute = veicoli.filter((v) => v.dataVendita && annoNum(v.dataVendita) === anno);
  const margineMedio = vendute.length
    ? vendute.reduce((s, v) => s + (risultato(v).risultatoDopoIva || 0), 0) / vendute.length
    : 0;
  const operazioniNecessarie = margineMedio > 0 ? fissiMedi / margineMedio : null;
  return { righe, fissiMedi, margineMedio, operazioniNecessarie };
}

function Costi({ anno }: { anno: number }) {
  const { righe, fissiMedi, margineMedio, operazioniNecessarie } = useRigheCosti(anno);
  const tot = (k: "fissi" | "diretti" | "generali" | "totali" | "risultatoAuto" | "risultatoOperativo") =>
    righe.reduce((s, r) => s + r[k], 0);

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Costi fissi medi al mese" value={euro(fissiMedi)} />
        <Stat label="Margine medio per operazione" value={euro(margineMedio)} tone={signedText(margineMedio)} />
        <Stat label="Operazioni al mese per pareggiare" value={operazioniNecessarie === null ? "—" : operazioniNecessarie.toFixed(1)} hint={operazioniNecessarie === null ? "Serve un margine medio positivo" : "Break-even sui costi fissi"} />
      </div>
      <div className={tableWrap}>
        <table className="w-full min-w-[56rem]">
          <thead className="border-b border-adm-line">
            <tr>
              <th className={`${thCls} sticky left-0 z-10 bg-adm-surface`}>Mese</th>
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
                <td className={`${tdCls} sticky left-0 bg-adm-surface font-medium text-white`}>{r.nome}</td>
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
          <tfoot className="border-t border-adm-line bg-white/[0.03]">
            <tr>
              <td className={`${tfCls} sticky left-0 bg-adm-raised`}>Totale anno</td>
              <td className={`${tfCls} text-right`}>{euro(tot("fissi"))}</td>
              <td className={`${tfCls} text-right`}>{euro(tot("diretti"))}</td>
              <td className={`${tfCls} text-right`}>{euro(tot("generali"))}</td>
              <td className={`${tfCls} text-right`}>{euro(tot("totali"))}</td>
              <td className={`${tfCls} text-right ${signedText(tot("risultatoAuto"))}`}>{euro(tot("risultatoAuto"))}</td>
              <td className={`${tfCls} text-right ${signedText(tot("risultatoOperativo"))}`}>{euro(tot("risultatoOperativo"))}</td>
              <td className={tfCls} />
              <td className={tfCls} />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

function useRigheMensile(anno: number) {
  const { risultato, venduteNelMese, somma } = useAnalisi(anno);

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
  return { righe, totale };
}

function Mensile({ anno }: { anno: number }) {
  const { righe, totale } = useRigheMensile(anno);
  const quante = (k: "diretta" | "commissione" | "contoVendita") => righe.reduce((s, r) => s + r[k], 0);

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
              <th className={`${thCls} sticky left-0 z-10 bg-adm-surface`}>Mese</th>
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
                <td className={`${tdCls} sticky left-0 bg-adm-surface font-medium text-white`}>{r.nome}</td>
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
          <tfoot className="border-t border-adm-line bg-white/[0.03]">
            <tr>
              <td className={`${tfCls} sticky left-0 bg-adm-raised`}>Totale anno</td>
              <td className={`${tfCls} text-right`}>{quante("diretta")}</td>
              <td className={`${tfCls} text-right`}>{quante("commissione")}</td>
              <td className={`${tfCls} text-right`}>{quante("contoVendita")}</td>
              <td className={`${tfCls} text-right`}>{totale.operazioni}</td>
              <td className={`${tfCls} text-right`}>{euro(totale.ricavi)}</td>
              <td className={`${tfCls} text-right ${signedText(totale.risultato)}`}>{euro(totale.risultato)}</td>
              <td className={tfCls} />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

export default function AnalisiView({ initialTab = "mensile" }: { initialTab?: AnalisiTab }) {
  const { impostazioni, movimenti, veicoli } = useGestionale();
  const [tab, setTab] = useUrlState<AnalisiTab>("tab", initialTab);
  // L'anno si sceglie qui e non cambia l'anno di gestione delle Impostazioni.
  const [annoStr, setAnnoStr] = useUrlState<string>("anno", String(impostazioni.annoGestione));
  const anno = Number(annoStr) || impostazioni.annoGestione;
  const anni = anniDisponibili(
    [...movimenti.map((m) => m.data), ...veicoli.map((v) => v.dataVendita)],
    impostazioni.annoGestione
  );
  const costi = useRigheCosti(anno);
  const mensile = useRigheMensile(anno);
  const tabs: TabOption<AnalisiTab>[] = [
    { id: "mensile", label: "Vendite per mese" },
    { id: "costi", label: "Costi e break-even" },
  ];
  return (
    <>
      <PageHeader
        title="Analisi"
        description={`Come sta andando l'attività, anno ${anno}.`}
        actions={
          <>
            <AnnoSelect value={anno} onChange={(a) => setAnnoStr(String(a))} anni={anni} />
            <ExportMenu
              nome={nomeFile("Analisi", anno)}
              fogli={() => [
                foglio<(typeof mensile.righe)[number]>({
                  nome: "Vendite per mese",
                  intro: [`Vendite per mese · ${anno}`],
                  righe: mensile.righe,
                  colonne: [
                    { titolo: "Mese", valore: (r) => r.nome },
                    { titolo: "Vendita diretta", formato: "intero", valore: (r) => r.diretta, totale: true },
                    { titolo: "Su commissione", formato: "intero", valore: (r) => r.commissione, totale: true },
                    { titolo: "Conto vendita", formato: "intero", valore: (r) => r.contoVendita, totale: true },
                    { titolo: "Operazioni", formato: "intero", valore: (r) => r.operazioni, totale: true },
                    { titolo: "Ricavi", formato: "euro", valore: (r) => r.ricavi, totale: true, larghezza: 14 },
                    { titolo: "Risultato auto", formato: "euro", valore: (r) => r.risultatoAuto, totale: true, larghezza: 14 },
                    { titolo: "ROI medio", formato: "percento", valore: (r) => r.roi },
                  ],
                }),
                foglio<(typeof costi.righe)[number]>({
                  nome: "Costi e break-even",
                  intro: [
                    `Costi e break-even · ${anno}`,
                    `Costi fissi medi al mese ${euro(costi.fissiMedi)} · margine medio per operazione ${euro(costi.margineMedio)}`,
                  ],
                  righe: costi.righe,
                  colonne: [
                    { titolo: "Mese", valore: (r) => r.nome },
                    { titolo: "Fissi", formato: "euro", valore: (r) => r.fissi, totale: true, larghezza: 13 },
                    { titolo: "Variabili diretti", formato: "euro", valore: (r) => r.diretti, totale: true, larghezza: 14 },
                    { titolo: "Variabili generali", formato: "euro", valore: (r) => r.generali, totale: true, larghezza: 14 },
                    { titolo: "Totali", formato: "euro", valore: (r) => r.totali, totale: true, larghezza: 13 },
                    { titolo: "Risultato auto", formato: "euro", valore: (r) => r.risultatoAuto, totale: true, larghezza: 14 },
                    { titolo: "Risultato operativo", formato: "euro", valore: (r) => r.risultatoOperativo, totale: true, larghezza: 15 },
                    { titolo: "Fissi per auto venduta", formato: "euro", valore: (r) => r.fissiPerAuto, larghezza: 15 },
                    { titolo: "Incidenza costi", formato: "percento", valore: (r) => r.incidenza },
                  ],
                }),
              ]}
            />
          </>
        }
      />
      <div className="mb-4">
        <FilterTabs tabs={tabs} value={tab} onChange={setTab} label="Tipo di analisi" />
      </div>
      {tab === "mensile" ? <Mensile anno={anno} /> : <Costi anno={anno} />}
    </>
  );
}
