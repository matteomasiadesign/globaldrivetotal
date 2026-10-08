"use client";

import React, { useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { euro, nomeVeicolo } from "@/lib/gestionale/calc";
import {
  CATEGORIE_MOVIMENTO,
  NATURE_COSTO,
  PAGAMENTI,
  type NaturaCosto,
  type Pagamento,
  type StatoPagamento,
  type TipoMovimento,
} from "@/lib/gestionale/types";
import Drawer from "../ui/Drawer";
import { Field, Section, ToggleRow } from "../ui/Field";
import { SelectField } from "../ui/Inputs";
import { btnSecondary, inputCls } from "../ui/styles";
import { useToast } from "../ui/Toast";

export interface MovimentoEditorOptions {
  /** Movimento da modificare; se assente se ne crea uno nuovo. */
  movimentoId?: string;
  /** Auto a cui collegare il nuovo movimento. */
  autoId?: string;
}

// Il pannello unico per registrare un'entrata o un'uscita, da qualunque pagina.
export default function MovimentoDrawer({
  movimentoId,
  autoId,
  onClose,
}: MovimentoEditorOptions & { onClose: () => void }) {
  const { today } = useAdmin();
  const { movimenti, veicoli, contatti, impostazioni, addMovimento, updateMovimento } = useGestionale();
  const toast = useToast();
  const esistente = movimenti.find((m) => m.id === movimentoId);

  const [f, setF] = useState(() => ({
    data: esistente?.data ?? today,
    tipo: (esistente?.tipo ?? "Uscita") as TipoMovimento,
    autoId: esistente?.autoId ?? autoId ?? "",
    contattoId: esistente?.contattoId ?? "",
    descrizione: esistente?.descrizione ?? "",
    fornitoreCliente: esistente?.fornitoreCliente ?? "",
    categoria: esistente?.categoria ?? (autoId ? "Meccanica / Tagliando" : "Altro"),
    naturaCosto: (esistente?.naturaCosto ?? (autoId ? "Variabile diretto auto" : "Variabile generale")) as NaturaCosto,
    pagamento: (esistente?.pagamento ?? "CONTO") as Pagamento,
    imponibile: esistente ? String(esistente.imponibile) : "",
    iva: esistente ? String(esistente.iva) : "",
    ivaDetraibile: esistente?.ivaDetraibile ?? false,
    numeroDocumento: esistente?.numeroDocumento ?? "",
    statoPagamento: (esistente?.statoPagamento ?? "Saldato") as StatoPagamento,
    dataScadenza: esistente?.dataScadenza ?? "",
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
      // Un costo di un'auto è "variabile diretto"; senza auto è un costo generale.
      naturaCosto: id
        ? "Variabile diretto auto"
        : prev.naturaCosto === "Variabile diretto auto"
          ? "Variabile generale"
          : prev.naturaCosto,
    }));
  }

  function submit() {
    const saldato = f.statoPagamento === "Saldato";
    const dati = {
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
      dataSaldo: saldato ? esistente?.dataSaldo || f.data : "",
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
      title={esistente ? "Modifica movimento" : "Nuovo movimento"}
      subtitle={esistente ? undefined : "Un'entrata o un'uscita, collegata a un'auto o generale"}
      submitLabel={esistente ? "Salva modifiche" : "Registra"}
      onSubmit={submit}
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
          <SelectField
            value={f.autoId}
            blank="— generale —"
            options={veicoli.map((v) => ({ value: v.id, label: nomeVeicolo(v) }))}
            onChange={scegliAuto}
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
          <SelectField
            value={f.contattoId}
            blank="— non in anagrafica —"
            options={contatti
              .filter((c) => (f.tipo === "Entrata" ? c.tipo !== "Fornitore" : c.tipo !== "Cliente") || c.id === f.contattoId)
              .map((c) => ({ value: c.id, label: c.nome }))}
            onChange={(v) => set("contattoId", v)}
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
        <div className="sm:col-span-3">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => set("iva", String(Math.round(imponibile * impostazioni.aliquotaIva * 100) / 100))}
          >
            Calcola IVA al {Math.round(impostazioni.aliquotaIva * 10000) / 100}%
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
        {f.statoPagamento === "Da saldare" && (
          <Field label="Scadenza">
            <input required type="date" value={f.dataScadenza} onChange={(e) => set("dataScadenza", e.target.value)} className={inputCls} />
          </Field>
        )}
      </Section>
    </Drawer>
  );
}
