import { Car, CalendarRange, AlertTriangle } from "lucide-react";
import type { RentVeicolo, RentCliente, RentPrenotazione } from "@/lib/rentCalc";
import { computeAvvisiRent, eurRent, importoPrenotazione } from "@/lib/rentCalc";

export default function RentDashboardView({ veicoli, clienti, prenotazioni }: {
  veicoli: RentVeicolo[]; clienti: RentCliente[]; prenotazioni: RentPrenotazione[];
}) {
  const avvisi = computeAvvisiRent(veicoli, clienti);
  const disponibili = veicoli.filter((v) => v.stato === "Disponibile").length;
  const noleggiate = veicoli.filter((v) => v.stato === "Noleggiata").length;
  const inCorso = prenotazioni.filter((p) => p.stato === "In corso").length;
  const ricaviPrenotati = prenotazioni.filter((p) => p.stato === "In corso" || p.stato === "Conclusa").reduce((s, p) => s + importoPrenotazione(p), 0);

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Dashboard — Global Rent</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Struttura in costruzione: qui trovi flotta, clienti e prenotazioni</div>
      </div>

      {avvisi.length > 0 && (
        <div className="ga-card" style={{ padding: 14, marginBottom: 18, borderColor: "#EFDCB0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            <AlertTriangle size={15} style={{ color: "var(--warning)" }} /> {avvisi.length} {avvisi.length === 1 ? "avviso" : "avvisi"}
          </div>
          {avvisi.slice(0, 4).map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: a.livello === "danger" ? "var(--bad)" : "var(--muted)", padding: "2px 0" }}>{a.messaggio}</div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <div className="ga-card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>Disponibili</div>
          <div className="ga-mono" style={{ fontSize: 24, fontWeight: 700 }}>{disponibili}</div>
        </div>
        <div className="ga-card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>Noleggiate</div>
          <div className="ga-mono" style={{ fontSize: 24, fontWeight: 700 }}>{noleggiate}</div>
        </div>
        <div className="ga-card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>Noleggi in corso</div>
          <div className="ga-mono" style={{ fontSize: 24, fontWeight: 700 }}>{inCorso}</div>
        </div>
        <div className="ga-card" style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>Ricavi (in corso+conclusi)</div>
          <div className="ga-mono" style={{ fontSize: 24, fontWeight: 700 }}>{eurRent(ricaviPrenotati)}</div>
        </div>
      </div>
    </div>
  );
}
