import type { Lead } from "@/types/lead";
import { detailLabel, LEAD_TYPE_LABEL } from "./constants";

/** Nome da mostrare: molti lead (Casper, commissione) hanno solo il telefono. */
export const leadDisplayName = (lead: Lead) => lead.name || lead.phone;

/** Messaggio + dettagli del form in poche righe di testo (per le note). */
export function leadSummary(lead: Lead): string {
  const parts: string[] = [];
  if (lead.message) parts.push(lead.message);
  if (lead.details) {
    parts.push(
      Object.entries(lead.details)
        .map(([k, v]) => `${detailLabel(k)}: ${v}`)
        .join(" · ")
    );
  }
  return parts.join("\n") || `Richiesta: ${LEAD_TYPE_LABEL[lead.type]}`;
}

export function leadWhatsAppText(lead: Lead): string {
  const who = lead.name ? ` ${lead.name}` : "";
  const car = lead.carLabel ? ` per ${lead.carLabel}` : "";
  return `Buongiorno${who}, sono dello staff di Global Drive: la contatto in merito alla sua richiesta${car}.`;
}
