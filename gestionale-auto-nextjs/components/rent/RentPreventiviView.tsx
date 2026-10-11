"use client";

import { useState, useMemo } from "react";
import { Plus, FileText, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import type { RentPreventivo, RentVeicolo, RentCliente, RentTariffa, CategoriaVeicolo } from "@/lib/rentCalc";
import { CATEGORIE_VEICOLO, STATI_PREVENTIVO, eurRent, giorniNoleggio, tariffaPerPeriodo, veicoloLiberoNelPeriodo } from "@/lib/rentCalc";
import type { RentPrenotazione } from "@/lib/rentCalc";
import { Field } from "../ui/Shared";

const STATO_COLORI: Record<string, { bg: string; color: string }> = {
  Bozza: { bg: "#EFEAE0", color: "#7A6A4B" },
  Inviato: { bg: "#E5EEF7", color: "#2E5C8A" },
  Accettato: { bg: "var(--good-bg)", color: "var(--good)" },
  Rifiutato: { bg: "var(--bad-bg)", color: "var(--bad)" },
  Scaduto: { bg: "#EFEDE7", color: "var(--muted)" },
};

export default function RentPreventiviView({ preventivi, veicoli, clienti, tariffe, prenotazioni, isAdmin, onAdd, onField, onDelete, onConverti }: {
  preventivi: RentPreventivo[]; veicoli: RentVeicolo[]; clienti: RentCliente[]; tariffe: RentTariffa[]; prenotazioni: RentPrenotazione[]; isAdmin: boolean;
  onAdd: (p: Partial<RentPreventivo>) => Promise<{ ok: boolean; errore?: string }>;
  onField: (id: string, field: keyof RentPreventivo, value: any) => void; onDelete: (id: string) => void;
  onConverti: (preventivo: RentPreventivo) => Promise<{ ok: boolean; errore?: string }>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [erroreForm, setErroreForm] = useState<string | null>(null);
  const [erroreConversione, setErroreConversione] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<RentPreventivo>>({
    veicoloId: "", clienteId: null, clienteNomeLibero: "", categoria: "Economy", dataInizio: "", dataFine: "", luogoRitiro: "", luogoRiconsegna: "",
  });

  const veicoloScelto = veicoli.find((v) => v.id === draft.veicoloId);
  const categoriaEffettiva: CategoriaVeicolo = veicoloScelto?.categoria || (draft.categoria as CategoriaVeicolo) || "Economy";
  const giorni = draft.dataInizio && draft.dataFine ? giorniNoleggio(draft.dataInizio, draft.dataFine) : 0;
  const { tariffa, fonte } = useMemo(
    () => tariffaPerPeriodo(categoriaEffettiva, draft.dataInizio || "", tariffe, veicoloScelto?.tariffaGiornaliera || 0),
    [categoriaEffettiva, draft.dataInizio, tariffe, veicoloScelto]
  );
  const totaleStimato = giorni * tariffa;

  const veicoloNome = (id: string | null) => { const v = veicoli.find((x) => x.id === id); return v ? `${v.marca} ${v.modello} (${v.targa})` : "—"; };
  const clienteNomeOf = (p: RentPreventivo) => p.clienteId ? (clienti.find((c) => c.id === p.clienteId)?.nome || "—") : (p.clienteNomeLibero || "—");

  async function handleSubmit() {
    setErroreForm(null);
    if (!draft.dataInizio || !draft.dataFine) { setErroreForm("Imposta le date di inizio e fine."); return; }
    if (draft.dataFine < draft.dataInizio) { setErroreForm("La data di fine non può precedere quella di inizio."); return; }
    const res = await onAdd({ ...draft, categoria: categoriaEffettiva, tariffaApplicata: tariffa, giorni, totale: totaleStimato });
    if (!res.ok) { setErroreForm(res.errore || "Impossibile salvare il preventivo."); return; }
    setShowForm(false);
    setDraft({ veicoloId: "", clienteId: null, clienteNomeLibero: "", categoria: "Economy", dataInizio: "", dataFine: "", luogoRitiro: "", luogoRiconsegna: "" });
  }

  async function handleConverti(p: RentPreventivo) {
    setErroreConversione(null);
    if (!p.veicoloId) { setErroreConversione("Assegna un'auto specifica al preventivo prima di convertirlo in prenotazione."); return; }
    if (!veicoloLiberoNelPeriodo(p.veicoloId, p.dataInizio, p.dataFine, prenotazioni)) {
      setErroreConversione("L'auto scelta risulta già prenotata in questo periodo.");
      return;
    }
    const res = await onConverti(p);
    if (!res.ok) setErroreConversione(res.errore || "Conversione non riuscita.");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Preventivi</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Calcolo automatico su giorni × tariffa del periodo</div>
        </div>
        <button className="ga-btn ga-btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> Nuovo preventivo</button>
      </div>

      {erroreConversione && (
        <div style={{ marginBottom: 14, padding: "9px 12px", background: "var(--bad-bg)", color: "var(--bad)", borderRadius: 8, fontSize: 13, display: "flex", gap: 8 }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {erroreConversione}
        </div>
      )}

      {preventivi.length === 0 ? (
        <div className="ga-card ga-empty"><FileText size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Nessun preventivo creato</div></div>
      ) : (
        <div className="ga-card" style={{ overflow: "auto" }}>
          <table className="ga-table">
            <thead><tr><th>Cliente</th><th>Auto/Categoria</th><th>Dal</th><th>Al</th><th style={{ textAlign: "right" }}>Giorni</th><th style={{ textAlign: "right" }}>Tariffa</th><th style={{ textAlign: "right" }}>Totale</th><th>Stato</th><th style={{ width: 90 }}></th></tr></thead>
            <tbody>
              {preventivi.map((p) => {
                const c = STATO_COLORI[p.stato];
                return (
                  <tr key={p.id}>
                    <td>{clienteNomeOf(p)}</td>
                    <td>{p.veicoloId ? veicoloNome(p.veicoloId) : `Categoria: ${p.categoria}`}</td>
                    <td className="ga-mono">{p.dataInizio}</td>
                    <td className="ga-mono">{p.dataFine}</td>
                    <td style={{ textAlign: "right" }} className="ga-mono">{p.giorni}</td>
                    <td style={{ textAlign: "right" }} className="ga-mono">{eurRent(p.tariffaApplicata)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }} className="ga-mono">{eurRent(p.totale)}</td>
                    <td>
                      <select defaultValue={p.stato} onChange={(e) => onField(p.id, "stato", e.target.value)} style={{ border: "1px solid var(--line)", borderRadius: 5, padding: "4px 5px", fontSize: 12, background: c.bg, color: c.color }}>
                        {STATI_PREVENTIVO.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ display: "flex", gap: 6 }}>
                      {p.stato !== "Accettato" && (
                        <button onClick={() => handleConverti(p)} title="Converti in prenotazione" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--good)", display: "flex" }}><CheckCircle2 size={16} /></button>
                      )}
                      {isAdmin && <button onClick={() => onDelete(p.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}><Trash2 size={14} /></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,31,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, overflowY: "auto", padding: 20 }}>
          <div className="ga-card" style={{ padding: 24, width: 440 }}>
            <div className="ga-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nuovo preventivo</div>
            {erroreForm && (
              <div style={{ marginBottom: 12, padding: "9px 12px", background: "var(--bad-bg)", color: "var(--bad)", borderRadius: 8, fontSize: 13, display: "flex", gap: 8 }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {erroreForm}
              </div>
            )}
            <div style={{ display: "grid", gap: 12 }}>
              <Field label="Cliente registrato (opzionale)">
                <select className="ga-input" value={draft.clienteId || ""} onChange={(e) => setDraft((d) => ({ ...d, clienteId: e.target.value || null }))}>
                  <option value="">— nessuno, uso il nome libero sotto —</option>
                  {clienti.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
              {!draft.clienteId && (
                <Field label="Nome cliente (se non ancora in anagrafica)"><input className="ga-input" value={draft.clienteNomeLibero || ""} onChange={(e) => setDraft((d) => ({ ...d, clienteNomeLibero: e.target.value }))} placeholder="es. Mario Rossi" /></Field>
              )}
              <Field label="Auto specifica (opzionale)">
                <select className="ga-input" value={draft.veicoloId || ""} onChange={(e) => setDraft((d) => ({ ...d, veicoloId: e.target.value }))}>
                  <option value="">— non ancora assegnata, scelgo solo la categoria —</option>
                  {veicoli.map((v) => <option key={v.id} value={v.id}>{v.marca} {v.modello} ({v.targa})</option>)}
                </select>
              </Field>
              {!draft.veicoloId && (
                <Field label="Categoria">
                  <select className="ga-input" value={draft.categoria} onChange={(e) => setDraft((d) => ({ ...d, categoria: e.target.value as CategoriaVeicolo }))}>
                    {CATEGORIE_VEICOLO.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Dal"><input type="date" className="ga-input" value={draft.dataInizio} onChange={(e) => setDraft((d) => ({ ...d, dataInizio: e.target.value }))} /></Field>
                <Field label="Al"><input type="date" className="ga-input" value={draft.dataFine} onChange={(e) => setDraft((d) => ({ ...d, dataFine: e.target.value }))} /></Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Luogo ritiro"><input className="ga-input" value={draft.luogoRitiro || ""} onChange={(e) => setDraft((d) => ({ ...d, luogoRitiro: e.target.value }))} /></Field>
                <Field label="Luogo riconsegna"><input className="ga-input" value={draft.luogoRiconsegna || ""} onChange={(e) => setDraft((d) => ({ ...d, luogoRiconsegna: e.target.value }))} /></Field>
              </div>
            </div>

            {giorni > 0 && (
              <div className="ga-card" style={{ marginTop: 16, padding: 14, background: "var(--paper)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "var(--muted)" }}>Giorni</span><span className="ga-mono">{giorni}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "var(--muted)" }}>Tariffa applicata ({fonte})</span><span className="ga-mono">{eurRent(tariffa)}/giorno</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--line)" }}>
                  <span>Totale stimato</span><span className="ga-mono">{eurRent(totaleStimato)}</span>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="ga-btn" onClick={() => { setShowForm(false); setErroreForm(null); }}>Annulla</button>
              <button className="ga-btn ga-btn-primary" onClick={handleSubmit}>Salva preventivo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
