"use client";

import { useState } from "react";
import { Plus, CalendarRange, AlertCircle, Trash2 } from "lucide-react";
import type { RentPrenotazione, RentVeicolo, RentCliente } from "@/lib/rentCalc";
import { STATI_PRENOTAZIONE, eurRent, giorniNoleggio, importoPrenotazione, veicoloLiberoNelPeriodo } from "@/lib/rentCalc";
import { Field } from "../ui/Shared";

export default function RentPrenotazioniView({ prenotazioni, veicoli, clienti, isAdmin, onAdd, onField, onDelete }: {
  prenotazioni: RentPrenotazione[]; veicoli: RentVeicolo[]; clienti: RentCliente[]; isAdmin: boolean;
  onAdd: (p: Partial<RentPrenotazione>) => Promise<{ ok: boolean; errore?: string }>;
  onField: (id: string, field: keyof RentPrenotazione, value: any) => void; onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Partial<RentPrenotazione>>({ dataInizio: "", dataFine: "", veicoloId: "", clienteId: null, tariffaApplicata: 0 });
  const [erroreForm, setErroreForm] = useState<string | null>(null);
  const [filtroStato, setFiltroStato] = useState("tutte");

  const veicoloNome = (id: string) => { const v = veicoli.find((x) => x.id === id); return v ? `${v.marca} ${v.modello} (${v.targa})` : "—"; };
  const clienteNome = (id: string | null) => clienti.find((c) => c.id === id)?.nome || "—";

  function selezionaVeicolo(id: string) {
    const v = veicoli.find((x) => x.id === id);
    setDraft((d) => ({ ...d, veicoloId: id, tariffaApplicata: v?.tariffaGiornaliera || 0 }));
  }

  async function handleSubmit() {
    setErroreForm(null);
    if (!draft.veicoloId || !draft.dataInizio || !draft.dataFine) { setErroreForm("Seleziona auto e date di inizio/fine."); return; }
    if (draft.dataFine! < draft.dataInizio!) { setErroreForm("La data di fine non può precedere quella di inizio."); return; }
    if (!veicoloLiberoNelPeriodo(draft.veicoloId!, draft.dataInizio!, draft.dataFine!, prenotazioni)) {
      setErroreForm("Questa auto è già prenotata in tutto o in parte del periodo scelto.");
      return;
    }
    const res = await onAdd(draft);
    if (!res.ok) { setErroreForm(res.errore || "Impossibile salvare la prenotazione."); return; }
    setShowForm(false);
    setDraft({ dataInizio: "", dataFine: "", veicoloId: "", clienteId: null, tariffaApplicata: 0 });
  }

  const filtrate = prenotazioni.filter((p) => filtroStato === "tutte" || p.stato === filtroStato).sort((a, b) => b.dataInizio.localeCompare(a.dataInizio));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Prenotazioni</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{prenotazioni.length} prenotazioni registrate</div>
        </div>
        <button className="ga-btn ga-btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> Nuova prenotazione</button>
      </div>

      <div className="ga-tabbar">
        <div className={`ga-tab ${filtroStato === "tutte" ? "active" : ""}`} onClick={() => setFiltroStato("tutte")}>Tutte</div>
        {STATI_PRENOTAZIONE.map((s) => <div key={s} className={`ga-tab ${filtroStato === s ? "active" : ""}`} onClick={() => setFiltroStato(s)}>{s}</div>)}
      </div>

      {filtrate.length === 0 ? (
        <div className="ga-card ga-empty"><CalendarRange size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Nessuna prenotazione qui</div></div>
      ) : (
        <div className="ga-card" style={{ overflow: "auto" }}>
          <table className="ga-table">
            <thead><tr><th>Auto</th><th>Cliente</th><th>Dal</th><th>Al</th><th>Ritiro</th><th>Consegna</th><th style={{ textAlign: "right" }}>Giorni</th><th style={{ textAlign: "right" }}>Importo</th><th>Stato</th><th style={{ width: 30 }}></th></tr></thead>
            <tbody>
              {filtrate.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{veicoloNome(p.veicoloId)}</td>
                  <td>{clienteNome(p.clienteId)}</td>
                  <td className="ga-mono">{p.dataInizio}</td>
                  <td className="ga-mono">{p.dataFine}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{p.luogoRitiro || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{p.luogoRiconsegna || "—"}</td>
                  <td style={{ textAlign: "right" }} className="ga-mono">{giorniNoleggio(p.dataInizio, p.dataFine)}</td>
                  <td style={{ textAlign: "right" }} className="ga-mono">{eurRent(importoPrenotazione(p))}</td>
                  <td>
                    <select defaultValue={p.stato} onChange={(e) => onField(p.id, "stato", e.target.value)} style={{ border: "1px solid var(--line)", borderRadius: 5, padding: "4px 5px", fontSize: 12, background: "#fff" }}>
                      {STATI_PRENOTAZIONE.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{isAdmin && <button onClick={() => onDelete(p.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}><Trash2 size={14} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,31,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="ga-card" style={{ padding: 24, width: 420 }}>
            <div className="ga-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nuova prenotazione</div>
            {erroreForm && (
              <div style={{ marginBottom: 12, padding: "9px 12px", background: "var(--bad-bg)", color: "var(--bad)", borderRadius: 8, fontSize: 13, display: "flex", gap: 8 }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {erroreForm}
              </div>
            )}
            <div style={{ display: "grid", gap: 12 }}>
              <Field label="Auto">
                <select className="ga-input" value={draft.veicoloId} onChange={(e) => selezionaVeicolo(e.target.value)}>
                  <option value="">— seleziona —</option>
                  {veicoli.map((v) => <option key={v.id} value={v.id}>{v.marca} {v.modello} ({v.targa})</option>)}
                </select>
              </Field>
              <Field label="Cliente">
                <select className="ga-input" value={draft.clienteId || ""} onChange={(e) => setDraft((d) => ({ ...d, clienteId: e.target.value || null }))}>
                  <option value="">— seleziona —</option>
                  {clienti.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Dal"><input type="date" className="ga-input" value={draft.dataInizio} onChange={(e) => setDraft((d) => ({ ...d, dataInizio: e.target.value }))} /></Field>
                <Field label="Al"><input type="date" className="ga-input" value={draft.dataFine} onChange={(e) => setDraft((d) => ({ ...d, dataFine: e.target.value }))} /></Field>
              </div>
              <Field label="Tariffa giornaliera (€)"><input type="number" className="ga-input ga-mono" value={draft.tariffaApplicata} onChange={(e) => setDraft((d) => ({ ...d, tariffaApplicata: parseFloat(e.target.value) || 0 }))} /></Field>
              <Field label="Cauzione (€)"><input type="number" className="ga-input ga-mono" value={draft.cauzione || 0} onChange={(e) => setDraft((d) => ({ ...d, cauzione: parseFloat(e.target.value) || 0 }))} /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Luogo ritiro"><input className="ga-input" value={draft.luogoRitiro || ""} onChange={(e) => setDraft((d) => ({ ...d, luogoRitiro: e.target.value }))} placeholder="es. Sede Sassari" /></Field>
                <Field label="Luogo riconsegna"><input className="ga-input" value={draft.luogoRiconsegna || ""} onChange={(e) => setDraft((d) => ({ ...d, luogoRiconsegna: e.target.value }))} placeholder="es. Aeroporto" /></Field>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="ga-btn" onClick={() => { setShowForm(false); setErroreForm(null); }}>Annulla</button>
              <button className="ga-btn ga-btn-primary" onClick={handleSubmit}>Salva prenotazione</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
