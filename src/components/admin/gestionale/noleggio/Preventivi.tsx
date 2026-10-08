"use client";

import React, { useState } from "react";
import { CheckCircle2, FileText, Plus, Trash2 } from "lucide-react";
import { useGestionale } from "@/context/GestionaleContext";
import { euro } from "@/lib/gestionale/calc";
import {
  CATEGORIE_VEICOLO,
  STATI_PREVENTIVO,
  giorniNoleggio,
  nomeRentVeicolo,
  tariffaPerPeriodo,
  type CategoriaVeicolo,
  type RentPreventivo,
} from "@/lib/gestionale/rent";
import Drawer from "../../ui/Drawer";
import { Field, Section } from "../../ui/Field";
import { SelectField } from "../../ui/Inputs";
import { EmptyState } from "../../ui/Layout";
import RowMenu from "../../ui/RowMenu";
import { btnIcon, btnPrimary, inputCls, rowDivider } from "../../ui/styles";
import { useToast } from "../../ui/Toast";

function PreventivoDrawer({ onClose }: { onClose: () => void }) {
  const { noleggio, contatti, addPreventivo } = useGestionale();
  const toast = useToast();
  const [f, setF] = useState({
    contattoId: "",
    clienteNomeLibero: "",
    veicoloId: "",
    categoria: "Economy" as CategoriaVeicolo,
    dataInizio: "",
    dataFine: "",
    luogoRitiro: "",
    luogoRiconsegna: "",
  });
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const auto = noleggio.veicoli.find((v) => v.id === f.veicoloId);
  const categoria = auto?.categoria ?? f.categoria;
  const giorni = f.dataInizio && f.dataFine ? giorniNoleggio(f.dataInizio, f.dataFine) : 0;
  const { tariffa, fonte } = tariffaPerPeriodo(categoria, f.dataInizio, noleggio.tariffe, auto?.tariffaGiornaliera ?? 0);

  function submit() {
    if (f.dataFine < f.dataInizio) {
      toast("La data di fine non può precedere quella di inizio");
      return;
    }
    addPreventivo({
      veicoloId: f.veicoloId || null,
      contattoId: f.contattoId || null,
      clienteNomeLibero: f.contattoId ? "" : f.clienteNomeLibero.trim(),
      categoria,
      dataInizio: f.dataInizio,
      dataFine: f.dataFine,
      luogoRitiro: f.luogoRitiro.trim(),
      luogoRiconsegna: f.luogoRiconsegna.trim(),
      tariffaApplicata: tariffa,
      giorni,
      totale: giorni * tariffa,
    });
    toast("Preventivo salvato");
    onClose();
  }

  return (
    <Drawer title="Nuovo preventivo" subtitle="Giorni × tariffa del periodo" submitLabel="Salva preventivo" onSubmit={submit} onClose={onClose}>
      <Section title="Cliente" columns={1}>
        <Field label="Cliente in anagrafica (facoltativo)">
          <SelectField
            value={f.contattoId}
            blank="— nessuno, scrivo il nome sotto —"
            options={contatti.filter((c) => c.tipo !== "Fornitore").map((c) => ({ value: c.id, label: c.nome }))}
            onChange={(v) => set("contattoId", v)}
          />
        </Field>
        {!f.contattoId && (
          <Field label="Nome del cliente">
            <input placeholder="Mario Rossi" value={f.clienteNomeLibero} onChange={(e) => set("clienteNomeLibero", e.target.value)} className={inputCls} />
          </Field>
        )}
      </Section>
      <Section title="Noleggio" columns={2}>
        <Field label="Auto specifica (facoltativo)" className="sm:col-span-2">
          <SelectField
            value={f.veicoloId}
            blank="— non ancora assegnata: scelgo la categoria —"
            options={noleggio.veicoli.map((v) => ({ value: v.id, label: nomeRentVeicolo(v) }))}
            onChange={(v) => set("veicoloId", v)}
          />
        </Field>
        {!f.veicoloId && (
          <Field label="Categoria" className="sm:col-span-2">
            <SelectField value={f.categoria} options={CATEGORIE_VEICOLO} onChange={(v) => set("categoria", v)} />
          </Field>
        )}
        <Field label="Dal">
          <input required type="date" value={f.dataInizio} onChange={(e) => set("dataInizio", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Al">
          <input required type="date" value={f.dataFine} onChange={(e) => set("dataFine", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Luogo di ritiro">
          <input value={f.luogoRitiro} onChange={(e) => set("luogoRitiro", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Luogo di riconsegna">
          <input value={f.luogoRiconsegna} onChange={(e) => set("luogoRiconsegna", e.target.value)} className={inputCls} />
        </Field>
      </Section>
      {giorni > 0 && (
        <div className="rounded-lg border border-adm-line bg-adm-bg px-3.5 py-3 text-sm">
          <p className="text-adm-muted">
            {giorni} {giorni === 1 ? "giorno" : "giorni"} × {euro(tariffa)} ({fonte})
          </p>
          <p className="mt-1 text-lg font-semibold text-white">{euro(giorni * tariffa)}</p>
        </div>
      )}
    </Drawer>
  );
}

export default function Preventivi() {
  const { noleggio, contatti, updatePreventivo, deletePreventivo, convertiPreventivo } = useGestionale();
  const toast = useToast();
  const [nuovo, setNuovo] = useState<number | null>(null);

  const nomeCliente = (p: RentPreventivo) =>
    p.contattoId ? contatti.find((c) => c.id === p.contattoId)?.nome || "Cliente" : p.clienteNomeLibero || "Cliente non indicato";
  const nomeAuto = (p: RentPreventivo) => {
    const v = noleggio.veicoli.find((x) => x.id === p.veicoloId);
    return v ? nomeRentVeicolo(v) : `Categoria ${p.categoria}`;
  };

  function converti(p: RentPreventivo) {
    const esito = convertiPreventivo(p.id);
    toast(esito.ok ? "Preventivo trasformato in prenotazione" : esito.errore);
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => setNuovo(Date.now())} className={btnPrimary}>
          <Plus className="size-4" />
          Nuovo preventivo
        </button>
      </div>

      {noleggio.preventivi.length === 0 ? (
        <EmptyState icon={FileText} title="Nessun preventivo creato" description="Il totale si calcola da giorni e tariffa del periodo." />
      ) : (
        <div className={`rounded-xl border border-adm-line bg-adm-surface ${rowDivider}`}>
          {noleggio.preventivi.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 basis-56">
                <span className="block truncate font-medium text-white">{nomeCliente(p)}</span>
                <span className="block truncate text-sm text-adm-muted">
                  {nomeAuto(p)} · {p.dataInizio} → {p.dataFine} · {p.giorni} gg × {euro(p.tariffaApplicata)}
                </span>
              </div>
              <span className="min-w-20 text-right font-semibold tabular-nums text-white">{euro(p.totale)}</span>
              <SelectField
                value={p.stato}
                options={STATI_PREVENTIVO}
                onChange={(stato) => updatePreventivo(p.id, { stato })}
                aria-label={`Stato del preventivo per ${nomeCliente(p)}`}
                className={`${inputCls} sm:w-36`}
              />
              {p.stato !== "Accettato" && (
                <button type="button" onClick={() => converti(p)} className={`${btnIcon} text-emerald-400`} title="Trasforma in prenotazione" aria-label="Trasforma in prenotazione">
                  <CheckCircle2 className="size-5" />
                </button>
              )}
              <RowMenu
                label="Azioni preventivo"
                items={[
                  {
                    label: "Elimina",
                    icon: Trash2,
                    danger: true,
                    confirm: "Conferma: elimina",
                    onSelect: () => {
                      deletePreventivo(p.id);
                      toast("Preventivo eliminato");
                    },
                  },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      {nuovo !== null && <PreventivoDrawer key={nuovo} onClose={() => setNuovo(null)} />}
    </>
  );
}
