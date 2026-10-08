"use client";

import React, { useState } from "react";
import { useGestionale } from "@/context/GestionaleContext";
import { TIPI_CONTATTO, type TipoContatto } from "@/lib/gestionale/types";
import Drawer from "../ui/Drawer";
import { Field, Section } from "../ui/Field";
import { SelectField } from "../ui/Inputs";
import { inputCls, textareaCls } from "../ui/styles";
import { useToast } from "../ui/Toast";

export interface ContattoEditorOptions {
  /** Contatto da modificare; se assente se ne crea uno nuovo. */
  contattoId?: string;
  /** Dati con cui precompilare un nuovo contatto (es. da una richiesta). */
  prefill?: { nome?: string; telefono?: string; email?: string; note?: string };
}

export default function ContattoDrawer({
  contattoId,
  prefill,
  onClose,
}: ContattoEditorOptions & { onClose: () => void }) {
  const { contatti, addContatto, updateContatto } = useGestionale();
  const toast = useToast();
  const esistente = contatti.find((c) => c.id === contattoId);

  const [f, setF] = useState(() => ({
    tipo: (esistente?.tipo ?? "Cliente") as TipoContatto,
    nome: esistente?.nome ?? prefill?.nome ?? "",
    telefono: esistente?.telefono ?? prefill?.telefono ?? "",
    email: esistente?.email ?? prefill?.email ?? "",
    codiceFiscale: esistente?.codiceFiscale ?? "",
    nascitaSede: esistente?.nascitaSede ?? "",
    residenza: esistente?.residenza ?? "",
    numeroPatente: esistente?.numeroPatente ?? "",
    scadenzaPatente: esistente?.scadenzaPatente ?? "",
    numeroDocumento: esistente?.numeroDocumento ?? "",
    note: esistente?.note ?? prefill?.note ?? "",
  }));
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  function submit() {
    const dati = {
      ...f,
      nome: f.nome.trim(),
      telefono: f.telefono.trim(),
      email: f.email.trim(),
      codiceFiscale: f.codiceFiscale.trim().toUpperCase(),
      numeroPatente: f.numeroPatente.trim().toUpperCase(),
    };
    if (esistente) {
      updateContatto(esistente.id, dati);
      toast("Contatto aggiornato");
    } else {
      addContatto(dati);
      toast(`${dati.nome} salvato in anagrafica`);
    }
    onClose();
  }

  return (
    <Drawer
      title={esistente ? esistente.nome || "Contatto" : "Nuovo contatto"}
      subtitle="Clienti e fornitori in un'unica anagrafica"
      submitLabel={esistente ? "Salva modifiche" : "Salva contatto"}
      onSubmit={submit}
      onClose={onClose}
    >
      <Section title="Contatto" columns={2}>
        <Field label="Nome o ragione sociale" className="sm:col-span-2">
          <input required autoFocus={!esistente} value={f.nome} onChange={(e) => set("nome", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Tipo">
          <SelectField value={f.tipo} options={TIPI_CONTATTO} onChange={(v) => set("tipo", v)} />
        </Field>
        <Field label="Telefono">
          <input type="tel" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title="Dati per i contratti" columns={2}>
        <Field label="Codice fiscale / P.IVA">
          <input value={f.codiceFiscale} onChange={(e) => set("codiceFiscale", e.target.value)} className={`${inputCls} uppercase`} />
        </Field>
        <Field label="Luogo e data di nascita">
          <input placeholder="Sassari, 15/10/1990" value={f.nascitaSede} onChange={(e) => set("nascitaSede", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Residenza o sede" className="sm:col-span-2">
          <input value={f.residenza} onChange={(e) => set("residenza", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title="Patente e documento (per il noleggio)" columns={2}>
        <Field label="N. patente">
          <input value={f.numeroPatente} onChange={(e) => set("numeroPatente", e.target.value)} className={`${inputCls} uppercase`} />
        </Field>
        <Field label="Scadenza patente">
          <input type="date" value={f.scadenzaPatente} onChange={(e) => set("scadenzaPatente", e.target.value)} className={inputCls} />
        </Field>
        <Field label="N. documento d'identità" className="sm:col-span-2">
          <input value={f.numeroDocumento} onChange={(e) => set("numeroDocumento", e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title="Note" columns={1}>
        <textarea rows={3} value={f.note} onChange={(e) => set("note", e.target.value)} className={textareaCls} aria-label="Note" />
      </Section>
    </Drawer>
  );
}
