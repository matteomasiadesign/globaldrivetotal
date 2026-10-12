"use client";

import React, { useState } from "react";
import { Paperclip } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import {
  ACCEPT_ATTR,
  deleteVehicleFile,
  getVehicleFileUrl,
  saveVehicleFile,
  validateVehicleFile,
} from "@/lib/storage/vehicleFiles";
import { useGestionale } from "@/context/GestionaleContext";
import { euro, nomeVeicolo } from "@/lib/gestionale/calc";
import {
  ATTIVITA,
  CATEGORIE_MOVIMENTO,
  NOME_ATTIVITA,
  NATURE_COSTO,
  PAGAMENTI,
  type Attivita,
  type NaturaCosto,
  type Pagamento,
  type StatoPagamento,
  type TipoMovimento,
} from "@/lib/gestionale/types";
import Combobox from "../ui/Combobox";
import Drawer from "../ui/Drawer";
import { Field, Section, ToggleRow } from "../ui/Field";
import { SelectField } from "../ui/Inputs";
import { btnSecondary, inputCls } from "../ui/styles";
import { useToast } from "../ui/Toast";
import { useAttivita } from "../Attivita";

export interface MovimentoEditorOptions {
  /** Movimento da modificare; se assente se ne crea uno nuovo. */
  movimentoId?: string;
  /** Nuovo movimento copiato da questo (costi ricorrenti), con la data di oggi. */
  duplicaDa?: string;
  /** Auto a cui collegare il nuovo movimento. */
  autoId?: string;
}

