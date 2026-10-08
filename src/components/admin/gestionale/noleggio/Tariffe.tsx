"use client";

import React from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { CATEGORIE_VEICOLO } from "@/lib/gestionale/rent";
import { Field } from "../../ui/Field";
import { NumberField, SelectField, TextField } from "../../ui/Inputs";
import { EmptyState } from "../../ui/Layout";
import RowMenu from "../../ui/RowMenu";
import { btnPrimary, rowDivider } from "../../ui/styles";
import { useToast } from "../../ui/Toast";

// Alta e bassa stagione, periodi speciali: ogni riga si modifica direttamente e
// salva quando esci dal campo. I preventivi e le prenotazioni le usano per
// proporre la tariffa giusta in base alla data di inizio.
export default function Tariffe() {
  const { today } = useAdmin();
  const { noleggio, addTariffa, updateTariffa, deleteTariffa } = useGestionale();
  const toast = useToast();

  const ordinate = [...noleggio.tariffe].sort(
    (a, b) => a.categoria.localeCompare(b.categoria) || a.dataInizio.localeCompare(b.dataInizio)
  );

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() =>
            addTariffa({ categoria: "Economy", nomePeriodo: "", dataInizio: today, dataFine: today, tariffaGiornaliera: 0 })
          }
          className={btnPrimary}
        >
          <Plus className="size-4" />
          Nuova tariffa
        </button>
      </div>

      {ordinate.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Nessuna tariffa di periodo"
          description="Senza tariffe specifiche i preventivi usano la tariffa base di ogni auto."
        />
      ) : (
        <div className={`rounded-xl border border-adm-line bg-adm-surface ${rowDivider}`}>
          {ordinate.map((t) => (
            <div key={t.id} className="grid grid-cols-2 items-end gap-3 px-4 py-3 lg:grid-cols-[9rem_minmax(0,1fr)_9rem_9rem_7rem_2rem]">
              <Field label="Categoria">
                <SelectField value={t.categoria} options={CATEGORIE_VEICOLO} onChange={(categoria) => updateTariffa(t.id, { categoria })} />
              </Field>
              <Field label="Periodo" className="col-span-2 lg:col-span-1">
                <TextField value={t.nomePeriodo} onCommit={(nomePeriodo) => updateTariffa(t.id, { nomePeriodo })} placeholder="Alta stagione" />
              </Field>
              <Field label="Dal">
                <TextField
                  type="date"
                  value={t.dataInizio}
                  onCommit={(dataInizio) => {
                    if (dataInizio > t.dataFine) return toast("L'inizio non può seguire la fine");
                    updateTariffa(t.id, { dataInizio });
                  }}
                />
              </Field>
              <Field label="Al">
                <TextField
                  type="date"
                  value={t.dataFine}
                  onCommit={(dataFine) => {
                    if (dataFine < t.dataInizio) return toast("La fine non può precedere l'inizio");
                    updateTariffa(t.id, { dataFine });
                  }}
                />
              </Field>
              <Field label="€ al giorno">
                <NumberField value={t.tariffaGiornaliera} onCommit={(n) => updateTariffa(t.id, { tariffaGiornaliera: n ?? 0 })} />
              </Field>
              <div className="justify-self-end">
                <RowMenu
                  label="Azioni tariffa"
                  items={[
                    {
                      label: "Elimina",
                      icon: Trash2,
                      danger: true,
                      confirm: "Conferma: elimina",
                      onSelect: () => {
                        deleteTariffa(t.id);
                        toast("Tariffa eliminata");
                      },
                    },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
