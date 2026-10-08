"use client";

import React, { Fragment, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { euro } from "@/lib/gestionale/calc";
import { MESI } from "@/lib/gestionale/types";
import { giorniNoleggio, importoPrenotazione, nomeRentVeicolo, type StatoPrenotazione } from "@/lib/gestionale/rent";
import { EmptyState } from "../../ui/Layout";
import { btnIcon } from "../../ui/styles";
import { SummaryRow } from "../../ui/Data";

const COLORE: Record<StatoPrenotazione, string> = {
  Prenotata: "bg-sky-500/60",
  "In corso": "bg-emerald-500/70",
  Conclusa: "bg-white/20",
  Annullata: "",
};

const iso = (anno: number, mese: number, giorno: number) =>
  `${anno}-${String(mese + 1).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;

// Disponibilità della flotta a colpo d'occhio: una riga per auto, una colonna per giorno.
export default function Calendario() {
  const { today } = useAdmin();
  const { noleggio, contatti } = useGestionale();
  const [anno, setAnno] = useState(() => Number(today.slice(0, 4)));
  const [mese, setMese] = useState(() => Number(today.slice(5, 7)) - 1);
  const [scelta, setScelta] = useState<string | null>(null);

  const giorniNelMese = new Date(anno, mese + 1, 0).getDate();
  const giorni = Array.from({ length: giorniNelMese }, (_, i) => i + 1);

  function vai(delta: number) {
    const d = new Date(anno, mese + delta, 1);
    setAnno(d.getFullYear());
    setMese(d.getMonth());
  }

  const prenotazioneIl = (veicoloId: string, giorno: number) => {
    const data = iso(anno, mese, giorno);
    return noleggio.prenotazioni.find(
      (p) => p.veicoloId === veicoloId && p.stato !== "Annullata" && data >= p.dataInizio && data <= p.dataFine
    );
  };
  const dettaglio = noleggio.prenotazioni.find((p) => p.id === scelta);
  const nomeCliente = (id: string | null) => contatti.find((c) => c.id === id)?.nome || "Non indicato";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => vai(-1)} className={btnIcon} aria-label="Mese precedente">
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="min-w-36 text-center font-semibold text-white">
            {MESI[mese]} {anno}
          </h2>
          <button type="button" onClick={() => vai(1)} className={btnIcon} aria-label="Mese successivo">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="flex gap-4 text-xs text-adm-muted">
          {(["Prenotata", "In corso", "Conclusa"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`size-3 rounded-sm ${COLORE[s]}`} />
              {s}
            </span>
          ))}
        </div>
      </div>

      {noleggio.veicoli.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Aggiungi auto alla flotta per vedere il calendario" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-adm-line bg-adm-surface">
          <div
            className="grid"
            style={{ gridTemplateColumns: `10rem repeat(${giorniNelMese}, minmax(1.75rem, 1fr))`, minWidth: `${10 + giorniNelMese * 1.75}rem` }}
          >
            <div className="sticky left-0 z-10 border-b border-adm-line bg-adm-surface px-3 py-2 text-xs font-medium text-adm-muted">Auto</div>
            {giorni.map((g) => (
              <div
                key={g}
                className={`border-b border-l border-adm-line py-2 text-center text-xs ${iso(anno, mese, g) === today ? "font-bold text-blue-400" : "text-adm-muted"}`}
              >
                {g}
              </div>
            ))}

            {noleggio.veicoli.map((v) => (
              <Fragment key={v.id}>
                <div className="sticky left-0 z-10 truncate border-b border-adm-line bg-adm-surface px-3 py-2 text-sm text-white">
                  {nomeRentVeicolo(v)}
                </div>
                {giorni.map((g) => {
                  const p = prenotazioneIl(v.id, g);
                  return (
                    <button
                      key={g}
                      type="button"
                      disabled={!p}
                      onClick={() => p && setScelta(p.id)}
                      aria-label={p ? `${nomeCliente(p.contattoId)}: ${p.dataInizio} → ${p.dataFine}` : undefined}
                      className={`min-h-9 border-b border-l border-adm-line ${p ? `${COLORE[p.stato]} cursor-pointer hover:brightness-125` : ""}`}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {dettaglio && (
        <section className="mt-4 max-w-sm rounded-xl border border-adm-line bg-adm-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-white">Dettaglio prenotazione</h3>
          <SummaryRow label="Cliente" value={nomeCliente(dettaglio.contattoId)} />
          <SummaryRow label="Dal" value={dettaglio.dataInizio} />
          <SummaryRow label="Al" value={`${dettaglio.dataFine} (${giorniNoleggio(dettaglio.dataInizio, dettaglio.dataFine)} gg)`} />
          <SummaryRow label="Stato" value={dettaglio.stato} />
          <SummaryRow label="Ritiro" value={dettaglio.luogoRitiro || "—"} />
          <SummaryRow label="Riconsegna" value={dettaglio.luogoRiconsegna || "—"} />
          <SummaryRow label="Importo" value={euro(importoPrenotazione(dettaglio))} bold />
        </section>
      )}
    </>
  );
}
