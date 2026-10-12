"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Download, FileUp, XCircle } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import type { Annulla } from "@/context/GestionaleContext";
import { scaricaXlsx } from "@/lib/export/scrivi";
import { ACCEPT_FOGLI, MAX_RIGHE, leggiFile, type FileLetto, type Griglia } from "@/lib/import/leggi";
import {
  chiaveMappatura,
  erroriMappatura,
  mappaAutomatica,
  trovaIntestazione,
  valutaRighe,
  type ContestoImport,
  type RigaValutata,
  type Schema,
} from "@/lib/import/mappatura";
import Drawer from "../../ui/Drawer";
import { Field } from "../../ui/Field";
import { Pill } from "../../ui/Layout";
import { btnSecondary, inputCls } from "../../ui/styles";
import { useToast } from "../../ui/Toast";

export type AzioneDoppioni = "salta" | "importa" | "aggiorna";

export interface ImportDialogProps<T> {
  schema: Schema<T>;
  titolo: string;
  /** Cosa si può importare, in una frase. */
  descrizione: string;
  onClose: () => void;
  /** Salva le righe scelte e restituisce come annullare e il messaggio di conferma. */
  onImporta: (righe: RigaValutata<T>[], doppioni: AzioneDoppioni, file: string) => { annulla: Annulla; messaggio: string };
  /** Anteprima personalizzata (es. l'abbinamento dell'estratto conto). */
  anteprima?: (righe: RigaValutata<T>[]) => React.ReactNode;
  /** Quante righe verranno davvero salvate, se diverso dal conteggio standard. */
  conteggio?: (righe: RigaValutata<T>[], doppioni: AzioneDoppioni) => number;
}

function leggiMappa(chiave: string, colonne: number): string[] | null {
  try {
    const m = JSON.parse(localStorage.getItem(chiave) ?? "null");
    return Array.isArray(m) && m.length === colonne ? m : null;
  } catch {
    return null;
  }
}

const anteprimaCella = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s.length > 28 ? `${s.slice(0, 27)}…` : s;
};

