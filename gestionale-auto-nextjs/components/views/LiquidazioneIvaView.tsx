import { Percent } from "lucide-react";
import type { Veicolo, Movimento, Impostazioni } from "@/lib/calc";
import { computeVeicolo, eur, trimestre as calcTrimestre } from "@/lib/calc";

const PERIODI: Record<number, { label: string; scadenza: string }> = {
  1: { label: "01/01 – 31/03", scadenza: "18 maggio" },
  2: { label: "01/04 – 30/06", scadenza: "20 agosto" },
  3: { label: "01/07 – 30/09", scadenza: "16 novembre" },
  4: { label: "01/10 – 31/12", scadenza: "16 marzo (anno succ.)" },
};

export default function LiquidazioneIvaView({ veicoli, movimenti, impostazioni }: { veicoli: Veicolo[]; movimenti: Movimento[]; impostazioni: Impostazioni }) {
  const anno = impostazioni.annoGestione;

  const righe = [1, 2, 3, 4].map((trim) => {
    let ivaMargine = 0, ivaCommissioni = 0, ivaDetraibile = 0;
    veicoli.forEach((v) => {
      if (!v.dataVendita) return;
      const d = new Date(v.dataVendita);
      if (calcTrimestre(v.dataVendita) !== trim || d.getFullYear() !== anno) return;
      const c = computeVeicolo(v, movimenti, impostazioni);
      if (v.servizio === "Conto vendita") ivaCommissioni += c.ivaCommissione || 0;
      else ivaMargine += c.ivaRegimeMargine || 0;
    });
    movimenti.forEach((m) => {
      if (!m.data || !m.ivaDetraibile) return;
      const d = new Date(m.data);
      if (calcTrimestre(m.data) === trim && d.getFullYear() === anno) ivaDetraibile += m.iva;
    });
    const saldoBase = Math.max(0, ivaMargine + ivaCommissioni - ivaDetraibile);
    const maggiorazione = saldoBase === 0 ? 0 : saldoBase * impostazioni.maggiorazioneTrimestrale;
    const totale = saldoBase + maggiorazione;
    return { trim, ivaMargine, ivaCommissioni, ivaDetraibile, saldoBase, maggiorazione, totale };
  });

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Liquidazione IVA</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Controllo trimestrale — anno {anno}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {righe.map((r) => {
          const periodo = PERIODI[r.trim];
          return (
            <div key={r.trim} className="ga-card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div className="ga-display" style={{ fontWeight: 700, fontSize: 15 }}>T{r.trim}</div>
                <Percent size={14} style={{ color: "var(--muted)" }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14 }}>{periodo.label} · scad. {periodo.scadenza}</div>
              <MiniRow label="IVA regime margine" value={eur(r.ivaMargine)} />
              <MiniRow label="IVA su commissioni" value={eur(r.ivaCommissioni)} />
              <MiniRow label="IVA detraibile costi" value={`− ${eur(r.ivaDetraibile)}`} />
              <div style={{ borderTop: "1px solid var(--line)", margin: "8px 0" }} />
              <MiniRow label="Saldo IVA base" value={eur(r.saldoBase)} />
              <MiniRow label={`Maggiorazione (${(impostazioni.maggiorazioneTrimestrale * 100).toFixed(0)}%)`} value={eur(r.maggiorazione)} />
              <div style={{ borderTop: "1px solid var(--line)", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Da versare</span>
                <span className="ga-mono" style={{ fontWeight: 700, fontSize: 17 }}>{eur(r.totale)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
        Nota fiscale: il prospetto è gestionale, non sostituisce il calcolo del commercialista. L'IVA del regime del margine è stimata come quota incorporata nel margine positivo (prezzo vendita − prezzo acquisto). L'IVA detraibile è quella indicata come tale nei singoli movimenti. Verifica sempre aliquota, maggiorazione e metodo con il tuo commercialista.
      </div>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", color: "var(--muted)" }}>
      <span>{label}</span><span className="ga-mono" style={{ color: "var(--ink)" }}>{value}</span>
    </div>
  );
}
