"use client";

import React from "react";
import Link from "next/link";
import { useGestionale } from "@/context/GestionaleContext";
import { PAGAMENTI, type Pagamento } from "@/lib/gestionale/types";
import { Field, ToggleRow } from "../ui/Field";
import { NumberField, TextField } from "../ui/Inputs";
import { PageHeader, Panel } from "../ui/Layout";
import { Note } from "../ui/Data";

// Percentuali mostrate come numeri interi/decimali ("22") ma salvate come frazioni (0.22).
const perc = (frazione: number) => Math.round(frazione * 10000) / 100;
// Dal campo (0–100) alla frazione salvata: un valore fuori scala o vuoto torna al predefinito.
const frazione = (n: number | null, predefinito: number) =>
  n == null || n < 0 || n > 100 ? predefinito : n / 100;

export default function ImpostazioniView() {
  const { impostazioni: s, updateImpostazioni } = useGestionale();

  return (
    <>
      <PageHeader title="Impostazioni" description="Parametri usati in tutti i calcoli e nei contratti." />

      <div className="grid max-w-3xl gap-6">
        <Panel title="Parametri di calcolo">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="Anno di gestione">
              <NumberField value={s.annoGestione} onCommit={(n) => updateImpostazioni({ annoGestione: n || new Date().getFullYear() })} />
            </Field>
            <Field label="Aliquota IVA ordinaria (%)">
              <NumberField step="0.1" value={perc(s.aliquotaIva)} onCommit={(n) => updateImpostazioni({ aliquotaIva: frazione(n, 0.22) })} />
            </Field>
            <Field label="Maggiorazione liquidazione trimestrale (%)">
              <NumberField step="0.1" value={perc(s.maggiorazioneTrimestrale)} onCommit={(n) => updateImpostazioni({ maggiorazioneTrimestrale: frazione(n, 0.01) })} />
            </Field>
            <Field label="Commissione predefinita del conto vendita (%)">
              <NumberField step="0.1" value={perc(s.commissionePredefinita)} onCommit={(n) => updateImpostazioni({ commissionePredefinita: frazione(n, 0.07) })} />
            </Field>
            <Field label="ROI obiettivo (%)" hint="Sotto questa soglia il ROI di un'auto si evidenzia.">
              <NumberField step="0.1" value={perc(s.sogliaRoi)} onCommit={(n) => updateImpostazioni({ sogliaRoi: frazione(n, 0.15) })} />
            </Field>
            <Field label="Giorni di stock prima dell'avviso" hint="Oltre questa soglia l'auto compare tra le cose da sistemare.">
              <NumberField
                value={s.sogliaGiorniStock}
                onCommit={(n) => updateImpostazioni({ sogliaGiorniStock: n == null || n < 1 ? 60 : Math.round(n) })}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Regime del margine">
          <div className="grid gap-3 p-4">
            <ToggleRow
              title="Includi le spese dell'auto nel margine"
              description={
                s.margineConSpese
                  ? "Margine = vendita − acquisto − spese di riparazione e accessorie dell'auto. L'IVA di queste spese non si detrae (metodo analitico, art. 36 DL 41/1995)."
                  : "Margine = vendita − acquisto. L'IVA delle spese si detrae quando il movimento la indica come detraibile."
              }
              checked={s.margineConSpese}
              onChange={(margineConSpese) => updateImpostazioni({ margineConSpese })}
            />
            <p className="text-xs text-adm-muted">
              Cambia il calcolo di IVA, registri, analisi e schede auto, anche per le vendite già registrate.
            </p>
          </div>
        </Panel>

        <Panel title="Banca">
          <div className="grid gap-3 p-4">
            <p className="text-sm text-slate-300">
              Metodi di pagamento che passano dal conto corrente: compaiono in Banca da riconciliare.
            </p>
            <div className="flex flex-wrap gap-2">
              {PAGAMENTI.map((p) => {
                const attivo = s.pagamentiBanca.includes(p);
                const toggle = () => {
                  const next: Pagamento[] = attivo ? s.pagamentiBanca.filter((x) => x !== p) : [...s.pagamentiBanca, p];
                  updateImpostazioni({ pagamentiBanca: PAGAMENTI.filter((x) => next.includes(x)) });
                };
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={attivo}
                    onClick={toggle}
                    className={`min-h-10 rounded-lg border px-3.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
                      attivo
                        ? "border-blue-500 bg-blue-600/20 text-white"
                        : "border-adm-line text-adm-muted hover:text-slate-200"
                    }`}
                  >
                    {p === "CASH" ? "Contanti" : p === "CONTO" ? "Conto" : p}
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel title="Contratti di vendita">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field
              label={`Prossimo numero contratto (${s.annoGestione})`}
              hint="Aumenta da solo a ogni contratto. La numerazione riparte da 1 ogni anno di vendita."
            >
              <NumberField value={s.prossimoNumeroContratto} onCommit={(n) => updateImpostazioni({ prossimoNumeroContratto: n || 1 })} />
            </Field>
            <Field label="PEC aziendale" hint="Compare nell'intestazione del contratto.">
              <TextField type="email" value={s.pecAzienda} onCommit={(pecAzienda) => updateImpostazioni({ pecAzienda })} placeholder="azienda@pec.it" />
            </Field>
          </div>
          <p className="border-t border-adm-line px-4 py-3 text-sm text-adm-muted">
            Ragione sociale, partita IVA, sede, telefono ed email del venditore si leggono da{" "}
            <Link href="/admin/sito" className="text-blue-400 hover:text-blue-300">
              Sito
            </Link>
            : cambiandoli lì cambiano anche nei contratti.
          </p>
        </Panel>

        <Note>
          Verifica sempre con il commercialista l&apos;aliquota IVA, la maggiorazione trimestrale e il metodo del regime
          del margine adottato per l&apos;attività.
        </Note>
      </div>
    </>
  );
}
