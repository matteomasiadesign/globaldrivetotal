"use client";

import React, { useState } from "react";
import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import { useGestionale } from "@/context/GestionaleContext";
import { formatDate } from "@/lib/admin/dates";
import { euro } from "@/lib/gestionale/calc";
import {
  LIVELLI_CARBURANTE,
  STATI_PRENOTAZIONE,
  giorniNoleggio,
  importoPrenotazione,
  nomeRentVeicolo,
  tariffaPerPeriodo,
  type StatoPrenotazione,
} from "@/lib/gestionale/rent";
import Drawer from "../../ui/Drawer";
import { Field, Section } from "../../ui/Field";
import { SelectField } from "../../ui/Inputs";
import { EmptyState, FilterTabs, type TabOption } from "../../ui/Layout";
import RowMenu from "../../ui/RowMenu";
import { btnPrimary, focusRing, inputCls, rowDivider, textareaCls } from "../../ui/styles";
import { useToast } from "../../ui/Toast";

function PrenotazioneDrawer({ prenotazioneId, onClose }: { prenotazioneId?: string; onClose: () => void }) {
  const { noleggio, contatti, addPrenotazione, updatePrenotazione } = useGestionale();
  const toast = useToast();
  const esistente = noleggio.prenotazioni.find((p) => p.id === prenotazioneId);
  const [f, setF] = useState({
    veicoloId: esistente?.veicoloId ?? "",
    contattoId: esistente?.contattoId ?? "",
    clienteNomeLibero: esistente?.clienteNomeLibero ?? "",
    dataInizio: esistente?.dataInizio ?? "",
    dataFine: esistente?.dataFine ?? "",
    tariffa: esistente ? String(esistente.tariffaApplicata) : "",
    cauzione: esistente?.cauzione ? String(esistente.cauzione) : "",
    luogoRitiro: esistente?.luogoRitiro ?? "",
    luogoRiconsegna: esistente?.luogoRiconsegna ?? "",
    stato: (esistente?.stato ?? "Prenotata") as StatoPrenotazione,
    kmRitiro: esistente?.kmRitiro != null ? String(esistente.kmRitiro) : "",
    kmRiconsegna: esistente?.kmRiconsegna != null ? String(esistente.kmRiconsegna) : "",
    carburanteRitiro: esistente?.carburanteRitiro ?? "",
    carburanteRiconsegna: esistente?.carburanteRiconsegna ?? "",
    note: esistente?.note ?? "",
  });
  const [errore, setErrore] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const auto = noleggio.veicoli.find((v) => v.id === f.veicoloId);
  // Tariffa proposta: quella del periodo per la categoria, altrimenti la base dell'auto.
  const proposta = auto ? tariffaPerPeriodo(auto.categoria, f.dataInizio, noleggio.tariffe, auto.tariffaGiornaliera) : null;
  const tariffa = f.tariffa !== "" ? Number(f.tariffa) || 0 : (proposta?.tariffa ?? 0);
  const giorni = f.dataInizio && f.dataFine ? giorniNoleggio(f.dataInizio, f.dataFine) : 0;
  const km = (s: string) => (s.trim() === "" ? null : Math.max(0, Math.round(Number(s) || 0)));

  function submit() {
    if (!f.veicoloId) return setErrore("Scegli l'auto.");
    const dati = {
      veicoloId: f.veicoloId,
      contattoId: f.contattoId || null,
      clienteNomeLibero: f.contattoId ? "" : f.clienteNomeLibero.trim(),
      dataInizio: f.dataInizio,
      dataFine: f.dataFine,
      tariffaApplicata: tariffa,
      cauzione: Number(f.cauzione) || 0,
      luogoRitiro: f.luogoRitiro.trim(),
      luogoRiconsegna: f.luogoRiconsegna.trim(),
      kmRitiro: km(f.kmRitiro),
      kmRiconsegna: km(f.kmRiconsegna),
      carburanteRitiro: f.carburanteRitiro,
      carburanteRiconsegna: f.carburanteRiconsegna,
      note: f.note.trim(),
    };
    const kmR = dati.kmRitiro;
    const kmC = dati.kmRiconsegna;
    if (kmR !== null && kmC !== null && kmC < kmR) return setErrore("I km alla riconsegna non possono essere meno di quelli al ritiro.");
    const esito = esistente ? updatePrenotazione(esistente.id, { ...dati, stato: f.stato }) : addPrenotazione(dati);
    if (!esito.ok) return setErrore(esito.errore);
    toast(
      esistente
        ? f.stato === "Conclusa" && esistente.stato !== "Conclusa"
          ? "Noleggio concluso: l'incasso è tra i movimenti da saldare"
          : "Prenotazione aggiornata"
        : "Prenotazione salvata"
    );
    onClose();
  }

  return (
    <Drawer
      title={esistente ? "Prenotazione" : "Nuova prenotazione"}
      subtitle={esistente && auto ? nomeRentVeicolo(auto) : undefined}
      submitLabel={esistente ? "Salva modifiche" : "Salva prenotazione"}
      onSubmit={submit}
      onClose={onClose}
    >
      {errore && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {errore}
        </p>
      )}
      <Section title="Noleggio" columns={2}>
        <Field label="Auto" className="sm:col-span-2">
          <SelectField
            value={f.veicoloId}
            blank="— scegli —"
            options={noleggio.veicoli.map((v) => ({
              value: v.id,
              label: `${nomeRentVeicolo(v)}${v.stato === "Fuori servizio" || v.stato === "In manutenzione" ? ` (${v.stato.toLowerCase()})` : ""}`,
            }))}
            onChange={(v) => set("veicoloId", v)}
          />
        </Field>
        <Field label="Cliente" className="sm:col-span-2" hint="Patente e documento si inseriscono nella scheda del contatto.">
          <SelectField
            value={f.contattoId}
            blank="— non ancora in anagrafica —"
            options={contatti.filter((c) => c.tipo !== "Fornitore" || c.id === f.contattoId).map((c) => ({ value: c.id, label: c.nome }))}
            onChange={(v) => set("contattoId", v)}
          />
        </Field>
        {!f.contattoId && (
          <Field label="Nome del cliente" className="sm:col-span-2">
            <input placeholder="Mario Rossi" value={f.clienteNomeLibero} onChange={(e) => set("clienteNomeLibero", e.target.value)} className={inputCls} />
          </Field>
        )}
        {patenteScaduta(f.contattoId, f.dataFine) && (
          <p className="text-sm text-amber-300 sm:col-span-2">
            La patente di questo cliente risulta scaduta per il periodo del noleggio: controllala nella scheda del contatto.
          </p>
        )}
        <p className="text-xs text-adm-muted sm:col-span-2">
          Il ritiro può essere lo stesso giorno della riconsegna di un altro cliente, oppure in un giorno successivo.
        </p>
        <Field label="Dal">
          <input required type="date" value={f.dataInizio} onChange={(e) => set("dataInizio", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Al">
          <input required type="date" value={f.dataFine} onChange={(e) => set("dataFine", e.target.value)} className={inputCls} />
        </Field>
        <Field
          label="Tariffa al giorno (€)"
          hint={proposta ? `Proposta: ${euro(proposta.tariffa)} (${proposta.fonte})` : undefined}
        >
          <input type="number" min={0} placeholder={proposta ? String(proposta.tariffa) : ""} value={f.tariffa} onChange={(e) => set("tariffa", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Cauzione (€)">
          <input type="number" min={0} value={f.cauzione} onChange={(e) => set("cauzione", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Luogo di ritiro">
          <input placeholder="Sede Sassari" value={f.luogoRitiro} onChange={(e) => set("luogoRitiro", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Luogo di riconsegna">
          <input placeholder="Aeroporto" value={f.luogoRiconsegna} onChange={(e) => set("luogoRiconsegna", e.target.value)} className={inputCls} />
        </Field>
      </Section>
      {giorni > 0 && (
        <p className="rounded-lg border border-adm-line bg-adm-bg px-3.5 py-3 text-sm text-slate-300">
          {giorni} {giorni === 1 ? "giorno" : "giorni"} × {euro(tariffa)} ={" "}
          <span className="font-semibold text-white">{euro(giorni * tariffa)}</span>
        </p>
      )}

      {esistente && (
        <Section title="Ritiro e riconsegna" columns={2}>
          <Field label="Stato" className="sm:col-span-2" hint="«Conclusa» registra l'incasso tra i movimenti e rimette l'auto disponibile.">
            <SelectField value={f.stato} options={STATI_PRENOTAZIONE} onChange={(v) => set("stato", v)} />
          </Field>
          <Field label="Km al ritiro">
            <input type="number" min={0} placeholder={auto ? String(auto.kmAttuali) : ""} value={f.kmRitiro} onChange={(e) => set("kmRitiro", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Km alla riconsegna">
            <input type="number" min={0} value={f.kmRiconsegna} onChange={(e) => set("kmRiconsegna", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Carburante al ritiro">
            <SelectField value={f.carburanteRitiro} blank="—" options={LIVELLI_CARBURANTE} onChange={(v) => set("carburanteRitiro", v)} />
          </Field>
          <Field label="Carburante alla riconsegna">
            <SelectField value={f.carburanteRiconsegna} blank="—" options={LIVELLI_CARBURANTE} onChange={(v) => set("carburanteRiconsegna", v)} />
          </Field>
          <Field label="Note (danni, extra, accordi)" className="sm:col-span-2">
            <textarea rows={3} value={f.note} onChange={(e) => set("note", e.target.value)} className={textareaCls} />
          </Field>
        </Section>
      )}
    </Drawer>
  );

  function patenteScaduta(contattoId: string, fine: string) {
    const c = contatti.find((x) => x.id === contattoId);
    return Boolean(c?.scadenzaPatente && fine && c.scadenzaPatente < fine);
  }
}

export default function Prenotazioni() {
  const { noleggio, contatti, updatePrenotazione, deletePrenotazione } = useGestionale();
  const toast = useToast();
  const [stato, setStato] = useState<StatoPrenotazione | "tutte">("tutte");
  const [aperta, setAperta] = useState<{ key: number; id?: string } | null>(null);

  const nomeAuto = (id: string) => {
    const v = noleggio.veicoli.find((x) => x.id === id);
    return v ? nomeRentVeicolo(v) : "Auto eliminata";
  };
  const nomeCliente = (p: { contattoId: string | null; clienteNomeLibero: string }) =>
    contatti.find((c) => c.id === p.contattoId)?.nome || p.clienteNomeLibero || "Cliente non indicato";

  const tabs: TabOption<StatoPrenotazione | "tutte">[] = [
    { id: "tutte", label: "Tutte", count: noleggio.prenotazioni.length },
    ...STATI_PRENOTAZIONE.map((s) => ({ id: s, label: s, count: noleggio.prenotazioni.filter((p) => p.stato === s).length })),
  ];
  const visibili = noleggio.prenotazioni
    .filter((p) => stato === "tutte" || p.stato === stato)
    .sort((a, b) => b.dataInizio.localeCompare(a.dataInizio));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs tabs={tabs} value={stato} onChange={setStato} label="Filtra prenotazioni" />
        <button type="button" onClick={() => setAperta({ key: Date.now() })} className={btnPrimary}>
          <Plus className="size-4" />
          Nuova prenotazione
        </button>
      </div>

      {visibili.length === 0 ? (
        <EmptyState icon={CalendarRange} title="Nessuna prenotazione qui" />
      ) : (
        <div className={`rounded-xl border border-adm-line bg-adm-surface ${rowDivider}`}>
          {visibili.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setAperta({ key: Date.now(), id: p.id })}
                className={`min-w-0 flex-1 basis-56 cursor-pointer rounded text-left ${focusRing}`}
              >
                <span className="block truncate font-medium text-white">{nomeAuto(p.veicoloId)}</span>
                <span className="block truncate text-sm text-adm-muted">
                  {nomeCliente(p)} · {formatDate(p.dataInizio)} → {formatDate(p.dataFine)} ({giorniNoleggio(p.dataInizio, p.dataFine)} gg)
                  {p.luogoRitiro ? ` · ${p.luogoRitiro}` : ""}
                </span>
              </button>
              <span className="min-w-20 text-right font-medium tabular-nums text-white">{euro(importoPrenotazione(p))}</span>
              <SelectField
                value={p.stato}
                options={STATI_PRENOTAZIONE}
                onChange={(s) => {
                  const esito = updatePrenotazione(p.id, { stato: s });
                  if (!esito.ok) toast(esito.errore);
                  else if (s === "Conclusa") toast("Noleggio concluso: l'incasso è tra i movimenti da saldare");
                  else if (s === "In corso") toast("Noleggio iniziato: l'auto risulta noleggiata");
                }}
                aria-label={`Stato della prenotazione di ${nomeAuto(p.veicoloId)}`}
                className={`${inputCls} sm:w-36`}
              />
              <RowMenu
                label="Azioni prenotazione"
                items={[
                  { label: "Apri e modifica", icon: Pencil, onSelect: () => setAperta({ key: Date.now(), id: p.id }) },
                  {
                    label: "Elimina",
                    icon: Trash2,
                    danger: true,
                    confirm: "Conferma: elimina",
                    onSelect: () => {
                      toast("Prenotazione eliminata", { label: "Annulla", onClick: deletePrenotazione(p.id) });
                    },
                  },
                ]}
              />
            </div>
          ))}
        </div>
      )}

      {aperta && <PrenotazioneDrawer key={aperta.key} prenotazioneId={aperta.id} onClose={() => setAperta(null)} />}
    </>
  );
}
