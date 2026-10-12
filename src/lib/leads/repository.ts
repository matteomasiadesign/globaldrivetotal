import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import type { Lead, NewLead } from "@/types/lead";
import { leadToRow } from "./rows";

// Contratto di persistenza dei lead: le pagine e la route /api/leads non sanno
// dove finiscono le richieste.
export interface LeadRepository {
  create(input: NewLead): Promise<Lead>;
}

// Tabella `leads` di Supabase: è quella che legge l'admin. Si scrive SOLO da qui,
// con la service role key (nessuna policy permette al pubblico di inserire).
class SupabaseLeadRepository implements LeadRepository {
  private readonly client;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async create(input: NewLead): Promise<Lead> {
    const { data, error } = await this.client
      .from("leads")
      .insert(leadToRow(input))
      .select("id, created_at")
      .single();
    if (error) throw new Error(`Supabase: ${error.message}`);
    return { ...input, id: data.id, status: "nuovo", createdAt: data.created_at };
  }
}

// Ripiego per lo sviluppo senza chiave: un lead per riga (JSON Lines) in
// .data/leads.jsonl, cartella ignorata da git. L'admin NON li vede, e su Vercel
// (disco in sola lettura) non funziona: in produzione serve la chiave.
class FileLeadRepository implements LeadRepository {
  private readonly file =
    process.env.LEADS_FILE_PATH ?? path.join(process.cwd(), ".data", "leads.jsonl");

  async create(input: NewLead): Promise<Lead> {
    const lead: Lead = {
      ...input,
      id: randomUUID(),
      status: "nuovo",
      createdAt: new Date().toISOString(),
    };
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.appendFile(this.file, JSON.stringify(lead) + "\n", "utf8");
    return lead;
  }
}

function createRepository(): LeadRepository {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) return new SupabaseLeadRepository(url, serviceKey);
  console.warn(
    "[leads] SUPABASE_SERVICE_ROLE_KEY mancante: le richieste finiscono in .data/leads.jsonl e l'admin non le vede."
  );
  return new FileLeadRepository();
}

export const leadRepository: LeadRepository = createRepository();
