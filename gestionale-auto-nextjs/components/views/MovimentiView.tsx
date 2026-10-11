"use client";

import { useState } from "react";
import { Plus, Receipt, Trash2, Search } from "lucide-react";
import type { Movimento, Veicolo } from "@/lib/calc";
import { eur, CATEGORIE, NATURE_COSTO, PAGAMENTI } from "@/lib/calc";

export default function MovimentiView({ movimenti, veicoli, isAdmin, onAdd, onField, onDelete }: {
  movimenti: Movimento[]; veicoli: Veicolo[]; isAdmin: boolean;
  onAdd: (autoId: string | null) => void; onField: (id: string, field: keyof Movimento, value: any) => void; onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("tutti");
  const [filterAuto, setFilterAuto] = useState("tutti");

  const veicoloNome = (id: string | null) => veicoli.find((v) => v.id === id)?.nome || "— generale —";

  const filtered = movimenti.filter((m) => {
    if (filterTipo !== "tutti" && m.tipo !== filterTipo) return false;
    if (filterAuto !== "tutti" && (filterAuto === "generale" ? m.autoId !== null : m.autoId !== filterAuto)) return false;
    if (search && !`${m.descrizione} ${m.fornitoreCliente} ${veicoloNome(m.autoId)}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totaleEntrate = filtered.filter((m) => m.tipo === "Entrata").reduce((s, m) => s + m.totale, 0);
  const totaleUscite = filtered.filter((m) => m.tipo === "Uscita").reduce((s, m) => s + m.totale, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Movimenti</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{movimenti.length} registrati · entrate {eur(totaleEntrate)} · uscite {eur(totaleUscite)}</div>
        </div>
        <button className="ga-btn ga-btn-primary" onClick={() => onAdd(null)}><Plus size={15} /> Nuovo movimento</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select className="ga-input" style={{ width: 140 }} value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
          <option value="tutti">Tutti i tipi</option><option value="Entrata">Entrate</option><option value="Uscita">Uscite</option>
        </select>
        <select className="ga-input" style={{ width: 200 }} value={filterAuto} onChange={(e) => setFilterAuto(e.target.value)}>
          <option value="tutti">Tutte le auto</option>
          <option value="generale">Solo generali</option>
          {veicoli.map((v) => <option key={v.id} value={v.id}>{v.nome || "Auto senza nome"}</option>)}
        </select>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--muted)" }} />
          <input className="ga-input" style={{ paddingLeft: 30, width: 220 }} placeholder="Cerca descrizione, fornitore…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="ga-card ga-empty"><Receipt size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Nessun movimento trovato</div></div>
      ) : (
        <div className="ga-card" style={{ overflow: "auto" }}>
          <table className="ga-table">
            <thead>
              <tr>
                <th style={{ width: 105 }}>Data</th>
                <th style={{ width: 160 }}>Auto</th>
                <th>Descrizione</th>
                <th style={{ width: 150 }}>Categoria</th>
                <th style={{ width: 150 }}>Natura</th>
                <th style={{ width: 90 }}>Tipo</th>
                <th style={{ width: 90 }}>Pagamento</th>
                <th style={{ width: 90, textAlign: "right" }}>Imponibile</th>
                <th style={{ width: 80, textAlign: "right" }}>IVA</th>
                <th style={{ width: 90, textAlign: "right" }}>Totale</th>
                <th style={{ width: 60 }}>Detr.</th>
                <th style={{ width: 105 }}>Scadenza</th>
                <th style={{ width: 100 }}>Pagamento stato</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td><input type="date" defaultValue={m.data} onBlur={(e) => onField(m.id, "data", e.target.value)} /></td>
                  <td>
                    <select defaultValue={m.autoId || ""} onChange={(e) => onField(m.id, "autoId", e.target.value || null)} style={selStyle}>
                      <option value="">— generale —</option>
                      {veicoli.map((v) => <option key={v.id} value={v.id}>{v.nome || "Auto senza nome"}</option>)}
                    </select>
                  </td>
                  <td><input defaultValue={m.descrizione} onBlur={(e) => onField(m.id, "descrizione", e.target.value)} placeholder="es. Tagliando pastiglie" /></td>
                  <td>
                    <select defaultValue={m.categoria} onChange={(e) => onField(m.id, "categoria", e.target.value)} style={selStyle}>
                      {CATEGORIE.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td>
                    <select defaultValue={m.naturaCosto} onChange={(e) => onField(m.id, "naturaCosto", e.target.value)} style={selStyle}>
                      {NATURE_COSTO.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                  <td>
                    <select defaultValue={m.tipo} onChange={(e) => onField(m.id, "tipo", e.target.value)} style={selStyle}>
                      <option value="Uscita">Uscita</option><option value="Entrata">Entrata</option>
                    </select>
                  </td>
                  <td>
                    <select defaultValue={m.pagamento} onChange={(e) => onField(m.id, "pagamento", e.target.value)} style={selStyle}>
                      {PAGAMENTI.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td style={{ textAlign: "right" }}><input className="ga-mono" style={{ textAlign: "right" }} type="number" defaultValue={m.imponibile} onBlur={(e) => onField(m.id, "imponibile", parseFloat(e.target.value) || 0)} /></td>
                  <td style={{ textAlign: "right" }}><input className="ga-mono" style={{ textAlign: "right" }} type="number" defaultValue={m.iva} onBlur={(e) => onField(m.id, "iva", parseFloat(e.target.value) || 0)} /></td>
                  <td style={{ textAlign: "right" }} className="ga-mono">{eur(m.totale)}</td>
                  <td style={{ textAlign: "center" }}><input type="checkbox" defaultChecked={m.ivaDetraibile} onChange={(e) => onField(m.id, "ivaDetraibile", e.target.checked)} /></td>
                  <td><input type="date" defaultValue={m.dataScadenza} onBlur={(e) => onField(m.id, "dataScadenza", e.target.value)} /></td>
                  <td>
                    <select defaultValue={m.statoPagamento} onChange={(e) => onField(m.id, "statoPagamento", e.target.value)} style={selStyle}>
                      <option value="Saldato">Saldato</option><option value="Da saldare">Da saldare</option>
                    </select>
                  </td>
                  <td><button onClick={() => onDelete(m.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const selStyle: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 5, padding: "4px 5px", fontSize: 13, width: "100%", background: "#fff" };
