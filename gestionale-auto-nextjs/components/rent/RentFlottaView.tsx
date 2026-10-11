"use client";

import { useState } from "react";
import { Plus, Car, Trash2, Search, ArrowLeft } from "lucide-react";
import type { RentVeicolo } from "@/lib/rentCalc";
import { CATEGORIE_VEICOLO, STATI_VEICOLO_RENT, eurRent } from "@/lib/rentCalc";
import { Field } from "../ui/Shared";

const STATO_COLORI: Record<string, { bg: string; color: string }> = {
  Disponibile: { bg: "#E5F4EE", color: "#1E7A56" },
  Noleggiata: { bg: "#E5EEF7", color: "#2E5C8A" },
  "In manutenzione": { bg: "#F5E6D3", color: "#8A5A2E" },
  "Fuori servizio": { bg: "var(--bad-bg)", color: "var(--bad)" },
};

export default function RentFlottaView({ veicoli, isAdmin, onAdd, onField, onDelete }: {
  veicoli: RentVeicolo[]; isAdmin: boolean; onAdd: () => Promise<string | null>;
  onField: (id: string, field: keyof RentVeicolo, value: any) => void; onDelete: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const selected = veicoli.find((v) => v.id === selectedId) || null;

  async function handleAdd() {
    const id = await onAdd();
    if (id) setSelectedId(id);
  }

  if (selected) {
    return (
      <div>
        <button className="ga-btn" style={{ marginBottom: 16 }} onClick={() => setSelectedId(null)}><ArrowLeft size={14} /> Torna alla flotta</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div className="ga-display" style={{ fontSize: 20, fontWeight: 700 }}>{selected.marca || "Auto"} {selected.modello}</div>
          {isAdmin && <button className="ga-btn ga-btn-danger" onClick={() => setConfirmDelete(selected.id)}><Trash2 size={14} /> Elimina</button>}
        </div>
        <div className="ga-card" style={{ padding: 20, maxWidth: 640 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Marca"><input className="ga-input" defaultValue={selected.marca} onBlur={(e) => onField(selected.id, "marca", e.target.value)} /></Field>
            <Field label="Modello"><input className="ga-input" defaultValue={selected.modello} onBlur={(e) => onField(selected.id, "modello", e.target.value)} /></Field>
            <Field label="Targa"><input className="ga-input ga-mono" style={{ textTransform: "uppercase" }} defaultValue={selected.targa} onBlur={(e) => onField(selected.id, "targa", e.target.value.toUpperCase())} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Categoria">
              <select className="ga-input" defaultValue={selected.categoria} onChange={(e) => onField(selected.id, "categoria", e.target.value)}>
                {CATEGORIE_VEICOLO.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Stato">
              <select className="ga-input" defaultValue={selected.stato} onChange={(e) => onField(selected.id, "stato", e.target.value)}>
                {STATI_VEICOLO_RENT.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Km attuali"><input className="ga-input ga-mono" type="number" defaultValue={selected.kmAttuali} onBlur={(e) => onField(selected.id, "kmAttuali", parseFloat(e.target.value) || 0)} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Field label="Tariffa giornaliera (€)"><input className="ga-input ga-mono" type="number" defaultValue={selected.tariffaGiornaliera} onBlur={(e) => onField(selected.id, "tariffaGiornaliera", parseFloat(e.target.value) || 0)} /></Field>
          </div>
          <div className="ga-display" style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Scadenze</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Revisione"><input type="date" className="ga-input" defaultValue={selected.dataRevisione} onBlur={(e) => onField(selected.id, "dataRevisione", e.target.value)} /></Field>
            <Field label="Bollo"><input type="date" className="ga-input" defaultValue={selected.dataBollo} onBlur={(e) => onField(selected.id, "dataBollo", e.target.value)} /></Field>
            <Field label="Assicurazione"><input type="date" className="ga-input" defaultValue={selected.dataAssicurazione} onBlur={(e) => onField(selected.id, "dataAssicurazione", e.target.value)} /></Field>
          </div>
          <Field label="Tagliando"><input type="date" className="ga-input" defaultValue={selected.dataTagliando} onBlur={(e) => onField(selected.id, "dataTagliando", e.target.value)} /></Field>
          <div style={{ marginTop: 12 }}>
            <Field label="Note"><textarea className="ga-input" rows={2} defaultValue={selected.note} onBlur={(e) => onField(selected.id, "note", e.target.value)} /></Field>
          </div>
        </div>

        {confirmDelete && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(27,31,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
            <div className="ga-card" style={{ padding: 24, width: 340 }}>
              <div className="ga-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Eliminare questa auto dalla flotta?</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                <button className="ga-btn" onClick={() => setConfirmDelete(null)}>Annulla</button>
                <button className="ga-btn ga-btn-danger" onClick={() => { onDelete(confirmDelete); setSelectedId(null); setConfirmDelete(null); }}>Elimina</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const filtered = veicoli.filter((v) => !search || `${v.marca} ${v.modello} ${v.targa}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Flotta</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{veicoli.length} auto</div>
        </div>
        <button className="ga-btn ga-btn-primary" onClick={handleAdd}><Plus size={15} /> Nuova auto</button>
      </div>
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 260 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--muted)" }} />
        <input className="ga-input" style={{ paddingLeft: 30 }} placeholder="Cerca marca, targa…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <div className="ga-card ga-empty"><Car size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Nessuna auto in flotta</div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {filtered.map((v) => {
            const c = STATO_COLORI[v.stato] || STATO_COLORI.Disponibile;
            return (
              <div key={v.id} className="ga-carcard" onClick={() => setSelectedId(v.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{v.categoria}</span>
                  <span className="ga-badge" style={{ background: c.bg, color: c.color }}>{v.stato}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{v.marca || "—"} {v.modello}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }} className="ga-mono">{v.targa || "senza targa"}</div>
                <div style={{ fontSize: 13, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                  <span style={{ color: "var(--muted)" }}>Tariffa: </span><span className="ga-mono" style={{ fontWeight: 700 }}>{eurRent(v.tariffaGiornaliera)}/giorno</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
