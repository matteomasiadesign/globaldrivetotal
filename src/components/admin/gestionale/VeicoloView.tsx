"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CarFront,
  ExternalLink,
  FileText,
  FolderOpen,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useCars } from "@/context/CarContext";
import { useGestionale } from "@/context/GestionaleContext";
import { computeVeicolo, euro, nomeVeicolo, percento } from "@/lib/gestionale/calc";
import { ALIMENTAZIONI, SERVIZI, STATI } from "@/lib/gestionale/types";
import { useEditors } from "../AdminEditors";
import { ServizioTag, StatoPill, SummaryRow, signedText } from "../ui/Data";
import { Field, Switch } from "../ui/Field";
import { NumberField, SelectField, TextField } from "../ui/Inputs";
import { EmptyState, PageHeader, Panel } from "../ui/Layout";
import RowMenu from "../ui/RowMenu";
import { btnPrimary, btnSecondary, inputCls, rowDivider, textareaCls } from "../ui/styles";
import { useToast } from "../ui/Toast";

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-adm-line bg-adm-bg px-3 py-2">
      <span className="text-sm text-slate-200">{label}</span>
      <Switch compact checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

// La scheda economica di un'auto: dati, prezzi, movimenti collegati e conto
// economico (margine, IVA, ROI). Se l'auto è nel catalogo, stato e visibilità sul
// sito seguono lo stato che si sceglie qui.
export default function VeicoloView({ veicoloId }: { veicoloId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { today } = useAdmin();
  const { cars } = useCars();
  const { openCar, openMovimento, openContratto } = useEditors();
  const { veicoli, movimenti, impostazioni, updateVeicolo, deleteVeicolo, deleteMovimento } = useGestionale();

  const v = veicoli.find((x) => x.id === veicoloId);
  if (!v) {
    return (
      <EmptyState
        icon={CarFront}
        title="Scheda non trovata"
        description="L'auto potrebbe essere stata eliminata."
        action={
          <Link href="/admin/auto" className={btnSecondary}>
            Torna al parco auto
          </Link>
        }
      />
    );
  }

  const car = v.carId ? cars.find((c) => c.id === v.carId) : undefined;
  const mie = movimenti.filter((m) => m.autoId === v.id).sort((a, b) => b.data.localeCompare(a.data));
  const calc = computeVeicolo(v, movimenti, impostazioni, today);
  const nome = nomeVeicolo(v);
  const patch = (p: Parameters<typeof updateVeicolo>[1]) => updateVeicolo(v.id, p);

  return (
    <>
      <Link
        href="/admin/auto"
        className="mb-4 inline-flex items-center gap-2 text-sm text-adm-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Parco auto
      </Link>

      <PageHeader
        title={nome}
        actions={
          <>
            <button type="button" onClick={() => openContratto(v.id)} className={btnPrimary}>
              <FileText className="size-4" />
              Contratto di vendita
            </button>
            <RowMenu
              label="Altre azioni"
              items={[
                ...(car
                  ? [
                      { label: "Modifica scheda pubblica", icon: Pencil, onSelect: () => openCar(car.id) },
                      { label: "Documenti", icon: FolderOpen, onSelect: () => router.push(`/admin/documenti?auto=${car.id}`) },
                      { label: "Vedi nel catalogo", icon: ExternalLink, onSelect: () => window.open("/catalogo", "_blank") },
                    ]
                  : []),
                {
                  label: "Elimina scheda",
                  icon: Trash2,
                  danger: true,
                  confirm: "Conferma: elimina anche i movimenti",
                  onSelect: () => {
                    deleteVeicolo(v.id);
                    toast(`${nome} eliminata`);
                    router.push("/admin/auto");
                  },
                },
              ]}
            />
          </>
        }
      />
      <div className="-mt-4 mb-6 flex flex-wrap items-center gap-3">
        <StatoPill stato={v.stato} />
        <ServizioTag servizio={v.servizio} />
        {car ? (
          <span className="text-xs text-adm-muted">
            Nel catalogo a {euro(car.price)}
            {car.hidden ? " · nascosta" : ""}
          </span>
        ) : (
          <span className="text-xs text-adm-muted">Non è nel catalogo del sito</span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Dati auto">
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <Field label="Servizio">
                <SelectField value={v.servizio} options={SERVIZI} onChange={(servizio) => patch({ servizio })} />
              </Field>
              <Field label="Stato" hint={car ? "Aggiorna anche il catalogo del sito." : undefined}>
                <SelectField value={v.stato} options={STATI} onChange={(stato) => patch({ stato })} />
              </Field>
              <Field label="Targa">
                <TextField value={v.targa} onCommit={(targa) => patch({ targa: targa.toUpperCase() })} className={`${inputCls} uppercase`} />
              </Field>
              <Field label="Data acquisto">
                <TextField type="date" value={v.dataAcquisto} onCommit={(dataAcquisto) => patch({ dataAcquisto })} />
              </Field>
              <Field label="Data vendita">
                <TextField type="date" value={v.dataVendita} onCommit={(dataVendita) => patch({ dataVendita })} />
              </Field>
              {calc.isContoVendita && (
                <Field label="Commissione (%)">
                  <NumberField
                    step="0.1"
                    value={Math.round(v.commissionePercentuale * 10000) / 100}
                    onCommit={(n) => patch({ commissionePercentuale: (n ?? 0) / 100 })}
                  />
                </Field>
              )}

              {car ? (
                <p className="text-sm text-adm-muted sm:col-span-3">
                  {car.brand} {car.model} {car.version} · {car.year} · {car.mileage.toLocaleString("it-IT")} km · {car.fuel}.{" "}
                  <button type="button" onClick={() => openCar(car.id)} className="cursor-pointer text-blue-400 hover:text-blue-300">
                    Modifica i dati pubblici
                  </button>
                </p>
              ) : (
                <>
                  <Field label="Marca">
                    <TextField value={v.marca} onCommit={(marca) => patch({ marca })} />
                  </Field>
                  <Field label="Modello">
                    <TextField value={v.modello} onCommit={(modello) => patch({ modello })} />
                  </Field>
                  <Field label="Versione">
                    <TextField value={v.versione} onCommit={(versione) => patch({ versione })} placeholder="1.5 EcoBlue 120 CV" />
                  </Field>
                  <Field label="Chilometri">
                    <NumberField value={v.chilometraggio} onCommit={(n) => patch({ chilometraggio: n ?? 0 })} />
                  </Field>
                  <Field label="Alimentazione">
                    <SelectField value={v.alimentazione} blank="—" options={ALIMENTAZIONI} onChange={(alimentazione) => patch({ alimentazione })} />
                  </Field>
                </>
              )}

              <div className="grid gap-2 sm:col-span-3 sm:grid-cols-3">
                <Check label="Fatturata" checked={v.fatturata} onChange={(fatturata) => patch({ fatturata })} />
                <Check label="Passaggio di proprietà fatto" checked={v.passaggioProprieta} onChange={(passaggioProprieta) => patch({ passaggioProprieta })} />
                <Check label="Con garanzia" checked={v.garanzia} onChange={(garanzia) => patch({ garanzia })} />
              </div>

              <Field label="Note" className="sm:col-span-3">
                <textarea
                  key={v.note}
                  rows={2}
                  defaultValue={v.note}
                  onBlur={(e) => e.target.value !== v.note && patch({ note: e.target.value })}
                  className={textareaCls}
                />
              </Field>
            </div>
          </Panel>

          <Panel
            title={`Movimenti collegati (${mie.length})`}
            action={
              <button type="button" onClick={() => openMovimento({ autoId: v.id })} className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
                <Plus className="size-4" />
                Aggiungi
              </button>
            }
          >
            {mie.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-6 text-sm text-adm-muted">
                <Receipt className="size-5" />
                Nessun movimento per questa auto: costi e incassi che registri qui entrano nei conti.
              </div>
            ) : (
              <div className={rowDivider}>
                {mie.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => openMovimento({ movimentoId: m.id })}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <span className="block truncate text-sm font-medium text-white">{m.descrizione || m.categoria}</span>
                      <span className="block truncate text-xs text-adm-muted">
                        {m.data} · {m.categoria}
                        {m.statoPagamento === "Da saldare" ? " · da saldare" : ""}
                      </span>
                    </button>
                    <span className={`text-sm font-medium tabular-nums ${m.tipo === "Entrata" ? "text-emerald-400" : "text-slate-200"}`}>
                      {m.tipo === "Entrata" ? "+" : "−"} {euro(m.totale)}
                    </span>
                    <RowMenu
                      label={`Azioni per ${m.descrizione || m.categoria}`}
                      items={[
                        { label: "Modifica", icon: Pencil, onSelect: () => openMovimento({ movimentoId: m.id }) },
                        { label: "Elimina", icon: Trash2, danger: true, confirm: "Conferma: elimina", onSelect: () => { deleteMovimento(m.id); toast("Movimento eliminato"); } },
                      ]}
                    />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Prezzi">
            <div className="grid gap-3 p-4">
              <Field label="Prezzo di acquisto (€)">
                <NumberField value={v.prezzoAcquisto} onCommit={(n) => patch({ prezzoAcquisto: n ?? 0 })} />
              </Field>
              <Field
                label={calc.isContoVendita ? "Prezzo di vendita per il proprietario (€)" : "Prezzo di vendita (€)"}
                hint={car ? `Sul sito l'auto è a ${euro(car.price)}: qui va il prezzo realmente incassato.` : undefined}
              >
                <NumberField allowEmpty value={v.prezzoVendita} onCommit={(prezzoVendita) => patch({ prezzoVendita })} />
              </Field>
              <Field label="N. fattura">
                <TextField value={v.numeroFattura} onCommit={(numeroFattura) => patch({ numeroFattura })} placeholder="12/2026" />
              </Field>
            </div>
          </Panel>

          <section className="rounded-xl border border-adm-line bg-adm-raised p-4">
            <h2 className="mb-2 text-sm font-semibold text-white">Conto economico</h2>
            <SummaryRow label="Costi diretti" value={euro(calc.costiDiretti)} />
            <SummaryRow label="Costo totale" value={euro(calc.costoTotale)} />
            {calc.isContoVendita ? (
              <>
                <SummaryRow label="Commissione imponibile" value={calc.commissioneImponibile !== null ? euro(calc.commissioneImponibile) : "—"} />
                <SummaryRow label="IVA sulla commissione" value={calc.ivaCommissione !== null ? euro(calc.ivaCommissione) : "—"} />
                <SummaryRow label="Fattura di intermediazione" value={calc.totaleFatturaIntermediazione !== null ? euro(calc.totaleFatturaIntermediazione) : "—"} />
              </>
            ) : (
              <>
                <SummaryRow label="Margine regime IVA" value={calc.margineRegimeIva !== null ? euro(calc.margineRegimeIva) : "—"} />
                <SummaryRow label="IVA regime del margine" value={calc.ivaRegimeMargine !== null ? euro(calc.ivaRegimeMargine) : "—"} />
              </>
            )}
            <div className="my-2 border-t border-adm-line" />
            <SummaryRow label="Margine gestionale" bold value={calc.margineGestionale !== null ? euro(calc.margineGestionale) : "—"} tone={calc.margineGestionale !== null ? signedText(calc.margineGestionale) : undefined} />
            <SummaryRow label="Risultato dopo IVA" bold value={calc.risultatoDopoIva !== null ? euro(calc.risultatoDopoIva) : "—"} tone={calc.risultatoDopoIva !== null ? signedText(calc.risultatoDopoIva) : undefined} />
            <div className="my-2 border-t border-adm-line" />
            <SummaryRow
              label="ROI"
              value={calc.roi !== null ? percento(calc.roi) : "—"}
              tone={calc.roi !== null && calc.roi < impostazioni.sogliaRoi ? "text-amber-300" : undefined}
            />
            <SummaryRow
              label="Giorni di stock"
              value={calc.giorniStock !== null ? String(calc.giorniStock) : "—"}
              tone={calc.giorniStock !== null && !v.dataVendita && calc.giorniStock > impostazioni.sogliaGiorniStock ? "text-amber-300" : undefined}
            />
            <SummaryRow label="Margine al giorno" value={calc.margineGiorno !== null ? euro(calc.margineGiorno) : "—"} />
            {calc.roi !== null && calc.roi < impostazioni.sogliaRoi && (
              <p className="mt-2 text-xs text-amber-300">
                ROI sotto l&apos;obiettivo del {percento(impostazioni.sogliaRoi)}.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
