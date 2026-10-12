"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import RowMenu from "./RowMenu";
import { focusRing } from "./styles";

type Tono = "blue" | "amber" | "green" | "red" | "slate";

const TONI: Record<Tono, string> = {
  blue: "bg-blue-500/15 text-blue-300 hover:bg-blue-500/25",
  amber: "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25",
  green: "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25",
  red: "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25",
  slate: "bg-white/8 text-slate-300 hover:bg-white/12",
};

// Lo stato di una riga come etichetta colorata: si legge a colpo d'occhio e, cliccandola,
// si cambia da un menu. Sostituisce le tendine grezze nelle liste.
export default function StatoMenu<T extends string>({
  valore,
  opzioni,
  toni,
  onCambia,
  label,
  etichette,
}: {
  valore: T;
  opzioni: readonly T[];
  toni: Partial<Record<T, Tono>>;
  onCambia: (nuovo: T) => void;
  /** Per i lettori di schermo: "Stato della prenotazione". */
  label: string;
  /** Testo da mostrare al posto del valore (es. "In Attesa" → "Da confermare"). */
  etichette?: Partial<Record<T, string>>;
}) {
  const testo = (v: T) => etichette?.[v] ?? v;
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <RowMenu
        label={`${label}: ${testo(valore)}`}
        triggerClassName={`inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
          TONI[toni[valore] ?? "slate"]
        } ${focusRing}`}
        trigger={
          <>
            <span className="size-1.5 rounded-full bg-current" />
            {testo(valore)}
            <ChevronDown className="size-3 opacity-70" />
          </>
        }
        items={opzioni
          .filter((o) => o !== valore)
          .map((o) => ({ label: `Segna «${testo(o)}»`, onSelect: () => onCambia(o) }))}
      />
    </div>
  );
}
