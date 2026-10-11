import type { Veicolo, Movimento, Impostazioni } from "@/lib/calc";
import { computeVeicolo, eur, pct, MESI, meseNum, annoNum } from "@/lib/calc";

export default function AnalisiMensileView({ veicoli, movimenti, impostazioni }: { veicoli: Veicolo[]; movimenti: Movimento[]; impostazioni: Impostazioni }) {
  const anno = impostazioni.annoGestione;

  const righe = MESI.map((nomeMese, idx) => {
    const mese = idx + 1;
    const venduteNelMese = veicoli.filter((v) => v.dataVendita && meseNum(v.dataVendita) === mese && annoNum(v.dataVendita) === anno);
    const venditaDiretta = venduteNelMese.filter((v) => v.servizio === "Vendita diretta").length;
    const suCommissione = venduteNelMese.filter((v) => v.servizio === "Auto su commissione").length;
    const contoVendita = venduteNelMese.filter((v) => v.servizio === "Conto vendita").length;
    const operazioniTotali = venduteNelMese.length;
    const ricavi = movimenti.filter((m) => m.tipo === "Entrata" && meseNum(m.data) === mese && annoNum(m.data) === anno).reduce((s, m) => s + m.totale, 0);
    const risultatoAuto = venduteNelMese.reduce((s, v) => s + (computeVeicolo(v, movimenti, impostazioni).risultatoDopoIva || 0), 0);
    const costoTotaleVendute = venduteNelMese.reduce((s, v) => s + computeVeicolo(v, movimenti, impostazioni).costoTotale, 0);
    const roiMedio = costoTotaleVendute ? risultatoAuto / costoTotaleVendute : 0;
    return { mese: nomeMese, venditaDiretta, suCommissione, contoVendita, operazioniTotali, ricavi, risultatoAuto, roiMedio };
  });

  const totaliAnno = righe.reduce((acc, r) => ({
    operazioni: acc.operazioni + r.operazioniTotali, ricavi: acc.ricavi + r.ricavi, risultato: acc.risultato + r.risultatoAuto,
  }), { operazioni: 0, ricavi: 0, risultato: 0 });

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Analisi mensile</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Operazioni per servizio — anno {anno}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 22 }}>
        <div className="ga-card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>Operazioni totali</div>
          <div className="ga-mono" style={{ fontSize: 24, fontWeight: 700 }}>{totaliAnno.operazioni}</div>
        </div>
        <div className="ga-card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>Ricavi totali</div>
          <div className="ga-mono" style={{ fontSize: 24, fontWeight: 700 }}>{eur(totaliAnno.ricavi)}</div>
        </div>
        <div className="ga-card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>Risultato totale</div>
          <div className="ga-mono" style={{ fontSize: 24, fontWeight: 700, color: totaliAnno.risultato >= 0 ? "var(--good)" : "var(--bad)" }}>{eur(totaliAnno.risultato)}</div>
        </div>
      </div>

      <div className="ga-card" style={{ overflow: "auto" }}>
        <table className="ga-table">
          <thead>
            <tr>
              <th>Mese</th><th style={{ textAlign: "right" }}>Vendita diretta</th><th style={{ textAlign: "right" }}>Su commissione</th>
              <th style={{ textAlign: "right" }}>Conto vendita</th><th style={{ textAlign: "right" }}>Operazioni</th>
              <th style={{ textAlign: "right" }}>Ricavi</th><th style={{ textAlign: "right" }}>Risultato auto</th><th style={{ textAlign: "right" }}>ROI medio</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => (
              <tr key={r.mese}>
                <td style={{ fontWeight: 600 }}>{r.mese}</td>
                <td style={{ textAlign: "right" }} className="ga-mono">{r.venditaDiretta}</td>
                <td style={{ textAlign: "right" }} className="ga-mono">{r.suCommissione}</td>
                <td style={{ textAlign: "right" }} className="ga-mono">{r.contoVendita}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }} className="ga-mono">{r.operazioniTotali}</td>
                <td style={{ textAlign: "right" }} className="ga-mono">{eur(r.ricavi)}</td>
                <td style={{ textAlign: "right" }} className="ga-mono">
                  <span style={{ color: r.risultatoAuto >= 0 ? "var(--good)" : "var(--bad)" }}>{eur(r.risultatoAuto)}</span>
                </td>
                <td style={{ textAlign: "right" }} className="ga-mono">{pct(r.roiMedio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
