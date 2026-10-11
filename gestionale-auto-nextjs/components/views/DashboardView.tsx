import { Car, TrendingUp, AlertTriangle } from "lucide-react";
import type { Veicolo, Movimento, Impostazioni } from "@/lib/calc";
import { computeVeicolo, eur, SCADENZE_TRIMESTRE, trimestre as calcTrimestre, computeAvvisi } from "@/lib/calc";
import { Kpi, StatoBadge, ServizioTag } from "../ui/Shared";

export default function DashboardView({ veicoli, movimenti, impostazioni, isAdmin, onOpenVeicoli, onNavigate }: {
  veicoli: Veicolo[]; movimenti: Movimento[]; impostazioni: Impostazioni; isAdmin: boolean; onOpenVeicoli: () => void; onNavigate: (view: string) => void;
}) {
  const avvisi = computeAvvisi(veicoli, movimenti, impostazioni);
  const enriched = veicoli.map((v) => ({ ...v, _calc: computeVeicolo(v, movimenti, impostazioni) }));
  const attivi = enriched.filter((v) => v.stato !== "Archiviata");
  const vendute = enriched.filter((v) => v.stato === "Venduta" || v.dataVendita);

  const ricaviRegistrati = movimenti.filter((m) => m.tipo === "Entrata").reduce((s, m) => s + m.totale, 0);
  const risultatoTotale = enriched.reduce((s, v) => s + (v._calc.risultatoDopoIva || 0), 0);
  const capitaleStock = attivi.filter((v) => v.servizio !== "Conto vendita").reduce((s, v) => s + v._calc.costoTotale, 0);

  const venditaDiretta = veicoli.filter((v) => v.servizio === "Vendita diretta").length;
  const suCommissione = veicoli.filter((v) => v.servizio === "Auto su commissione").length;
  const contoVendita = veicoli.filter((v) => v.servizio === "Conto vendita").length;
  const pratiche = veicoli.filter((v) => v.dataVendita && v.stato !== "Archiviata").length;

  // IVA prossimo versamento: stima rapida sui trimestri correnti (stessa logica della liquidazione)
  const oggi = new Date();
  const trimAttuale = Math.ceil((oggi.getMonth() + 1) / 3);
  const ivaTrimestre = calcolaIvaTrimestre(trimAttuale, veicoli, movimenti, impostazioni);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Dashboard</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Controllo di gestione — {impostazioni.annoGestione}</div>
        </div>
        <button className="ga-btn ga-btn-primary" onClick={onOpenVeicoli}><Car size={15} /> Vai al parco auto</button>
      </div>

      {avvisi.length > 0 && (
        <div className="ga-card" style={{ padding: 14, marginBottom: 18, borderColor: "#EFDCB0", cursor: "pointer" }} onClick={() => onNavigate("avvisi")}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, marginBottom: avvisi.length > 0 ? 4 : 0 }}>
            <AlertTriangle size={15} style={{ color: "var(--warning)" }} /> {avvisi.length} {avvisi.length === 1 ? "avviso attivo" : "avvisi attivi"}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{avvisi[0].messaggio}{avvisi.length > 1 ? ` · e altri ${avvisi.length - 1}…` : ""}</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "repeat(4, 1fr)" : "repeat(2, 1fr)", gap: 12, marginBottom: 14 }}>
        {isAdmin && <Kpi label="Ricavi registrati" value={eur(ricaviRegistrati)} />}
        {isAdmin && <Kpi label="Risultato auto" value={eur(risultatoTotale)} color={risultatoTotale >= 0 ? "var(--good)" : "var(--bad)"} />}
        {isAdmin && <Kpi label="Capitale in stock" value={eur(capitaleStock)} />}
        {isAdmin && <Kpi label="IVA prossimo versamento" value={eur(ivaTrimestre)} />}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 26 }}>
        <Kpi label="Vendita diretta" value={venditaDiretta} small />
        <Kpi label="Su commissione" value={suCommissione} small />
        <Kpi label="Conto vendita" value={contoVendita} small />
        <Kpi label="Pratiche aperte" value={pratiche} small />
      </div>

      <div className="ga-display" style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Parco auto</div>
      {enriched.length === 0 ? (
        <div className="ga-card ga-empty">
          <Car size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} />
          <div style={{ fontWeight: 600 }}>Nessuna auto registrata</div>
        </div>
      ) : (
        <div className="ga-card" style={{ overflow: "hidden" }}>
          <table className="ga-table">
            <thead>
              <tr>
                <th>Auto</th><th>Servizio</th><th>Stato</th>
                {isAdmin && <th style={{ textAlign: "right" }}>Costo totale</th>}
                {isAdmin && <th style={{ textAlign: "right" }}>Risultato</th>}
                <th style={{ textAlign: "right" }}>Giorni stock</th>
              </tr>
            </thead>
            <tbody>
              {enriched.slice(0, 12).map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600 }}>{v.nome || "—"}</td>
                  <td><ServizioTag servizio={v.servizio} /></td>
                  <td><StatoBadge stato={v.stato} /></td>
                  {isAdmin && <td style={{ textAlign: "right" }} className="ga-mono">{eur(v._calc.costoTotale)}</td>}
                  {isAdmin && (
                    <td style={{ textAlign: "right" }}>
                      <span className="ga-mono" style={{ color: (v._calc.risultatoDopoIva || 0) >= 0 ? "var(--good)" : "var(--bad)", fontWeight: 700 }}>
                        {v._calc.risultatoDopoIva !== null ? eur(v._calc.risultatoDopoIva) : "—"}
                      </span>
                    </td>
                  )}
                  <td style={{ textAlign: "right" }} className="ga-mono">{v._calc.giorniStock ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function calcolaIvaTrimestre(trim: number, veicoli: Veicolo[], movimenti: Movimento[], impostazioni: Impostazioni) {
  const anno = impostazioni.annoGestione;
  let ivaMargine = 0, ivaCommissioni = 0, ivaDetraibile = 0;
  veicoli.forEach((v) => {
    if (!v.dataVendita) return;
    const t = calcTrimestre(v.dataVendita);
    const a = new Date(v.dataVendita).getFullYear();
    if (t !== trim || a !== anno) return;
    const c = computeVeicolo(v, movimenti, impostazioni);
    if (v.servizio === "Conto vendita") ivaCommissioni += c.ivaCommissione || 0;
    else ivaMargine += c.ivaRegimeMargine || 0;
  });
  movimenti.forEach((m) => {
    if (!m.data || !m.ivaDetraibile) return;
    const t = calcTrimestre(m.data);
    const a = new Date(m.data).getFullYear();
    if (t === trim && a === anno) ivaDetraibile += m.iva;
  });
  const saldo = Math.max(0, ivaMargine + ivaCommissioni - ivaDetraibile);
  return saldo + saldo * impostazioni.maggiorazioneTrimestrale;
}
