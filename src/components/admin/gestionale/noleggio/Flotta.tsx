"use client";

import React, { useState } from "react";
import { CarFront, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { euro } from "@/lib/gestionale/calc";
import {
  CATEGORIE_VEICOLO,
  STATI_VEICOLO_RENT,
  nomeRentVeicolo,
  type CategoriaVeicolo,
  type RentVeicolo,
  type StatoVeicoloRent,
} from "@/lib/gestionale/rent";
import Drawer from "../../ui/Drawer";
import { Field, Section } from "../../ui/Field";
import { SelectField } from "../../ui/Inputs";
import { EmptyState, Pill } from "../../ui/Layout";
import RowMenu from "../../ui/RowMenu";
import { btnPrimary, focusRing, inputCls, rowDivider, textareaCls } from "../../ui/styles";
import { useToast } from "../../ui/Toast";

type Draft = Omit<RentVeicolo, "id">;

function FlottaDrawer({ veicolo, onClose }: { veicolo?: RentVeicolo; onClose: () => void }) {
  const { addRentVeicolo, updateRentVeicolo } = useGestionale();
  const toast = useToast();
  const [f, setF] = useState(() => ({
    marca: veicolo?.marca ?? "",
    modello: veicolo?.modello ?? "",
    targa: veicolo?.targa ?? "",
    categoria: (veicolo?.categoria ?? "Economy") as CategoriaVeicolo,
    stato: (veicolo?.stato ?? "Disponibile") as StatoVeicoloRent,
    kmAttuali: veicolo ? String(veicolo.kmAttuali) : "",
    tariffaGiornaliera: veicolo ? String(veicolo.tariffaGiornaliera) : "",
    dataRevisione: veicolo?.dataRevisione ?? "",
    dataBollo: veicolo?.dataBollo ?? "",
    dataAssicurazione: veicolo?.dataAssicurazione ?? "",
    dataTagliando: veicolo?.dataTagliando ?? "",
    note: veicolo?.note ?? "",
  }));
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  function submit() {
    const dati: Draft = {
      ...f,
      marca: f.marca.trim(),
      modello: f.modello.trim(),
      targa: f.targa.trim().toUpperCase(),
      kmAttuali: Number(f.kmAttuali) || 0,
      tariffaGiornaliera: Number(f.tariffaGiornaliera) || 0,
    };
    if (veicolo) {
      updateRentVeicolo(veicolo.id, dati);
      toast("Auto aggiornata");
    } else {
      addRentVeicolo(dati);
      toast(`${nomeRentVeicolo(dati)} aggiunta alla flotta`);
    }
    onClose();
  }

  return (
    <Drawer
      title={veicolo ? nomeRentVeicolo(veicolo) : "Nuova auto a noleggio"}
      submitLabel={veicolo ? "Salva modifiche" : "Aggiungi alla flotta"}
      onSubmit={submit}
      onClose={onClose}
    >
      <Section title="Veicolo" columns={3}>
        <Field label="Marca">
          <input required autoFocus={!veicolo} value={f.marca} onChange={(e) => set("marca", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Modello">
          <input required value={f.modello} onChange={(e) => set("modello", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Targa">
          <input value={f.targa} onChange={(e) => set("targa", e.target.value)} className={`${inputCls} uppercase`} />
        </Field>
        <Field label="Categoria">
          <SelectField value={f.categoria} options={CATEGORIE_VEICOLO} onChange={(v) => set("categoria", v)} />
        </Field>
        <Field label="Stato">
          <SelectField value={f.stato} options={STATI_VEICOLO_RENT} onChange={(v) => set("stato", v)} />
        </Field>
        <Field label="Km attuali">
          <input type="number" min={0} value={f.kmAttuali} onChange={(e) => set("kmAttuali", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Tariffa base al giorno (€)" className="sm:col-span-3">
          <input required type="number" min={0} value={f.tariffaGiornaliera} onChange={(e) => set("tariffaGiornaliera", e.target.value)} className={inputCls} />
        </Field>
      </Section>
      <Section title="Scadenze" columns={2}>
        <Field label="Revisione">
          <input type="date" value={f.dataRevisione} onChange={(e) => set("dataRevisione", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Bollo">
          <input type="date" value={f.dataBollo} onChange={(e) => set("dataBollo", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Assicurazione">
          <input type="date" value={f.dataAssicurazione} onChange={(e) => set("dataAssicurazione", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Tagliando">
          <input type="date" value={f.dataTagliando} onChange={(e) => set("dataTagliando", e.target.value)} className={inputCls} />
        </Field>
      </Section>
      <Section title="Note" columns={1}>
        <textarea rows={3} value={f.note} onChange={(e) => set("note", e.target.value)} className={textareaCls} aria-label="Note" />
      </Section>
    </Drawer>
  );
}

export default function Flotta() {
  const { today } = useAdmin();
  const { noleggio, updateRentVeicolo, deleteRentVeicolo } = useGestionale();
  const toast = useToast();
  const [editing, setEditing] = useState<{ veicolo?: RentVeicolo; key: number } | null>(null);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visibili = noleggio.veicoli.filter((v) => !q || `${v.marca} ${v.modello} ${v.targa}`.toLowerCase().includes(q));
  const scaduta = (v: RentVeicolo) =>
    [v.dataRevisione, v.dataBollo, v.dataAssicurazione].some((d) => d && d < today);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-adm-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca marca, modello, targa…"
            aria-label="Cerca nella flotta"
            className={`${inputCls} pl-9 sm:w-64`}
          />
        </div>
        <button type="button" onClick={() => setEditing({ key: Date.now() })} className={btnPrimary}>
          <Plus className="size-4" />
          Nuova auto
        </button>
      </div>

      {visibili.length === 0 ? (
        <EmptyState icon={CarFront} title="Nessuna auto in flotta" description="Aggiungi le auto che noleggi." />
      ) : (
        <div className={`rounded-xl border border-adm-line bg-adm-surface ${rowDivider}`}>
          {visibili.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setEditing({ veicolo: v, key: Date.now() })}
                className={`min-w-0 flex-1 basis-48 cursor-pointer rounded text-left ${focusRing}`}
              >
                <span className="block truncate font-medium text-white">{nomeRentVeicolo(v)}</span>
                <span className="block truncate text-sm text-adm-muted">
                  {v.categoria} · {v.kmAttuali.toLocaleString("it-IT")} km
                </span>
              </button>
              {scaduta(v) && <Pill tone="red">Scadenza superata</Pill>}
              <span className="text-sm tabular-nums text-slate-200">{euro(v.tariffaGiornaliera)}/giorno</span>
              <SelectField
                value={v.stato}
                options={STATI_VEICOLO_RENT}
                onChange={(stato) => updateRentVeicolo(v.id, { stato })}
                aria-label={`Stato di ${nomeRentVeicolo(v)}`}
                className={`${inputCls} sm:w-40`}
              />
              <RowMenu
                label={`Azioni per ${nomeRentVeicolo(v)}`}
                items={[
                  { label: "Modifica", icon: Pencil, onSelect: () => setEditing({ veicolo: v, key: Date.now() }) },
                  {
                    label: "Elimina",
                    icon: Trash2,
                    danger: true,
                    confirm: "Conferma: elimina anche le prenotazioni",
                    onSelect: () => {
                      deleteRentVeicolo(v.id);
                      toast(`${nomeRentVeicolo(v)} eliminata dalla flotta`);
                    },
                  },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      {editing && <FlottaDrawer key={editing.key} veicolo={editing.veicolo} onClose={() => setEditing(null)} />}
    </>
  );
}
