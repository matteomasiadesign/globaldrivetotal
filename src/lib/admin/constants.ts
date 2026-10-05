import type {
  AppointmentStatus,
  AppointmentType,
  DocumentCategory,
} from "@/types/admin";
import type { LeadStatus, LeadType } from "@/types/lead";

export const APPOINTMENT_TYPES: AppointmentType[] = [
  "Test Drive",
  "Trattativa / Acquisto",
  "Consegna Vettura",
  "Perizia Permuta",
  "Consulenza Finanziamento",
  "Ritiro Documenti",
];

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "In Attesa",
  "Confermato",
  "Completato",
  "Annullato",
];

// Un appuntamento è "aperto" finché non è stato completato o annullato.
export const isOpenAppointment = (s: AppointmentStatus) =>
  s === "Confermato" || s === "In Attesa";

// Documenti che ogni vettura dovrebbe avere nel dossier prima della vendita.
export const REQUIRED_DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "Libretto / DUC",
  "Certificato Proprietà",
  "Tagliandi & Manutenzione",
  "Perizia 110 Punti",
  "Garanzia & Assicurazione",
];

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  ...REQUIRED_DOCUMENT_CATEGORIES,
  "Contratto di Vendita",
  "Altro",
];

export const LEAD_TYPE_LABEL: Record<LeadType, string> = {
  test_drive: "Test drive",
  contatto: "Contatto",
  commissione: "Auto su commissione",
  conto_vendita: "Conto vendita",
  casper: "Chat Casper",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  nuovo: "Nuova",
  in_gestione: "In gestione",
  completato: "Completata",
  scartato: "Scartata",
};

// Tipo di appuntamento più naturale per ciascun tipo di richiesta.
export const LEAD_TO_APPOINTMENT_TYPE: Record<LeadType, AppointmentType> = {
  test_drive: "Test Drive",
  contatto: "Trattativa / Acquisto",
  commissione: "Trattativa / Acquisto",
  conto_vendita: "Perizia Permuta",
  casper: "Trattativa / Acquisto",
};

const DETAIL_LABELS: Record<string, string> = {
  budget: "Budget",
  annoMinimo: "Anno minimo",
  anno: "Anno",
  km: "Chilometri",
  prezzoDesiderato: "Prezzo desiderato",
};

// I dettagli dei lead hanno chiavi camelCase scelte dai form: se non sono nella
// mappa le rende leggibili ("fooBar" → "Foo bar").
export function detailLabel(key: string): string {
  if (DETAIL_LABELS[key]) return DETAIL_LABELS[key];
  const spaced = key.replace(/([A-Z])/g, " $1").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const eur = (n: number) =>
  `€ ${new Intl.NumberFormat("it-IT").format(n)}`;
