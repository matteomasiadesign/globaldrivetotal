import { defaultImpostazioni } from "@/config/gestionale";
import { addDays, toDateStr } from "@/lib/admin/dates";
import type { GestionaleData } from "@/lib/gestionale/data";
import type { Contatto, Movimento, Veicolo } from "@/lib/gestionale/types";

// DATI DI DEMO — da eliminare quando il gestionale passerà al database (vedi
// context/GestionaleContext.tsx). Le schede delle auto sono collegate alle auto
// demo di data/cars.ts tramite `carId`. Nessun dato è reale: nomi, targhe e
// importi sono inventati.

const oggi = toDateStr(new Date());
const giorniFa = (n: number) => addDays(oggi, -n);
const tra = (n: number) => addDays(oggi, n);
const anno = new Date().getFullYear();

const veicolo = (v: Partial<Veicolo> & Pick<Veicolo, "id" | "marca" | "modello">): Veicolo => ({
  carId: null,
  fornitoreId: null,
  acquirenteId: null,
  targa: "",
  versione: "",
  chilometraggio: 0,
  alimentazione: "",
  servizio: "Vendita diretta",
  stato: "In vendita",
  fatturata: false,
  passaggioProprieta: false,
  garanzia: true,
  dataAcquisto: "",
  dataVendita: "",
  prezzoAcquisto: 0,
  prezzoVendita: null,
  commissionePercentuale: defaultImpostazioni.commissionePredefinita,
  numeroFattura: "",
  note: "",
  ...v,
});

const movimento = (m: Partial<Movimento> & Pick<Movimento, "id" | "data" | "imponibile">): Movimento => {
  const iva = m.iva ?? 0;
  return {
    autoId: null,
    contattoId: null,
    descrizione: "",
    fornitoreCliente: "",
    tipo: "Uscita",
    categoria: "Altro",
    naturaCosto: "Variabile diretto auto",
    pagamento: "CONTO",
    iva,
    totale: m.imponibile + iva,
    ivaDetraibile: false,
    dataScadenza: "",
    statoPagamento: "Saldato",
    dataSaldo: m.data,
    numeroDocumento: "",
    riconciliato: false,
    riferimentoEstratto: "",
    ...m,
  };
};

const contatto = (c: Partial<Contatto> & Pick<Contatto, "id" | "nome">): Contatto => ({
  tipo: "Cliente",
  telefono: "",
  email: "",
  codiceFiscale: "",
  residenza: "",
  nascitaSede: "",
  numeroPatente: "",
  scadenzaPatente: "",
  numeroDocumento: "",
  note: "",
  ...c,
});

