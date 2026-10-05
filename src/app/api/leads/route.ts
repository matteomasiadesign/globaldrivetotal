import { NextRequest, NextResponse } from "next/server";
import { parseLeadInput } from "@/lib/leads/validate";
import { leadRepository } from "@/lib/leads/repository";
import { allowRequest } from "@/lib/leads/rateLimit";

const MAX_BODY_CHARS = 10_000;

// Rifiuta le richieste del browser partite da un altro sito.
// (Non protegge da client non-browser: per quelli ci sono rate limit e validazione.)
function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ success: false, error: "Origine non consentita." }, { status: 403 });
  }

  if (!allowRequest(clientIp(req))) {
    return NextResponse.json(
      { success: false, error: "Troppe richieste. Riprova tra qualche minuto." },
      { status: 429 }
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) {
    return NextResponse.json({ success: false, error: "Richiesta troppo grande." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ success: false, error: "JSON non valido." }, { status: 400 });
  }

  // Honeypot: il campo "website" è invisibile agli utenti, lo riempiono solo i bot.
  // Rispondiamo "ok" senza salvare, così non capiscono di essere stati scartati.
  if (typeof body === "object" && body !== null && (body as Record<string, unknown>).website) {
    return NextResponse.json({ success: true });
  }

  const parsed = parseLeadInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }

  try {
    const lead = await leadRepository.create(parsed.data);
    return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
  } catch (error) {
    console.error("[leads] salvataggio fallito:", error);
    return NextResponse.json(
      { success: false, error: "Impossibile salvare la richiesta." },
      { status: 500 }
    );
  }
}
