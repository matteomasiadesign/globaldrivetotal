"use client";

import React, { useState } from "react";
import {
  CalendarPlus,
  Check,
  ChevronDown,
  MessageCircle,
  Phone,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import {
  LEAD_STATUS_LABEL,
  LEAD_TO_APPOINTMENT_TYPE,
  LEAD_TYPE_LABEL,
  detailLabel,
  isOpenAppointment,
} from "@/lib/admin/constants";
import { formatShortDate, timeAgo } from "@/lib/admin/dates";
import { leadDisplayName, leadSummary, leadWhatsAppText } from "@/lib/admin/leads";
import { telLink, waLink } from "@/lib/admin/phone";
import type { Lead, LeadStatus } from "@/types/lead";
import { useEditors } from "./AdminEditors";
import { Pill, type PillTone } from "./ui/Layout";
import RowMenu from "./ui/RowMenu";
import { btnIcon, btnSecondary } from "./ui/styles";
import { useToast } from "./ui/Toast";

const STATUS_TONE: Record<LeadStatus, PillTone> = {
  nuovo: "blue",
  in_gestione: "amber",
  completato: "green",
  scartato: "slate",
};

export default function LeadRow({
  lead,
  compact = false,
}: {
  lead: Lead;
  /** Versione per la home: senza stato e senza pannello dei dettagli. */
  compact?: boolean;
}) {
  const { now, appointments, updateLead } = useAdmin();
  const { openAppointment } = useEditors();
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);

  const closed = lead.status === "completato" || lead.status === "scartato";
  const booked = appointments.find(
    (a) => a.leadId === lead.id && isOpenAppointment(a.status)
  );

  function setStatus(next: LeadStatus, message: string) {
    const previous = lead.status;
    updateLead(lead.id, { status: next });
    toast(message, {
      label: "Annulla",
      onClick: () => updateLead(lead.id, { status: previous }),
    });
  }

  // Chiamare o scrivere a una richiesta nuova la prende in carico: un clic in meno.
  function takeCharge() {
    if (lead.status === "nuovo") setStatus("in_gestione", "Richiesta presa in gestione");
  }

  function schedule() {
    openAppointment({
      leadId: lead.id,
      prefill: {
        clientName: lead.name ?? "",
        clientPhone: lead.phone,
        clientEmail: lead.email ?? "",
        carId: lead.carId,
        carName: lead.carLabel,
        type: LEAD_TO_APPOINTMENT_TYPE[lead.type],
        notes: leadSummary(lead),
      },
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
        <button
          type="button"
          onClick={() => !compact && setExpanded((v) => !v)}
          aria-expanded={compact ? undefined : expanded}
          className={`min-w-0 flex-1 basis-52 text-left ${compact ? "cursor-default" : "cursor-pointer"}`}
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`font-medium ${closed ? "text-slate-400" : "text-white"}`}>
              {leadDisplayName(lead)}
            </span>
            <Pill>{LEAD_TYPE_LABEL[lead.type]}</Pill>
            {!compact && (
              <Pill tone={STATUS_TONE[lead.status]} dot>
                {LEAD_STATUS_LABEL[lead.status]}
              </Pill>
            )}
            {booked && (
              <Pill tone="green">
                In agenda · {formatShortDate(booked.date)} {booked.time}
              </Pill>
            )}
          </span>
          <span className="mt-0.5 block truncate text-sm text-adm-muted">
            {lead.carLabel ?? lead.message ?? "Nessun dettaglio"}
            <span className="text-slate-500"> · {timeAgo(lead.createdAt, now)}</span>
          </span>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {!closed && (
            <>
              <a
                href={telLink(lead.phone)}
                onClick={takeCharge}
                className={btnIcon}
                aria-label={`Chiama ${leadDisplayName(lead)}`}
                title="Chiama"
              >
                <Phone className="size-4" />
              </a>
              <a
                href={waLink(lead.phone, leadWhatsAppText(lead))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={takeCharge}
                className={btnIcon}
                aria-label={`Scrivi su WhatsApp a ${leadDisplayName(lead)}`}
                title="Scrivi su WhatsApp"
              >
                <MessageCircle className="size-4" />
              </a>
              <button
                type="button"
                onClick={schedule}
                className={compact ? btnIcon : btnSecondary}
                aria-label="Fissa in agenda"
                title="Fissa in agenda"
              >
                <CalendarPlus className="size-4" />
                {!compact && <span className="hidden sm:inline">Fissa in agenda</span>}
              </button>
            </>
          )}
          {lead.status === "in_gestione" && (
            <button
              type="button"
              onClick={() => setStatus("completato", "Richiesta completata")}
              className={btnIcon}
              aria-label="Segna come completata"
              title="Segna come completata"
            >
              <Check className="size-4" />
            </button>
          )}
          <RowMenu
            items={
              closed
                ? [
                    {
                      label: "Riapri",
                      icon: RotateCcw,
                      onSelect: () => setStatus("in_gestione", "Richiesta riaperta"),
                    },
                  ]
                : [
                    ...(lead.status === "nuovo"
                      ? [
                          {
                            label: "Segna come in gestione",
                            icon: Check,
                            onSelect: () => setStatus("in_gestione", "Richiesta presa in gestione"),
                          },
                        ]
                      : []),
                    {
                      label: "Segna come completata",
                      icon: Check,
                      onSelect: () => setStatus("completato", "Richiesta completata"),
                    },
                    {
                      label: "Scarta (spam o non pertinente)",
                      icon: XCircle,
                      danger: true,
                      onSelect: () => setStatus("scartato", "Richiesta scartata"),
                    },
                  ]
            }
          />
          {!compact && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={btnIcon}
              aria-label={expanded ? "Nascondi dettagli" : "Mostra dettagli"}
            >
              <ChevronDown
                className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
      </div>

      {expanded && !compact && (
        <div className="adm-fade-in space-y-3 border-t border-adm-line bg-adm-bg/50 px-4 py-4 text-sm">
          {lead.message && (
            <p className="whitespace-pre-line text-slate-200">{lead.message}</p>
          )}
          {lead.details && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {Object.entries(lead.details).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-adm-muted">{detailLabel(k)}</dt>
                  <dd className="text-white">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-adm-muted">Telefono</dt>
              <dd className="text-white">{lead.phone}</dd>
            </div>
            {lead.email && (
              <div className="min-w-0">
                <dt className="text-xs text-adm-muted">Email</dt>
                <dd className="truncate">
                  <a href={`mailto:${lead.email}`} className="text-blue-300 hover:underline">
                    {lead.email}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-adm-muted">Ricevuta</dt>
              <dd className="text-white">
                {new Date(lead.createdAt).toLocaleString("it-IT", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {lead.sourcePath && (
                  <span className="text-adm-muted"> da {lead.sourcePath}</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
