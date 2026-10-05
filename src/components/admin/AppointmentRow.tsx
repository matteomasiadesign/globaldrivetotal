"use client";

import React from "react";
import {
  Check,
  MessageCircle,
  Pencil,
  Phone,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { isOpenAppointment } from "@/lib/admin/constants";
import { formatShortDate, fromDateStr } from "@/lib/admin/dates";
import { telLink, waLink } from "@/lib/admin/phone";
import type { Appointment, AppointmentStatus } from "@/types/admin";
import { useEditors } from "./AdminEditors";
import { Pill } from "./ui/Layout";
import RowMenu from "./ui/RowMenu";
import { btnIcon, btnPrimary, btnSecondary } from "./ui/styles";
import { useToast } from "./ui/Toast";

function reminderText(a: Appointment) {
  const when = fromDateStr(a.date).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `Buongiorno ${a.clientName}, le confermiamo l'appuntamento (${a.type}) da Global Drive, ${a.location}, ${when} alle ${a.time}.${
    a.carName ? ` Vettura: ${a.carName}.` : ""
  } A presto!`;
}

export default function AppointmentRow({
  appointment: a,
  compact = false,
  showDate = false,
}: {
  appointment: Appointment;
  /** Versione per la home: senza contatti e note. */
  compact?: boolean;
  /** Mostra la data accanto all'ora (nello storico, dove non ci sono intestazioni di giorno). */
  showDate?: boolean;
}) {
  const { today, updateAppointment, deleteAppointment } = useAdmin();
  const { openAppointment } = useEditors();
  const toast = useToast();

  const open = isOpenAppointment(a.status);
  const overdue = open && a.date < today;

  function setStatus(next: AppointmentStatus, message: string) {
    const previous = a.status;
    updateAppointment(a.id, { status: next });
    toast(message, {
      label: "Annulla",
      onClick: () => updateAppointment(a.id, { status: previous }),
    });
  }

  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-3 px-4 py-3.5">
      <div className="w-14 shrink-0 text-center">
        <p
          className={`text-lg font-semibold tabular-nums ${open ? "text-white" : "text-adm-muted"}`}
        >
          {a.time}
        </p>
        <p className="text-xs text-adm-muted">
          {showDate ? formatShortDate(a.date) : `${a.durationMinutes} min`}
        </p>
      </div>

      <div className="min-w-0 flex-1 basis-52">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={`font-medium ${open ? "text-white" : "text-slate-400"}`}>
            {a.clientName}
          </p>
          <Pill>{a.type}</Pill>
          {a.status === "In Attesa" && !overdue && (
            <Pill tone="amber" dot>
              Da confermare
            </Pill>
          )}
          {a.status === "Completato" && <Pill tone="green">Completato</Pill>}
          {a.status === "Annullato" && <Pill tone="red">Annullato</Pill>}
          {overdue && <Pill tone="amber">Da chiudere</Pill>}
        </div>
        <p className="mt-0.5 truncate text-sm text-adm-muted">
          {a.carName ? `${a.carName} · ` : ""}
          {a.location}
        </p>
        {!compact && (
          <div className="mt-1 space-y-0.5 text-sm">
            <a
              href={telLink(a.clientPhone)}
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white"
            >
              <Phone className="size-3.5 text-adm-muted" />
              {a.clientPhone}
            </a>
            {a.notes && <p className="text-adm-muted">{a.notes}</p>}
          </div>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {a.status === "In Attesa" && !overdue && (
          <button
            type="button"
            onClick={() => setStatus("Confermato", `Appuntamento con ${a.clientName} confermato`)}
            className={btnPrimary}
          >
            <Check className="size-4" />
            Conferma
          </button>
        )}
        {(a.status === "Confermato" || overdue) && (
          <button
            type="button"
            onClick={() => setStatus("Completato", `Appuntamento con ${a.clientName} completato`)}
            className={overdue ? btnPrimary : btnSecondary}
          >
            <Check className="size-4" />
            Completato
          </button>
        )}
        {open && (
          <a
            href={waLink(a.clientPhone, reminderText(a))}
            target="_blank"
            rel="noopener noreferrer"
            className={btnIcon}
            aria-label="Invia promemoria su WhatsApp"
            title="Invia promemoria su WhatsApp"
          >
            <MessageCircle className="size-4" />
          </a>
        )}
        <RowMenu
          items={[
            {
              label: "Modifica o sposta",
              icon: Pencil,
              onSelect: () => openAppointment({ appointment: a }),
            },
            open
              ? {
                  label: "Segna come annullato",
                  icon: XCircle,
                  onSelect: () =>
                    setStatus("Annullato", `Appuntamento con ${a.clientName} annullato`),
                }
              : {
                  label: "Riapri",
                  icon: RotateCcw,
                  onSelect: () =>
                    setStatus("Confermato", `Appuntamento con ${a.clientName} riaperto`),
                },
            {
              label: "Elimina",
              icon: Trash2,
              danger: true,
              confirm: "Conferma eliminazione",
              onSelect: () => deleteAppointment(a.id),
            },
          ]}
        />
      </div>
    </div>
  );
}
