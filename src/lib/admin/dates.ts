// Date dell'admin. Le date degli appuntamenti sono stringhe "YYYY-MM-DD" in ora
// locale: toISOString() ragiona in UTC e a cavallo della mezzanotte darebbe il
// giorno sbagliato, quindi qui si costruisce tutto dalle parti locali.

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(dateStr: string, days: number): string {
  const d = fromDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function formatDayLabel(dateStr: string, today: string): string {
  if (dateStr === today) return "Oggi";
  if (dateStr === addDays(today, 1)) return "Domani";
  if (dateStr === addDays(today, -1)) return "Ieri";
  return fromDateStr(dateStr).toLocaleDateString("it-IT", {
    weekday: "long",
  });
}

export function formatShortDate(dateStr: string): string {
  return fromDateStr(dateStr).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
}

export function formatLongDate(d: Date): string {
  return d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 13) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

export function timeAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "Adesso";
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h fa`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Ieri";
  if (days < 7) return `${days} giorni fa`;
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}