// Il pannello unico per registrare un'entrata o un'uscita, da qualunque pagina.
export default function MovimentoDrawer({
  movimentoId,
  duplicaDa,
  autoId,
  onClose,
}: MovimentoEditorOptions & { onClose: () => void }) {
  const { today } = useAdmin();
  const { movimenti, veicoli, contatti, impostazioni, addMovimento, updateMovimento, addContatto } = useGestionale();
  const { attivita: gestioneAperta } = useAttivita();
  const toast = useToast();
  const esistente = movimenti.find((m) => m.id === movimentoId);
  // Da copiare: tutti i campi tranne data, documento, saldo e riconciliazione.
  const base = esistente ?? movimenti.find((m) => m.id === duplicaDa);
  const [allegato, setAllegato] = useState<File | null>(null);
  const [togliAllegato, setTogliAllegato] = useState(false);
  const [busy, setBusy] = useState(false);

  const [f, setF] = useState(() => ({
    data: esistente?.data ?? today,
    tipo: (base?.tipo ?? "Uscita") as TipoMovimento,
    autoId: base?.autoId ?? autoId ?? "",
    // Un movimento nuovo va alla gestione dell'auto, se c'è, altrimenti a quella aperta.
    attivita: (base?.attivita ?? veicoli.find((v) => v.id === autoId)?.attivita ?? gestioneAperta) as Attivita,
    contattoId: base?.contattoId ?? "",
    descrizione: base?.descrizione ?? "",
    fornitoreCliente: base?.fornitoreCliente ?? "",
    categoria: base?.categoria ?? (autoId ? "Meccanica / Tagliando" : "Altro"),
    naturaCosto: (base?.naturaCosto ?? (autoId ? "Variabile diretto auto" : "Variabile generale")) as NaturaCosto,
    pagamento: (base?.pagamento ?? "CONTO") as Pagamento,
    imponibile: base ? String(base.imponibile) : "",
    iva: base ? String(base.iva) : "",
    ivaDetraibile: base?.ivaDetraibile ?? false,
    numeroDocumento: esistente?.numeroDocumento ?? "",
    statoPagamento: (base?.statoPagamento ?? "Saldato") as StatoPagamento,
    dataScadenza: esistente?.dataScadenza ?? "",
    dataSaldo: esistente?.dataSaldo ?? "",
  }));
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const contattoScelto = contatti.find((c) => c.id === f.contattoId);
  const imponibile = Number(f.imponibile) || 0;
  const iva = Number(f.iva) || 0;

  function scegliAuto(id: string) {
    setF((prev) => ({
      ...prev,
      autoId: id,
      attivita: veicoli.find((v) => v.id === id)?.attivita ?? prev.attivita,
      // Un costo di un'auto è "variabile diretto"; senza auto è un costo generale.
      naturaCosto: id
        ? "Variabile diretto auto"
        : prev.naturaCosto === "Variabile diretto auto"
          ? "Variabile generale"
          : prev.naturaCosto,
    }));
  }

  async function apriAllegato(path: string) {
    const url = await getVehicleFileUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast("Non trovo il file: potrebbe essere stato caricato da un altro browser");
  }

  // Il numero scritto in "Imponibile" è in realtà il totale: lo si divide in imponibile e IVA.
  function scorpora() {
    const totale = Number(f.imponibile) || 0;
    const netto = Math.round((totale / (1 + impostazioni.aliquotaIva)) * 100) / 100;
    setF((prev) => ({ ...prev, imponibile: String(netto), iva: String(Math.round((totale - netto) * 100) / 100) }));
  }

  async function submit() {
    const saldato = f.statoPagamento === "Saldato";
    let allegatoPath = togliAllegato ? "" : (esistente?.allegatoPath ?? "");
    let allegatoNome = togliAllegato ? "" : (esistente?.allegatoNome ?? "");
    if (allegato) {
      setBusy(true);
      try {
        allegatoPath = await saveVehicleFile(allegato, "movimenti");
        allegatoNome = allegato.name;
      } catch (e) {
        setBusy(false);
        toast(e instanceof Error ? e.message : "Allegato non salvato, riprova");
        return;
      }
    }
    // Il file sostituito o tolto non serve più.
    if (esistente?.allegatoPath && esistente.allegatoPath !== allegatoPath) void deleteVehicleFile(esistente.allegatoPath);
    const dati = {
      attivita: f.attivita,
      data: f.data,
      tipo: f.tipo,
      autoId: f.autoId || null,
      contattoId: f.contattoId || null,
      descrizione: f.descrizione.trim(),
      // Con un contatto scelto il nome segue l'anagrafica; altrimenti resta il testo scritto.
      fornitoreCliente: contattoScelto ? contattoScelto.nome : f.fornitoreCliente.trim(),
      categoria: f.categoria,
      naturaCosto: f.naturaCosto,
      pagamento: f.pagamento,
      imponibile,
      iva,
      ivaDetraibile: f.tipo === "Uscita" && f.ivaDetraibile,
      numeroDocumento: f.numeroDocumento.trim(),
      statoPagamento: f.statoPagamento,
      dataScadenza: saldato ? "" : f.dataScadenza,
      dataSaldo: saldato ? f.dataSaldo || f.data : "",
      allegatoPath,
      allegatoNome,
    };
    if (esistente) {
      updateMovimento(esistente.id, dati);
      toast("Movimento aggiornato");
    } else {
      addMovimento(dati);
      toast(`${f.tipo === "Entrata" ? "Entrata" : "Uscita"} di ${euro(imponibile + iva)} registrata`);
    }
    onClose();
  }

  return (
    <Drawer
      title={esistente ? "Modifica movimento" : duplicaDa ? "Duplica movimento" : "Nuovo movimento"}
      subtitle={
        esistente
          ? undefined
          : duplicaDa
            ? "Copia del movimento scelto: controlla data e importo"
            : "Un'entrata o un'uscita, collegata a un'auto o generale"
      }
      submitLabel={busy ? "Salvo…" : esistente ? "Salva modifiche" : "Registra"}
      submitDisabled={busy}
      busy={busy}
      onSubmit={() => void submit()}
      onClose={onClose}
      width="max-w-xl"
    >
      <Section title="Cos'è" columns={2}>
        <Field label="Tipo">
          <SelectField value={f.tipo} options={["Uscita", "Entrata"] as TipoMovimento[]} onChange={(v) => set("tipo", v)} />
        </Field>
        <Field label="Data">
          <input required type="date" value={f.data} onChange={(e) => set("data", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Auto" className="sm:col-span-2" hint="Lascia vuoto per un costo generale dell'attività.">
          <Combobox
            value={f.autoId}
            vuoto="— generale —"
            placeholder="Cerca per marca, modello o targa…"
            ariaLabel="Auto"
            opzioni={veicoli.map((v) => ({
              value: v.id,
              label: nomeVeicolo(v),
              dettaglio: v.attivita === "Noleggio" ? NOME_ATTIVITA.Noleggio : v.stato,
            }))}
            onChange={scegliAuto}
          />
        </Field>
        <Field label="Gestione" className="sm:col-span-2" hint="L'IVA resta unica per la società: serve a separare conti e incassi di vendita e noleggio.">
          <SelectField
            value={f.attivita}
            options={ATTIVITA.map((a) => ({ value: a, label: NOME_ATTIVITA[a] }))}
            onChange={(v) => set("attivita", v)}
          />
        </Field>
        <Field label="Descrizione" className="sm:col-span-2">
          <input
            autoFocus={!esistente}
            placeholder="es. Tagliando e filtri"
            value={f.descrizione}
            onChange={(e) => set("descrizione", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label={f.tipo === "Entrata" ? "Cliente" : "Fornitore"} className="sm:col-span-2" hint="Scegli dall'anagrafica per collegare il movimento al contatto.">
          <Combobox
            value={f.contattoId}
            vuoto="— non in anagrafica —"
            placeholder="Cerca per nome o telefono…"
            ariaLabel={f.tipo === "Entrata" ? "Cliente" : "Fornitore"}
            opzioni={contatti
              .filter((c) => (f.tipo === "Entrata" ? c.tipo !== "Fornitore" : c.tipo !== "Cliente") || c.id === f.contattoId)
              .map((c) => ({ value: c.id, label: c.nome || "Senza nome", dettaglio: c.telefono }))}
            onChange={(v) => set("contattoId", v)}
            creaLabel={f.tipo === "Entrata" ? "Nuovo cliente" : "Nuovo fornitore"}
            onCrea={(nome) => addContatto({ nome, tipo: f.tipo === "Entrata" ? "Cliente" : "Fornitore" }).id}
          />
        </Field>
        {!f.contattoId && (
          <Field label="Nome (se non è in anagrafica)" className="sm:col-span-2">
            <input value={f.fornitoreCliente} onChange={(e) => set("fornitoreCliente", e.target.value)} className={inputCls} />
          </Field>
        )}
        <Field label="Categoria">
          <SelectField value={f.categoria} options={CATEGORIE_MOVIMENTO} onChange={(v) => set("categoria", v)} />
        </Field>
        <Field label="Natura del costo">
          <SelectField value={f.naturaCosto} options={NATURE_COSTO} onChange={(v) => set("naturaCosto", v)} />
        </Field>
      </Section>

      <Section title="Importi" columns={3}>
        <Field label="Imponibile (€)">
          <input required type="number" step="0.01" value={f.imponibile} onChange={(e) => set("imponibile", e.target.value)} className={inputCls} />
        </Field>
        <Field label="IVA (€)">
          <input type="number" step="0.01" value={f.iva} onChange={(e) => set("iva", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Totale">
          <div className={`${inputCls} flex items-center font-semibold tabular-nums text-white`}>{euro(imponibile + iva)}</div>
        </Field>
        <div className="flex flex-wrap gap-2 sm:col-span-3">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => set("iva", String(Math.round(imponibile * impostazioni.aliquotaIva * 100) / 100))}
          >
            Calcola IVA al {Math.round(impostazioni.aliquotaIva * 10000) / 100}%
          </button>
          <button
            type="button"
            className={btnSecondary}
            title="Scrivi in Imponibile il totale IVA inclusa e premi qui"
            onClick={scorpora}
          >
            Ho il totale: scorpora l&apos;IVA
          </button>
        </div>
        <Field label="Pagamento">
          <SelectField value={f.pagamento} options={PAGAMENTI} onChange={(v) => set("pagamento", v)} />
        </Field>
        <Field label="N. documento" className="sm:col-span-2">
          <input placeholder="es. fattura 112/2026" value={f.numeroDocumento} onChange={(e) => set("numeroDocumento", e.target.value)} className={inputCls} />
        </Field>
        {f.tipo === "Uscita" && (
          <div className="sm:col-span-3">
            <ToggleRow
              title="IVA detraibile"
              description="Entra nel registro acquisti e nella liquidazione IVA."
              checked={f.ivaDetraibile}
              onChange={(v) => set("ivaDetraibile", v)}
            />
          </div>
        )}
      </Section>

      <Section title="Pagamento" columns={2}>
        <Field label="Stato">
          <SelectField value={f.statoPagamento} options={["Saldato", "Da saldare"] as StatoPagamento[]} onChange={(v) => set("statoPagamento", v)} />
        </Field>
        {f.statoPagamento === "Da saldare" ? (
          <Field label="Scadenza">
            <input required type="date" value={f.dataScadenza} onChange={(e) => set("dataScadenza", e.target.value)} className={inputCls} />
          </Field>
        ) : (
          <Field label="Data del saldo" hint="Vuota = la data del movimento.">
            <input type="date" value={f.dataSaldo} onChange={(e) => set("dataSaldo", e.target.value)} className={inputCls} />
          </Field>
        )}
      </Section>

      <Section title="Allegato">
        {esistente?.allegatoPath && !togliAllegato && !allegato ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-adm-line bg-adm-bg px-3.5 py-2.5 text-sm">
            <Paperclip className="size-4 text-adm-muted" />
            <span className="min-w-0 flex-1 truncate text-slate-200">{esistente.allegatoNome || "Documento"}</span>
            <button type="button" className={btnSecondary} onClick={() => void apriAllegato(esistente.allegatoPath)}>
              Apri
            </button>
            <button type="button" className={btnSecondary} onClick={() => setTogliAllegato(true)}>
              Togli
            </button>
          </div>
        ) : (
          <Field label="Fattura o ricevuta (PDF o foto, facoltativa)">
            <input
              type="file"
              accept={ACCEPT_ATTR}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                const errore = file ? validateVehicleFile(file) : null;
                if (errore) {
                  toast(errore);
                  e.target.value = "";
                  return;
                }
                setAllegato(file);
              }}
              className={`${inputCls} file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-2.5 file:py-1 file:text-sm file:text-slate-200`}
            />
          </Field>
        )}
      </Section>
    </Drawer>
  );
}
