"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Briefcase, Percent } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { formatDate } from "@/lib/admin/dates";
import { useGestionale } from "@/context/GestionaleContext";
import {
  foglioAltreEntrate,
  foglioLiquidazione,
  foglioRegistroAcquisti,
  foglioRegistroVendite,
  pacchettoCommercialista,
} from "@/lib/export/gestionale";
import { nomeFile, scaricaXlsx } from "@/lib/export/scrivi";
import {
  CATEGORIE_VENDITA,
  PERIODI_IVA,
  annoNum,
  computeVeicolo,
  euro,
  ivaAltraEntrata,
  ivaDetraibileEffettiva,
  liquidazioneTrimestre,
  nomeVeicolo,
  trimestreDaVersare,
} from "@/lib/gestionale/calc";
import { anniDisponibili } from "@/lib/gestionale/periodo";
import { Note, SummaryRow } from "../ui/Data";
import ExportMenu, { useContestoExport } from "../ui/ExportMenu";
import { useUrlState } from "../useUrlState";
import { EmptyState, FilterTabs, PageHeader, type TabOption } from "../ui/Layout";
import { AnnoSelect } from "../ui/PeriodoSelect";
import { tableWrap, tdCls, thCls } from "../ui/styles";
import { useToast } from "../ui/Toast";

export type IvaTab = "liquidazione" | "vendite" | "acquisti" | "altre";

const tfCls = "px-3 py-2.5 text-sm font-semibold text-white tabular-nums";

function Liquidazione({ anno }: { anno: number }) {
  const { today } = useAdmin();
  const { veicoli, movimenti, impostazioni } = useGestionale();
  const righe = [1, 2, 3, 4].map((t) => liquidazioneTrimestre(t, veicoli, movimenti, impostazioni, today, anno));
  const totaleAnno = righe.reduce((s, r) => s + r.totale, 0);

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
            <SummaryRow label="IVA altre entrate (noleggio…)" value={euro(r.ivaAltreEntrate)} />
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
      <div className="mt-3 flex justify-end rounded-xl border border-adm-line bg-adm-surface px-4 py-3 text-sm">
        <span className="text-adm-muted">Totale da versare nel {anno}&nbsp;</span>
        <span className="font-semibold tabular-nums text-white">{euro(totaleAnno)}</span>
      </div>
      <div className="mt-4">
        <Note>
          Il prospetto è gestionale e non sostituisce il calcolo del commercialista. L&apos;IVA del regime del margine è
          stimata come quota incorporata nel margine positivo (prezzo di vendita − prezzo di acquisto
          {impostazioni.margineConSpese ? " − spese di riparazione e accessorie" : ""}); l&apos;IVA delle altre entrate
          (noleggi, servizi) è quella scritta nei movimenti; l&apos;IVA detraibile è quella indicata come tale nei
          singoli movimenti
          {impostazioni.margineConSpese ? ", escluse le spese già conteggiate nel margine" : ""}. Il metodo si cambia da{" "}
          <Link href="/admin/impostazioni" className="text-blue-400 hover:text-blue-300">
            Impostazioni
          </Link>
          : verificalo con il tuo commercialista.
        </Note>
      </div>
    </>
  );
}

