"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Phone } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { formatDate } from "@/lib/admin/dates";
import { telLink } from "@/lib/admin/phone";
import { euro, nomeVeicolo } from "@/lib/gestionale/calc";
import { importoPrenotazione } from "@/lib/gestionale/rent";
import { useEditors } from "../AdminEditors";
import { TIPI_CONTATTO, type TipoContatto } from "@/lib/gestionale/types";
import Drawer from "../ui/Drawer";
import { Field, Section } from "../ui/Field";
import { SelectField } from "../ui/Inputs";
import { btnSecondary, inputCls, textareaCls } from "../ui/styles";
import { useToast } from "../ui/Toast";

export interface ContattoEditorOptions {
  /** Contatto da modificare; se assente se ne crea uno nuovo. */
  contattoId?: string;
  /** Richiesta da cui nasce il contatto: la richiesta ricorderà il collegamento. */
  leadId?: string;
  /** Dati con cui precompilare un nuovo contatto (es. da una richiesta). */
  prefill?: { nome?: string; telefono?: string; email?: string; note?: string };
}

export default function ContattoDrawer({
  contattoId,
  leadId,
  prefill,
  onClose,
}: ContattoEditorOptions & { onClose: () => void }) {
  const router = useRouter();
  const { updateLead, leads, appointments, isAdmin } = useAdmin();
  const { openAppointment, openMovimento } = useEditors();
  const { contatti, veicoli, movimenti, noleggio, addContatto, updateContatto } = useGestionale();
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
      const creato = addContatto(dati);
      if (leadId) updateLead(leadId, { contattoId: creato.id });
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

      {esistente && (
        <Section title="Storia del cliente" columns={1}>
          {(() => {
            const cifre = (p: string) => p.replace(/\D/g, "");
            const tel = cifre(esistente.telefono);
            const auto = veicoli.filter((v) => v.acquirenteId === esistente.id || v.fornitoreId === esistente.id);
            const suoi = movimenti.filter((m) => m.contattoId === esistente.id);
            const daSaldare = suoi.filter((m) => m.statoPagamento === "Da saldare");
            const richieste = leads.filter((l) => l.contattoId === esistente.id || (tel.length >= 6 && cifre(l.phone) === tel));
            const appuntamenti = appointments.filter(
              (a) => (a.leadId && richieste.some((l) => l.id === a.leadId)) || (tel.length >= 6 && cifre(a.clientPhone) === tel)
            );
            const noleggi = noleggio.prenotazioni.filter((p) => p.contattoId === esistente.id);
            const vai = (href: string) => {
              onClose();
              router.push(href);
            };
            const riga = "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-white/5";
            const vuoto = auto.length + suoi.length + richieste.length + appuntamenti.length + noleggi.length === 0;
            return (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {esistente.telefono && (
                    <a href={telLink(esistente.telefono)} className={btnSecondary}>
                      <Phone className="size-4" />
                      Chiama
                    </a>
                  )}
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() =>
                      openAppointment({
                        prefill: { clientName: esistente.nome, clientPhone: esistente.telefono, clientEmail: esistente.email },
                      })
                    }
                  >
                    <CalendarPlus className="size-4" />
                    Fissa appuntamento
                  </button>
                </div>
                {vuoto && <p className="text-sm text-adm-muted">Ancora nessuna auto, movimento, richiesta o noleggio collegati.</p>}
                {auto.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-adm-muted">Auto</p>
                    {auto.map((v) => (
                      <button key={v.id} type="button" disabled={!isAdmin} onClick={() => vai(`/admin/auto/${v.id}`)} className={riga}>
                        <span className="truncate">{nomeVeicolo(v)}</span>
                        <span className="shrink-0 text-xs text-adm-muted">
                          {v.acquirenteId === esistente.id ? "ha acquistato" : "ci ha venduto"} · {v.stato}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {isAdmin && suoi.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-adm-muted">Movimenti</p>
                    <p className="px-2 text-sm text-slate-300">
                      {suoi.length} {suoi.length === 1 ? "movimento" : "movimenti"} · saldo{" "}
                      {euro(suoi.reduce((s, m) => s + (m.tipo === "Entrata" ? m.totale : -m.totale), 0))}
                      {daSaldare.length > 0 && (
                        <span className="text-amber-300"> · {euro(daSaldare.reduce((s, m) => s + m.totale, 0))} ancora da saldare</span>
                      )}
                    </p>
                    {[...suoi].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5).map((m) => (
                      <button key={m.id} type="button" onClick={() => openMovimento({ movimentoId: m.id })} className={riga}>
                        <span className="truncate">
                          {formatDate(m.data)} · {m.descrizione || m.categoria}
                        </span>
                        <span className={`shrink-0 tabular-nums ${m.tipo === "Entrata" ? "text-emerald-400" : ""}`}>
                          {m.tipo === "Entrata" ? "+" : "−"} {euro(m.totale)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {richieste.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-adm-muted">Richieste dal sito</p>
                    {richieste.slice(0, 5).map((l) => (
                      <button key={l.id} type="button" onClick={() => vai(`/admin/richieste?stato=${l.status === "completato" || l.status === "scartato" ? "chiuse" : l.status}`)} className={riga}>
                        <span className="truncate">{l.carLabel || l.message || "Richiesta"}</span>
                        <span className="shrink-0 text-xs text-adm-muted">{formatDate(l.createdAt.slice(0, 10))} · {l.status.replace("_", " ")}</span>
                      </button>
                    ))}
                  </div>
                )}
                {appuntamenti.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-adm-muted">Appuntamenti</p>
                    {appuntamenti.slice(0, 5).map((a) => (
                      <button key={a.id} type="button" onClick={() => openAppointment({ appointment: a })} className={riga}>
                        <span className="truncate">
                          {a.type}
                          {a.carName ? ` · ${a.carName}` : ""}
                        </span>
                        <span className="shrink-0 text-xs text-adm-muted">
                          {formatDate(a.date)} {a.time} · {a.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {noleggi.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-adm-muted">Noleggi</p>
                    {noleggi.slice(0, 5).map((p) => (
                      <button key={p.id} type="button" onClick={() => vai("/admin/noleggio/prenotazioni")} className={riga}>
                        <span className="truncate">
                          {formatDate(p.dataInizio)} → {formatDate(p.dataFine)}
                        </span>
                        <span className="shrink-0 text-xs text-adm-muted">
                          {p.stato} · {euro(importoPrenotazione(p))}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </Section>
      )}

      <Section title="Note" columns={1}>
        <textarea rows={3} value={f.note} onChange={(e) => set("note", e.target.value)} className={textareaCls} aria-label="Note" />
      </Section>
    </Drawer>
  );
}
