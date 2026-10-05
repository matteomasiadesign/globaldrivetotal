"use client";

import React, { useState } from "react";
import Image from "next/image";
import { SaleDocumentDraft } from "@/types/admin";
import { Car } from "@/types/car";
import { useSite } from "@/context/SiteContext";
import {
  X,
  Printer,
  Copy,
  Check,
  FileText,
  FolderPlus,
  ShieldCheck,
} from "lucide-react";

interface DocumentPreviewModalProps {
  draft: SaleDocumentDraft;
  car?: Car;
  onClose: () => void;
  onSaveToVehicleDossier: (draft: SaleDocumentDraft, car: Car) => void;
}

export default function DocumentPreviewModal({
  draft,
  car,
  onClose,
  onSaveToVehicleDossier,
}: DocumentPreviewModalProps) {
  const { site } = useSite();
  const companyLine = [
    site.legalAddress || site.location,
    site.vatNumber && `C.F./P.IVA: ${site.vatNumber}`,
    `Tel: ${site.phone}`,
    site.email,
  ]
    .filter(Boolean)
    .join(" • ");
  const [copied, setCopied] = useState(false);
  const [savedToDossier, setSavedToDossier] = useState(false);

  // Calcolato una volta sola all'apertura: nel render cambierebbe a ogni aggiornamento.
  const [documentNumber] = useState(
    () => `GD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const currentDateFormatted = new Date().toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  const generateRawHtml = () => {
    return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Contratto di Vendita ${documentNumber} - ${site.companyName}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; margin: 40px; line-height: 1.5; }
    .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
    h1 { font-size: 20px; text-transform: uppercase; margin: 0; }
    .section-title { font-size: 13px; font-weight: bold; background: #eee; padding: 6px 10px; margin-top: 25px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    td { padding: 6px; font-size: 12px; border-bottom: 1px solid #ddd; }
    .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
    .sig-box { width: 45%; border-top: 1px solid #000; padding-top: 10px; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${site.companyName.toUpperCase()}</h1>
      <p style="font-size: 11px; margin: 4px 0;">${companyLine}</p>
    </div>
    <div style="text-align: right;">
      <strong>Doc. N°: ${documentNumber}</strong><br>
      <small>Data: ${currentDateFormatted}</small>
    </div>
  </div>

  <div class="section-title">1. Dati Parte Acquirente</div>
  <table>
    <tr><td><strong>Nome / Ragione Sociale:</strong></td><td>${draft.buyerName}</td></tr>
    <tr><td><strong>Codice Fiscale / P.IVA:</strong></td><td>${draft.buyerTaxCode}</td></tr>
    <tr><td><strong>Indirizzo:</strong></td><td>${draft.buyerAddress}</td></tr>
    <tr><td><strong>Telefono / Email:</strong></td><td>${draft.buyerPhone} • ${draft.buyerEmail}</td></tr>
  </table>

  <div class="section-title">2. Identificazione Veicolo</div>
  <table>
    <tr><td><strong>Veicolo:</strong></td><td>${car ? `${car.brand} ${car.model} ${car.version}` : "Veicolo da confermare"}</td></tr>
    <tr><td><strong>Anno / Chilometraggio:</strong></td><td>${car?.year || ""} • ${car ? new Intl.NumberFormat("it-IT").format(car.mileage) : ""} km certificati</td></tr>
    <tr><td><strong>Numero Telaio (VIN):</strong></td><td>${draft.vinNumber}</td></tr>
    <tr><td><strong>Targa di Circolazione:</strong></td><td>${draft.plateNumber}</td></tr>
  </table>

  <div class="section-title">3. Corrispettivo Economico e Pagamento</div>
  <table>
    <tr><td><strong>Prezzo Concordato (IVA inc.):</strong></td><td>€ ${new Intl.NumberFormat("it-IT").format(draft.salePrice)}</td></tr>
    <tr><td><strong>Acconto Versato / Caparra:</strong></td><td>€ ${new Intl.NumberFormat("it-IT").format(draft.depositAmount)}</td></tr>
    <tr><td><strong>Saldo alla Consegna:</strong></td><td>€ ${new Intl.NumberFormat("it-IT").format(draft.balanceAmount)}</td></tr>
    <tr><td><strong>Modalità di Pagamento:</strong></td><td>${draft.paymentMethod}</td></tr>
    ${draft.tradeInModel ? `<tr><td><strong>Permuta Rientrata:</strong></td><td>${draft.tradeInModel} (Valutazione € ${new Intl.NumberFormat("it-IT").format(draft.tradeInValue || 0)})</td></tr>` : ""}
  </table>

  <div class="section-title">4. Garanzia e Condizioni di Vendita</div>
  <p style="font-size: 11px; margin-top: 8px;">
    Il venditore rilascia garanzia convenzionale di conformità per <strong>${draft.warrantyDuration}</strong> con copertura 110 punti di controllo Global Drive Care. Il veicolo viene consegnato regolarmente revisionato e libero da vincoli o fermi amministrativi.
  </p>

  <div class="signatures">
    <div class="sig-box">Firma Venditore (${site.companyName})</div>
    <div class="sig-box">Firma Acquirente per Accettazione</div>
  </div>
</body>
</html>`;
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(generateRawHtml());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveToDossier = () => {
    if (car) {
      onSaveToVehicleDossier(draft, car);
      setSavedToDossier(true);
      setTimeout(() => setSavedToDossier(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0c1226] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Modal Top Actions Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0e1633]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Anteprima Generata Documento di Vendita
              </h2>
              <p className="text-xs text-slate-400">
                Struttura HTML dinamica con dati auto e cliente compilati automaticamente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
              title="Copia codice sorgente HTML"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copiato!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Copia HTML</span>
                </>
              )}
            </button>

            {car && (
              <button
                onClick={handleSaveToDossier}
                disabled={savedToDossier}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-colors"
                title="Salva nell'archivio documenti di questa auto"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{savedToDossier ? "Salvato nel Dossier Auto ✓" : "Associa all'Auto"}</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Stampa / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Simulation Area */}
        <div className="overflow-y-auto p-4 sm:p-8 flex-1 bg-slate-950/80">
          <div className="max-w-3xl mx-auto bg-white text-slate-900 rounded-2xl p-6 sm:p-12 shadow-2xl border border-slate-200 font-sans print:shadow-none print:border-none print:p-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-900 pb-6 mb-8 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 flex-shrink-0">
                    <Image
                      src="/logo.webp"
                      alt="Global Drive Logo"
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                  <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                    GLOBAL<span className="text-blue-600">DRIVE</span>
                  </h1>
                </div>
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
                  {site.companyName}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {companyLine}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="inline-block px-3 py-1 rounded bg-slate-100 text-slate-800 font-black text-xs uppercase tracking-wider mb-1">
                  CONTRATTO DI VENDITA
                </span>
                <p className="text-xs font-mono font-bold text-slate-900">N° {documentNumber}</p>
                <p className="text-[11px] text-slate-500">Data emissione: {currentDateFormatted}</p>
              </div>
            </div>

            {/* Section 1: Buyer Data */}
            <div className="mb-6">
              <div className="bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded mb-3 flex items-center justify-between">
                <span>1. Dati della Parte Acquirente</span>
                <span className="text-[10px] text-slate-500 font-normal">Identificazione Anagrafica</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Nome / Ragione Sociale:</span>
                  <span className="font-bold text-slate-900 text-sm">{draft.buyerName || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Codice Fiscale / P.IVA:</span>
                  <span className="font-mono font-bold text-slate-900">{draft.buyerTaxCode || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Indirizzo di Residenza / Sede:</span>
                  <span className="text-slate-800">{draft.buyerAddress || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Recapiti di Contatto:</span>
                  <span className="text-slate-800">{draft.buyerPhone} • {draft.buyerEmail}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Vehicle Data */}
            <div className="mb-6">
              <div className="bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded mb-3 flex items-center justify-between">
                <span>2. Identificazione Veicolo Compravenduto</span>
                <span className="text-[10px] text-slate-500 font-normal">Scheda Tecnica & Telaio</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Marca & Modello:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {car ? `${car.brand} ${car.model}` : "Veicolo da confermare"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Allestimento / Versione:</span>
                  <span className="text-slate-800 font-medium">{car?.version || "Standard"}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Anno Immatricolazione:</span>
                  <span className="text-slate-800">{car?.year || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Chilometraggio Dichiarato:</span>
                  <span className="font-bold text-slate-900">
                    {car ? `${new Intl.NumberFormat("it-IT").format(car.mileage)} km` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Numero Telaio (VIN):</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {draft.vinNumber || "VIN-IN-FASE-DI-EMISSIONE"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Targa:</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {draft.plateNumber || "TARGA PROVVISORIA"}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Financials */}
            <div className="mb-6">
              <div className="bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded mb-3 flex items-center justify-between">
                <span>3. Corrispettivo Economico & Modalità di Pagamento</span>
                <span className="text-[10px] text-slate-500 font-normal">Quadro Contabile</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full">
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-800">Prezzo Totale Veicolo Concordato (IVA inclusa):</td>
                      <td className="p-2.5 text-right font-black text-slate-950 text-base">
                        € {new Intl.NumberFormat("it-IT").format(draft.salePrice)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-slate-600">Acconto / Caparra Confirmatoria già versata:</td>
                      <td className="p-2.5 text-right font-semibold text-emerald-700">
                        - € {new Intl.NumberFormat("it-IT").format(draft.depositAmount)}
                      </td>
                    </tr>
                    {draft.tradeInModel && (
                      <tr>
                        <td className="p-2.5 text-slate-600">
                          Valutazione Ritiro Permuta Usato ({draft.tradeInModel}):
                        </td>
                        <td className="p-2.5 text-right font-semibold text-blue-700">
                          - € {new Intl.NumberFormat("it-IT").format(draft.tradeInValue || 0)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-blue-50 font-bold">
                      <td className="p-2.5 text-blue-950">Saldo Dovuto alla Consegna:</td>
                      <td className="p-2.5 text-right font-black text-blue-950 text-base">
                        € {new Intl.NumberFormat("it-IT").format(draft.balanceAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Modalità saldo pattuita: <strong>{draft.paymentMethod}</strong> • Data prevista consegna: <strong>{draft.deliveryDate}</strong>
              </p>
            </div>

            {/* Section 4: Warranty & Legal */}
            <div className="mb-8 p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
              <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>4. Garanzia di Conformità & Dichiarazioni di Legge</span>
              </p>
              <p>
                Il veicolo sopra identificato è coperto da Garanzia Convenzionale di Conformità per la durata di{" "}
                <strong>{draft.warrantyDuration}</strong>, rilasciata da {site.companyName} secondo le disposizioni degli articoli 128 e seguenti del Codice del Consumo.
              </p>
              <p>
                Il Venditore attesta che il veicolo ha superato positivamente la check-list peritale dei 110 controlli tecnici, non è gravato da iscrizioni ipotecarie, sequestri o pignoramenti, ed è conforme ai dati anagrafici e chilometrici riportati nel presente atto.
              </p>
            </div>

            {/* Section 5: Signatures */}
            <div className="grid grid-cols-2 gap-10 pt-6 border-t border-slate-300 text-xs">
              <div className="text-center">
                <p className="text-slate-500 mb-12">Per {site.companyName}</p>
                <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                  (Firma della Direzione)
                </div>
              </div>

              <div className="text-center">
                <p className="text-slate-500 mb-12">L&apos;Acquirente per Accettazione ed Effetto</p>
                <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                  (Firma dell&apos;Acquirente)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
