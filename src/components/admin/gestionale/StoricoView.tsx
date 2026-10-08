"use client";

import React, { useState } from "react";
import { History, Search } from "lucide-react";
import { useGestionale } from "@/context/GestionaleContext";
import type { AzioneStorico, TabellaStorico } from "@/lib/gestionale/types";
import { SelectField } from "../ui/Inputs";
import { EmptyState, PageHeader, Pill, type PillTone } from "../ui/Layout";
import { inputCls, rowDivider } from "../ui/styles";

const AZIONE_TONE: Record<AzioneStorico, PillTone> = {
  Creato: "green",
  Modificato: "amber",
  Eliminato: "red",
};

const TABELLE: { value: TabellaStorico; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "movimenti", label: "Movimenti" },
  { value: "contatti", label: "Contatti" },
  { value: "noleggio", label: "Noleggio" },
];

// Chi ha creato, modificato o eliminato cosa. Per ora registra le azioni fatte da
// questo browser; con il database sarà lo storico di tutto il team.
export default function StoricoView() {
  const { storico } = useGestionale();
  const [tabella, setTabella] = useState<TabellaStorico | "">("");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visibili = storico
    .filter((s) => !tabella || s.tabella === tabella)
    .filter((s) => !q || `${s.oggetto} ${s.dettaglio} ${s.utente}`.toLowerCase().includes(q));

  return (
    <>
      <PageHeader title="Storico modifiche" description="Chi ha creato, modificato o eliminato cosa (ultime 300 azioni)." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SelectField value={tabella} blank="Tutto" options={TABELLE} onChange={setTabella} aria-label="Filtra per sezione" className={`${inputCls} sm:w-44`} />
        <div className="relative w-full sm:w-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-adm-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca…"
            aria-label="Cerca nello storico"
            className={`${inputCls} pl-9 sm:w-64`}
          />
        </div>
      </div>

      {visibili.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nessuna modifica registrata"
          description="Ogni cosa che crei, cambi o elimini nel gestionale comparirà qui."
        />
      ) : (
        <div className={`rounded-xl border border-adm-line bg-adm-surface ${rowDivider}`}>
          {visibili.map((s) => (
            <div key={s.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3">
              <Pill tone={AZIONE_TONE[s.azione]}>{s.azione}</Pill>
              <div className="min-w-0 flex-1 basis-56">
                <p className="truncate text-sm font-medium text-white">
                  {s.oggetto} <span className="font-normal text-adm-muted">· {TABELLE.find((t) => t.value === s.tabella)?.label}</span>
                </p>
                {s.dettaglio && <p className="text-sm text-adm-muted">{s.dettaglio}</p>}
              </div>
              <p className="text-xs text-adm-muted">
                {new Date(s.quando).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {s.utente}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
