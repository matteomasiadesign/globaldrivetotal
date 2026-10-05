import type { NewLead } from "@/types/lead";

// Da usare solo nei componenti client. Non lancia mai: ritorna true se il lead
// è stato salvato, false altrimenti (rete assente, errore server, rate limit).
// Passando il <form> viene letto anche il campo honeypot (vedi <Honeypot />).
export async function submitLead(
  lead: Omit<NewLead, "sourcePath">,
  form?: HTMLFormElement
): Promise<boolean> {
  const website = form
    ? (new FormData(form).get("website") as string | null) ?? ""
    : "";

  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...lead,
        sourcePath: window.location.pathname,
        website,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
