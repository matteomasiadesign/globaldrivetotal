// Cosa si può importare e come si legge ogni colonna. I record prodotti sono quelli
// che le azioni del GestionaleContext già accettano (NuovoMovimento, NuovoContatto…).

import { CATEGORIE_VEICOLO as CATEGORIE_RENT, STATI_VEICOLO_RENT as STATI_RENT } from "@/lib/gestionale/rent";
import {
  ALIMENTAZIONI,
  CATEGORIE_MOVIMENTO,
  NATURE_COSTO,
  SERVIZI,
  STATI,
  TIPI_CONTATTO,
  type Contatto,
  type NaturaCosto,
  type Pagamento,
  type Servizio,
  type Stato,
  type TipoContatto,
} from "@/lib/gestionale/types";
import type { NuovoContatto, NuovoMovimento, NuovoVeicolo } from "@/lib/gestionale/defaults";
import type { CategoriaVeicolo, RentVeicolo, StatoVeicoloRent } from "@/lib/gestionale/rent";
import type { ContestoImport, Esito, Schema } from "./mappatura";
import {
  normTarga,
  normTelefono,
  normTesto,
  parseBool,
  parseData,
  parseImporto,
  parsePercento,
  somiglianza,
} from "./normalizza";

const testo = (v: unknown) => String(v ?? "").trim();
const presente = (v: unknown) => testo(v) !== "";
const eur = (n: number | null | undefined) => (Number(n) || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

/** Il valore di un elenco chiuso più simile a quello scritto (null se nessuno è abbastanza vicino). */
function scegli<T extends string>(v: unknown, opzioni: readonly T[], alias: Record<string, T> = {}): T | null {
  const s = normTesto(v);
  if (!s) return null;
  if (alias[s]) return alias[s];
  const aliasParziale = Object.keys(alias).find((k) => s.includes(k));
  if (aliasParziale) return alias[aliasParziale];
  let best: T | null = null;
  let max = 0;
  opzioni.forEach((o) => {
    const n = normTesto(o);
    const p = n === s ? 1 : n.includes(s) || s.includes(n) ? 0.85 : somiglianza(n, s);
    if (p > max) {
      max = p;
      best = o;
    }
  });
  return max >= 0.75 ? best : null;
}

function contattoPerNome(nome: string, ctx: ContestoImport): Contatto | undefined {
  const n = normTesto(nome);
  return n ? ctx.contatti.find((c) => normTesto(c.nome) === n) : undefined;
}

const PAGAMENTO_ALIAS: Record<string, Pagamento> = {
  bonifico: "Bonifico",
  sepa: "Bonifico",
  contanti: "CASH",
  contante: "CASH",
  cassa: "CASH",
  cash: "CASH",
  carta: "Carta",
  pos: "Carta",
  bancomat: "Carta",
  credito: "Carta",
  conto: "CONTO",
  banca: "CONTO",
  rid: "CONTO",
  sdd: "CONTO",
  addebito: "CONTO",
  assegno: "Altro",
};

// --- Movimenti ----------------------------------------------------------------

export const schemaMovimenti: Schema<NuovoMovimento> = {
  entita: "movimenti",
  nome: "movimenti",
  riassunto: (m) => [m.data?.split("-").reverse().join("/"), m.tipo, eur((m.imponibile ?? 0) + (m.iva ?? 0)), m.descrizione || m.categoria, m.fornitoreCliente].filter(Boolean).join(" · "),
  campi: [
    { id: "data", etichetta: "Data", obbligatorio: true, esempio: "15/03/2026", sinonimi: ["data", "data operazione", "data registrazione", "data documento", "data contabile", "giorno"] },
    { id: "descrizione", etichetta: "Descrizione", esempio: "Tagliando e filtri", sinonimi: ["descrizione", "causale", "dettaglio", "oggetto", "voce", "descrizione operazione"] },
    { id: "tipo", etichetta: "Tipo (Entrata/Uscita)", esempio: "Uscita", sinonimi: ["tipo", "entrata uscita", "e u", "segno", "tipo movimento"] },
    { id: "importo", etichetta: "Importo / Totale", esempio: "610,00", sinonimi: ["importo", "totale", "ammontare", "valore", "importo totale", "totale documento", "euro"] },
    { id: "entrate", etichetta: "Entrate", sinonimi: ["entrate", "avere", "accrediti", "incassi", "entrata"] },
    { id: "uscite", etichetta: "Uscite", sinonimi: ["uscite", "dare", "addebiti", "spese", "uscita", "pagamenti"] },
    { id: "imponibile", etichetta: "Imponibile", esempio: "500,00", sinonimi: ["imponibile", "netto", "base imponibile", "importo netto"] },
    { id: "iva", etichetta: "IVA (€)", esempio: "110,00", sinonimi: ["iva", "imposta", "importo iva"] },
    { id: "aliquota", etichetta: "Aliquota IVA", sinonimi: ["aliquota", "iva %", "perc iva", "aliquota iva"] },
    { id: "categoria", etichetta: "Categoria", esempio: "Meccanica / Tagliando", sinonimi: ["categoria", "tipologia", "conto", "voce di spesa"] },
    { id: "natura", etichetta: "Natura del costo", sinonimi: ["natura", "natura costo", "tipo costo"] },
    { id: "pagamento", etichetta: "Pagamento", esempio: "Bonifico", sinonimi: ["pagamento", "metodo", "metodo pagamento", "modalita", "modalita pagamento", "mezzo"] },
    { id: "controparte", etichetta: "Fornitore / cliente", esempio: "Officina Rossi", sinonimi: ["fornitore", "cliente", "controparte", "beneficiario", "ordinante", "ragione sociale", "fornitore cliente", "intestatario"] },
    { id: "numeroDocumento", etichetta: "N. documento", esempio: "112/2026", sinonimi: ["n documento", "numero documento", "n fattura", "numero fattura", "fattura", "protocollo", "rif", "riferimento", "documento"] },
    { id: "targa", etichetta: "Targa auto", sinonimi: ["targa", "auto", "veicolo"] },
    { id: "stato", etichetta: "Stato pagamento", sinonimi: ["stato", "stato pagamento", "pagato", "saldato"] },
    { id: "scadenza", etichetta: "Scadenza", sinonimi: ["scadenza", "data scadenza", "entro il"] },
    { id: "detraibile", etichetta: "IVA detraibile (sì/no)", sinonimi: ["detraibile", "iva detraibile"] },
  ],
  gruppiRichiesti: [
    { campi: ["importo", "entrate", "uscite", "imponibile"], messaggio: "Serve almeno una colonna con l'importo (Importo, Entrate/Uscite o Imponibile)" },
  ],
  costruisci(v, ctx): Esito<NuovoMovimento> {
    const errori: string[] = [];
    const avvisi: string[] = [];
    const data = parseData(v.data);
    if (!data) errori.push(presente(v.data) ? `Data non valida: «${testo(v.data)}»` : "Data mancante");

    // Tipo: dalla colonna, poi da Entrate/Uscite, poi dal segno dell'importo.
    const entrate = parseImporto(v.entrate);
    const uscite = parseImporto(v.uscite);
    const importo = parseImporto(v.importo);
    let tipo: "Entrata" | "Uscita" | null = null;
    const t = normTesto(v.tipo);
    if (t) {
      if (/^(e|entrat|avere|incass|ricav|\+)/.test(t)) tipo = "Entrata";
      else if (/^(u|uscit|dare|spes|cost|pagam|\-)/.test(t)) tipo = "Uscita";
    }
    if (!tipo && entrate) tipo = "Entrata";
    if (!tipo && uscite) tipo = "Uscita";
    if (!tipo && importo !== null) tipo = importo < 0 ? "Uscita" : "Entrata";
    if (!tipo) {
      tipo = "Uscita";
      avvisi.push("Tipo non indicato: considerato Uscita");
    }

    // Importi: imponibile + IVA, oppure un totale da cui si scorpora l'aliquota (se c'è).
    const aliquota = parsePercento(v.aliquota);
    let imponibile = parseImporto(v.imponibile);
    let iva = parseImporto(v.iva);
    const totaleLordo = Math.abs(importo ?? entrate ?? uscite ?? 0);
    if (imponibile !== null) {
      imponibile = Math.abs(imponibile);
      if (iva === null) iva = aliquota !== null ? Math.round(imponibile * aliquota * 100) / 100 : 0;
    } else if (totaleLordo) {
      if (iva !== null) imponibile = Math.round((totaleLordo - Math.abs(iva)) * 100) / 100;
      else if (aliquota !== null) {
        imponibile = Math.round((totaleLordo / (1 + aliquota)) * 100) / 100;
        iva = Math.round((totaleLordo - imponibile) * 100) / 100;
      } else imponibile = totaleLordo;
    }
    iva = Math.abs(iva ?? 0);
    if (!imponibile && !iva) errori.push("Importo mancante o zero");

    const categoriaScritta = testo(v.categoria);
    let categoria = categoriaScritta ? scegli(categoriaScritta, CATEGORIE_MOVIMENTO) : null;
    if (categoriaScritta && !categoria) avvisi.push(`Categoria «${categoriaScritta}» non riconosciuta: messa in «Altro»`);
    if (!categoria) categoria = tipo === "Entrata" ? "Altre entrate" : "Altro";

    let autoId: string | null = null;
    if (presente(v.targa)) {
      const targa = normTarga(v.targa);
      autoId = ctx.veicoli.find((x) => targa && normTarga(x.targa) === targa)?.id ?? null;
      if (!autoId) avvisi.push(`Nessuna auto con targa «${testo(v.targa)}»: movimento generale`);
    }

    const naturaScritta = scegli(v.natura, NATURE_COSTO, {
      fisso: "Fisso",
      fissi: "Fisso",
      diretto: "Variabile diretto auto",
      auto: "Variabile diretto auto",
      generale: "Variabile generale",
    });
    const natura: NaturaCosto = naturaScritta ?? (autoId ? "Variabile diretto auto" : "Variabile generale");

    const controparte = testo(v.controparte);
    const contatto = controparte ? contattoPerNome(controparte, ctx) : undefined;

    const st = normTesto(v.stato);
    const daSaldare = st ? /(da saldare|aperto|non pagat|insolut|da pagare|da incassare|^no$)/.test(st) : false;
    const scadenza = parseData(v.scadenza);
    if (daSaldare && !scadenza) avvisi.push("Da saldare senza scadenza: non comparirà negli scaduti");

    const detraibile = parseBool(v.detraibile);
    return {
      errori,
      avvisi,
      record: errori.length
        ? null
        : {
            data: data as string,
            tipo,
            descrizione: testo(v.descrizione),
            fornitoreCliente: contatto?.nome ?? controparte,
            contattoId: contatto?.id ?? null,
            categoria,
            naturaCosto: natura,
            pagamento: scegli(v.pagamento, ["CONTO", "CASH", "Carta", "Bonifico", "Altro"] as Pagamento[], PAGAMENTO_ALIAS) ?? "CONTO",
            imponibile: imponibile ?? 0,
            iva,
            // Senza indicazione, l'IVA di un costo si considera detraibile (si corregge dal movimento).
            ivaDetraibile: tipo === "Uscita" && iva > 0 && detraibile !== false,
            numeroDocumento: testo(v.numeroDocumento),
            autoId,
            statoPagamento: daSaldare ? "Da saldare" : "Saldato",
            dataScadenza: daSaldare ? (scadenza ?? "") : "",
            dataSaldo: daSaldare ? "" : (data as string),
          },
    };
  },
  doppione(m, ctx, chiavi) {
    const totale = (m.imponibile ?? 0) + (m.iva ?? 0);
    const descr = normTesto(m.descrizione).slice(0, 24);
    const chiave = `${m.data}|${m.tipo}|${totale.toFixed(2)}|${descr}|${m.numeroDocumento ?? ""}`;
    if (chiavi.has(chiave)) return { motivo: "Ripetuto nel file" };
    chiavi.add(chiave);
    const esistente = ctx.movimenti.find(
      (x) =>
        x.data === m.data &&
        x.tipo === m.tipo &&
        Math.abs(x.totale - totale) < 0.01 &&
        ((m.numeroDocumento && x.numeroDocumento === m.numeroDocumento) || normTesto(x.descrizione).slice(0, 24) === descr)
    );
    return esistente ? { motivo: "Già registrato (stessa data, importo e descrizione)", idEsistente: esistente.id } : null;
  },
};

// --- Contatti -----------------------------------------------------------------

export const schemaContatti: Schema<NuovoContatto> = {
  entita: "contatti",
  nome: "contatti",
  riassunto: (c) => [c.nome, c.tipo, c.telefono, c.email].filter(Boolean).join(" · "),
  aggiornabile: true,
  campi: [
    { id: "nome", etichetta: "Nome o ragione sociale", obbligatorio: true, esempio: "Mario Rossi", sinonimi: ["nome", "nominativo", "nome e cognome", "ragione sociale", "cliente", "fornitore", "denominazione", "intestatario"] },
    { id: "cognome", etichetta: "Cognome", sinonimi: ["cognome"] },
    { id: "tipo", etichetta: "Tipo (Cliente/Fornitore/Entrambi)", esempio: "Cliente", sinonimi: ["tipo", "categoria", "ruolo"] },
    { id: "telefono", etichetta: "Telefono", esempio: "333 1234567", sinonimi: ["telefono", "tel", "cellulare", "cell", "mobile", "numero telefono", "recapito"] },
    { id: "email", etichetta: "Email", esempio: "mario@esempio.it", sinonimi: ["email", "e mail", "mail", "posta elettronica"] },
    { id: "codiceFiscale", etichetta: "Codice fiscale / P.IVA", sinonimi: ["codice fiscale", "cf", "c f", "partita iva", "p iva", "piva", "cf piva", "codice fiscale partita iva"] },
    { id: "residenza", etichetta: "Indirizzo / residenza", sinonimi: ["residenza", "indirizzo", "via", "sede", "domicilio", "indirizzo completo"] },
    { id: "citta", etichetta: "Città", sinonimi: ["citta", "comune", "localita"] },
    { id: "nascitaSede", etichetta: "Luogo e data di nascita", sinonimi: ["luogo e data di nascita", "nascita", "nato a", "luogo nascita"] },
    { id: "numeroPatente", etichetta: "N. patente", sinonimi: ["patente", "n patente", "numero patente"] },
    { id: "scadenzaPatente", etichetta: "Scadenza patente", sinonimi: ["scadenza patente"] },
    { id: "numeroDocumento", etichetta: "N. documento d'identità", sinonimi: ["documento", "n documento", "carta identita", "numero documento"] },
    { id: "note", etichetta: "Note", sinonimi: ["note", "annotazioni", "commenti"] },
  ],
  costruisci(v): Esito<NuovoContatto> {
    const errori: string[] = [];
    const avvisi: string[] = [];
    const nome = [testo(v.nome), testo(v.cognome)].filter(Boolean).join(" ");
    if (!nome) errori.push("Nome mancante");
    const email = testo(v.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) avvisi.push(`Email non valida: «${email}»`);
    const tipo: TipoContatto = scegli(v.tipo, TIPI_CONTATTO, { fornit: "Fornitore", client: "Cliente", entramb: "Entrambi" }) ?? "Cliente";
    const scadenzaPatente = parseData(v.scadenzaPatente);
    if (presente(v.scadenzaPatente) && !scadenzaPatente) avvisi.push("Scadenza patente non valida: ignorata");
    return {
      errori,
      avvisi,
      record: errori.length
        ? null
        : {
            nome,
            tipo,
            telefono: testo(v.telefono),
            email: /@/.test(email) ? email : "",
            codiceFiscale: testo(v.codiceFiscale).toUpperCase(),
            residenza: [testo(v.residenza), testo(v.citta)].filter(Boolean).join(", "),
            nascitaSede: testo(v.nascitaSede),
            numeroPatente: testo(v.numeroPatente),
            scadenzaPatente: scadenzaPatente ?? "",
            numeroDocumento: testo(v.numeroDocumento),
            note: testo(v.note),
          },
    };
  },
  doppione(c, ctx, chiavi) {
    const cf = normTesto(c.codiceFiscale).replace(/ /g, "");
    const email = (c.email ?? "").toLowerCase();
    const tel = normTelefono(c.telefono);
    const chiaviRiga = [cf && `cf:${cf}`, email && `em:${email}`, tel.length >= 6 && `tel:${tel}`].filter(Boolean) as string[];
    if (chiaviRiga.some((k) => chiavi.has(k))) return { motivo: "Ripetuto nel file" };
    chiaviRiga.forEach((k) => chiavi.add(k));
    const trovato =
      (cf && ctx.contatti.find((x) => normTesto(x.codiceFiscale).replace(/ /g, "") === cf)) ||
      (email && ctx.contatti.find((x) => x.email.toLowerCase() === email)) ||
      (tel.length >= 6 && ctx.contatti.find((x) => normTelefono(x.telefono) === tel)) ||
      undefined;
    if (trovato) return { motivo: `Già in anagrafica: ${trovato.nome}`, idEsistente: trovato.id };
    return null;
  },
};

// --- Parco auto (schede economiche) -------------------------------------------

export const schemaVeicoli: Schema<NuovoVeicolo> = {
  entita: "veicoli",
  nome: "auto",
  riassunto: (v) => [[v.marca, v.modello].join(" "), v.targa, v.stato, v.prezzoAcquisto ? `acquisto ${eur(v.prezzoAcquisto)}` : ""].filter(Boolean).join(" · "),
  campi: [
    { id: "marca", etichetta: "Marca", obbligatorio: true, esempio: "Fiat", sinonimi: ["marca", "produttore", "casa"] },
    { id: "modello", etichetta: "Modello", obbligatorio: true, esempio: "Panda", sinonimi: ["modello"] },
    { id: "versione", etichetta: "Versione", sinonimi: ["versione", "allestimento"] },
    { id: "targa", etichetta: "Targa", esempio: "AB123CD", sinonimi: ["targa"] },
    { id: "km", etichetta: "Km", sinonimi: ["km", "chilometri", "chilometraggio", "percorrenza", "kilometri"] },
    { id: "alimentazione", etichetta: "Alimentazione", sinonimi: ["alimentazione", "carburante", "motore"] },
    { id: "servizio", etichetta: "Servizio", sinonimi: ["servizio", "tipo vendita", "modalita"] },
    { id: "stato", etichetta: "Stato", sinonimi: ["stato"] },
    { id: "dataAcquisto", etichetta: "Data acquisto", sinonimi: ["data acquisto", "acquistata il", "data carico", "data entrata"] },
    { id: "prezzoAcquisto", etichetta: "Prezzo acquisto", esempio: "5000", sinonimi: ["prezzo acquisto", "costo acquisto", "acquisto", "costo"] },
    { id: "dataVendita", etichetta: "Data vendita", sinonimi: ["data vendita", "venduta il", "data uscita"] },
    { id: "prezzoVendita", etichetta: "Prezzo vendita", sinonimi: ["prezzo vendita", "vendita", "incasso", "prezzo"] },
    { id: "fornitore", etichetta: "Fornitore / proprietario", sinonimi: ["fornitore", "proprietario", "venditore", "acquistata da"] },
    { id: "commissione", etichetta: "Commissione %", sinonimi: ["commissione", "provvigione"] },
    { id: "numeroFattura", etichetta: "N. fattura", sinonimi: ["fattura", "n fattura", "numero fattura"] },
    { id: "note", etichetta: "Note", sinonimi: ["note", "annotazioni"] },
  ],
  costruisci(v, ctx): Esito<NuovoVeicolo> {
    const errori: string[] = [];
    const avvisi: string[] = [];
    if (!presente(v.marca)) errori.push("Marca mancante");
    if (!presente(v.modello)) errori.push("Modello mancante");
    const dataAcquisto = parseData(v.dataAcquisto);
    const dataVendita = parseData(v.dataVendita);
    if (presente(v.dataAcquisto) && !dataAcquisto) avvisi.push("Data d'acquisto non valida: ignorata");
    const prezzoVendita = parseImporto(v.prezzoVendita);
    const servizio: Servizio = scegli(v.servizio, SERVIZI, { conto: "Conto vendita", commission: "Auto su commissione", diretta: "Vendita diretta" }) ?? "Vendita diretta";
    let stato: Stato | null = scegli(v.stato, STATI);
    if (!stato) stato = dataVendita ? "Venduta" : dataAcquisto ? "Acquistata" : "In valutazione";
    const fornitoreNome = testo(v.fornitore);
    const fornitore = fornitoreNome ? contattoPerNome(fornitoreNome, ctx) : undefined;
    if (fornitoreNome && !fornitore) avvisi.push(`«${fornitoreNome}» non è in anagrafica: aggiungilo e collegalo dalla scheda`);
    const alim = testo(v.alimentazione);
    const alimentazione = alim ? scegli(alim, ALIMENTAZIONI) : null;
    if (alim && !alimentazione) avvisi.push(`Alimentazione «${alim}» non riconosciuta`);
    const commissione = parsePercento(v.commissione);
    return {
      errori,
      avvisi,
      record: errori.length
        ? null
        : {
            marca: testo(v.marca),
            modello: testo(v.modello),
            versione: testo(v.versione),
            targa: normTarga(v.targa),
            chilometraggio: Math.max(0, Math.round(parseImporto(v.km) ?? 0)),
            alimentazione: alimentazione ?? "",
            servizio,
            stato,
            dataAcquisto: dataAcquisto ?? "",
            prezzoAcquisto: Math.max(0, parseImporto(v.prezzoAcquisto) ?? 0),
            dataVendita: dataVendita ?? "",
            prezzoVendita: prezzoVendita && prezzoVendita > 0 ? prezzoVendita : null,
            fornitoreId: fornitore?.id ?? null,
            ...(commissione !== null && { commissionePercentuale: commissione }),
            numeroFattura: testo(v.numeroFattura),
            note: [testo(v.note), fornitoreNome && !fornitore ? `Fornitore: ${fornitoreNome}` : ""].filter(Boolean).join(" · "),
          },
    };
  },
  doppione(x, ctx, chiavi) {
    const targa = normTarga(x.targa);
    if (!targa) return null;
    if (chiavi.has(targa)) return { motivo: "Targa ripetuta nel file" };
    chiavi.add(targa);
    const esistente = ctx.veicoli.find((v) => normTarga(v.targa) === targa);
    return esistente ? { motivo: "Targa già nel parco auto", idEsistente: esistente.id } : null;
  },
};

// --- Flotta noleggio ------------------------------------------------------------

export const schemaFlotta: Schema<Omit<RentVeicolo, "id">> = {
  entita: "flotta",
  nome: "auto della flotta",
  riassunto: (v) => [[v.marca, v.modello].join(" "), v.targa, v.categoria, `${eur(v.tariffaGiornaliera)}/giorno`].filter(Boolean).join(" · "),
  campi: [
    { id: "marca", etichetta: "Marca", obbligatorio: true, esempio: "Fiat", sinonimi: ["marca"] },
    { id: "modello", etichetta: "Modello", obbligatorio: true, esempio: "Panda", sinonimi: ["modello"] },
    { id: "targa", etichetta: "Targa", esempio: "AB123CD", sinonimi: ["targa"] },
    { id: "categoria", etichetta: "Categoria", esempio: "Economy", sinonimi: ["categoria", "classe", "gruppo"] },
    { id: "km", etichetta: "Km attuali", sinonimi: ["km", "chilometri", "km attuali", "chilometraggio"] },
    { id: "tariffa", etichetta: "Tariffa al giorno", esempio: "35", sinonimi: ["tariffa", "tariffa giornaliera", "prezzo giorno", "costo giornaliero"] },
    { id: "stato", etichetta: "Stato", sinonimi: ["stato"] },
    { id: "revisione", etichetta: "Scadenza revisione", sinonimi: ["revisione", "scadenza revisione"] },
    { id: "bollo", etichetta: "Scadenza bollo", sinonimi: ["bollo", "scadenza bollo"] },
    { id: "assicurazione", etichetta: "Scadenza assicurazione", sinonimi: ["assicurazione", "scadenza assicurazione", "rca"] },
    { id: "tagliando", etichetta: "Prossimo tagliando", sinonimi: ["tagliando", "prossimo tagliando"] },
    { id: "note", etichetta: "Note", sinonimi: ["note"] },
  ],
  costruisci(v): Esito<Omit<RentVeicolo, "id">> {
    const errori: string[] = [];
    if (!presente(v.marca)) errori.push("Marca mancante");
    if (!presente(v.modello)) errori.push("Modello mancante");
    return {
      errori,
      avvisi: [],
      record: errori.length
        ? null
        : {
            marca: testo(v.marca),
            modello: testo(v.modello),
            targa: normTarga(v.targa),
            categoria: (scegli(v.categoria, CATEGORIE_RENT) ?? "Economy") as CategoriaVeicolo,
            kmAttuali: Math.max(0, Math.round(parseImporto(v.km) ?? 0)),
            tariffaGiornaliera: Math.max(0, parseImporto(v.tariffa) ?? 0),
            stato: (scegli(v.stato, STATI_RENT) ?? "Disponibile") as StatoVeicoloRent,
            dataRevisione: parseData(v.revisione) ?? "",
            dataBollo: parseData(v.bollo) ?? "",
            dataAssicurazione: parseData(v.assicurazione) ?? "",
            dataTagliando: parseData(v.tagliando) ?? "",
            note: testo(v.note),
          },
    };
  },
  doppione(x, ctx, chiavi) {
    const targa = normTarga(x.targa);
    if (!targa) return null;
    if (chiavi.has(targa)) return { motivo: "Targa ripetuta nel file" };
    chiavi.add(targa);
    const esistente = ctx.noleggio.veicoli.find((v) => normTarga(v.targa) === targa);
    return esistente ? { motivo: "Targa già in flotta", idEsistente: esistente.id } : null;
  },
};

// --- Estratto conto ---------------------------------------------------------------

export interface RigaEstratto {
  data: string;
  descrizione: string;
  /** Con segno: positivo = accredito (entrata), negativo = addebito (uscita). */
  importo: number;
  /** CRO/TRN o altro identificativo della banca; se manca se ne costruisce uno. */
  riferimento: string;
}

export const schemaEstratto: Schema<RigaEstratto> = {
  entita: "estratto",
  nome: "righe dell'estratto conto",
  riassunto: (r) => [r.data.split("-").reverse().join("/"), eur(r.importo), r.descrizione].filter(Boolean).join(" · "),
  campi: [
    { id: "data", etichetta: "Data operazione", obbligatorio: true, esempio: "15/03/2026", sinonimi: ["data", "data operazione", "data contabile", "data registrazione", "data op"] },
    { id: "valuta", etichetta: "Data valuta", sinonimi: ["valuta", "data valuta"] },
    { id: "descrizione", etichetta: "Descrizione", esempio: "Bonifico a favore di…", sinonimi: ["descrizione", "causale", "descrizione operazione", "dettagli", "operazione", "movimento"] },
    { id: "importo", etichetta: "Importo (con segno)", esempio: "-610,00", sinonimi: ["importo", "ammontare", "importo eur", "valore"] },
    { id: "entrate", etichetta: "Accrediti / Avere", sinonimi: ["avere", "accrediti", "entrate", "accredito", "importo avere"] },
    { id: "uscite", etichetta: "Addebiti / Dare", sinonimi: ["dare", "addebiti", "uscite", "addebito", "importo dare"] },
    { id: "riferimento", etichetta: "Riferimento (CRO/TRN)", sinonimi: ["cro", "trn", "riferimento", "rif", "id operazione", "codice", "identificativo"] },
  ],
  gruppiRichiesti: [{ campi: ["importo", "entrate", "uscite"], messaggio: "Serve la colonna dell'importo oppure Dare/Avere" }],
  costruisci(v): Esito<RigaEstratto> {
    const errori: string[] = [];
    const data = parseData(v.data) ?? parseData(v.valuta);
    if (!data) errori.push("Data mancante o non valida");
    const entrate = parseImporto(v.entrate);
    const uscite = parseImporto(v.uscite);
    let importo = parseImporto(v.importo);
    if (importo === null && (entrate || uscite)) importo = (entrate ? Math.abs(entrate) : 0) - (uscite ? Math.abs(uscite) : 0);
    if (!importo) errori.push("Importo mancante o zero");
    const descrizione = testo(v.descrizione);
    return {
      errori,
      avvisi: [],
      record: errori.length
        ? null
        : {
            data: data as string,
            descrizione,
            importo: importo as number,
            riferimento: testo(v.riferimento) || `EC ${data} ${(importo as number).toFixed(2)} ${normTesto(descrizione).slice(0, 18)}`.trim(),
          },
    };
  },
  doppione(r, ctx, chiavi) {
    const k = `${r.riferimento}|${r.data}|${r.importo}`;
    if (chiavi.has(k)) return { motivo: "Ripetuta nel file" };
    chiavi.add(k);
    const gia = ctx.movimenti.find((m) => m.riconciliato && m.riferimentoEstratto === r.riferimento);
    return gia ? { motivo: "Già riconciliata", idEsistente: gia.id } : null;
  },
};
