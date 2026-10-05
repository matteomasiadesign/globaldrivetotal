// Richieste dei clienti raccolte dal sito (form + Casper).
// Specchio della tabella `leads` descritta nel README.

export type LeadType =
  | "contatto"
  | "test_drive"
  | "commissione"
  | "conto_vendita"
  | "casper";

export type LeadStatus = "nuovo" | "in_gestione" | "completato" | "scartato";

export interface Lead {
  id: string;
  type: LeadType;
  status: LeadStatus;
  phone: string;
  name?: string;
  email?: string;
  message?: string;
  carId?: string;
  carLabel?: string;
  // Campi specifici del form (budget, anno minimo, km...), tutti stringhe.
  details?: Record<string, string>;
  // Pagina da cui è partita la richiesta (es. "/catalogo").
  sourcePath?: string;
  createdAt: string; // ISO 8601
}

// Quello che il client può inviare: id, stato e data li assegna il server.
export type NewLead = Omit<Lead, "id" | "status" | "createdAt">;
