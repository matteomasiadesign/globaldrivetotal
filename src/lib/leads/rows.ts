import type { Lead, LeadStatus, LeadType, NewLead } from "@/types/lead";

// Conversione tra il tipo Lead del codice e la riga della tabella `leads` di Supabase
// (supabase/schema.sql). Il server la usa per scrivere, l'admin per leggere.
//
// Le auto del catalogo oggi hanno id del browser ("car-…"), non uuid: la colonna car_id
// (chiave esterna verso cars) resta vuota e l'id originale viaggia in details._carId.
// Quando il catalogo sarà su Supabase gli id saranno uuid e finiranno in car_id.

export interface LeadRow {
  id: string;
  type: LeadType;
  status: LeadStatus;
  phone: string;
  name: string | null;
  email: string | null;
  message: string | null;
  car_id: string | null;
  car_label: string | null;
  details: Record<string, string> | null;
  source_path: string | null;
  created_at: string;
}

export const LEAD_COLUMNS =
  "id, type, status, phone, name, email, message, car_id, car_label, details, source_path, created_at";

const CAR_ID_KEY = "_carId";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function leadToRow(input: NewLead) {
  const details: Record<string, string> = { ...(input.details ?? {}) };
  const carUuid = input.carId && UUID.test(input.carId) ? input.carId : null;
  if (input.carId && !carUuid) details[CAR_ID_KEY] = input.carId;
  return {
    type: input.type,
    phone: input.phone,
    name: input.name ?? null,
    email: input.email ?? null,
    message: input.message ?? null,
    car_id: carUuid,
    car_label: input.carLabel ?? null,
    details: Object.keys(details).length > 0 ? details : null,
    source_path: input.sourcePath ?? null,
  };
}

export function leadFromRow(row: LeadRow): Lead {
  const { [CAR_ID_KEY]: carIdLocale, ...details } = row.details ?? {};
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    phone: row.phone,
    name: row.name ?? undefined,
    email: row.email ?? undefined,
    message: row.message ?? undefined,
    carId: row.car_id ?? carIdLocale ?? undefined,
    carLabel: row.car_label ?? undefined,
    details: Object.keys(details).length > 0 ? details : undefined,
    sourcePath: row.source_path ?? undefined,
    createdAt: row.created_at,
  };
}
