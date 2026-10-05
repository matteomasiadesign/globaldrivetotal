import type { LeadType, NewLead } from "@/types/lead";

const LEAD_TYPES: readonly LeadType[] = [
  "contatto",
  "test_drive",
  "commissione",
  "conto_vendita",
  "casper",
];

const MAX = {
  name: 120,
  phone: 30,
  email: 160,
  message: 2000,
  carId: 80,
  carLabel: 200,
  sourcePath: 200,
  detailKey: 40,
  detailValue: 300,
  detailCount: 12,
};

export type ParseResult =
  | { ok: true; data: NewLead }
  | { ok: false; error: string };

function clean(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function cleanDetails(value: unknown): Record<string, string> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value).slice(0, MAX.detailCount)) {
    const v = clean(raw, MAX.detailValue);
    if (v) out[key.slice(0, MAX.detailKey)] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function parseLeadInput(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Richiesta non valida." };
  }
  const input = body as Record<string, unknown>;

  const type = input.type;
  if (typeof type !== "string" || !LEAD_TYPES.includes(type as LeadType)) {
    return { ok: false, error: "Tipo di richiesta non valido." };
  }

  const phone = clean(input.phone, MAX.phone);
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!phone || !/^[+\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
    return { ok: false, error: "Numero di telefono non valido." };
  }

  const email = clean(input.email, MAX.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Indirizzo email non valido." };
  }

  const sourcePath = clean(input.sourcePath, MAX.sourcePath);

  return {
    ok: true,
    data: {
      type: type as LeadType,
      phone,
      name: clean(input.name, MAX.name),
      email,
      message: clean(input.message, MAX.message),
      carId: clean(input.carId, MAX.carId),
      carLabel: clean(input.carLabel, MAX.carLabel),
      details: cleanDetails(input.details),
      sourcePath: sourcePath?.startsWith("/") ? sourcePath : undefined,
    },
  };
}
