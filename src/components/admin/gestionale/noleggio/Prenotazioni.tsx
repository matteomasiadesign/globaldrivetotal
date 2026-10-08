"use client";

import React, { useState } from "react";
import { CalendarRange, Plus, Trash2 } from "lucide-react";
import { useGestionale } from "@/context/GestionaleContext";
import { euro } from "@/lib/gestionale/calc";
import {
  STATI_PRENOTAZIONE,
  giorniNoleggio,
  importoPrenotazione,
  nomeRentVeicolo,
  tariffaPerPeriodo,
  type StatoPrenotazione,
} from "@/lib/gestionale/rent";
import Drawer from "../../ui/Drawer";
import { Field, Section } from "../../ui/Field";
import { SelectField } from "../../ui/Inputs";
import { EmptyState, FilterTabs, type TabOption } from "../../ui/Layout";
import RowMenu from "../../ui/RowMenu";
import { btnPrimary, inputCls, rowDivider } from "../../ui/styles";
import { useToast } from "../../ui/Toast";

function PrenotazioneDrawer({ onClose }: { onClose: () => void }) {
  const { noleggio, contatti, addPrenotazione } = useGestionale();
  const toast = useToast();
  const [f, setF] = useState({
    veicoloId: "",
    contattoId: "",
    dataInizio: "",
    dataFine: "",
    tariffa: "",
    cauzione: "",
    luogoRitiro: "",
    luogoRiconsegna: "",
  });
  const [errore, setErrore] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const auto = noleggio.veicoli.find((v) => v.id === f.veicoloId);
  // Tariffa proposta: quella del periodo per la categoria, altrimenti la base dell'auto.
  const proposta = auto ? tariffaPerPeriodo(auto.categoria, f.dataInizio, noleggio.tariffe, auto.tariffaGiornaliera) : null;
  const tariffa = f.tariffa !== "" ? Number(f.tariffa) || 0 : (proposta?.tariffa ?? 0);
  const giorni = f.dataInizio && f.dataFine ? giorniNoleggio(f.dataInizio, f.dataFine) : 0;

  function submit() {
    if (!f.veicoloId) return setErrore("Scegli l'auto.");
    const esito = addPrenotazione({
      veicoloId: f.veicoloId,
      contattoId: f.contattoId || null,
      dataInizio: f.dataInizio,
      dataFine: f.dataFine,
      tariffaApplicata: tariffa,
      cauzione: Number(f.cauzione) || 0,
      luogoRitiro: f.luogoRitiro.trim(),
      luogoRiconsegna: f.luogoRiconsegna.trim(),
    });
    if (!esito.ok) return setErrore(esito.errore);
    toast("Prenotazione salvata");
    onClose();
  }

  return (
    <Drawer title="Nuova prenotazione" submitLabel="Salva prenotazione" onSubmit={submit} onClose={onClose}>
      {errore && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {errore}
        </p>
      )}
      <Section title="Noleggio" columns={2}>
        <Field label="Auto" className="sm:col-span-2">
          <SelectField
            value={f.veicoloId}
            blank="— scegli —"
            options={noleggio.veicoli.map((v) => ({ value: v.id, label: nomeRentVeicolo(v) }))}
            onChange={(v) => set("veicoloId", v)}
          />
        </Field>
        <Field label="Cliente" className="sm:col-span-2" hint="Il cliente deve essere in Contatti, con patente e documento.">
          <SelectField
            value={f.contattoId}
            blank="— nessuno —"
            options={contatti.filter((c) => c.tipo !== "Fornitore").map((c) => ({ value: c.id, label: c.nome }))}
            onChange={(v) => set("contattoId", v)}
          />
        </Field>
        <Field label="Dal">
          <input required type="date" value={f.dataInizio} onChange={(e) => set("dataInizio", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Al">
          <input required type="date" value={f.dataFine} onChange={(e) => set("dataFine", e.target.value)} className={inputCls} />
        </Field>
        <Field
          label="Tariffa al giorno (€)"
          hint={proposta ? `Proposta: ${euro(proposta.tariffa)} (${proposta.fonte})` : undefined}
        >
          <input type="number" min={0} placeholder={proposta ? String(proposta.tariffa) : ""} value={f.tariffa} onChange={(e) => set("tariffa", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Cauzione (€)">
          <input type="number" min={0} value={f.cauzione} onChange={(e) => set("cauzione", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Luogo di ritiro">
          <input placeholder="Sede Sassari" value={f.luogoRitiro} onChange={(e) => set("luogoRitiro", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Luogo di riconsegna">
          <input placeholder="Aeroporto" value={f.luogoRiconsegna} onChange={(e) => set("luogoRiconsegna", e.target.value)} className={inputCls} />
        </Field>
      </Section>
      {giorni > 0 && (
        <p className="rounded-lg border border-adm-line bg-adm-bg px-3.5 py-3 text-sm text-slate-300">
          {giorni} {giorni === 1 ? "giorno" : "giorni"} × {euro(tariffa)} ={" "}
          <span className="font-semibold text-white">{euro(giorni * tariffa)}</span>
        </p>
      )}
    </Drawer>
  );
}

export default function Prenotazioni() {
  const { noleggio, contatti, updatePrenotazione, deletePrenotazione } = useGestionale();
  const toast = useToast();
  const [stato, setStato] = useState<StatoPrenotazione | "tutte">("tutte");
  const [nuova, setNuova] = useState<number | null>(null);

  const nomeAuto = (id: string) => {
    const v = noleggio.veicoli.find((x) => x.id === id);
    return v ? nomeRentVeicolo(v) : "Auto eliminata";
  };
  const nomeCliente = (id: string | null) => contatti.find((c) => c.id === id)?.nome || "Cliente non indicato";

  const tabs: TabOption<StatoPrenotazione | "tutte">[] = [
    { id: "tutte", label: "Tutte", count: noleggio.prenotazioni.length },
    ...STATI_PRENOTAZIONE.map((s) => ({ id: s, label: s, count: noleggio.prenotazioni.filter((p) => p.stato === s).length })),
  ];
  const visibili = noleggio.prenotazioni
    .filter((p) => stato === "tutte" || p.stato === stato)
    .sort((a, b) => b.dataInizio.localeCompare(a.dataInizio));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs tabs={tabs} value={stato} onChange={setStato} label="Filtra prenotazioni" />
        <button type="button" onClick={() => setNuova(Date.now())} className={btnPrimary}>
          <Plus className="size-4" />
          Nuova prenotazione
        </button>
      </div>

      {visibili.length === 0 ? (
        <EmptyState icon={CalendarRange} title="Nessuna prenotazione qui" />
      ) : (
        <div className={`rounded-xl border border-adm-line bg-adm-surface ${rowDivider}`}>
          {visibili.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 basis-56">
                <span className="block truncate font-medium text-white">{nomeAuto(p.veicoloId)}</span>
                <span className="block truncate text-sm text-adm-muted">
                  {nomeCliente(p.contattoId)} · {p.dataInizio} → {p.dataFine} ({giorniNoleggio(p.dataInizio, p.dataFine)} gg)
                  {p.luogoRitiro ? ` · ${p.luogoRitiro}` : ""}
                </span>
              </div>
              <span className="min-w-20 text-right font-medium tabular-nums text-white">{euro(importoPrenotazione(p))}</span>
              <SelectField
                value={p.stato}
                options={STATI_PRENOTAZIONE}
                onChange={(s) => updatePrenotazione(p.id, { stato: s })}
                aria-label={`Stato della prenotazione di ${nomeAuto(p.veicoloId)}`}
                className={`${inputCls} sm:w-36`}
              />
              <RowMenu
                label="Azioni prenotazione"
                items={[
                  {
                    label: "Elimina",
                    icon: Trash2,
                    danger: true,
                    confirm: "Conferma: elimina",
                    onSelect: () => {
                      deletePrenotazione(p.id);
                      toast("Prenotazione eliminata");
                    },
                  },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      {nuova !== null && <PrenotazioneDrawer key={nuova} onClose={() => setNuova(null)} />}
    </>
  );
}