// Importazione da Excel o CSV in tre passi visibili insieme: file, colonne riconosciute,
// anteprima riga per riga. Niente si salva finché non si conferma, e dopo si può annullare.
export default function ImportDialog<T>({
  schema,
  titolo,
  descrizione,
  onClose,
  onImporta,
  anteprima,
  conteggio,
}: ImportDialogProps<T>) {
  const { today } = useAdmin();
  const { veicoli, movimenti, contatti, noleggio, impostazioni } = useGestionale();
  const toast = useToast();
  const ctx: ContestoImport = { veicoli, movimenti, contatti, noleggio, impostazioni, oggi: today };

  const [file, setFile] = useState<FileLetto | null>(null);
  const [foglio, setFoglio] = useState("");
  const [griglia, setGriglia] = useState<Griglia>([]);
  const [intestazione, setIntestazione] = useState(0);
  const [mappa, setMappa] = useState<string[]>([]);
  const [doppioni, setDoppioni] = useState<AzioneDoppioni>("salta");
  const [soloProblemi, setSoloProblemi] = useState(false);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const intestazioni = griglia[intestazione] ?? [];

  function preparaFoglio(f: FileLetto, nome: string) {
    const g = f.griglia(nome);
    const riga = trovaIntestazione(g, schema.campi);
    const h = g[riga] ?? [];
    setFoglio(nome);
    setGriglia(g);
    setIntestazione(riga);
    setMappa(leggiMappa(chiaveMappatura(schema.entita, h), h.length) ?? mappaAutomatica(h, schema.campi));
  }

  async function scegliFile(f: File | undefined) {
    if (!f) return;
    setErrore(null);
    setCaricamento(true);
    try {
      const letto = await leggiFile(f);
      if (letto.fogli.length === 0) throw new Error("Il file non contiene fogli.");
      setFile(letto);
      // Si apre il primo foglio che contiene dati.
      const primo = letto.fogli.find((n) => letto.griglia(n).length > 1) ?? letto.fogli[0];
      preparaFoglio(letto, primo);
    } catch (e) {
      console.error("File non letto", e);
      setErrore(e instanceof Error ? e.message : "Non riesco a leggere il file: è un Excel o un CSV?");
      setFile(null);
    } finally {
      setCaricamento(false);
    }
  }

  function cambiaIntestazione(riga: number) {
    const h = griglia[riga] ?? [];
    setIntestazione(riga);
    setMappa(mappaAutomatica(h, schema.campi));
  }

  function cambiaCampo(col: number, campo: string) {
    // Un campo può stare su una sola colonna: se era già usato, l'altra colonna si libera.
    setMappa((prev) => prev.map((c, i) => (i === col ? campo : campo && c === campo ? "" : c)));
  }

  const problemiMappa = file ? erroriMappatura(mappa, schema as Schema<unknown>) : [];
  const righe = useMemo(
    () => (file && problemiMappa.length === 0 ? valutaRighe(griglia, intestazione, mappa, schema, ctx) : []),
    // ctx cambia a ogni render ma i dati sotto no: si ricalcola solo se cambiano file, colonne o dati.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [file, griglia, intestazione, mappa, schema, problemiMappa.length, veicoli, movimenti, contatti, noleggio]
  );
  const conErrori = righe.filter((r) => r.errori.length > 0);
  const doppie = righe.filter((r) => r.record && r.doppione);
  const conAvvisi = righe.filter((r) => r.record && !r.doppione && r.avvisi.length > 0);
  const buone = righe.filter((r) => r.record && !r.doppione);
  const daImportare = conteggio
    ? conteggio(righe, doppioni)
    : buone.length + (doppioni === "salta" ? 0 : doppie.length);
  const troppe = righe.length > MAX_RIGHE;

  function conferma() {
    if (!file || daImportare === 0 || troppe) return;
    try {
      localStorage.setItem(chiaveMappatura(schema.entita, intestazioni), JSON.stringify(mappa));
    } catch {}
    const { annulla, messaggio } = onImporta(righe, doppioni, file.nome);
    toast(messaggio, { label: "Annulla", onClick: annulla });
    onClose();
  }

  async function scaricaModello() {
    await scaricaXlsx(
      [
        {
          nome: `Modello ${schema.nome}`.slice(0, 31),
          colonne: schema.campi.map((c) => ({ titolo: c.etichetta, valore: (r: unknown) => (r as Record<string, string>)[c.id] ?? "" })),
          righe: [Object.fromEntries(schema.campi.map((c) => [c.id, c.esempio ?? ""]))],
        },
      ],
      `Modello_import_${schema.entita}`
    );
  }

  const visibili = soloProblemi ? righe.filter((r) => r.errori.length || r.avvisi.length || r.doppione) : righe;

  return (
    <Drawer
      title={titolo}
      subtitle={descrizione}
      width="max-w-4xl"
      submitLabel={
        !file ? "Scegli un file" : daImportare === 0 ? "Niente da importare" : `Importa ${daImportare} ${schema.nome}`
      }
      submitDisabled={!file || daImportare === 0 || troppe || problemiMappa.length > 0}
      onSubmit={conferma}
      onClose={onClose}
    >
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${btnSecondary} cursor-pointer`}>
            <FileUp className="size-4" />
            {file ? "Cambia file" : "Scegli file Excel o CSV"}
            <input
              type="file"
              accept={ACCEPT_FOGLI}
              className="sr-only"
              onChange={(e) => {
                void scegliFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button type="button" onClick={() => void scaricaModello()} className={btnSecondary}>
            <Download className="size-4" />
            Scarica il modello
          </button>
          {file && <span className="truncate text-sm text-adm-muted">{file.nome}</span>}
          {caricamento && <span className="text-sm text-adm-muted">Leggo il file…</span>}
        </div>
        {errore && (
          <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {errore}
          </p>
        )}
        {!file && (
          <p className="text-sm text-adm-muted">
            Va bene un foglio qualsiasi (anche l&apos;export della banca o di un altro gestionale): le colonne si
            riconoscono dal nome, le date e gli importi all&apos;italiana si leggono da soli. Prima di salvare vedi
            l&apos;anteprima, e dopo puoi annullare tutto con un clic.
          </p>
        )}
      </section>

      {file && (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            {file.fogli.length > 1 && (
              <Field label="Foglio">
                <select value={foglio} onChange={(e) => preparaFoglio(file, e.target.value)} className={inputCls}>
                  {file.fogli.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Riga delle intestazioni" hint="Riconosciuta da sola; cambiala se il file ha righe sopra la tabella.">
              <select value={intestazione} onChange={(e) => cambiaIntestazione(Number(e.target.value))} className={inputCls}>
                {griglia.slice(0, 25).map((r, i) => (
                  <option key={i} value={i}>
                    Riga {i + 1}: {r.slice(0, 4).map(anteprimaCella).filter(Boolean).join(" | ") || "(vuota)"}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-white">Colonne riconosciute</h3>
            <div className="overflow-x-auto rounded-xl border border-adm-line">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="border-b border-adm-line text-left text-xs uppercase tracking-wide text-adm-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Colonna nel file</th>
                    <th className="px-3 py-2 font-medium">Primo valore</th>
                    <th className="px-3 py-2 font-medium">Diventa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-adm-line">
                  {intestazioni.map((h, col) => (
                    <tr key={col}>
                      <td className="px-3 py-1.5 text-slate-200">{anteprimaCella(h) || `Colonna ${col + 1}`}</td>
                      <td className="px-3 py-1.5 text-adm-muted">{anteprimaCella(griglia[intestazione + 1]?.[col])}</td>
                      <td className="px-3 py-1.5">
                        <select
                          value={mappa[col] ?? ""}
                          onChange={(e) => cambiaCampo(col, e.target.value)}
                          aria-label={`Campo per la colonna ${String(h ?? col + 1)}`}
                          className={`${inputCls} py-1.5 ${mappa[col] ? "text-white" : "text-adm-muted"}`}
                        >
                          <option value="">— non importare —</option>
                          {schema.campi.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.etichetta}
                              {c.obbligatorio ? " *" : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {problemiMappa.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-amber-300">
                {problemiMappa.map((p) => (
                  <li key={p}>• {p}: scegli la colonna giusta qui sopra.</li>
                ))}
              </ul>
            )}
          </section>

          {problemiMappa.length === 0 && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Pill tone="green">
                  <CheckCircle2 className="size-3.5" /> {buone.length} pronte
                </Pill>
                {conAvvisi.length > 0 && (
                  <Pill tone="amber">
                    <AlertTriangle className="size-3.5" /> {conAvvisi.length} con avvisi
                  </Pill>
                )}
                {doppie.length > 0 && (
                  <Pill tone="slate">
                    <Copy className="size-3.5" /> {doppie.length} già presenti
                  </Pill>
                )}
                {conErrori.length > 0 && (
                  <Pill tone="red">
                    <XCircle className="size-3.5" /> {conErrori.length} con errori (saltate)
                  </Pill>
                )}
                <label className="ml-auto flex cursor-pointer items-center gap-2 text-slate-300">
                  <input type="checkbox" checked={soloProblemi} onChange={(e) => setSoloProblemi(e.target.checked)} className="size-4 accent-blue-600" />
                  Solo righe da controllare
                </label>
              </div>
              {troppe && (
                <p className="text-sm text-rose-300">Il file ha più di {MAX_RIGHE} righe: dividilo in più file.</p>
              )}
              {doppie.length > 0 && (
                <Field label="Righe già presenti">
                  <select value={doppioni} onChange={(e) => setDoppioni(e.target.value as AzioneDoppioni)} className={`${inputCls} sm:w-80`}>
                    <option value="salta">Saltale (consigliato)</option>
                    {schema.aggiornabile && <option value="aggiorna">Completa i dati mancanti di quelle già presenti</option>}
                    <option value="importa">Importale comunque come nuove</option>
                  </select>
                </Field>
              )}

              {anteprima ? (
                anteprima(righe)
              ) : (
                <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-adm-line">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-adm-line">
                      {visibili.slice(0, 300).map((r) => (
                        <tr key={r.n} className={r.errori.length ? "bg-rose-500/5" : r.doppione ? "bg-white/[0.02]" : ""}>
                          <td className="w-14 px-3 py-1.5 align-top tabular-nums text-adm-muted">{r.n}</td>
                          <td className="px-3 py-1.5 align-top">
                            <span className={r.errori.length ? "text-slate-400" : "text-slate-100"}>
                              {r.record ? schema.riassunto(r.record) : "—"}
                            </span>
                            {[...r.errori.map((e) => ["e", e]), ...(r.doppione ? [["d", r.doppione.motivo]] : []), ...r.avvisi.map((a) => ["a", a])].map(
                              ([k, msg], i) => (
                                <span
                                  key={i}
                                  className={`block text-xs ${k === "e" ? "text-rose-300" : k === "d" ? "text-adm-muted" : "text-amber-300"}`}
                                >
                                  {msg}
                                </span>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {visibili.length > 300 && (
                    <p className="px-3 py-2 text-xs text-adm-muted">… e altre {visibili.length - 300} righe.</p>
                  )}
                  {visibili.length === 0 && <p className="px-3 py-3 text-sm text-adm-muted">Nessuna riga da mostrare.</p>}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </Drawer>
  );
}
