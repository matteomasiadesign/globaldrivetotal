"use client";

import React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Inbox,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useCars } from "@/context/CarContext";
import { useGestionale } from "@/context/GestionaleContext";
import { isOpenAppointment } from "@/lib/admin/constants";
import { formatLongDate, greeting, timeAgo } from "@/lib/admin/dates";
import { getDossier } from "@/lib/admin/documents";
import { annoNum, computeAvvisi, computeVeicolo, euro, liquidazioneTrimestre, trimestre } from "@/lib/gestionale/calc";
import { computeAvvisiRent } from "@/lib/gestionale/rent";
import { useEditors } from "../AdminEditors";
import AppointmentRow from "../AppointmentRow";
import LeadRow from "../LeadRow";
import { SummaryRow, signedText } from "../ui/Data";
import { EmptyState, PageHeader, Panel } from "../ui/Layout";
import { btnPrimary, btnSecondary } from "../ui/styles";

function Kpi({
  href,
  label,
  value,
  hint,
  highlight,
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-adm-line bg-adm-surface p-4 transition-colors hover:border-white/20"
    >
      <p className="text-sm text-adm-muted">{label}</p>
      <p
        className={`mt-1 text-3xl font-semibold tabular-nums ${
          highlight && value > 0 ? "text-blue-400" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-adm-muted group-hover:text-slate-300">{hint}</p>
    </Link>
  );
}

function AttentionRow({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 text-sm text-slate-200 transition-colors hover:bg-white/5"
    >
      <Icon className="size-4 shrink-0 text-amber-400" />
      <span className="flex-1">{children}</span>
      <ArrowRight className="size-4 shrink-0 text-adm-muted" />
    </Link>
  );
}

export default function TodayView() {
  const { user, now, today, leads, appointments, documents } = useAdmin();
  const { cars } = useCars();
  const { veicoli, movimenti, contatti, impostazioni, noleggio } = useGestionale();
  const { openAppointment, openCar } = useEditors();

  const nowDate = new Date(now);
  const nowTime = `${String(nowDate.getHours()).padStart(2, "0")}:${String(nowDate.getMinutes()).padStart(2, "0")}`;

  const newLeads = leads
    .filter((l) => l.status === "nuovo")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const oldestLead = newLeads[newLeads.length - 1];

  const todayOpen = appointments
    .filter((a) => a.date === today && isOpenAppointment(a.status))
    .sort((a, b) => a.time.localeCompare(b.time));
  const nextToday = todayOpen.find((a) => a.time >= nowTime);
  const pending = appointments.filter((a) => a.status === "In Attesa" && a.date >= today);
  const overdue = appointments.filter((a) => isOpenAppointment(a.status) && a.date < today);

  const available = cars.filter((c) => c.status === "Disponibile" && !c.hidden);
  const inNegotiation = cars.filter((c) => c.status === "In Trattativa");
  const hiddenCars = cars.filter((c) => c.hidden && c.status !== "Venduta");
  const incompleteDossiers = cars.filter(
    (c) => c.status !== "Venduta" && !getDossier(c.id, documents).complete
  );

  // Conti: scadenze, giacenze e noleggio che richiedono attenzione, più le cifre dell'anno.
  const avvisi = [
    ...computeAvvisi(veicoli, movimenti, impostazioni, today),
    ...computeAvvisiRent(noleggio.veicoli, contatti, today),
  ];
  const conti = veicoli.map((v) => ({ v, c: computeVeicolo(v, movimenti, impostazioni, today) }));
  const ricavi = movimenti
    .filter((m) => m.tipo === "Entrata" && annoNum(m.data) === impostazioni.annoGestione)
    .reduce((s, m) => s + m.totale, 0);
  const risultatoVendite = conti
    .filter(({ v }) => v.dataVendita && annoNum(v.dataVendita) === impostazioni.annoGestione)
    .reduce((s, { c }) => s + (c.risultatoDopoIva || 0), 0);
  const capitaleInStock = conti
    .filter(({ v }) => v.stato !== "Venduta" && v.stato !== "Archiviata" && v.servizio !== "Conto vendita")
    .reduce((s, { c }) => s + c.costoTotale, 0);
  const ivaDaVersare = liquidazioneTrimestre(trimestre(today) ?? 1, veicoli, movimenti, impostazioni, today).totale;

  const firstName = (user?.name ?? "").split(" ")[0];
  const attentionCount = overdue.length + hiddenCars.length + incompleteDossiers.length + avvisi.length;

  return (
    <>
      <PageHeader
        title={`${greeting(nowDate)}${firstName ? `, ${firstName}` : ""}`}
        description={formatLongDate(nowDate)}
        actions={
          <>
            <button type="button" onClick={() => openCar()} className={btnSecondary}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Aggiungi auto</span>
              <span className="sm:hidden">Auto</span>
            </button>
            <button type="button" onClick={() => openAppointment()} className={btnPrimary}>
              <CalendarPlus className="size-4" />
              <span className="hidden sm:inline">Nuovo appuntamento</span>
              <span className="sm:hidden">Appuntamento</span>
            </button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          href="/admin/richieste"
          label="Nuove richieste"
          value={newLeads.length}
          highlight
          hint={oldestLead ? `La più vecchia: ${timeAgo(oldestLead.createdAt, now)}` : "Tutto gestito"}
        />
        <Kpi
          href="/admin/agenda"
          label="Appuntamenti oggi"
          value={todayOpen.length}
          hint={
            nextToday
              ? `Prossimo alle ${nextToday.time} · ${nextToday.clientName}`
              : todayOpen.length
                ? "Nessun altro per oggi"
                : "Giornata libera"
          }
        />
        <Kpi
          href="/admin/agenda?tab=confermare"
          label="Da confermare"
          value={pending.length}
          highlight
          hint={pending.length ? "Appuntamenti in attesa" : "Niente in sospeso"}
        />
        <Kpi
          href="/admin/auto?filtro=trattativa"
          label="Auto in trattativa"
          value={inNegotiation.length}
          hint={`${available.length} disponibili in catalogo`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Panel
            title="Agenda di oggi"
            action={
              <Link
                href="/admin/agenda"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Apri agenda
              </Link>
            }
          >
            {todayOpen.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={CalendarDays}
                  title="Nessun appuntamento per oggi"
                  action={
                    <button type="button" onClick={() => openAppointment()} className={btnSecondary}>
                      Fissa un appuntamento
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-adm-line">
                {todayOpen.map((a) => (
                  <AppointmentRow key={a.id} appointment={a} compact />
                ))}
              </div>
            )}
          </Panel>

          <div className="mt-6">
            <Panel
              title={`Conti ${impostazioni.annoGestione}`}
              action={
                <Link href="/admin/analisi" className="text-sm text-blue-400 hover:text-blue-300">
                  Apri analisi
                </Link>
              }
            >
              <div className="px-4 py-2">
                <SummaryRow label="Incassi registrati" value={euro(ricavi)} />
                <SummaryRow label="Risultato delle auto vendute" value={euro(risultatoVendite)} tone={signedText(risultatoVendite)} />
                <SummaryRow label="Capitale in stock" value={euro(capitaleInStock)} />
                <SummaryRow label="IVA del trimestre da versare" value={euro(ivaDaVersare)} />
              </div>
            </Panel>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Panel
            title="Richieste da gestire"
            action={
              newLeads.length > 4 ? (
                <Link
                  href="/admin/richieste"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Vedi tutte ({newLeads.length})
                </Link>
              ) : undefined
            }
          >
            {newLeads.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-6 text-sm text-adm-muted">
                <Inbox className="size-5" />
                Nessuna richiesta nuova.
              </div>
            ) : (
              <div className="divide-y divide-adm-line">
                {newLeads.slice(0, 4).map((l) => (
                  <LeadRow key={l.id} lead={l} compact />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Da sistemare">
            {attentionCount === 0 ? (
              <div className="flex items-center gap-3 px-4 py-6 text-sm text-adm-muted">
                <CheckCircle2 className="size-5 text-emerald-400" />
                Tutto in ordine.
              </div>
            ) : (
              <div className="divide-y divide-adm-line">
                {overdue.length > 0 && (
                  <AttentionRow href="/admin/agenda?tab=storico" icon={AlertCircle}>
                    {overdue.length === 1
                      ? "1 appuntamento passato da chiudere"
                      : `${overdue.length} appuntamenti passati da chiudere`}
                  </AttentionRow>
                )}
                {incompleteDossiers.length > 0 && (
                  <AttentionRow href="/admin/documenti?filtro=incompleti" icon={AlertCircle}>
                    {incompleteDossiers.length === 1
                      ? "1 auto con documenti mancanti"
                      : `${incompleteDossiers.length} auto con documenti mancanti`}
                  </AttentionRow>
                )}
                {avvisi.map((a, i) => (
                  <AttentionRow key={i} href={a.href ?? "/admin"} icon={AlertCircle}>
                    {a.messaggio}
                  </AttentionRow>
                ))}
                {hiddenCars.length > 0 && (
                  <AttentionRow href="/admin/auto?filtro=nascoste" icon={AlertCircle}>
                    {hiddenCars.length === 1
                      ? "1 auto non visibile nel catalogo"
                      : `${hiddenCars.length} auto non visibili nel catalogo`}
                  </AttentionRow>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
