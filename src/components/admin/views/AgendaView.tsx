"use client";

import React, { useState } from "react";
import { CalendarDays, CalendarPlus } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { isOpenAppointment } from "@/lib/admin/constants";
import { addDays, formatDayLabel, formatShortDate, fromDateStr } from "@/lib/admin/dates";
import type { Appointment } from "@/types/admin";
import { useEditors } from "../AdminEditors";
import AgendaCalendar from "../AgendaCalendar";
import AppointmentRow from "../AppointmentRow";
import { EmptyState, FilterTabs, PageHeader, type TabOption } from "../ui/Layout";
import { btnPrimary, btnSecondary } from "../ui/styles";

export type AgendaTab = "prossimi" | "calendario" | "confermare" | "storico";

const byDateTime = (a: Appointment, b: Appointment) =>
  a.date.localeCompare(b.date) || a.time.localeCompare(b.time);

export default function AgendaView({ initialTab }: { initialTab?: AgendaTab }) {
  const { appointments, today } = useAdmin();
  const { openAppointment } = useEditors();

  const [tab, setTab] = useState<AgendaTab>(initialTab ?? "prossimi");
  const [day, setDay] = useState<string | null>(null);

  const upcoming = appointments
    .filter((a) => isOpenAppointment(a.status) && a.date >= today)
    .sort(byDateTime);
  const toConfirm = upcoming.filter((a) => a.status === "In Attesa");
  const history = appointments
    .filter((a) => !isOpenAppointment(a.status) || a.date < today)
    .sort((a, b) => byDateTime(b, a));
  const overdue = history.filter((a) => isOpenAppointment(a.status)).length;

  const tabs: TabOption<AgendaTab>[] = [
    { id: "prossimi", label: "Prossimi", count: upcoming.length },
    { id: "calendario", label: "Calendario" },
    { id: "confermare", label: "Da confermare", count: toConfirm.length, alert: true },
    { id: "storico", label: "Storico", count: overdue || undefined, alert: true },
  ];

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const list =
    tab === "prossimi"
      ? upcoming.filter((a) => !day || a.date === day)
      : tab === "confermare"
        ? toConfirm
        : tab === "storico"
          ? history
          : [];

  // Giorni con almeno un appuntamento, in ordine, per le intestazioni.
  const groups: { date: string; items: Appointment[] }[] = [];
  if (tab !== "storico") {
    for (const a of list) {
      const last = groups[groups.length - 1];
      if (last?.date === a.date) last.items.push(a);
      else groups.push({ date: a.date, items: [a] });
    }
  }

  function changeTab(next: AgendaTab) {
    setTab(next);
    setDay(null);
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Test drive, trattative e consegne in programma."
        actions={
          <button type="button" onClick={() => openAppointment()} className={btnPrimary}>
            <CalendarPlus className="size-4" />
            Nuovo appuntamento
          </button>
        }
      />

      <div className="mb-4">
        <FilterTabs tabs={tabs} value={tab} onChange={changeTab} label="Vista agenda" />
      </div>

      {tab === "prossimi" && (
        <div className="mb-5 grid grid-cols-7 gap-1.5" role="group" aria-label="Filtra per giorno">
          {week.map((d) => {
            const count = upcoming.filter((a) => a.date === d).length;
            const selected = day === d;
            const date = fromDateStr(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDay(selected ? null : d)}
                aria-pressed={selected}
                className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-1 py-2 transition-colors ${
                  selected
                    ? "border-blue-500 bg-blue-600/15 text-white"
                    : "border-adm-line bg-adm-surface text-slate-300 hover:border-white/20"
                }`}
              >
                <span className="text-xs capitalize text-adm-muted">
                  {d === today ? "Oggi" : date.toLocaleDateString("it-IT", { weekday: "short" })}
                </span>
                <span className="text-base font-semibold tabular-nums">{date.getDate()}</span>
                <span
                  className={`text-xs tabular-nums ${count ? "font-semibold text-blue-400" : "text-slate-600"}`}
                >
                  {count || "·"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {tab === "calendario" ? (
        <AgendaCalendar />
      ) : list.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={
            tab === "confermare"
              ? "Niente da confermare"
              : tab === "storico"
                ? "Nessun appuntamento passato"
                : day
                  ? "Nessun appuntamento in questo giorno"
                  : "Nessun appuntamento in programma"
          }
          description={
            tab === "prossimi" ? "Fissa un test drive o una consegna per riempire l'agenda." : undefined
          }
          action={
            tab === "prossimi" ? (
              <button
                type="button"
                onClick={() => openAppointment({ prefill: day ? { date: day } : undefined })}
                className={btnSecondary}
              >
                Fissa un appuntamento
              </button>
            ) : undefined
          }
        />
      ) : tab === "storico" ? (
        <div className="divide-y divide-adm-line rounded-xl border border-adm-line bg-adm-surface">
          {list.map((a) => (
            <AppointmentRow key={a.id} appointment={a} showDate />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.date}>
              <h2 className="mb-2 flex items-baseline gap-2 px-1">
                <span className="text-sm font-semibold capitalize text-white">
                  {formatDayLabel(g.date, today)}
                </span>
                <span className="text-sm text-adm-muted">{formatShortDate(g.date)}</span>
              </h2>
              <div className="divide-y divide-adm-line rounded-xl border border-adm-line bg-adm-surface">
                {g.items.map((a) => (
                  <AppointmentRow key={a.id} appointment={a} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
