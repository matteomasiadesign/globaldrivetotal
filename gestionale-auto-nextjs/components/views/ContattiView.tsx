"use client";

import { useState } from "react";
import { Plus, Users, Trash2, Search, Phone, Mail } from "lucide-react";
import type { Contatto } from "@/lib/calc";
import { TIPI_CONTATTO } from "@/lib/calc";
import { Field } from "../ui/Shared";

export default function ContattiView({ contatti, isAdmin, onAdd, onField, onDelete }: {
  contatti: Contatto[]; isAdmin: boolean; onAdd: () => void;
  onField: (id: string, field: keyof Contatto, value: any) => void; onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("tutti");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = contatti.filter((c) => {
    if (filterTipo !== "tutti" && c.tipo !== filterTipo) return false;
    if (search && !`${c.nome} ${c.telefono} ${c.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Clienti e fornitori</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{contatti.length} contatti in anagrafica</div>
        </div>
        <button className="ga-btn ga-btn-primary" onClick={onAdd}><Plus size={15} /> Nuovo contatto</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="ga-input" style={{ width: 160 }} value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
          <option value="tutti">Tutti i tipi</option>
          {TIPI_CONTATTO.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--muted)" }} />
          <input className="ga-input" style={{ paddingLeft: 30, width: 220 }} placeholder="Cerca nome, telefono, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="ga-card ga-empty"><Users size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Nessun contatto trovato</div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filtered.map((c) => (
            <div key={c.id} className="ga-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--amber)" }}>{c.tipo}</span>
                {isAdmin && <button onClick={() => setConfirmDelete(c.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)" }}><Trash2 size={14} /></button>}
              </div>
              <input className="ga-input" style={{ fontWeight: 700, fontSize: 15, border: "none", padding: 0, marginBottom: 8 }} defaultValue={c.nome} onBlur={(e) => onField(c.id, "nome", e.target.value)} placeholder="Nome" />
              <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Phone size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
                  <input className="ga-input" style={{ fontSize: 13, padding: "4px 6px" }} defaultValue={c.telefono} onBlur={(e) => onField(c.id, "telefono", e.target.value)} placeholder="Telefono" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Mail size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
                  <input className="ga-input" style={{ fontSize: 13, padding: "4px 6px" }} defaultValue={c.email} onBlur={(e) => onField(c.id, "email", e.target.value)} placeholder="Email" />
                </div>
              </div>
              <select className="ga-input" style={{ fontSize: 12, marginBottom: 8 }} defaultValue={c.tipo} onChange={(e) => onField(c.id, "tipo", e.target.value)}>
                {TIPI_CONTATTO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                <input className="ga-input" style={{ fontSize: 12, padding: "4px 6px" }} defaultValue={c.codiceFiscale} onBlur={(e) => onField(c.id, "codiceFiscale", e.target.value.toUpperCase())} placeholder="Cod. fiscale / P.IVA" />
                <input className="ga-input" style={{ fontSize: 12, padding: "4px 6px" }} defaultValue={c.nascitaSede} onBlur={(e) => onField(c.id, "nascitaSede", e.target.value)} placeholder="Luogo/data nascita" />
              </div>
              <input className="ga-input" style={{ fontSize: 12, padding: "4px 6px", marginBottom: 8 }} defaultValue={c.residenza} onBlur={(e) => onField(c.id, "residenza", e.target.value)} placeholder="Residenza" />
              <textarea className="ga-input" style={{ fontSize: 12 }} rows={2} defaultValue={c.note} onBlur={(e) => onField(c.id, "note", e.target.value)} placeholder="Note…" />
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,31,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="ga-card" style={{ padding: 24, width: 340 }}>
            <div className="ga-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Eliminare questo contatto?</div>
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
