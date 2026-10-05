// I lead arrivano con il numero scritto come l'utente vuole ("340 1234567",
// "+39 340...", "0039..."). wa.me vuole solo cifre, con prefisso internazionale.
export function toWaNumber(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Cellulare italiano senza prefisso: 3xx + 6/7 cifre.
  if (/^3\d{8,9}$/.test(digits)) digits = `39${digits}`;
  return digits;
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${toWaNumber(phone)}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
