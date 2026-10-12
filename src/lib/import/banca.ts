// Abbinamento automatico tra le righe dell'estratto conto e i movimenti registrati:
// stesso importo (al centesimo), stesso segno, date vicine. Ogni movimento si abbina
// a una sola riga; vince l'abbinamento con il punteggio più alto.

import type { NuovoMovimento } from "@/lib/gestionale/defaults";
import type { Movimento, Pagamento } from "@/lib/gestionale/types";
import { normTesto } from "./normalizza";
import type { RigaEstratto } from "./schemi";

export interface Candidato {
  movimento: Movimento;
  punteggio: number;
  giorni: number;
}

const giorniTra = (a: string, b: string) =>
  Math.abs(Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000));

export function candidati(r: RigaEstratto, movimenti: Movimento[], tolleranzaGiorni: number): Candidato[] {
  const tipo = r.importo > 0 ? "Entrata" : "Uscita";
  const importo = Math.abs(r.importo);
  const descr = ` ${normTesto(r.descrizione)} `;
  return movimenti
    .filter((m) => !m.riconciliato && m.tipo === tipo && m.pagamento !== "CASH" && Math.abs(m.totale - importo) < 0.01)
    .map((m) => {
      const giorni = Math.min(...[m.dataSaldo, m.dataScadenza, m.data].filter(Boolean).map((d) => giorniTra(d, r.data)));
      let punteggio = 100 - 10 * giorni;
      const doc = normTesto(m.numeroDocumento);
      const nome = normTesto(m.fornitoreCliente);
      if ((doc.length >= 3 && descr.includes(` ${doc} `)) || (nome.length >= 4 && descr.includes(nome))) punteggio += 20;
      return { movimento: m, punteggio, giorni };
    })
    .filter((c) => c.giorni <= tolleranzaGiorni)
    .sort((a, b) => b.punteggio - a.punteggio);
}

/** Per ogni riga (per indice) l'id del movimento proposto, o null. */
export function abbinaEstratto(righe: RigaEstratto[], movimenti: Movimento[], tolleranzaGiorni: number): (string | null)[] {
  const coppie: { riga: number; id: string; punteggio: number }[] = [];
  righe.forEach((r, i) =>
    candidati(r, movimenti, tolleranzaGiorni).forEach((c) => coppie.push({ riga: i, id: c.movimento.id, punteggio: c.punteggio }))
  );
  coppie.sort((a, b) => b.punteggio - a.punteggio);
  const scelta: (string | null)[] = righe.map(() => null);
  const usati = new Set<string>();
  coppie.forEach(({ riga, id }) => {
    if (scelta[riga] || usati.has(id)) return;
    scelta[riga] = id;
    usati.add(id);
  });
  return scelta;
}

/** Movimento da creare per una riga dell'estratto senza corrispondenza. */
export function movimentoDaEstratto(r: RigaEstratto, pagamentiBanca: Pagamento[]): NuovoMovimento {
  const d = normTesto(r.descrizione);
  const banca = /(commission|canone|spese|imposta di bollo|bollo|competenze|interessi|tenuta conto)/.test(d);
  const entrata = r.importo > 0;
  return {
    data: r.data,
    tipo: entrata ? "Entrata" : "Uscita",
    descrizione: r.descrizione.slice(0, 200),
    categoria: banca ? "Banca / Commissioni" : entrata ? "Altre entrate" : "Altro",
    naturaCosto: banca ? "Fisso" : "Variabile generale",
    pagamento: /bonific/.test(d) ? "Bonifico" : /(pos|carta)/.test(d) && pagamentiBanca.includes("Carta") ? "Carta" : "CONTO",
    imponibile: Math.abs(r.importo),
    iva: 0,
    statoPagamento: "Saldato",
    dataSaldo: r.data,
    riferimentoEstratto: r.riferimento,
  };
}
