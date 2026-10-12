"use client";

import React, { useState } from "react";
import { useGestionale } from "@/context/GestionaleContext";
import { formatDate } from "@/lib/admin/dates";
import { euro } from "@/lib/gestionale/calc";
import { abbinaEstratto, candidati, movimentoDaEstratto } from "@/lib/import/banca";
import type { RigaValutata } from "@/lib/import/mappatura";
import { schemaEstratto, type RigaEstratto } from "@/lib/import/schemi";
import { inputCls } from "../../ui/styles";
import ImportDialog from "./ImportDialog";

type Scelta = string; // id del movimento, "nuovo" o "ignora"

const TOLLERANZE = [0, 2, 5, 10, 15];

// Estratto conto della banca: ogni riga si abbina da sola al movimento con lo stesso importo e
// una data vicina; quelle senza corrispondenza diventano movimenti nuovi (o si ignorano).
export default function ImportEstratto({ onClose }: { onClose: () => void }) {
  const { movimenti, impostazioni, riconciliaEstratto } = useGestionale();
  const [giorni, setGiorni] = useState(5);
  // Solo le scelte cambiate a mano; le altre seguono la proposta automatica.
  const [scelte, setScelte] = useState<Record<number, Scelta>>({});

  const proposte = (righe: RigaValutata<RigaEstratto>[]) => {
    const valide = righe.filter((r) => r.record && !r.doppione);
    const abbinati = abbinaEstratto(valide.map((r) => r.record as RigaEstratto), movimenti, giorni);
    return valide.map((r, i) => ({ riga: r, proposta: abbinati[i] ?? "nuovo" }));
  };
  const scelta = (n: number, proposta: string) => scelte[n] ?? proposta;

  return (
    <ImportDialog
      schema={schemaEstratto}
      titolo="Importa estratto conto"
      descrizione="Il file scaricato dall'home banking (Excel o CSV): i movimenti si abbinano da soli e si segnano riconciliati."
      onClose={onClose}
      conteggio={(righe) => proposte(righe).filter((p) => scelta(p.riga.n, p.proposta) !== "ignora").length}
      onImporta={(righe, _d, file) => {
        const abbinati: { movimentoId: string; riferimentoEstratto: string; dataSaldo: string }[] = [];
        const nuovi = [];
        for (const p of proposte(righe)) {
          const r = p.riga.record as RigaEstratto;
          const s = scelta(p.riga.n, p.proposta);
          if (s === "ignora") continue;
          if (s === "nuovo") nuovi.push(movimentoDaEstratto(r, impostazioni.pagamentiBanca));
          else abbinati.push({ movimentoId: s, riferimentoEstratto: r.riferimento, dataSaldo: r.data });
        }
        return {
          annulla: riconciliaEstratto(abbinati, nuovi, file),
          messaggio: `${abbinati.length} movimenti riconciliati${nuovi.length ? `, ${nuovi.length} nuovi registrati` : ""}`,
        };
      }}
      anteprima={(righe) => {
        const lista = proposte(righe);
        const abbinate = lista.filter((p) => !["nuovo", "ignora"].includes(scelta(p.riga.n, p.proposta))).length;
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span>
                <span className="font-semibold text-white">{abbinate}</span> abbinate su {lista.length}
              </span>
              <label className="ml-auto flex items-center gap-2">
                Tolleranza sulle date
                <select value={giorni} onChange={(e) => setGiorni(Number(e.target.value))} className={`${inputCls} w-auto py-1.5`}>
                  {TOLLERANZE.map((g) => (
                    <option key={g} value={g}>
                      ± {g} giorni
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="max-h-[24rem] overflow-y-auto rounded-xl border border-adm-line">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="sticky top-0 border-b border-adm-line bg-adm-surface text-left text-xs uppercase tracking-wide text-adm-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Riga dell&apos;estratto</th>
                    <th className="px-3 py-2 text-right font-medium">Importo</th>
                    <th className="px-3 py-2 font-medium">Cosa fare</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-adm-line">
                  {lista.slice(0, 400).map(({ riga, proposta }) => {
                    const r = riga.record as RigaEstratto;
                    const s = scelta(riga.n, proposta);
                    const opzioni = candidati(r, movimenti, 31);
                    return (
                      <tr key={riga.n}>
                        <td className="px-3 py-1.5 align-top">
                          <span className="block text-slate-100">{formatDate(r.data)}</span>
                          <span className="block max-w-[22rem] truncate text-xs text-adm-muted" title={r.descrizione}>
                            {r.descrizione || "—"}
                          </span>
                        </td>
                        <td className={`px-3 py-1.5 text-right align-top tabular-nums ${r.importo > 0 ? "text-emerald-400" : "text-slate-100"}`}>
                          {r.importo > 0 ? "+" : "−"} {euro(Math.abs(r.importo))}
                        </td>
                        <td className="px-3 py-1.5 align-top">
                          <select
                            value={s}
                            onChange={(e) => setScelte((prev) => ({ ...prev, [riga.n]: e.target.value }))}
                            aria-label={`Abbinamento per la riga ${riga.n}`}
                            className={`${inputCls} py-1.5 ${s === "nuovo" ? "text-amber-200" : s === "ignora" ? "text-adm-muted" : "text-emerald-300"}`}
                          >
                            {opzioni.map((c) => (
                              <option key={c.movimento.id} value={c.movimento.id}>
                                Abbina: {formatDate(c.movimento.data)} · {c.movimento.descrizione || c.movimento.categoria}
                                {c.movimento.fornitoreCliente ? ` · ${c.movimento.fornitoreCliente}` : ""}
                                {c.movimento.statoPagamento === "Da saldare" ? " (da saldare)" : ""}
                              </option>
                            ))}
                            <option value="nuovo">Registra come nuovo movimento</option>
                            <option value="ignora">Ignora questa riga</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-adm-muted">
              Abbinare segna il movimento come riconciliato (e saldato, se era da saldare). Un movimento nuovo prende
              data, importo e descrizione della banca; le commissioni bancarie vanno in «Banca / Commissioni».
            </p>
          </div>
        );
      }}
    />
  );
}
