import type { SiteSettings } from "@/types/site";

// Valori di partenza dei contenuti del sito. Dopo la prima modifica da
// /admin/sito valgono quelli salvati (vedi context/SiteContext.tsx); i campi
// nuovi aggiunti qui compaiono comunque, con questo valore.
export const defaultSiteSettings: SiteSettings = {
  companyName: "Global Drive Srls",
  tagline: "Usato & Commissione",
  vatNumber: "",
  legalAddress: "",
  footerText:
    "Global Drive Srls vende auto usate selezionate e controllate e cerca per te il veicolo giusto su commissione. Ci occupiamo di documenti e passaggio di proprietà, con assistenza anche dopo l'acquisto.",

  phone: "+39 342 142 0499",
  email: "globaldrivesrls@gmail.com",
  location: "Provincia di Sassari",
  hours: "09:30 – 13:00 · 15:30 – 19:30",
  hoursNote: "Dal lunedì al sabato • Domenica su appuntamento",
  instagramUrl: "https://www.instagram.com/globaldrivesrls/",
  instagramHandle: "@globaldrivesrls",
  facebookUrl: "https://www.facebook.com/p/Global-Drive-Srls-61574177134812/",
  facebookLabel: "Global Drive Srls",

  heroTitle: "L'auto giusta",
  heroHighlight: "Al momento giusto.",
  heroSubtitle: "Usato garantito e auto su commissione nel Nord Sardegna.",

  services: [
    {
      title: "Auto usate garantite",
      tagline: "Massima trasparenza e affidabilità certificata",
      badge: "Pronta Consegna",
      description:
        "Da Global Drive Srls selezioniamo con attenzione ogni veicolo per offrirti auto usate affidabili e pronte all'uso. Prima della consegna, ogni vettura viene sottoposta a controlli accurati e preparata per garantirti la massima tranquillità.",
      highlights: [
        "Veicoli selezionati e controllati scrupolosamente",
        "Garanzia legale di conformità prevista dalla normativa vigente",
        "Possibilità di sottoscrivere garanzie aggiuntive personalizzate con diverse coperture e durate",
        "Possibilità di consegna del veicolo a domicilio",
        "Gestione delle pratiche amministrative e del passaggio di proprietà",
        "Assistenza pre e post vendita",
        "Supporto dedicato anche dopo l'acquisto",
      ],
    },
    {
      title: "Auto su commissione",
      tagline: "Troviamo noi l'auto perfetta per te",
      badge: "Ricerca Sartoriale",
      description:
        "Cerchi un'auto specifica ma non vuoi perdere tempo tra annunci e trattative? Con il nostro servizio di ricerca su commissione ci occupiamo di trovare il veicolo più adatto alle tue esigenze, selezionando le migliori opportunità sul mercato e verificando attentamente provenienza, documentazione e condizioni generali.",
      highlights: [
        "Ricerca personalizzata del veicolo su misura",
        "Consulenza nella scelta del modello più adatto alle tue esigenze",
        "Verifica accurata dello storico e della documentazione ufficiale",
        "Gestione completa dell'acquisto e delle pratiche amministrative",
        "Preparazione, igienizzazione e consegna del veicolo",
        "Possibilità di abbinare garanzie aggiuntive personalizzate",
      ],
    },
    {
      title: "Conto vendita",
      tagline: "Vendi la tua auto al miglior prezzo, senza pensieri",
      badge: "Zero Stress",
      description:
        "Vuoi vendere la tua auto in modo semplice e sicuro, senza occuparti di annunci, appuntamenti e trattative? Affidandoti a Global Drive Srls, valorizziamo il tuo veicolo e gestiamo l'intero processo di vendita, garantendo professionalità e trasparenza sia al venditore che all'acquirente.",
      highlights: [
        "Valutazione professionale e realistica del veicolo",
        "Realizzazione di foto professionali e pubblicazione degli annunci sui canali leader",
        "Gestione completa delle richieste e delle trattative con i potenziali acquirenti",
        "Assistenza completa nelle pratiche burocratiche e passaggio",
        "Possibilità di offrire all'acquirente garanzie aggiuntive personalizzate",
        "Consegna del veicolo in totale sicurezza ed incasso garantito",
      ],
    },
  ],

  aboutTitle: "Crediamo in una mobilità affidabile.",
  aboutText:
    "Global Drive nasce con una missione precisa: trasformare l'acquisto di un'auto in un momento speciale ed entusiasmante. Nessuna pressione commerciale, ma autentica consulenza tecnica, trasparenza contrattuale totale e veicoli selezionati uno ad uno.",
  aboutBullets: [
    "Ispezione rigorosa su banco prova e telaio",
    "Libretto tagliandi ufficiale e chilometri certificati in fattura",
    "Consegna a domicilio e gestione di tutte le pratiche amministrative",
  ],
  aboutCaptionTitle: "Global Drive Srls",
  aboutCaptionText: "Provincia di Sassari • Consegne a domicilio",
  mapsUrl: "https://maps.google.com",
  showStats: true,
  stats: [
    { value: "15+", label: "Anni di Passione & Trasparenza" },
    { value: "1.800+", label: "Vetture Consegnate con Successo" },
    { value: "3", label: "Servizi: Usato, Commissione, Conto Vendita" },
    { value: "4.9 / 5", label: "Punteggio Medio Recensioni Google" },
  ],
  showReviews: true,
  reviews: [
    {
      author: "Marco Beltrame",
      city: "Milano",
      car: "Volkswagen Golf 1.5 TSI",
      quote:
        "Esperienza impeccabile. Ho acquistato a distanza con spedizione tramite bisarca: l'auto era esattamente perfetta come descritto nel video peritale in 4K. Personale altamente preparato e cordiale.",
    },
    {
      author: "Elena Varesi",
      city: "Bologna",
      car: "Toyota Yaris Cross Hybrid",
      quote:
        "Grande serietà e velocità nella gestione di tutte le pratiche, passaggio di proprietà compreso. Consegna puntuale e assistenza anche dopo l'acquisto. Consigliatissimi!",
    },
    {
      author: "Dott. Claudio Santoro",
      city: "Roma",
      car: "Jeep Renegade 1.6 Multijet",
      quote:
        "Professionalità e trasparenza dalla scelta alla consegna, con un'auto esattamente come descritta. Sicuramente il mio punto di riferimento per il futuro.",
    },
  ],
};
