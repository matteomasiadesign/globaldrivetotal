"use client";

import { useState } from "react";
import { Landmark, Search } from "lucide-react";
import type { Movimento, Veicolo } from "@/lib/calc";
import { eur } from "@/lib/calc";

export default function RiconciliazioneView({ movimenti, veicoli, onField }: {
  movimenti: Movimento[]; veicoli: Veicolo[]; onField: (id: string, field: keyof Movimento, value: any) => void;
}) {
  const [search, setSearch] = useState("");
  const [soloNonRiconciliati, setSoloNonRiconciliati] = useState(true);
  const veicoloNome = (id: string | null) => veicoli.find((v) => v.id === id)?.nome || "— generale —";

  const bancari = movimenti.filter((m) => m.pagamento === "CONTO" || m.pagamento === "Bonifico");
  const filtrati = bancari.filter((m) => {
    if (soloNonRiconciliati && m.riconciliato) return false;
    if (search && !`${m.descrizione} ${m.fornitoreCliente} ${veicoloNome(m.autoId)}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.data.localeCompare(a.data));

  const nonRiconciliatiCount = bancari.filter((m) => !m.riconciliato).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Riconciliazione bancaria</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{bancari.length} movimenti da conto/bonifico · {nonRiconciliatiCount} da riconciliare</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <label className="ga-checkbox-row">
          <input type="checkbox" checked={soloNonRiconciliati} onChange={(e) => setSoloNonRiconciliati(e.target.checked)} /> Mostra solo da riconciliare
        </label>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--muted)" }} />
          <input className="ga-input" style={{ paddingLeft: 30, width: 220 }} placeholder="Cerca descrizione, fornitore…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtrati.length === 0 ? (
        <div className="ga-card ga-empty"><Landmark size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Nulla da mostrare qui</div></div>
      ) : (
        <div className="ga-card" style={{ overflow: "auto" }}>
          <table className="ga-table">
            <thead><tr><th style={{ width: 100 }}>Data</th><th style={{ width: 150 }}>Auto</th><th>Descrizione</th><th style={{ textAlign: "right", width: 90 }}>Totale</th><th style={{ width: 200 }}>Riferimento estratto conto</th><th style={{ width: 100, textAlign: "center" }}>Riconciliato</th></tr></thead>
            <tbody>
              {filtrati.map((m) => (
                <tr key={m.id} style={{ background: m.riconciliato ? "var(--good-bg)" : "transparent" }}>
                  <td className="ga-mono">{m.data}</td>
                  <td>{veicoloNome(m.autoId)}</td>
                  <td>{m.descrizione || m.categoria}</td>
                  <td style={{ textAlign: "right" }} className="ga-mono">{eur(m.totale)}</td>
                  <td><input defaultValue={m.riferimentoEstratto} onBlur={(e) => onField(m.id, "riferimentoEstratto", e.target.value)} placeholder="es. rif. movimento banca" /></td>
                  <td style={{ textAlign: "center" }}><input type="checkbox" checked={m.riconciliato} onChange={(e) => onField(m.id, "riconciliato", e.target.checked)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
