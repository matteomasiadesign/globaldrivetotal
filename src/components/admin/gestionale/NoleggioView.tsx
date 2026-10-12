"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarRange, CheckCircle2, Euro, KeyRound, Plus } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { formatDate, formatLongDate, greeting } from "@/lib/admin/dates";
import { annoNum, euro } from "@/lib/gestionale/calc";
import { computeAvvisiRent, giorniNoleggio, nomeRentVeicolo, type NoleggioSezione, type RentPrenotazione } from "@/lib/gestionale/rent";
import { foglioFlotta, foglioNoleggioPerMese, foglioPrenotazioni } from "@/lib/export/gestionale";
import { nomeFile } from "@/lib/export/scrivi";
import ExportMenu, { useContestoExport } from "../ui/ExportMenu";
import { EmptyState, KpiCard, PageHeader, Panel } from "../ui/Layout";
import { btnPrimary } from "../ui/styles";
import Calendario from "./noleggio/Calendario";
import Flotta from "./noleggio/Flotta";
import Prenotazioni from "./noleggio/Prenotazioni";
import Preventivi from "./noleggio/Preventivi";
import Tariffe from "./noleggio/Tariffe";


const TITOLI: Record<NoleggioSezione, { titolo: string; descrizione: string }> = {
  panoramica: { titolo: "", descrizione: "" },
  prenotazioni: { titolo: "Prenotazioni", descrizione: "Ritiri, riconsegne e noleggi in corso." },
  calendario: { titolo: "Calendario", descrizione: "Occupazione della flotta giorno per giorno." },
  preventivi: { titolo: "Preventivi", descrizione: "Offerte ai clienti, da convertire in prenotazioni." },
  flotta: { titolo: "Auto a noleggio", descrizione: "Le auto assegnate a Global Rent: tariffe, km e scadenze." },
  tariffe: { titolo: "Tariffe", descrizione: "Prezzi al giorno per categoria e periodo." },
};

