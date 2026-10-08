import { jsPDF } from "jspdf";
import type { Veicolo } from "./types";

export type DatiAcquirente = {
  nome: string;
  nascitaSede: string;
  codiceFiscale: string;
  residenza: string;
  telefono: string;
  email: string;
};

/** Intestazione del venditore e numerazione: arriva da /admin/sito e dalle impostazioni. */
export type DatiAzienda = {
  ragioneSociale: string;
  partitaIva: string;
  indirizzo: string;
  telefono: string;
  email: string;
  pec: string;
  numeroContratto: number;
  anno: number;
};

export type DatiContratto = {
  dataConsegna: string;
  strumentoPagamento: string;
  estensioneGaranzia: boolean;
  luogoData: string; // es. "SASSARI, 19/06/2026"
};

const INK: [number, number, number] = [27, 31, 35];
const BLUE: [number, number, number] = [47, 95, 255];
const MUTED: [number, number, number] = [118, 112, 102];
const LINE: [number, number, number] = [227, 223, 213];

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function eur(n: number | null | undefined) {
  const v = Number(n) || 0;
  return v.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function generaContrattoVenditaPDF(
  veicolo: Veicolo, veicoloInfo: { marca: string; modello: string; targa: string },
  azienda: DatiAzienda, acquirente: DatiAcquirente, contratto: DatiContratto
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210, pageH = 297, marginX = 15;
  let y = 0;

  const numeroContratto = `${azienda.numeroContratto} / ${azienda.anno}`;
  const logo = await loadImageAsDataUrl("/logo-icon.png");

  function nuovaPagina() {
    doc.addPage();
    y = 20;
  }
  function assicuraSpazio(altezza: number) {
    if (y + altezza > pageH - 22) nuovaPagina();
  }
  function titoloArt(testo: string) {
    assicuraSpazio(16);
    y += 4;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); doc.setTextColor(...BLUE);
    doc.text(testo, marginX, y);
    y += 2;
    doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
    doc.line(marginX, y, pageW - marginX, y);
    y += 6;
  }
  function paragrafo(testo: string, opts?: { bold?: boolean }) {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal"); doc.setFontSize(10); doc.setTextColor(...INK);
    const righe = doc.splitTextToSize(testo, pageW - marginX * 2);
    assicuraSpazio(righe.length * 5 + 2);
    doc.text(righe, marginX, y);
    y += righe.length * 5 + 3;
  }
  function elenco(voci: string[]) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...INK);
    voci.forEach((v) => {
      const righe = doc.splitTextToSize(v, pageW - marginX * 2 - 5);
      assicuraSpazio(righe.length * 5 + 1);
      doc.text("•", marginX, y);
      doc.text(righe, marginX + 5, y);
      y += righe.length * 5 + 1;
    });
    y += 3;
  }

  // ---------- Intestazione ----------
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageW, 30, "F");
  if (logo) doc.addImage(logo, "PNG", marginX, 5, 20, 20);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(200, 200, 205);
  doc.text("CONTRATTO DI", pageW - marginX, 10, { align: "right" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(255, 255, 255);
  doc.text("Compra-vendita Veicolo Usato", pageW - marginX, 17, { align: "right" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...BLUE);
  doc.text(`N° ${numeroContratto}`, pageW - marginX, 24, { align: "right" });

  y = 40;

  // ---------- Box venditore / acquirente ----------
  const boxW = (pageW - marginX * 2 - 6) / 2, boxH = 46;
  function box(x: number, titolo: string, righe: [string, string][]) {
    doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, boxW, boxH, 2, 2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...BLUE);
    doc.text(titolo, x + 5, y + 8);
    let ry = y + 15;
    righe.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
      doc.text(label, x + 5, ry);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...INK);
      const valRighe = doc.splitTextToSize(value || "—", boxW - 32);
      doc.text(valRighe, x + 28, ry);
      ry += Math.max(5, valRighe.length * 4);
    });
  }
  box(marginX, "IL VENDITORE", [
    ["Ragione Sociale", azienda.ragioneSociale],
    ["Sede Legale", azienda.indirizzo],
    ["P.IVA / C.F.", azienda.partitaIva],
    ["Telefono", azienda.telefono],
    ["Email", azienda.email],
    ["PEC", azienda.pec],
  ]);
  box(marginX + boxW + 6, "L'ACQUIRENTE", [
    ["Nome / Rag. Soc.", acquirente.nome],
    ["Nascita / Sede", acquirente.nascitaSede],
    ["C.F. / P.IVA", acquirente.codiceFiscale],
    ["Residenza", acquirente.residenza],
    ["Telefono", acquirente.telefono],
    ["Email", acquirente.email],
  ]);
  y += boxH + 10;

  // ---------- Articoli ----------
  titoloArt("ART. 1 – OGGETTO DEL CONTRATTO");
  paragrafo("Il Venditore vende all'Acquirente, che accetta, il seguente veicolo usato:");
  elenco([
    `Marca: ${veicoloInfo.marca || "—"}`,
    `Modello: ${veicoloInfo.modello || "—"}`,
    `Versione / Allestimento: ${veicolo.versione || "—"}`,
    `Targa: ${veicoloInfo.targa || "—"}`,
    `Chilometraggio dichiarato: ${veicolo.chilometraggio ? veicolo.chilometraggio.toLocaleString("it-IT") : "—"} km`,
    `Alimentazione: ${veicolo.alimentazione || "—"}`,
  ]);

  titoloArt("ART. 2 – PREZZO DI VENDITA");
  paragrafo(`Il prezzo di vendita del veicolo è concordato tra le parti in ${eur(veicolo.prezzoVendita)} €, comprensivo di IVA secondo il regime del margine (art. 36 D.L. 41/1995), ove applicabile.`);
  paragrafo("Il prezzo si intende pagato interamente alla firma del presente contratto.");
  paragrafo(`Strumento di pagamento: ${contratto.strumentoPagamento || "—"}`, { bold: true });

  titoloArt("ART. 3 – CONSEGNA DEL VEICOLO");
  paragrafo(`Il veicolo verrà consegnato all'Acquirente in data ${contratto.dataConsegna || "—"}. Con la consegna, ogni rischio relativo al veicolo passa in capo all'Acquirente.`);

  titoloArt("ART. 4 – STATO DEL VEICOLO");
  paragrafo("L'Acquirente dichiara di aver visionato e provato il veicolo e di accettarlo nello stato di fatto e di diritto in cui si trova, con chilometraggio e condizioni d'uso compatibili con l'età del mezzo. Il veicolo è venduto come usato, pertanto possono essere presenti normali segni di usura.");

  titoloArt("ART. 5 – GARANZIA LEGALE DI CONFORMITÀ");
  paragrafo("1. In conformità con il disposto di cui al comma 2° dell'art. 134 del D.Lgs. 206/2005, l'Acquirente ed il Venditore convengono che i diritti dell'Acquirente, attivi ai sensi degli artt. 128 e seguenti del D.Lgs. 206/2005 e successive modifiche e/o integrazioni, impegnano la presente garanzia del Venditore limitatamente ai 12 mesi successivi alla consegna dell'autoveicolo.");
  paragrafo("2. Ai sensi della normativa vigente l'Acquirente dichiara:");
  elenco([
    "di aver attentamente visionato e provato il veicolo oggetto del presente contratto e di accettarlo nello stato di fatto e nelle condizioni in cui si trova;",
    "di essere a conoscenza del fatto che non potrà far valere difetti di conformità quando gli stessi risultino evidenti o riconoscibili secondo l'ordinaria diligenza al momento della consegna del veicolo;",
    "di prendere atto del fatto che eventuali difetti di conformità possono essere riferiti esclusivamente a difetti non derivanti dall'uso normale del veicolo, tenuto conto dell'anzianità di costruzione dello stesso e del numero di chilometri percorsi;",
    "di convenire che non possono considerarsi difetti di conformità quelli derivanti dalla normale usura, da carenza di manutenzione o dal mancato rispetto delle indicazioni fornite dalla casa costruttrice in ordine all'impiego ed alla manutenzione del veicolo.",
  ]);
  paragrafo("3. L'Acquirente conviene, conformemente a quanto prescritto dall'art. 130 del D.Lgs. 206/2005, che in caso di accertata e provata non conformità del veicolo, il Venditore provvederà, in via prioritaria, al ripristino dello stesso. La pretesa di rimedi alternativi potrà essere avanzata dall'Acquirente solo qualora il rimedio richiesto non risulti oggettivamente impossibile o eccessivamente oneroso per il Venditore.");
  paragrafo("4. Le parti concordano che, nel caso di vendita a soggetto titolare di Partita IVA, regolarmente fatturata, non trova applicazione la normativa di cui ai commi precedenti, non sussistendo la qualità di consumatore; trovano invece applicazione gli artt. 1490 e seguenti del Codice Civile in materia di garanzia per i vizi della cosa venduta, che viene espressamente esclusa ai sensi degli artt. 1490 e 1491 c.c.");

  titoloArt("ART. 6 – ESTENSIONE DELLA GARANZIA (FACOLTATIVA)");
  paragrafo("È riconosciuta all'Acquirente la facoltà di acquistare, su base volontaria, una estensione della garanzia rispetto alla garanzia legale di conformità di cui all'Art. 5 del presente contratto. L'eventuale estensione di garanzia sarà regolata da separato contratto o allegato, che costituirà parte integrante e sostanziale del presente accordo, nel quale saranno specificati durata, condizioni, componenti coperte, esclusioni, massimali e modalità di intervento.");
  paragrafo("In assenza della sottoscrizione del relativo allegato, non potrà ritenersi operante alcuna garanzia ulteriore rispetto a quella legale prevista dalla normativa vigente.");
  paragrafo("Scelta dell'Acquirente in merito all'estensione di garanzia:", { bold: true });
  paragrafo(contratto.estensioneGaranzia
    ? "[X] SÌ — L'Acquirente intende acquistare l'estensione di garanzia e sottoscrivere il relativo allegato."
    : "[ ] NO — L'Acquirente non intende acquistare l'estensione di garanzia in questa sede.");
  assicuraSpazio(16);
  paragrafo("Firma specifica dell'Acquirente per la scelta sull'estensione di garanzia:");
  y += 6;
  doc.setDrawColor(...INK); doc.line(marginX, y, marginX + 70, y);
  y += 12;

  titoloArt("ART. 7 – PASSAGGIO DI PROPRIETÀ");
  paragrafo("Il passaggio di proprietà verrà effettuato entro i termini di legge. Le spese di passaggio di proprietà sono a carico dell'Acquirente.");

  titoloArt("ART. 8 – DICHIARAZIONI DELL'ACQUIRENTE");
  paragrafo("L'Acquirente dichiara:");
  elenco([
    "di aver ricevuto tutte le informazioni necessarie sul veicolo;",
    "di accettare il prezzo pattuito;",
    "di essere stato informato sui diritti e doveri derivanti dal presente contratto.",
  ]);

  titoloArt("ART. 9 – FORO COMPETENTE");
  paragrafo("Per ogni controversia derivante dal presente contratto sarà competente in via esclusiva il Foro del luogo di residenza o domicilio dell'Acquirente, se consumatore, oppure il Foro di Roma negli altri casi.");

  titoloArt("ART. 10 – TRATTAMENTO DEI DATI PERSONALI");
  paragrafo('Vi informiamo che ai sensi dell\'art. 13 del D.Lgs. 196/2003 recante "Codice in materia di protezione dei dati personali" che i dati personali da Voi forniti, ovvero acquisiti nell\'ambito di rapporti contrattuali con Voi intercorrenti o che si instaureranno in futuro, potranno formare oggetto di trattamento nel rispetto della normativa in oggetto. Il trattamento dei dati è finalizzato all\'assolvimento degli obblighi di legge e contrattuali.');
  paragrafo("Vi informiamo altresì che i dati personali da Voi forniti o acquisiti nel corso del rapporto contrattuale potranno essere comunicati ai seguenti soggetti: all'Amministrazione finanziaria, agli enti previdenziali e assistenziali se necessario; all'Autorità di Pubblica Sicurezza; a società, enti o consorzi, aventi finalità di tutela del credito; a società o enti di recupero credito; a società o enti, consorzi o altre organizzazioni aventi finalità di assicurazione, di intermediazione finanziaria, bancaria e simili; a banche o istituti di credito nell'ambito della gestione finanziaria dell'impresa; a società esterne incaricate dall'azienda della custodia e/o la gestione dei nostri archivi.");
  paragrafo("Vi informiamo altresì che in relazione ai predetti dati potrete esercitare i diritti di cui al D.Lgs. 196/2003 tra cui i diritti di accesso, di aggiornamento, di opposizione al trattamento e di cancellazione. Il Titolare e/o responsabile del trattamento dei dati è il Venditore.");
  paragrafo("Vi facciamo presente che il conferimento di dati suddetti in generale non è obbligatorio, ma l'eventuale rifiuto ad autorizzare la comunicazione dei Suoi dati ai soggetti sopra indicati, potrebbe comportarne l'impossibilità di procedere al puntuale adempimento degli obblighi contrattuali.");

  // ---------- Firme ----------
  assicuraSpazio(45);
  y += 4;
  paragrafo(`Letto, confermato e sottoscritto — ${contratto.luogoData || "—"}`, { bold: true });
  y += 10;
  doc.setDrawColor(...INK);
  doc.line(marginX, y, marginX + 75, y);
  doc.line(pageW - marginX - 75, y, pageW - marginX, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  doc.text("FIRMA DELL'ACQUIRENTE", marginX, y + 5);
  doc.text("FIRMA DEL VENDITORE", pageW - marginX - 75, y + 5);

  // ---------- Piè di pagina su tutte le pagine ----------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.2);
    doc.line(marginX, pageH - 16, pageW - marginX, pageH - 16);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    const infoAzienda = `${azienda.ragioneSociale} — ${azienda.indirizzo} | P.IVA: ${azienda.partitaIva} | Tel: ${azienda.telefono} | ${azienda.email}`;
    doc.text(infoAzienda, pageW / 2, pageH - 11, { align: "center", maxWidth: pageW - marginX * 2 });
    doc.text(`N° ${numeroContratto}`, marginX, pageH - 11);
    doc.text(`${i}/${totalPages}`, pageW - marginX, pageH - 11, { align: "right" });
  }

  const nomeFile = `Contratto_${([veicoloInfo.marca, veicoloInfo.modello].filter(Boolean).join("_") || "auto").replace(/\s+/g, "_")}_${numeroContratto.replace(/[\s/]/g, "-")}.pdf`;
  doc.save(nomeFile);
}
