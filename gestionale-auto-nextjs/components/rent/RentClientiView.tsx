"use client";

import { useState } from "react";
import { Plus, Users, Trash2, Search, Phone, Mail, IdCard } from "lucide-react";
import type { RentCliente } from "@/lib/rentCalc";

export default function RentClientiView({ clienti, isAdmin, onAdd, onField, onDelete }: {
  clienti: RentCliente[]; isAdmin: boolean; onAdd: () => void;
  onField: (id: string, field: keyof RentCliente, value: any) => void; onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const oggi = new Date().toISOString().slice(0, 10);

  const filtered = clienti.filter((c) => !search || `${c.nome} ${c.telefono} ${c.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Clienti</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{clienti.length} clienti registrati</div>
        </div>
        <button className="ga-btn ga-btn-primary" onClick={onAdd}><Plus size={15} /> Nuovo cliente</button>
      </div>
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 260 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--muted)" }} />
        <input className="ga-input" style={{ paddingLeft: 30 }} placeholder="Cerca nome, telefono, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="ga-card ga-empty"><Users size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Nessun cliente trovato</div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {filtered.map((c) => {
            const patenteScaduta = c.scadenzaPatente && c.scadenzaPatente < oggi;
            return (
              <div key={c.id} className="ga-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <input className="ga-input" style={{ fontWeight: 700, fontSize: 15, border: "none", padding: 0 }} defaultValue={c.nome} onBlur={(e) => onField(c.id, "nome", e.target.value)} placeholder="Nome cliente" />
                  {isAdmin && <button onClick={() => setConfirmDelete(c.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)" }}><Trash2 size={14} /></button>}
                </div>
                <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Phone size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
                    <input className="ga-input" style={{ fontSize: 13, padding: "4px 6px" }} defaultValue={c.telefono} onBlur={(e) => onField(c.id, "telefono", e.target.value)} placeholder="Telefono" />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Mail size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
                    <input className="ga-input" style={{ fontSize: 13, padding: "4px 6px" }} defaultValue={c.email} onBlur={(e) => onField(c.id, "email", e.target.value)} placeholder="Email" />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <IdCard size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
                    <input className="ga-input" style={{ fontSize: 13, padding: "4px 6px" }} defaultValue={c.numeroPatente} onBlur={(e) => onField(c.id, "numeroPatente", e.target.value)} placeholder="N. patente" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label className="ga-field-label">Scad. patente</label>
                    <input type="date" className="ga-input" style={{ fontSize: 12, borderColor: patenteScaduta ? "var(--bad)" : undefined }} defaultValue={c.scadenzaPatente} onBlur={(e) => onField(c.id, "scadenzaPatente", e.target.value)} />
                  </div>
                  <div>
                    <label className="ga-field-label">N. documento</label>
                    <input className="ga-input" style={{ fontSize: 12 }} defaultValue={c.numeroDocumento} onBlur={(e) => onField(c.id, "numeroDocumento", e.target.value)} />
                  </div>
                </div>
                {patenteScaduta && <div style={{ fontSize: 11, color: "var(--bad)", marginTop: 8, fontWeight: 600 }}>⚠ Patente scaduta</div>}
              </div>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,31,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="ga-card" style={{ padding: 24, width: 340 }}>
            <div className="ga-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Eliminare questo cliente?</div>
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
