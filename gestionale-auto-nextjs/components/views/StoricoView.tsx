"use client";

import { useState } from "react";
import { History, Search } from "lucide-react";
import type { AuditEntry } from "@/lib/calc";

const AZIONE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  INSERT: { label: "Creato", color: "var(--good)", bg: "var(--good-bg)" },
  UPDATE: { label: "Modificato", color: "#8A5A2E", bg: "#F5E6D3" },
  DELETE: { label: "Eliminato", color: "var(--bad)", bg: "var(--bad-bg)" },
};
const TABELLA_LABEL: Record<string, string> = { veicoli: "Auto", movimenti: "Movimento" };

function riassuntoDati(row: AuditEntry): string {
  const dati = row.datiNuovi || row.datiPrecedenti;
  if (!dati) return "";
  if (row.tabella === "veicoli") return dati.nome || "Auto senza nome";
  if (row.tabella === "movimenti") return dati.descrizione || dati.categoria || "Movimento";
  return "";
}

export default function StoricoView({ audit }: { audit: AuditEntry[] }) {
  const [search, setSearch] = useState("");
  const [filterTabella, setFilterTabella] = useState("tutte");

  const filtered = audit.filter((a) => {
    if (filterTabella !== "tutte" && a.tabella !== filterTabella) return false;
    if (search && !`${riassuntoDati(a)} ${a.utenteEmail || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Storico modifiche</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Chi ha creato, modificato o eliminato cosa</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="ga-input" style={{ width: 160 }} value={filterTabella} onChange={(e) => setFilterTabella(e.target.value)}>
          <option value="tutte">Tutto</option>
          <option value="veicoli">Solo auto</option>
          <option value="movimenti">Solo movimenti</option>
        </select>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--muted)" }} />
          <input className="ga-input" style={{ paddingLeft: 30, width: 220 }} placeholder="Cerca…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="ga-card ga-empty"><History size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Nessuna modifica registrata</div></div>
      ) : (
        <div className="ga-card" style={{ overflow: "auto" }}>
          <table className="ga-table">
            <thead><tr><th style={{ width: 150 }}>Quando</th><th style={{ width: 90 }}>Azione</th><th style={{ width: 90 }}>Tabella</th><th>Oggetto</th><th style={{ width: 200 }}>Utente</th></tr></thead>
            <tbody>
              {filtered.map((a) => {
                const az = AZIONE_LABEL[a.azione];
                return (
                  <tr key={a.id}>
                    <td className="ga-mono" style={{ fontSize: 12 }}>{new Date(a.avvenutoIl).toLocaleString("it-IT")}</td>
                    <td><span className="ga-badge" style={{ background: az.bg, color: az.color }}>{az.label}</span></td>
                    <td>{TABELLA_LABEL[a.tabella] || a.tabella}</td>
                    <td>{riassuntoDati(a)}</td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{a.utenteEmail || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
