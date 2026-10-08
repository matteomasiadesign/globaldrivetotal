"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { euro } from "@/lib/gestionale/calc";
import { computeAvvisiRent, giorniNoleggio, importoPrenotazione, nomeRentVeicolo } from "@/lib/gestionale/rent";
import { Stat } from "../ui/Data";
import { FilterTabs, PageHeader, Panel, type TabOption } from "../ui/Layout";
import Calendario from "./noleggio/Calendario";
import Flotta from "./noleggio/Flotta";
import Prenotazioni from "./noleggio/Prenotazioni";
import Preventivi from "./noleggio/Preventivi";
import Tariffe from "./noleggio/Tariffe";

export type NoleggioTab = "panoramica" | "prenotazioni" | "calendario" | "preventivi" | "flotta" | "tariffe";

function Panoramica() {
  const { today } = useAdmin();
  const { noleggio, contatti } = useGestionale();
  const avvisi = computeAvvisiRent(noleggio.veicoli, contatti, today);
  const inCorso = noleggio.prenotazioni.filter((p) => p.stato === "In corso");
  const prossime = noleggio.prenotazioni
    .filter((p) => p.stato === "Prenotata" && p.dataInizio >= today)
    .sort((a, b) => a.dataInizio.localeCompare(b.dataInizio));
  const ricavi = noleggio.prenotazioni
    .filter((p) => p.stato === "In corso" || p.stato === "Conclusa")
    .reduce((s, p) => s + importoPrenotazione(p), 0);

  const nomeAuto = (id: string) => {
    const v = noleggio.veicoli.find((x) => x.id === id);
    return v ? nomeRentVeicolo(v) : "Auto eliminata";
  };
  const nomeCliente = (id: string | null) => contatti.find((c) => c.id === id)?.nome || "Cliente non indicato";

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Disponibili" value={noleggio.veicoli.filter((v) => v.stato === "Disponibile").length} />
        <Stat label="Noleggiate" value={noleggio.veicoli.filter((v) => v.stato === "Noleggiata").length} />
        <Stat label="Noleggi in corso" value={inCorso.length} />
        <Stat label="Ricavi (in corso + conclusi)" value={euro(ricavi)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Prenotazioni in corso e in arrivo">
          {inCorso.length + prossime.length === 0 ? (
            <p className="px-4 py-6 text-sm text-adm-muted">Nessun noleggio in corso né prenotato.</p>
          ) : (
            <div className="divide-y divide-adm-line">
              {[...inCorso, ...prossime.slice(0, 5)].map((p) => (
                <div key={p.id} className="px-4 py-3">
                  <p className="truncate text-sm font-medium text-white">{nomeAuto(p.veicoloId)}</p>
                  <p className="truncate text-sm text-adm-muted">
                    {p.stato === "In corso" ? "In corso" : "Prenotata"} · {nomeCliente(p.contattoId)} · {p.dataInizio} → {p.dataFine} ({giorniNoleggio(p.dataInizio, p.dataFine)} gg)
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Scadenze da controllare">
          {avvisi.length === 0 ? (
            <p className="px-4 py-6 text-sm text-adm-muted">Revisioni, bolli, assicurazioni e patenti sono in regola.</p>
          ) : (
            <div className="divide-y divide-adm-line">
              {avvisi.map((a, i) => (
                <Link key={i} href={a.href ?? "#"} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-200 transition-colors hover:bg-white/5">
                  <AlertCircle className={`size-4 shrink-0 ${a.livello === "danger" ? "text-rose-400" : "text-amber-400"}`} />
                  {a.messaggio}
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

export default function NoleggioView({ initialTab = "panoramica" }: { initialTab?: NoleggioTab }) {
  const { noleggio } = useGestionale();
  const [tab, setTab] = useState<NoleggioTab>(initialTab);

  const tabs: TabOption<NoleggioTab>[] = [
    { id: "panoramica", label: "Panoramica" },
    { id: "prenotazioni", label: "Prenotazioni", count: noleggio.prenotazioni.filter((p) => p.stato === "Prenotata" || p.stato === "In corso").length },
    { id: "calendario", label: "Calendario" },
    { id: "preventivi", label: "Preventivi" },
    { id: "flotta", label: "Flotta", count: noleggio.veicoli.length },
    { id: "tariffe", label: "Tariffe" },
  ];

  return (
    <>
      <PageHeader title="Noleggio" description="Global Rent: flotta, clienti, prenotazioni e preventivi." />
      <div className="mb-5">
        <FilterTabs tabs={tabs} value={tab} onChange={setTab} label="Sezioni del noleggio" />
      </div>
      {tab === "panoramica" && <Panoramica />}
      {tab === "prenotazioni" && <Prenotazioni />}
      {tab === "calendario" && <Calendario />}
      {tab === "preventivi" && <Preventivi />}
      {tab === "flotta" && <Flotta />}
      {tab === "tariffe" && <Tariffe />}
    </>
  );
}
