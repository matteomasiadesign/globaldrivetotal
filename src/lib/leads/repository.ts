import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { Lead, NewLead } from "@/types/lead";

// Contratto di persistenza dei lead. Oggi c'è solo l'implementazione su file;
// quando arriverà il database basta scrivere un'altra implementazione di
// questa interfaccia e cambiare l'export in fondo (vedi README).
export interface LeadRepository {
  create(input: NewLead): Promise<Lead>;
}

// Un lead per riga (JSON Lines) in .data/leads.jsonl, cartella ignorata da git.
// Funziona in locale e su un server con disco scrivibile; NON su Vercel
// (filesystem di sola lettura): lì serve il database.
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

export const leadRepository: LeadRepository = new FileLeadRepository();
