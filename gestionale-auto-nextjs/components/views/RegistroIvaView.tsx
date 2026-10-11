"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import type { Veicolo, Movimento, Impostazioni } from "@/lib/calc";
import { computeVeicolo, eur, annoNum } from "@/lib/calc";

export default function RegistroIvaView({ veicoli, movimenti, impostazioni }: { veicoli: Veicolo[]; movimenti: Movimento[]; impostazioni: Impostazioni }) {
  const [tab, setTab] = useState<"vendite" | "acquisti">("vendite");
  const anno = impostazioni.annoGestione;

  const vendite = veicoli
    .filter((v) => v.dataVendita && annoNum(v.dataVendita) === anno)
    .map((v) => ({ v, calc: computeVeicolo(v, movimenti, impostazioni) }))
    .sort((a, b) => a.v.dataVendita.localeCompare(b.v.dataVendita));

  const totVenditeImponibile = vendite.reduce((s, r) => s + (r.v.servizio === "Conto vendita" ? (r.calc.commissioneImponibile || 0) : (r.calc.margineRegimeIva || 0)), 0);
  const totVenditeIva = vendite.reduce((s, r) => s + (r.v.servizio === "Conto vendita" ? (r.calc.ivaCommissione || 0) : (r.calc.ivaRegimeMargine || 0)), 0);

  const acquisti = movimenti
    .filter((m) => m.tipo === "Uscita" && m.ivaDetraibile && annoNum(m.data) === anno)
    .sort((a, b) => a.data.localeCompare(b.data));
  const totAcquistiImponibile = acquisti.reduce((s, m) => s + m.imponibile, 0);
  const totAcquistiIva = acquisti.reduce((s, m) => s + m.iva, 0);

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Registro IVA</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Anno {anno} — documenti in ordine cronologico</div>
      </div>

      <div className="ga-tabbar">
        <div className={`ga-tab ${tab === "vendite" ? "active" : ""}`} onClick={() => setTab("vendite")}>Registro vendite ({vendite.length})</div>
        <div className={`ga-tab ${tab === "acquisti" ? "active" : ""}`} onClick={() => setTab("acquisti")}>Registro acquisti ({acquisti.length})</div>
      </div>

      {tab === "vendite" ? (
        vendite.length === 0 ? (
          <div className="ga-card ga-empty"><BookOpen size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Nessuna vendita registrata nel {anno}</div></div>
        ) : (
          <>
            <div className="ga-card" style={{ overflow: "auto", marginBottom: 14 }}>
              <table className="ga-table">
                <thead><tr><th>Data</th><th>N. fattura</th><th>Auto</th><th>Servizio</th><th style={{ textAlign: "right" }}>Imponibile</th><th style={{ textAlign: "right" }}>IVA</th><th style={{ textAlign: "right" }}>Totale</th></tr></thead>
                <tbody>
                  {vendite.map(({ v, calc }) => {
                    const isCV = v.servizio === "Conto vendita";
                    const imponibile = isCV ? (calc.commissioneImponibile || 0) : (calc.margineRegimeIva || 0);
                    const iva = isCV ? (calc.ivaCommissione || 0) : (calc.ivaRegimeMargine || 0);
                    return (
                      <tr key={v.id}>
                        <td className="ga-mono">{v.dataVendita}</td>
                        <td>{v.numeroFattura || "—"}</td>
                        <td style={{ fontWeight: 600 }}>{v.nome}</td>
                        <td style={{ fontSize: 12, color: "var(--muted)" }}>{v.servizio}</td>
                        <td style={{ textAlign: "right" }} className="ga-mono">{eur(imponibile)}</td>
                        <td style={{ textAlign: "right" }} className="ga-mono">{eur(iva)}</td>
                        <td style={{ textAlign: "right" }} className="ga-mono">{eur(imponibile + iva)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TotaliRiga imponibile={totVenditeImponibile} iva={totVenditeIva} />
          </>
        )
      ) : (
        acquisti.length === 0 ? (
          <div className="ga-card ga-empty"><BookOpen size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Nessun acquisto con IVA detraibile nel {anno}</div></div>
        ) : (
          <>
            <div className="ga-card" style={{ overflow: "auto", marginBottom: 14 }}>
              <table className="ga-table">
                <thead><tr><th>Data</th><th>N. documento</th><th>Fornitore</th><th>Categoria</th><th style={{ textAlign: "right" }}>Imponibile</th><th style={{ textAlign: "right" }}>IVA</th><th style={{ textAlign: "right" }}>Totale</th></tr></thead>
                <tbody>
                  {acquisti.map((m) => (
                    <tr key={m.id}>
                      <td className="ga-mono">{m.data}</td>
                      <td>{m.numeroDocumento || "—"}</td>
                      <td>{m.fornitoreCliente || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{m.categoria}</td>
                      <td style={{ textAlign: "right" }} className="ga-mono">{eur(m.imponibile)}</td>
                      <td style={{ textAlign: "right" }} className="ga-mono">{eur(m.iva)}</td>
                      <td style={{ textAlign: "right" }} className="ga-mono">{eur(m.totale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TotaliRiga imponibile={totAcquistiImponibile} iva={totAcquistiIva} />
          </>
        )
      )}

      <div style={{ marginTop: 18, fontSize: 12, color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
        Questo registro è un supporto gestionale per organizzare i dati: il registro IVA ufficiale ai fini di legge resta quello tenuto dal tuo commercialista. Confronta periodicamente questi totali con i suoi per intercettare eventuali discrepanze.
      </div>
    </div>
  );
}

function TotaliRiga({ imponibile, iva }: { imponibile: number; iva: number }) {
  return (
    <div className="ga-card" style={{ padding: 16, display: "flex", justifyContent: "flex-end", gap: 32 }}>
      <div><span style={{ fontSize: 12, color: "var(--muted)" }}>Totale imponibile: </span><span className="ga-mono" style={{ fontWeight: 700 }}>{eur(imponibile)}</span></div>
      <div><span style={{ fontSize: 12, color: "var(--muted)" }}>Totale IVA: </span><span className="ga-mono" style={{ fontWeight: 700 }}>{eur(iva)}</span></div>
    </div>
  );
}