export const initialGestionale: GestionaleData = {
  impostazioni: defaultImpostazioni,
  storico: [],

  veicoli: [
    veicolo({
      id: "gv-golf",
      carId: "vw-golf-8-life",
      marca: "Volkswagen",
      modello: "Golf",
      targa: "FK412LP",
      versione: "1.5 TSI 130 CV Life",
      chilometraggio: 48000,
      alimentazione: "Benzina",
      dataAcquisto: giorniFa(45),
      prezzoAcquisto: 18200,
    }),
    veicolo({
      id: "gv-panda",
      carId: "fiat-panda-sport-hybrid",
      marca: "Fiat",
      modello: "Panda",
      targa: "GB208RM",
      versione: "1.0 FireFly Hybrid Sport",
      chilometraggio: 31000,
      alimentazione: "Ibrida",
      dataAcquisto: giorniFa(30),
      prezzoAcquisto: 10600,
    }),
    veicolo({
      id: "gv-500",
      carId: "fiat-500-hybrid-lounge",
      marca: "Fiat",
      modello: "500",
      targa: "GA771ZT",
      versione: "1.0 Hybrid Lounge",
      chilometraggio: 29500,
      alimentazione: "Ibrida",
      stato: "Prenotata",
      dataAcquisto: giorniFa(52),
      prezzoAcquisto: 10100,
    }),
    veicolo({
      id: "gv-yaris",
      carId: "toyota-yaris-cross-hybrid",
      marca: "Toyota",
      modello: "Yaris Cross",
      targa: "GK530DC",
      versione: "1.5 Hybrid 116 CV Trend",
      chilometraggio: 24000,
      alimentazione: "Ibrida",
      dataAcquisto: giorniFa(20),
      prezzoAcquisto: 21000,
    }),
    veicolo({
      id: "gv-renegade",
      carId: "jeep-renegade-limited-mjt",
      marca: "Jeep",
      modello: "Renegade",
      targa: "FY986KN",
      versione: "1.6 Multijet 130 CV Limited",
      chilometraggio: 62000,
      alimentazione: "Diesel",
      stato: "Venduta",
      fatturata: true,
      passaggioProprieta: true,
      dataAcquisto: giorniFa(80),
      dataVendita: giorniFa(12),
      prezzoAcquisto: 13800,
      prezzoVendita: 16500,
      numeroFattura: "7/" + anno,
      acquirenteId: "gc-1",
    }),
    veicolo({
      id: "gv-duster",
      carId: "dacia-duster-comfort-tce",
      marca: "Dacia",
      modello: "Duster",
      targa: "GC115SE",
      versione: "1.0 TCe 100 CV Comfort",
      chilometraggio: 38000,
      alimentazione: "Benzina",
      servizio: "Conto vendita",
      dataAcquisto: giorniFa(15),
      prezzoAcquisto: 0,
    }),
    // Auto appena acquistata, non ancora in catalogo: non ha una scheda sul sito.
    veicolo({
      id: "gv-fiesta",
      marca: "Ford",
      modello: "Fiesta",
      targa: "FW604AA",
      versione: "1.1 85 CV Plus",
      chilometraggio: 71000,
      alimentazione: "Benzina",
      stato: "In preparazione",
      dataAcquisto: giorniFa(6),
      prezzoAcquisto: 7400,
    }),
  ],

  movimenti: [
    movimento({ id: "gm-1", data: giorniFa(45), autoId: "gv-golf", descrizione: "Acquisto Golf", categoria: "Acquisto veicolo", fornitoreCliente: "Privato", imponibile: 18200, riconciliato: true }),
    movimento({ id: "gm-2", data: giorniFa(38), autoId: "gv-golf", descrizione: "Tagliando e filtri", categoria: "Meccanica / Tagliando", fornitoreCliente: "Officina Mele", contattoId: "gc-3", imponibile: 380, iva: 83.6, ivaDetraibile: true, numeroDocumento: "112/" + anno, riconciliato: true }),
    movimento({ id: "gm-3", data: giorniFa(36), autoId: "gv-golf", descrizione: "Lavaggio e detailing", categoria: "Lavaggio / Detailing", fornitoreCliente: "Autolavaggio Express", contattoId: "gc-4", imponibile: 60, iva: 13.2, pagamento: "CASH", ivaDetraibile: true }),
    movimento({ id: "gm-4", data: giorniFa(30), autoId: "gv-panda", descrizione: "Acquisto Panda", categoria: "Acquisto veicolo", fornitoreCliente: "Privato", imponibile: 10600, riconciliato: true }),
    movimento({
      id: "gm-5",
      data: giorniFa(24),
      autoId: "gv-panda",
      descrizione: "Riparazione paraurti",
      categoria: "Carrozzeria",
      fornitoreCliente: "Carrozzeria Sanna",
      contattoId: "gc-2",
      imponibile: 450,
      iva: 99,
      ivaDetraibile: true,
      dataScadenza: giorniFa(5),
      statoPagamento: "Da saldare",
      dataSaldo: "",
      numeroDocumento: "48/" + anno,
    }),
    movimento({ id: "gm-6", data: giorniFa(80), autoId: "gv-renegade", descrizione: "Acquisto Renegade", categoria: "Acquisto veicolo", fornitoreCliente: "Privato", imponibile: 13800, riconciliato: true }),
    movimento({ id: "gm-7", data: giorniFa(70), autoId: "gv-renegade", descrizione: "Pneumatici quattro stagioni", categoria: "Pneumatici / Assetto", fornitoreCliente: "Gomme Sassari", imponibile: 520, iva: 114.4, ivaDetraibile: true, riconciliato: true }),
    movimento({ id: "gm-8", data: giorniFa(12), autoId: "gv-renegade", descrizione: "Vendita Renegade", tipo: "Entrata", categoria: "Vendita veicolo", naturaCosto: "Variabile generale", fornitoreCliente: "Marco Pinna", contattoId: "gc-1", imponibile: 16500, numeroDocumento: "7/" + anno, pagamento: "Bonifico", riconciliato: true }),
    movimento({ id: "gm-9", data: giorniFa(20), autoId: "gv-yaris", descrizione: "Acquisto Yaris Cross", categoria: "Acquisto veicolo", fornitoreCliente: "Privato", imponibile: 21000, riconciliato: true }),
    movimento({ id: "gm-10", data: giorniFa(6), autoId: "gv-fiesta", descrizione: "Acquisto Fiesta", categoria: "Acquisto veicolo", fornitoreCliente: "Privato", imponibile: 7400 }),
    movimento({ id: "gm-11", data: giorniFa(4), autoId: "gv-fiesta", descrizione: "Trasporto dal venditore", categoria: "Trasporto", fornitoreCliente: "Autotrasporti Cossu", imponibile: 120, iva: 26.4, ivaDetraibile: true, dataScadenza: tra(10), statoPagamento: "Da saldare", dataSaldo: "" }),
    movimento({ id: "gm-12", data: giorniFa(28), descrizione: "Affitto sede", categoria: "Costi generali", naturaCosto: "Fisso", fornitoreCliente: "Locatore", imponibile: 600, iva: 132, ivaDetraibile: true, riconciliato: true }),
    movimento({ id: "gm-13", data: giorniFa(14), descrizione: "Campagna social", categoria: "Pubblicità", naturaCosto: "Variabile generale", fornitoreCliente: "Meta", imponibile: 150, pagamento: "Carta" }),
    movimento({ id: "gm-14", data: giorniFa(3), descrizione: "Provvigione conto vendita Duster (acconto)", tipo: "Entrata", categoria: "Intermediazione conto vendita", naturaCosto: "Variabile generale", autoId: "gv-duster", fornitoreCliente: "Proprietario Duster", imponibile: 300, iva: 66, dataScadenza: tra(7), statoPagamento: "Da saldare", dataSaldo: "" }),
  ],

  contatti: [
    contatto({ id: "gc-1", nome: "Marco Pinna", telefono: "340 5550101", email: "marco.pinna@example.com", residenza: "Sassari", note: "Ha acquistato la Renegade." }),
    contatto({ id: "gc-2", tipo: "Fornitore", nome: "Carrozzeria Sanna", telefono: "079 555010" }),
    contatto({ id: "gc-3", tipo: "Fornitore", nome: "Officina Mele", telefono: "079 555020" }),
    contatto({ id: "gc-4", tipo: "Entrambi", nome: "Autolavaggio Express", telefono: "079 555030" }),
    contatto({ id: "gc-5", nome: "Giulia Deiana", telefono: "347 5550202", numeroPatente: "SS1234567A", scadenzaPatente: `${anno + 4}-03-15`, numeroDocumento: "CA00000XX", note: "Cliente del noleggio." }),
  ],

  noleggio: {
    veicoli: [
      { id: "gr-1", marca: "Fiat", modello: "Panda", targa: "GD310XP", categoria: "Economy", kmAttuali: 18000, tariffaGiornaliera: 35, stato: "Noleggiata", dataRevisione: tra(200), dataBollo: tra(120), dataAssicurazione: tra(25), dataTagliando: tra(60), note: "" },
      { id: "gr-2", marca: "Fiat", modello: "500", targa: "GD322XQ", categoria: "Economy", kmAttuali: 12000, tariffaGiornaliera: 38, stato: "Disponibile", dataRevisione: tra(300), dataBollo: tra(150), dataAssicurazione: tra(180), dataTagliando: tra(90), note: "" },
      { id: "gr-3", marca: "Toyota", modello: "Yaris", targa: "GE004KL", categoria: "Compatta", kmAttuali: 26000, tariffaGiornaliera: 45, stato: "Disponibile", dataRevisione: giorniFa(10), dataBollo: tra(100), dataAssicurazione: tra(200), dataTagliando: tra(30), note: "Revisione da rifare." },
    ],
    prenotazioni: [
      { id: "gp-1", veicoloId: "gr-1", contattoId: "gc-5", clienteNomeLibero: "", dataInizio: giorniFa(2), dataFine: tra(4), tariffaApplicata: 35, cauzione: 200, stato: "In corso", luogoRitiro: "Sede Sassari", luogoRiconsegna: "Sede Sassari", note: "" },
      { id: "gp-2", veicoloId: "gr-2", contattoId: null, clienteNomeLibero: "Famiglia Orrù", dataInizio: tra(10), dataFine: tra(17), tariffaApplicata: 38, cauzione: 200, stato: "Prenotata", luogoRitiro: "Aeroporto di Alghero", luogoRiconsegna: "Aeroporto di Alghero", note: "" },
    ],
    tariffe: [
      { id: "gt-1", categoria: "Economy", nomePeriodo: "Alta stagione", dataInizio: `${anno}-06-15`, dataFine: `${anno}-09-15`, tariffaGiornaliera: 55 },
      { id: "gt-2", categoria: "Compatta", nomePeriodo: "Alta stagione", dataInizio: `${anno}-06-15`, dataFine: `${anno}-09-15`, tariffaGiornaliera: 65 },
    ],
    preventivi: [
      { id: "gq-1", veicoloId: null, contattoId: null, clienteNomeLibero: "Anna Murgia", categoria: "Compatta", dataInizio: tra(30), dataFine: tra(37), luogoRitiro: "Sede Sassari", luogoRiconsegna: "Sede Sassari", tariffaApplicata: 45, giorni: 7, totale: 315, stato: "Inviato", note: "" },
    ],
  },
};
