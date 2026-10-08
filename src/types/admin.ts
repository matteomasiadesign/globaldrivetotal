export type AppointmentType =
  | "Test Drive"
  | "Trattativa / Acquisto"
  | "Consegna Vettura"
  | "Perizia Permuta"
  | "Consulenza Finanziamento"
  | "Ritiro Documenti";

export type AppointmentStatus =
  | "Confermato"
  | "In Attesa"
  | "Completato"
  | "Annullato";

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number;
  type: AppointmentType;
  carId?: string;
  carName?: string;
  location: string;
  status: AppointmentStatus;
  notes?: string;
  // Richiesta da cui nasce l'appuntamento ("Fissa in agenda" dai lead).
  leadId?: string;
  createdAt: string;
}

export type DocumentCategory =
  | "Contratto di Vendita"
  | "Libretto / DUC"
  | "Certificato Proprietà"
  | "Tagliandi & Manutenzione"
  | "Perizia 110 Punti"
  | "Garanzia & Assicurazione"
  | "Altro";

export type DocumentSource = "google_drive" | "generated_html" | "local_pdf";

export interface VehicleDocument {
  id: string;
  carId: string;
  carTitle: string;
  title: string;
  category: DocumentCategory;
  source: DocumentSource;
  fileUrl?: string; // Link al file Google Drive o risorsa interna
  driveFolderUrl?: string;
  fileSize?: string;
  dateAdded: string;
  notes?: string;
}
