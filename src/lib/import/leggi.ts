// Lettura di un file Excel (.xlsx, .xls, .ods) o CSV in una griglia di celle.
// SheetJS si carica solo qui, quando si sceglie un file.

export const ACCEPT_FOGLI = ".xlsx,.xls,.ods,.csv,.txt";
export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_RIGHE = 5000;

export type Griglia = unknown[][];

export interface FileLetto {
  nome: string;
  fogli: string[];
  griglia: (foglio: string) => Griglia;
}

/** I CSV delle banche sono spesso in windows-1252: se l'UTF-8 non regge si ripiega su quello. */
function decodifica(buf: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

export async function leggiFile(file: File): Promise<FileLetto> {
  if (file.size > MAX_BYTES) throw new Error("Il file supera i 5 MB: dividilo in più parti.");
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const testo = /\.(csv|txt)$/i.test(file.name);
  // raw: i CSV restano testo, così "1.234,56" lo interpretiamo noi e non diventa 1.234.
  const wb = testo
    ? XLSX.read(decodifica(buf), { type: "string", raw: true })
    : XLSX.read(buf, { type: "array", cellDates: false });
  return {
    nome: file.name,
    fogli: wb.SheetNames,
    griglia: (foglio) => {
      const ws = wb.Sheets[foglio];
      if (!ws) return [];
      const righe = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "", blankrows: false });
      return righe.slice(0, MAX_RIGHE + 30);
    },
  };
}
