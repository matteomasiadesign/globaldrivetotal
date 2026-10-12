import type { Impostazioni } from "@/lib/gestionale/types";

// Parametri di calcolo di partenza. Dopo la prima modifica da /admin/impostazioni
// valgono quelli salvati. Aliquota, maggiorazione, regime del margine (con o senza
// spese) e metodi di pagamento bancari vanno confermati con il commercialista. I dati dell'azienda (ragione sociale, P.IVA,
// sede, contatti) non stanno qui: si leggono da /admin/sito.
export const defaultImpostazioni: Impostazioni = {
  annoGestione: new Date().getFullYear(),
  aliquotaIva: 0.22,
  maggiorazioneTrimestrale: 0.01,
  commissionePredefinita: 0.07,
  sogliaRoi: 0.15,
  sogliaGiorniStock: 60,
  pecAzienda: "",
  prossimoNumeroContratto: 1,
  margineConSpese: true,
  pagamentiBanca: ["CONTO", "Bonifico", "Carta"],
  noleggioIvaInclusa: true,
};