/** Una riga «chi passa oggi»: ritiro o riconsegna. */
function MovimentoOggi({ p, cosa, auto, cliente }: { p: RentPrenotazione; cosa: "Ritiro" | "Riconsegna"; auto: string; cliente: string }) {
  const Icon = cosa === "Ritiro" ? ArrowUpRight : ArrowDownLeft;
  const luogo = cosa === "Ritiro" ? p.luogoRitiro : p.luogoRiconsegna;
  return (
    <Link
      href="/admin/noleggio/prenotazioni"
      className="group flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/5"
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${
          cosa === "Ritiro" ? "bg-acc-500/15 text-acc-300 ring-acc-500/20" : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20"
        }`}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-white">
          {cosa} · {auto}
        </span>
        <span className="block truncate text-adm-muted">
          {cliente}
          {luogo ? ` · ${luogo}` : ""}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-adm-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** La «Oggi» di Global Rent. */
function Panoramica() {
  const { user, now, today } = useAdmin();
  const { noleggio, flotta, contatti, movimenti, impostazioni } = useGestionale();
  const nowDate = new Date(now);
  const firstName = (user?.name ?? "").split(" ")[0];

  const avvisi = computeAvvisiRent(flotta, contatti, today);
  const ritiri = noleggio.prenotazioni.filter((p) => p.stato === "Prenotata" && p.dataInizio === today);
  const riconsegne = noleggio.prenotazioni.filter((p) => p.stato === "In corso" && p.dataFine === today);
  const inCorso = noleggio.prenotazioni.filter((p) => p.stato === "In corso");
  const prossime = noleggio.prenotazioni
    .filter((p) => p.stato === "Prenotata" && p.dataInizio > today)
    .sort((a, b) => a.dataInizio.localeCompare(b.dataInizio));
  const ritiriInRitardo = noleggio.prenotazioni.filter((p) => p.stato === "Prenotata" && p.dataInizio < today);
  const riconsegneInRitardo = inCorso.filter((p) => p.dataFine < today);

  const disponibili = flotta.filter((v) => v.stato === "Disponibile").length;
  const noleggiate = flotta.filter((v) => v.stato === "Noleggiata").length;
  const ferme = flotta.filter((v) => v.stato === "In manutenzione" || v.stato === "Fuori servizio").length;
  const utilizzo = flotta.length ? Math.round((noleggiate / flotta.length) * 100) : 0;

  // Incassi del noleggio nell'anno di gestione (movimenti di Global Rent).
  const incassiAnno = movimenti
    .filter((m) => m.attivita === "Noleggio" && m.tipo === "Entrata" && annoNum(m.data) === impostazioni.annoGestione)
    .reduce((s, m) => s + m.totale, 0);
  const daIncassare = movimenti
    .filter((m) => m.attivita === "Noleggio" && m.tipo === "Entrata" && m.statoPagamento === "Da saldare")
    .reduce((s, m) => s + m.totale, 0);

  const nomeAuto = (id: string) => {
    const v = noleggio.veicoli.find((x) => x.id === id);
    return v ? nomeRentVeicolo(v) : "Auto eliminata";
  };
  const nomeCliente = (p: { contattoId: string | null; clienteNomeLibero: string }) =>
    contatti.find((c) => c.id === p.contattoId)?.nome || p.clienteNomeLibero || "Cliente non indicato";

  const daSistemare = avvisi.length + ritiriInRitardo.length + riconsegneInRitardo.length;

  return (
    <>
      <PageHeader
        title={`${greeting(nowDate)}${firstName ? `, ${firstName}` : ""}`}
        description={`${formatLongDate(nowDate)} · Global Rent`}
        actions={
          <Link href="/admin/noleggio/prenotazioni?nuova=1" className={btnPrimary}>
            <Plus className="size-4" />
            Prenotazione
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          href="/admin/noleggio/prenotazioni"
          label="Ritiri e riconsegne"
          icon={KeyRound}
          value={ritiri.length + riconsegne.length}
          highlight={ritiri.length + riconsegne.length > 0}
          hint={`Oggi: ${ritiri.length} ${ritiri.length === 1 ? "ritiro" : "ritiri"} · ${riconsegne.length} ${riconsegne.length === 1 ? "riconsegna" : "riconsegne"}`}
        />
        <KpiCard
          href="/admin/noleggio/flotta"
          label="Auto disponibili"
          icon={CheckCircle2}
          tone="green"
          value={`${disponibili}/${flotta.length}`}
          hint={ferme ? `${ferme} ferme in officina o fuori servizio` : "Nessuna auto ferma"}
        />
        <KpiCard
          href="/admin/noleggio/calendario"
          label="Flotta noleggiata"
          icon={CalendarRange}
          tone="slate"
          value={`${utilizzo}%`}
          hint={`${noleggiate} in giro ora · ${prossime.length} prenotazioni in arrivo`}
        />
        <KpiCard
          href="/admin/movimenti"
          label={`Incassi ${impostazioni.annoGestione}`}
          icon={Euro}
          tone="amber"
          value={euro(incassiAnno)}
          hint={daIncassare ? `${euro(daIncassare)} ancora da incassare` : "Tutto incassato"}
        />
      </div>

      {flotta.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="La flotta è vuota"
          description="Aggiungi un'auto a noleggio oppure sposta qui un'auto dal parco di Global Drive."
          action={
            <Link href="/admin/noleggio/flotta" className={btnPrimary}>
              Vai alla flotta
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Panel title="Chi passa oggi">
              {ritiri.length + riconsegne.length === 0 ? (
                <p className="px-4 py-6 text-sm text-adm-muted">Nessun ritiro né riconsegna per oggi.</p>
              ) : (
                <div className="divide-y divide-adm-line">
                  {ritiri.map((p) => (
                    <MovimentoOggi key={`r-${p.id}`} p={p} cosa="Ritiro" auto={nomeAuto(p.veicoloId)} cliente={nomeCliente(p)} />
                  ))}
                  {riconsegne.map((p) => (
                    <MovimentoOggi key={`c-${p.id}`} p={p} cosa="Riconsegna" auto={nomeAuto(p.veicoloId)} cliente={nomeCliente(p)} />
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="In corso e in arrivo"
              action={
                <Link href="/admin/noleggio/calendario" className="text-sm text-acc-400 hover:text-acc-300">
                  Apri calendario
                </Link>
              }
            >
              {inCorso.length + prossime.length === 0 ? (
                <p className="px-4 py-6 text-sm text-adm-muted">Nessun noleggio in corso né prenotato.</p>
              ) : (
                <div className="divide-y divide-adm-line">
                  {[...inCorso, ...prossime.slice(0, 5)].map((p) => {
                    const giorni = giorniNoleggio(p.dataInizio, p.dataFine);
                    // Avanzamento del noleggio in corso, per la barretta.
                    const fatti = p.stato === "In corso" ? Math.min(giorni, Math.max(0, giorniNoleggio(p.dataInizio, today))) : 0;
                    return (
                      <div key={p.id} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{nomeAuto(p.veicoloId)}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.stato === "In corso" ? "bg-acc-500/15 text-acc-300" : "bg-white/8 text-slate-300"
                            }`}
                          >
                            {p.stato === "In corso" ? "In corso" : "Prenotata"}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-adm-muted">
                          {nomeCliente(p)} · {formatDate(p.dataInizio)} → {formatDate(p.dataFine)} ({giorni} gg)
                        </p>
                        {p.stato === "In corso" && (
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8" aria-hidden="true">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-acc-500 to-acc-300"
                              style={{ width: `${Math.round((fatti / Math.max(1, giorni)) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <Panel title="Da sistemare">
              {daSistemare === 0 ? (
                <div className="flex items-center gap-3 px-4 py-6 text-sm text-adm-muted">
                  <CheckCircle2 className="size-5 text-emerald-400" />
                  Revisioni, bolli, assicurazioni e patenti sono in regola.
                </div>
              ) : (
                <div className="divide-y divide-adm-line">
                  {ritiriInRitardo.length > 0 && (
                    <Link href="/admin/noleggio/prenotazioni" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-200 transition-colors hover:bg-white/5">
                      <AlertCircle className="size-4 shrink-0 text-rose-400" />
                      {ritiriInRitardo.length === 1 ? "1 ritiro passato ancora «Prenotata»" : `${ritiriInRitardo.length} ritiri passati ancora «Prenotata»`}
                    </Link>
                  )}
                  {riconsegneInRitardo.length > 0 && (
                    <Link href="/admin/noleggio/prenotazioni" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-200 transition-colors hover:bg-white/5">
                      <AlertCircle className="size-4 shrink-0 text-rose-400" />
                      {riconsegneInRitardo.length === 1 ? "1 auto non ancora riconsegnata" : `${riconsegneInRitardo.length} auto non ancora riconsegnate`}
                    </Link>
                  )}
                  {avvisi.map((a, i) => (
                    <Link key={i} href={a.href ?? "#"} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-200 transition-colors hover:bg-white/5">
                      <AlertCircle className={`size-4 shrink-0 ${a.livello === "danger" ? "text-rose-400" : "text-amber-400"}`} />
                      {a.messaggio}
                    </Link>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Stato della flotta">
              <div className="space-y-3 px-4 py-4">
                {[
                  { label: "Disponibili", n: disponibili, cls: "bg-emerald-400" },
                  { label: "Noleggiate", n: noleggiate, cls: "bg-acc-400" },
                  { label: "In manutenzione o fuori servizio", n: ferme, cls: "bg-amber-400" },
                ].map(({ label, n, cls }) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-300">{label}</span>
                      <span className="tabular-nums text-white">{n}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/8" aria-hidden="true">
                      <div className={`h-full rounded-full ${cls}`} style={{ width: `${flotta.length ? (n / flotta.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}

export default function NoleggioView({ sezione = "panoramica" }: { sezione?: NoleggioSezione }) {
  const { noleggio } = useGestionale();
  const { today } = useAdmin();
  const ctx = useContestoExport();

  if (sezione === "panoramica") return <Panoramica />;

  return (
    <>
      <PageHeader
        title={TITOLI[sezione].titolo}
        description={TITOLI[sezione].descrizione}
        actions={
          <ExportMenu
            nome={nomeFile("Noleggio", today)}
            fogli={() => [
              foglioPrenotazioni(noleggio.prenotazioni, ctx, ["Tutte le prenotazioni"]),
              foglioNoleggioPerMese(Number(today.slice(0, 4)), ctx),
              foglioFlotta(ctx),
            ]}
          />
        }
      />
      {sezione === "prenotazioni" && <Prenotazioni />}
      {sezione === "calendario" && <Calendario />}
      {sezione === "preventivi" && <Preventivi />}
      {sezione === "flotta" && <Flotta />}
      {sezione === "tariffe" && <Tariffe />}
    </>
  );
}
