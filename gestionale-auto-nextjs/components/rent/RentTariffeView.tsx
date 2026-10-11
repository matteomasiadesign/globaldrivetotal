"use client";

import { useState } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import type { RentTariffa } from "@/lib/rentCalc";
import { CATEGORIE_VEICOLO, eurRent } from "@/lib/rentCalc";
import { Field } from "../ui/Shared";

export default function RentTariffeView({ tariffe, isAdmin, onAdd, onField, onDelete }: {
  tariffe: RentTariffa[]; isAdmin: boolean; onAdd: () => void;
  onField: (id: string, field: keyof RentTariffa, value: any) => void; onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const ordinate = [...tariffe].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.dataInizio.localeCompare(b.dataInizio));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Tariffe per periodo</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Alta/bassa stagione e periodi speciali per categoria — usate per calcolare i preventivi</div>
        </div>
        <button className="ga-btn ga-btn-primary" onClick={onAdd}><Plus size={15} /> Nuova tariffa</button>
      </div>

      {ordinate.length === 0 ? (
        <div className="ga-card ga-empty"><Tag size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Nessuna tariffa di periodo impostata</div><div style={{ fontSize: 13, marginTop: 4 }}>Senza tariffe specifiche, i preventivi useranno la tariffa base di ogni auto.</div></div>
      ) : (
        <div className="ga-card" style={{ overflow: "auto" }}>
          <table className="ga-table">
            <thead><tr><th>Categoria</th><th>Nome periodo</th><th>Dal</th><th>Al</th><th style={{ textAlign: "right" }}>Tariffa/giorno</th><th style={{ width: 30 }}></th></tr></thead>
            <tbody>
              {ordinate.map((t) => (
                <tr key={t.id}>
                  <td>
                    <select defaultValue={t.categoria} onChange={(e) => onField(t.id, "categoria", e.target.value)} style={{ border: "1px solid var(--line)", borderRadius: 5, padding: "4px 5px", fontSize: 13, background: "#fff" }}>
                      {CATEGORIE_VEICOLO.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td><input defaultValue={t.nomePeriodo} onBlur={(e) => onField(t.id, "nomePeriodo", e.target.value)} placeholder="es. Alta stagione" /></td>
                  <td><input type="date" defaultValue={t.dataInizio} onBlur={(e) => onField(t.id, "dataInizio", e.target.value)} /></td>
                  <td><input type="date" defaultValue={t.dataFine} onBlur={(e) => onField(t.id, "dataFine", e.target.value)} /></td>
                  <td style={{ textAlign: "right" }}><input className="ga-mono" style={{ textAlign: "right" }} type="number" defaultValue={t.tariffaGiornaliera} onBlur={(e) => onField(t.id, "tariffaGiornaliera", parseFloat(e.target.value) || 0)} /></td>
                  <td>{isAdmin && <button onClick={() => setConfirmDelete(t.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}><Trash2 size={14} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,31,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="ga-card" style={{ padding: 24, width: 340 }}>
            <div className="ga-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Eliminare questa tariffa?</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button className="ga-btn" onClick={() => setConfirmDelete(null)}>Annulla</button>
              <button className="ga-btn ga-btn-danger" onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}>Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
