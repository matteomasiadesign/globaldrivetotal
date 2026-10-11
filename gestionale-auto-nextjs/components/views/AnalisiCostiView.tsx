import type { Veicolo, Movimento, Impostazioni } from "@/lib/calc";
import { computeVeicolo, eur, MESI, meseNum, annoNum } from "@/lib/calc";

export default function AnalisiCostiView({ veicoli, movimenti, impostazioni }: { veicoli: Veicolo[]; movimenti: Movimento[]; impostazioni: Impostazioni }) {
  const anno = impostazioni.annoGestione;

  const righe = MESI.map((nomeMese, idx) => {
    const mese = idx + 1;
    const costiFissi = movimenti.filter((m) => m.tipo === "Uscita" && m.naturaCosto === "Fisso" && meseNum(m.data) === mese && annoNum(m.data) === anno).reduce((s, m) => s + m.totale, 0);
    const variabiliDiretti = movimenti.filter((m) => m.tipo === "Uscita" && m.naturaCosto === "Variabile diretto auto" && meseNum(m.data) === mese && annoNum(m.data) === anno).reduce((s, m) => s + m.totale, 0);
    const variabiliGenerali = movimenti.filter((m) => m.tipo === "Uscita" && m.naturaCosto === "Variabile generale" && meseNum(m.data) === mese && annoNum(m.data) === anno).reduce((s, m) => s + m.totale, 0);
    const costiTotali = costiFissi + variabiliDiretti + variabiliGenerali;

    const venduteNelMese = veicoli.filter((v) => v.dataVendita && meseNum(v.dataVendita) === mese && annoNum(v.dataVendita) === anno);
    const risultatoAuto = venduteNelMese.reduce((s, v) => s + (computeVeicolo(v, movimenti, impostazioni).risultatoDopoIva || 0), 0);
    const risultatoOperativo = risultatoAuto - costiFissi - variabiliGenerali;
    const costiFissiPerAuto = venduteNelMese.length ? costiFissi / venduteNelMese.length : 0;
    const entrateMese = movimenti.filter((m) => m.tipo === "Entrata" && meseNum(m.data) === mese && annoNum(m.data) === anno).reduce((s, m) => s + m.totale, 0);
    const incidenza = entrateMese ? costiTotali / entrateMese : 0;

    return { mese: nomeMese, costiFissi, variabiliDiretti, variabiliGenerali, costiTotali, risultatoAuto, risultatoOperativo, costiFissiPerAuto, incidenza };
  });

  const mediaCostiFissi = righe.reduce((s, r) => s + r.costiFissi, 0) / 12;
  const vendute = veicoli.filter((v) => v.dataVendita);
  const margineMedioOperazione = vendute.length
    ? vendute.reduce((s, v) => s + (computeVeicolo(v, movimenti, impostazioni).risultatoDopoIva || 0), 0) / vendute.length
    : 0;
  const operazioniNecessarie = margineMedioOperazione ? mediaCostiFissi / margineMedioOperazione : 0;

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Analisi costi</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Fissi, variabili e break-even — anno {anno}</div>
      </div>

      <div className="ga-card" style={{ overflow: "auto", marginBottom: 22 }}>
        <table className="ga-table">
          <thead>
            <tr>
              <th>Mese</th><th style={{ textAlign: "right" }}>Fissi</th><th style={{ textAlign: "right" }}>Variabili diretti</th>
              <th style={{ textAlign: "right" }}>Variabili generali</th><th style={{ textAlign: "right" }}>Totali</th>
              <th style={{ textAlign: "right" }}>Risultato auto</th><th style={{ textAlign: "right" }}>Risultato operativo</th>
              <th style={{ textAlign: "right" }}>Fissi/auto venduta</th><th style={{ textAlign: "right" }}>Incidenza</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => (
              <tr key={r.mese}>
                <td style={{ fontWeight: 600 }}>{r.mese}</td>
                <td style={{ textAlign: "right" }} className="ga-mono">{eur(r.costiFissi)}</td>
                <td style={{ textAlign: "right" }} className="ga-mono">{eur(r.variabiliDiretti)}</td>
                <td style={{ textAlign: "right" }} className="ga-mono">{eur(r.variabiliGenerali)}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }} className="ga-mono">{eur(r.costiTotali)}</td>
                <td style={{ textAlign: "right" }} className="ga-mono">
                  <span style={{ color: r.risultatoAuto >= 0 ? "var(--good)" : "var(--bad)" }}>{eur(r.risultatoAuto)}</span>
                </td>
                <td style={{ textAlign: "right" }} className="ga-mono">
                  <span style={{ color: r.risultatoOperativo >= 0 ? "var(--good)" : "var(--bad)" }}>{eur(r.risultatoOperativo)}</span>
                </td>
                <td style={{ textAlign: "right" }} className="ga-mono">{eur(r.costiFissiPerAuto)}</td>
                <td style={{ textAlign: "right" }} className="ga-mono">{(r.incidenza * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ga-card" style={{ padding: 20 }}>
        <div className="ga-display" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Break-even mensile</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <MiniKpi label="Costi fissi medi/mese" value={eur(mediaCostiFissi)} />
          <MiniKpi label="Margine medio per operazione" value={eur(margineMedioOperazione)} />
          <MiniKpi label="Operazioni necessarie/mese" value={operazioniNecessarie.toFixed(1)} />
        </div>
      </div>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      <div className="ga-mono" style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
