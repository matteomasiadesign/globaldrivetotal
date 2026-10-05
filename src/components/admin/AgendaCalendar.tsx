"use client";

import React, { useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { addDays, formatDayLabel, formatShortDate, fromDateStr, toDateStr } from "@/lib/admin/dates";
import type { Appointment, AppointmentStatus } from "@/types/admin";
import { useEditors } from "./AdminEditors";
import AppointmentRow from "./AppointmentRow";
import { btnIcon, btnSecondary, focusRing } from "./ui/styles";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MAX_CHIPS = 3;

const CHIP: Record<AppointmentStatus, string> = {
  Confermato: "bg-blue-500/20 text-blue-200",
  "In Attesa": "bg-amber-500/20 text-amber-200",
  Completato: "bg-emerald-500/15 text-emerald-300/80",
  Annullato: "bg-white/5 text-slate-500 line-through",
};

const DOT: Record<AppointmentStatus, string> = {
  Confermato: "bg-blue-400",
  "In Attesa": "bg-amber-400",
  Completato: "bg-emerald-400/70",
  Annullato: "bg-slate-600",
};

const firstOfMonth = (dateStr: string) => {
  const d = fromDateStr(dateStr);
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
};

const shiftMonth = (monthStart: string, delta: number) => {
  const d = fromDateStr(monthStart);
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + delta, 1));
};

const byTime = (a: Appointment, b: Appointment) => a.time.localeCompare(b.time);

export default function AgendaCalendar() {
  const { appointments, today } = useAdmin();
  const { openAppointment } = useEditors();

  const [month, setMonth] = useState(() => firstOfMonth(today));
  const [selected, setSelected] = useState(today);

  const monthDate = fromDateStr(month);
  const offset = (monthDate.getDay() + 6) % 7; // settimana da lunedì
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, i) => addDays(month, i - offset));

  const byDay = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const list = byDay.get(a.date);
    if (list) list.push(a);
    else byDay.set(a.date, [a]);
  }
  for (const list of byDay.values()) list.sort(byTime);

  const title = monthDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  const dayItems = byDay.get(selected) ?? [];

  function goToday() {
    setMonth(firstOfMonth(today));
    setSelected(today);
  }

  function select(d: string) {
    setSelected(d);
    // Cliccando un giorno "sbiadito" del mese vicino si passa a quel mese.
    if (firstOfMonth(d) !== month) setMonth(firstOfMonth(d));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-adm-line bg-adm-surface">
        <header className="flex items-center justify-between gap-2 border-b border-adm-line px-3 py-2.5 sm:px-4">
          <h2 className="text-base font-semibold capitalize text-white">{title}</h2>
          <div className="flex items-center gap-1">
            <button type="button" onClick={goToday} className={`${btnSecondary} !h-8 !px-3`}>
              Oggi
            </button>
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, -1))}
              className={btnIcon}
              aria-label="Mese precedente"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, 1))}
              className={btnIcon}
              aria-label="Mese successivo"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-7 border-b border-adm-line text-center text-xs font-medium text-adm-muted">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const date = fromDateStr(d);
            const inMonth = date.getMonth() === monthDate.getMonth();
            const isToday = d === today;
            const isSelected = d === selected;
            const items = byDay.get(d) ?? [];
            const open = items.filter((a) => a.status !== "Annullato").length;
            const edge = `${i % 7 !== 6 ? "border-r" : ""} ${i < cellCount - 7 ? "border-b" : ""}`;

            return (
              <button
                key={d}
                type="button"
                onClick={() => select(d)}
                aria-pressed={isSelected}
                aria-label={`${date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}: ${
                  open ? `${open} appuntament${open === 1 ? "o" : "i"}` : "libero"
                }`}
                className={`relative flex min-h-16 cursor-pointer flex-col items-stretch gap-1 border-adm-line p-1.5 text-left transition-colors sm:min-h-28 sm:p-2 ${edge} ${focusRing} ${
                  isSelected ? "bg-blue-600/15" : "hover:bg-white/[0.03]"
                } ${inMonth ? "" : "opacity-40"}`}
              >
                <span
                  className={`grid size-6 place-items-center self-start rounded-full text-sm tabular-nums ${
                    isToday
                      ? "bg-blue-600 font-semibold text-white"
                      : isSelected
                        ? "font-semibold text-white"
                        : "text-slate-300"
                  }`}
                >
                  {date.getDate()}
                </span>

                {/* Telefono: solo puntini per stato, niente testo che non ci starebbe */}
                {items.length > 0 && (
                  <span className="flex flex-wrap gap-1 sm:hidden">
                    {items.slice(0, 4).map((a) => (
                      <span key={a.id} className={`size-1.5 rounded-full ${DOT[a.status]}`} />
                    ))}
                  </span>
                )}

                <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                  {items.slice(0, MAX_CHIPS).map((a) => (
                    <span
                      key={a.id}
                      className={`truncate rounded px-1.5 py-0.5 text-[11px] leading-tight ${CHIP[a.status]}`}
                    >
                      <span className="tabular-nums">{a.time}</span> {a.clientName}
                    </span>
                  ))}
                  {items.length > MAX_CHIPS && (
                    <span className="px-1.5 text-[11px] text-adm-muted">
                      +{items.length - MAX_CHIPS} altri
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-adm-muted">
        <span className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${DOT.Confermato}`} /> Confermato
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${DOT["In Attesa"]}`} /> Da confermare
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${DOT.Completato}`} /> Completato
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${DOT.Annullato}`} /> Annullato
        </span>
      </div>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <h2 className="flex items-baseline gap-2">
            <span className="text-sm font-semibold capitalize text-white">
              {formatDayLabel(selected, today)}
            </span>
            <span className="text-sm text-adm-muted">{formatShortDate(selected)}</span>
          </h2>
          <button
            type="button"
            onClick={() => openAppointment({ prefill: { date: selected } })}
            className={btnSecondary}
          >
            <CalendarPlus className="size-4" />
            Fissa per questo giorno
          </button>
        </div>

        {dayItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-adm-line px-4 py-8 text-center text-sm text-adm-muted">
            Giornata libera: nessun appuntamento.
          </p>
        ) : (
          <div className="divide-y divide-adm-line rounded-xl border border-adm-line bg-adm-surface">
            {dayItems.map((a) => (
              <AppointmentRow key={a.id} appointment={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
