"use client";

import { useState } from "react";
import { CalendarClock, AlertTriangle } from "lucide-react";
import type { Movimento, Veicolo } from "@/lib/calc";
import { eur } from "@/lib/calc";

export default function ScadenzarioView({ movimenti, veicoli, onField }: {
  movimenti: Movimento[]; veicoli: Veicolo[]; onField: (id: string, field: keyof Movimento, value: any) => void;
}) {
  const [tab, setTab] = useState<"incassi" | "pagamenti">("incassi");
  const oggi = new Date().toISOString().slice(0, 10);
  const veicoloNome = (id: string | null) => veicoli.find((v) => v.id === id)?.nome || "—";

  const daSaldare = movimenti.filter((m) => m.statoPagamento === "Da saldare");
  const incassi = daSaldare.filter((m) => m.tipo === "Entrata").sort((a, b) => (a.dataScadenza || "").localeCompare(b.dataScadenza || ""));
  const pagamenti = daSaldare.filter((m) => m.tipo === "Uscita").sort((a, b) => (a.dataScadenza || "").localeCompare(b.dataScadenza || ""));

  const totIncassi = incassi.reduce((s, m) => s + m.totale, 0);
  const totPagamenti = pagamenti.reduce((s, m) => s + m.totale, 0);
  const scadutiIncassi = incassi.filter((m) => m.dataScadenza && m.dataScadenza < oggi).length;
  const scadutiPagamenti = pagamenti.filter((m) => m.dataScadenza && m.dataScadenza < oggi).length;

  function segnaSaldato(id: string) {
    onField(id, "statoPagamento", "Saldato");
    onField(id, "dataSaldo", oggi);
  }

  const lista = tab === "incassi" ? incassi : pagamenti;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Scadenzario</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Incassi e pagamenti ancora da saldare</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 22 }}>
        <div className="ga-card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>Da incassare</div>
          <div className="ga-mono" style={{ fontSize: 22, fontWeight: 700 }}>{eur(totIncassi)}</div>
          {scadutiIncassi > 0 && <div style={{ fontSize: 12, color: "var(--bad)", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}><AlertTriangle size={12} /> {scadutiIncassi} scaduti</div>}
        </div>
        <div className="ga-card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>Da pagare</div>
          <div className="ga-mono" style={{ fontSize: 22, fontWeight: 700 }}>{eur(totPagamenti)}</div>
          {scadutiPagamenti > 0 && <div style={{ fontSize: 12, color: "var(--bad)", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}><AlertTriangle size={12} /> {scadutiPagamenti} scaduti</div>}
        </div>
      </div>

      <div className="ga-tabbar">
        <div className={`ga-tab ${tab === "incassi" ? "active" : ""}`} onClick={() => setTab("incassi")}>Da incassare ({incassi.length})</div>
        <div className={`ga-tab ${tab === "pagamenti" ? "active" : ""}`} onClick={() => setTab("pagamenti")}>Da pagare ({pagamenti.length})</div>
      </div>

      {lista.length === 0 ? (
        <div className="ga-card ga-empty"><CalendarClock size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Niente in sospeso qui</div></div>
      ) : (
        <div className="ga-card" style={{ overflow: "auto" }}>
          <table className="ga-table">
            <thead><tr><th style={{ width: 110 }}>Scadenza</th><th style={{ width: 160 }}>Auto</th><th>Descrizione</th><th style={{ width: 150 }}>Controparte</th><th style={{ textAlign: "right", width: 100 }}>Totale</th><th style={{ width: 110 }}></th></tr></thead>
            <tbody>
              {lista.map((m) => {
                const scaduto = m.dataScadenza && m.dataScadenza < oggi;
                return (
                  <tr key={m.id}>
                    <td>
                      <span className="ga-mono" style={{ color: scaduto ? "var(--bad)" : "var(--ink)", fontWeight: scaduto ? 700 : 500 }}>
                        {m.dataScadenza || "—"}{scaduto && " ⚠"}
                      </span>
                    </td>
                    <td>{veicoloNome(m.autoId)}</td>
                    <td>{m.descrizione || m.categoria}</td>
                    <td>{m.fornitoreCliente || "—"}</td>
                    <td style={{ textAlign: "right" }} className="ga-mono">{eur(m.totale)}</td>
                    <td><button className="ga-btn" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => segnaSaldato(m.id)}>Segna saldato</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 14 }}>
        Per impostare una scadenza su un movimento, apri la sezione "Movimenti" e compila la colonna Scadenza e lo stato "Da saldare".
      </div>
    </div>
  );
}
