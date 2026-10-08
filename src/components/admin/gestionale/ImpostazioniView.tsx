"use client";

import React from "react";
import Link from "next/link";
import { useGestionale } from "@/context/GestionaleContext";
import { Field } from "../ui/Field";
import { NumberField, TextField } from "../ui/Inputs";
import { PageHeader, Panel } from "../ui/Layout";
import { Note } from "../ui/Data";

// Percentuali mostrate come numeri interi/decimali ("22") ma salvate come frazioni (0.22).
const perc = (frazione: number) => Math.round(frazione * 10000) / 100;

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
              <NumberField step="0.1" value={perc(s.aliquotaIva)} onCommit={(n) => updateImpostazioni({ aliquotaIva: (n ?? 22) / 100 })} />
            </Field>
            <Field label="Maggiorazione liquidazione trimestrale (%)">
              <NumberField step="0.1" value={perc(s.maggiorazioneTrimestrale)} onCommit={(n) => updateImpostazioni({ maggiorazioneTrimestrale: (n ?? 1) / 100 })} />
            </Field>
            <Field label="Commissione predefinita del conto vendita (%)">
              <NumberField step="0.1" value={perc(s.commissionePredefinita)} onCommit={(n) => updateImpostazioni({ commissionePredefinita: (n ?? 7) / 100 })} />
            </Field>
            <Field label="ROI obiettivo (%)" hint="Sotto questa soglia il ROI di un'auto si evidenzia.">
              <NumberField step="0.1" value={perc(s.sogliaRoi)} onCommit={(n) => updateImpostazioni({ sogliaRoi: (n ?? 15) / 100 })} />
            </Field>
            <Field label="Giorni di stock prima dell'avviso" hint="Oltre questa soglia l'auto compare tra le cose da sistemare.">
              <NumberField value={s.sogliaGiorniStock} onCommit={(n) => updateImpostazioni({ sogliaGiorniStock: n || 60 })} />
            </Field>
          </div>
        </Panel>

        <Panel title="Contratti di vendita">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="Prossimo numero contratto" hint="Aumenta da solo a ogni contratto generato.">
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
