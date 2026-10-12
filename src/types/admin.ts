export type AppointmentType =
  | "Test Drive"
  | "Trattativa / Acquisto"
  | "Consegna Vettura"
  /** Auto portata da un cliente per il conto vendita o da acquistare. */
  | "Valutazione auto"
  | "Ritiro Documenti"
  // Tipi non più proposti (Global Drive non fa permute né finanziamenti): restano
  // solo per leggere gli appuntamenti salvati prima.
  | "Perizia Permuta"
  | "Consulenza Finanziamento";

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

// "upload" = file caricato nell'archivio dei documenti (lib/storage/vehicleFiles.ts).
export type DocumentSource = "google_drive" | "generated_html" | "local_pdf" | "upload";

export interface VehicleDocument {
  id: string;
  carId: string;
  carTitle: string;
  title: string;
  category: DocumentCategory;
  source: DocumentSource;
  fileUrl?: string; // Link al file Google Drive o risorsa interna
  driveFolderUrl?: string;
  /** Percorso del file caricato nell'archivio (source = "upload"). */
  storagePath?: string;
  fileName?: string;
  fileSize?: string;
  dateAdded: string;
  notes?: string;
}
