// Descrizione di una tabella da esportare: la stessa definizione produce il CSV e il
// foglio Excel, così i due file hanno sempre le stesse colonne.

export type Formato = "testo" | "euro" | "numero" | "intero" | "percento" | "data" | "sino";

export type Valore = string | number | boolean | null | undefined;

export interface Colonna<T> {
  titolo: string;
  formato?: Formato;
  valore: (riga: T) => Valore;
  /** Larghezza in caratteri nel foglio Excel. */
  larghezza?: number;
  /** In fondo al foglio una riga TOTALE somma questa colonna. */
  totale?: boolean;
}

export interface Foglio<T = unknown> {
  /** Nome del foglio (al massimo 31 caratteri in Excel). */
  nome: string;
  colonne: Colonna<T>[];
  righe: T[];
  /** Righe di testo sopra la tabella (titolo, periodo, avvertenze). */
  intro?: string[];
}

/** Aiuta TypeScript a tenere legati righe e colonne dello stesso foglio. */
export const foglio = <T,>(f: Foglio<T>): Foglio => f as unknown as Foglio;