function RegistroVendite({ anno }: { anno: number }) {
  const { today } = useAdmin();
  const { veicoli, movimenti, impostazioni } = useGestionale();

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
  const totImp = righe.reduce((s, r) => s + r.imponibile, 0);
  const totIva = righe.reduce((s, r) => s + r.iva, 0);
  return (
    <div className={tableWrap}>
      <table className="w-full min-w-[44rem]">
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
              <td className={`${tdCls} font-medium`}>
                <Link href={`/admin/auto/${v.id}`} className="text-white hover:text-blue-300">
                  {nomeVeicolo(v)}
                </Link>
              </td>
              <td className={`${tdCls} text-adm-muted`}>{v.servizio}</td>
              <td className={`${tdCls} text-right tabular-nums`}>{euro(imponibile)}</td>
              <td className={`${tdCls} text-right tabular-nums`}>{euro(iva)}</td>
              <td className={`${tdCls} text-right tabular-nums`}>{euro(imponibile + iva)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-adm-line bg-white/[0.03]">
          <tr>
            <td className={tfCls} colSpan={4}>
              Totale ({righe.length})
            </td>
            <td className={`${tfCls} text-right`}>{euro(totImp)}</td>
            <td className={`${tfCls} text-right`}>{euro(totIva)}</td>
            <td className={`${tfCls} text-right`}>{euro(totImp + totIva)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function TabellaMovimenti({
  righe,
  iva,
  colonnaControparte,
}: {
  righe: ReturnType<typeof useGestionale>["movimenti"];
  iva: (m: ReturnType<typeof useGestionale>["movimenti"][number]) => number;
  colonnaControparte: string;
}) {
  const totImp = righe.reduce((s, m) => s + m.imponibile, 0);
  const totIva = righe.reduce((s, m) => s + iva(m), 0);
  return (
    <div className={tableWrap}>
      <table className="w-full min-w-[44rem]">
        <thead className="border-b border-adm-line">
          <tr>
            <th className={thCls}>Data</th>
            <th className={thCls}>N. documento</th>
            <th className={thCls}>{colonnaControparte}</th>
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
              <td className={`${tdCls} text-right tabular-nums`}>{euro(iva(m))}</td>
              <td className={`${tdCls} text-right tabular-nums`}>{euro(m.totale)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-adm-line bg-white/[0.03]">
          <tr>
            <td className={tfCls} colSpan={4}>
              Totale ({righe.length})
            </td>
            <td className={`${tfCls} text-right`}>{euro(totImp)}</td>
            <td className={`${tfCls} text-right`}>{euro(totIva)}</td>
            <td className={`${tfCls} text-right`}>{euro(righe.reduce((s, m) => s + m.totale, 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function RegistroAcquisti({ anno }: { anno: number }) {
  const { movimenti, veicoli, impostazioni } = useGestionale();
  // Solo l'IVA che si detrae davvero: con il margine calcolato sulle spese, quella delle spese
  // delle auto in regime del margine resta fuori (vedi ivaDetraibileEffettiva).
  const righe = movimenti
    .filter((m) => annoNum(m.data) === anno && ivaDetraibileEffettiva(m, veicoli, impostazioni) > 0)
    .sort((a, b) => a.data.localeCompare(b.data));
  if (righe.length === 0) {
    return <EmptyState icon={BookOpen} title={`Nessun acquisto con IVA detraibile nel ${anno}`} description="Compaiono le uscite con IVA detraibile." />;
  }
  return <TabellaMovimenti righe={righe} iva={(m) => m.iva} colonnaControparte="Fornitore" />;
}

function AltreEntrate({ anno }: { anno: number }) {
  const { movimenti } = useGestionale();
  const righe = movimenti
    .filter((m) => m.tipo === "Entrata" && !CATEGORIE_VENDITA.includes(m.categoria) && annoNum(m.data) === anno)
    .sort((a, b) => a.data.localeCompare(b.data));
  if (righe.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={`Nessun'altra entrata nel ${anno}`}
        description="Qui compaiono le entrate diverse dalla vendita di auto: noleggi, servizi. La loro IVA va in liquidazione."
      />
    );
  }
  return <TabellaMovimenti righe={righe} iva={ivaAltraEntrata} colonnaControparte="Cliente" />;
}

export default function IvaView({ initialTab = "liquidazione" }: { initialTab?: IvaTab }) {
  const { today } = useAdmin();
  const { impostazioni, movimenti, veicoli } = useGestionale();
  const ctx = useContestoExport();
  const toast = useToast();
  const [tab, setTab] = useUrlState<IvaTab>("tab", initialTab);
  const [annoStr, setAnnoStr] = useUrlState<string>("anno", String(impostazioni.annoGestione));
  const anno = Number(annoStr) || impostazioni.annoGestione;
  const anni = anniDisponibili(
    [...movimenti.map((m) => m.data), ...veicoli.map((v) => v.dataVendita)],
    impostazioni.annoGestione
  );
  const daVersare = trimestreDaVersare(today);

  const tabs: TabOption<IvaTab>[] = [
    { id: "liquidazione", label: "Liquidazione" },
    { id: "vendite", label: "Registro vendite" },
    { id: "acquisti", label: "Registro acquisti" },
    { id: "altre", label: "Altre entrate" },
  ];

  async function pacchetto(periodo: string) {
    try {
      await scaricaXlsx(pacchettoCommercialista(periodo, ctx), nomeFile("Commercialista", periodo));
    } catch (e) {
      console.error("Pacchetto non creato", e);
      toast("Non sono riuscito a creare il pacchetto, riprova");
    }
  }

  return (
    <>
      <PageHeader
        title="IVA"
        description={`Liquidazione trimestrale e registri, anno ${anno}.`}
        actions={
          <>
            <AnnoSelect value={anno} onChange={(a) => setAnnoStr(String(a))} anni={anni} />
            <ExportMenu
              nome={nomeFile("IVA", anno)}
              fogli={() => [
                foglioLiquidazione(anno, ctx),
                foglioRegistroVendite(String(anno), ctx),
                foglioRegistroAcquisti(String(anno), ctx),
                foglioAltreEntrate(String(anno), ctx),
              ]}
              extra={[
                {
                  label: `Pacchetto commercialista T${daVersare.trim} ${daVersare.anno}`,
                  icon: Briefcase,
                  onSelect: () => void pacchetto(`${daVersare.anno}-T${daVersare.trim}`),
                },
                ...[1, 2, 3, 4]
                  .filter((t) => !(anno === daVersare.anno && t === daVersare.trim))
                  .map((t) => ({
                    label: `Pacchetto commercialista T${t} ${anno}`,
                    icon: Briefcase,
                    onSelect: () => void pacchetto(`${anno}-T${t}`),
                  })),
                { label: `Pacchetto commercialista anno ${anno}`, icon: Briefcase, onSelect: () => void pacchetto(String(anno)) },
              ]}
            />
          </>
        }
      />
      <div className="mb-4">
        <FilterTabs tabs={tabs} value={tab} onChange={setTab} label="Sezione IVA" />
      </div>
      {tab === "liquidazione" && <Liquidazione anno={anno} />}
      {tab === "vendite" && <RegistroVendite anno={anno} />}
      {tab === "acquisti" && <RegistroAcquisti anno={anno} />}
      {tab === "altre" && <AltreEntrate anno={anno} />}
      {tab !== "liquidazione" && (
        <div className="mt-4">
          <Note>
            Questo registro è un supporto gestionale: il registro IVA ufficiale ai fini di legge resta quello tenuto dal
            commercialista. Il «Pacchetto commercialista» (menu Esporta) raccoglie in un solo file Excel liquidazione,
            registri, prima nota, beni usati, conto vendita, contratti, scadenze, banca e noleggi del periodo.
          </Note>
        </div>
      )}
    </>
  );
}
