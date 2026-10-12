"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { useSite } from "@/context/SiteContext";
import { euro, nomeVeicolo } from "@/lib/gestionale/calc";
import { generaContrattoVenditaPDF } from "@/lib/gestionale/contractPdf";
import { formatBytes, saveVehicleFile } from "@/lib/storage/vehicleFiles";
import Drawer from "../ui/Drawer";
import { Field, Section, ToggleRow } from "../ui/Field";
import { SelectField } from "../ui/Inputs";
import { inputCls } from "../ui/styles";
import { useToast } from "../ui/Toast";

const PAGAMENTI_CONTRATTO = ["Bonifico bancario", "Contanti", "Assegno", "Finanziamento"] as const;

// Contratto di compravendita in PDF. Intestazione e numerazione arrivano da
// /admin/sito e dalle impostazioni; l'acquirente si sceglie dall'anagrafica o si
// scrive. Alla generazione l'auto risulta venduta e il cliente resta in anagrafica.
export default function SaleContractDrawer({
  veicoloId,
  onClose,
}: {
  veicoloId: string;
  onClose: () => void;
}) {
  const { today, documents, addDocument, deleteDocument } = useAdmin();
  const { site } = useSite();
  const { veicoli, contatti, impostazioni, updateVeicolo, registraVendita, prossimoContratto } = useGestionale();
  const toast = useToast();
  const veicolo = veicoli.find((v) => v.id === veicoloId);
  // Ristampa: si riparte dall'acquirente già registrato sulla scheda.
  const giaAcquirente = contatti.find((c) => c.id === veicolo?.acquirenteId);

  const [f, setF] = useState(() => ({
    targa: veicolo?.targa ?? "",
    contattoId: giaAcquirente?.id ?? "",
    nome: giaAcquirente?.nome ?? "",
    nascitaSede: giaAcquirente?.nascitaSede ?? "",
    codiceFiscale: giaAcquirente?.codiceFiscale ?? "",
    residenza: giaAcquirente?.residenza ?? "",
    telefono: giaAcquirente?.telefono ?? "",
    email: giaAcquirente?.email ?? "",
    prezzoVendita: veicolo?.prezzoVendita ? String(veicolo.prezzoVendita) : "",
    dataVendita: veicolo?.dataVendita || today,
    dataConsegna: "",
    strumentoPagamento: PAGAMENTI_CONTRATTO[0] as string,
    estensioneGaranzia: false,
    luogoData: "",
  }));
  const [generating, setGenerating] = useState(false);
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  if (!veicolo) return null;

  const contratto = prossimoContratto(veicolo.id, f.dataVendita);
  const etichettaNumero = `N° ${contratto.numero}/${contratto.anno}`;
  const clienti = contatti.filter((c) => c.tipo !== "Fornitore");
  const aziendaIncompleta = !site.vatNumber || !site.legalAddress;

  function precompila(id: string) {
    const c = contatti.find((x) => x.id === id);
    if (!c) return;
    setF((prev) => ({
      ...prev,
      contattoId: c.id,
      nome: c.nome,
      nascitaSede: c.nascitaSede,
      codiceFiscale: c.codiceFiscale,
      residenza: c.residenza,
      telefono: c.telefono,
      email: c.email,
    }));
  }

  async function submit() {
    if (!veicolo) return;
    const prezzoVendita = Number(f.prezzoVendita) || 0;
    if (prezzoVendita <= 0) {
      toast("Indica il prezzo di vendita");
      return;
    }
    if (f.dataConsegna && f.dataConsegna < f.dataVendita) {
      toast("La consegna non può precedere la vendita");
      return;
    }
    const targa = f.targa.trim().toUpperCase();
    const schedaAggiornata = { ...veicolo, targa, prezzoVendita, dataVendita: f.dataVendita };
    const acquirente = {
      nome: f.nome.trim(),
      nascitaSede: f.nascitaSede.trim(),
      codiceFiscale: f.codiceFiscale.trim().toUpperCase(),
      residenza: f.residenza.trim(),
      telefono: f.telefono.trim(),
      email: f.email.trim(),
    };

    setGenerating(true);
    let pdf: File;
    try {
      ({ file: pdf } = await generaContrattoVenditaPDF(
        schedaAggiornata,
        { marca: veicolo.marca, modello: veicolo.modello, targa },
        {
          ragioneSociale: site.companyName,
          partitaIva: site.vatNumber,
          indirizzo: site.legalAddress,
          telefono: site.phone,
          email: site.email,
          pec: impostazioni.pecAzienda,
          numeroContratto: contratto.numero,
          anno: contratto.anno,
        },
        acquirente,
        {
          dataConsegna: f.dataConsegna,
          strumentoPagamento: f.strumentoPagamento,
          estensioneGaranzia: f.estensioneGaranzia,
          luogoData: f.luogoData,
        }
      ));
    } catch (e) {
      console.error("Contratto non generato", e);
      toast("Non sono riuscito a generare il PDF, riprova");
      setGenerating(false);
      return;
    }

    if (targa !== veicolo.targa) updateVeicolo(veicolo.id, { targa });
    registraVendita(veicolo.id, {
      prezzoVendita,
      dataVendita: f.dataVendita,
      dataConsegna: f.dataConsegna,
      acquirente,
      contattoId: f.contattoId || null,
      strumentoPagamento: f.strumentoPagamento,
      contratto,
    });

    // Il PDF resta nel dossier dell'auto (per un'auto fuori catalogo la chiave è la scheda economica).
    // Codice fiscale e indirizzo restano nel PDF e in anagrafica, non nelle note.
    const chiaveDossier = veicolo.carId ?? veicolo.id;
    const titolo = `Contratto di vendita ${etichettaNumero}`;
    let storagePath: string | undefined;
    try {
      storagePath = await saveVehicleFile(pdf, chiaveDossier);
    } catch (e) {
      console.error("PDF del contratto non archiviato", e);
    }
    // Una ristampa sostituisce la copia precedente con lo stesso numero.
    if (contratto.ristampa) {
      documents
        .filter((d) => d.carId === chiaveDossier && d.category === "Contratto di Vendita" && d.title === titolo)
        .forEach((d) => deleteDocument(d.id));
    }
    addDocument({
      carId: chiaveDossier,
      carTitle: nomeVeicolo(schedaAggiornata),
      title: titolo,
      category: "Contratto di Vendita",
      source: "local_pdf",
      storagePath,
      fileName: pdf.name,
      fileSize: formatBytes(pdf.size),
      notes: `Acquirente ${acquirente.nome || "non indicato"} · ${euro(prezzoVendita)}`,
    });
    toast(
      storagePath
        ? `Contratto ${etichettaNumero} generato e salvato nel dossier: ${nomeVeicolo(schedaAggiornata)} risulta venduta`
        : `Contratto ${etichettaNumero} scaricato, ma non salvato nel dossier: caricalo a mano da Documenti`
    );
    onClose();
  }

  return (
    <Drawer
      title="Contratto di vendita"
      subtitle={`${nomeVeicolo(veicolo)} · ${etichettaNumero}`}
      submitLabel={generating ? "Genero il PDF…" : contratto.ristampa ? "Ristampa PDF" : "Genera e scarica PDF"}
      submitDisabled={generating}
      busy={generating}
      onSubmit={submit}
      onClose={onClose}
      width="max-w-xl"
    >
      <div className="rounded-lg border border-adm-line bg-adm-bg px-3.5 py-3 text-sm text-slate-300">
        Alla generazione l&apos;auto passa a <span className="font-medium text-white">Venduta</span>
        {veicolo.carId ? " e il catalogo del sito si aggiorna" : ""}; l&apos;acquirente resta in anagrafica e il PDF
        nel dossier dell&apos;auto.
        {contratto.ristampa && (
          <span className="mt-1.5 block text-amber-300">
            Questa auto ha già il contratto {etichettaNumero}: viene ristampato con lo stesso numero e sostituisce la
            copia nel dossier.
          </span>
        )}
        {aziendaIncompleta && (
          <span className="mt-1.5 block text-amber-300">
            Mancano partita IVA o sede legale dell&apos;azienda: compaiono vuote nel contratto.{" "}
            <Link href="/admin/sito" onClick={onClose} className="underline">
              Completali in Sito
            </Link>
            .
          </span>
        )}
      </div>

      <Section title="Veicolo" columns={2}>
        <Field label="Targa" hint="Obbligatoria in contratto.">
          <input required autoFocus value={f.targa} onChange={(e) => set("targa", e.target.value)} className={`${inputCls} uppercase`} />
        </Field>
        <Field label="Chilometri" hint="Si modificano nella scheda dell'auto.">
          <div className={`${inputCls} flex items-center text-adm-muted`}>
            {veicolo.chilometraggio ? `${veicolo.chilometraggio.toLocaleString("it-IT")} km` : "km non indicati"}
          </div>
        </Field>
      </Section>

      <Section title="Acquirente" columns={2}>
        {clienti.length > 0 && (
          <Field label="Dall'anagrafica" className="sm:col-span-2">
            <SelectField
              value=""
              blank="— scegli un cliente o compila sotto —"
              options={clienti.map((c) => ({ value: c.id, label: c.nome }))}
              onChange={precompila}
            />
          </Field>
        )}
        <Field label="Nome o ragione sociale" className="sm:col-span-2">
          <input required value={f.nome} onChange={(e) => set("nome", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Luogo e data di nascita">
          <input placeholder="Sassari, 15/10/1990" value={f.nascitaSede} onChange={(e) => set("nascitaSede", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Codice fiscale / P.IVA">
          <input value={f.codiceFiscale} onChange={(e) => set("codiceFiscale", e.target.value)} className={`${inputCls} uppercase`} />
        </Field>
        <Field label="Residenza" className="sm:col-span-2">
          <input value={f.residenza} onChange={(e) => set("residenza", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Telefono">
          <input type="tel" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Email">
          <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title="Termini" columns={2}>
        <Field label="Prezzo di vendita (€)">
          <input required type="number" min={1} value={f.prezzoVendita} onChange={(e) => set("prezzoVendita", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Data vendita">
          <input required type="date" value={f.dataVendita} onChange={(e) => set("dataVendita", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Data consegna">
          <input type="date" value={f.dataConsegna} onChange={(e) => set("dataConsegna", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Strumento di pagamento">
          <SelectField value={f.strumentoPagamento} options={PAGAMENTI_CONTRATTO} onChange={(v) => set("strumentoPagamento", v)} />
        </Field>
        <Field label="Luogo e data di sottoscrizione" className="sm:col-span-2">
          <input placeholder="Sassari, 19/06/2026" value={f.luogoData} onChange={(e) => set("luogoData", e.target.value)} className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <ToggleRow
            title="Estensione di garanzia"
            description="L'acquirente sottoscrive anche l'estensione di garanzia (art. 6)."
            checked={f.estensioneGaranzia}
            onChange={(v) => set("estensioneGaranzia", v)}
          />
        </div>
      </Section>
    </Drawer>
  );
}
