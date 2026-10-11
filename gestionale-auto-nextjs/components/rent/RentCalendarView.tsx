"use client";

import { useState, Fragment } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import type { RentVeicolo, RentPrenotazione, RentCliente } from "@/lib/rentCalc";

const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

const STATO_COLORE: Record<string, string> = {
  Prenotata: "#8FB8E8",
  "In corso": "#12B097",
  Conclusa: "#C9C6BE",
  Annullata: "transparent",
};

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function RentCalendarView({ veicoli, prenotazioni, clienti }: {
  veicoli: RentVeicolo[]; prenotazioni: RentPrenotazione[]; clienti: RentCliente[];
}) {
  const oggi = new Date();
  const [anno, setAnno] = useState(oggi.getFullYear());
  const [mese, setMese] = useState(oggi.getMonth()); // 0-based
  const [selezionata, setSelezionata] = useState<RentPrenotazione | null>(null);

  const giorniNelMese = new Date(anno, mese + 1, 0).getDate();
  const giorni = Array.from({ length: giorniNelMese }, (_, i) => i + 1);
  const oggiISO = oggi.toISOString().slice(0, 10);

  function cambiaMese(delta: number) {
    let m = mese + delta, y = anno;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMese(m); setAnno(y);
  }

  function prenotazionePerGiorno(veicoloId: string, giorno: number) {
    const data = toISO(anno, mese, giorno);
    return prenotazioni.find((p) => p.veicoloId === veicoloId && p.stato !== "Annullata" && data >= p.dataInizio && data <= p.dataFine);
  }

  const clienteNome = (id: string | null) => clienti.find((c) => c.id === id)?.nome || "—";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Calendario</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Disponibilità della flotta colpo d'occhio</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="ga-btn" onClick={() => cambiaMese(-1)}><ChevronLeft size={15} /></button>
          <div className="ga-display" style={{ fontWeight: 700, fontSize: 15, minWidth: 140, textAlign: "center" }}>{MESI[mese]} {anno}</div>
          <button className="ga-btn" onClick={() => cambiaMese(1)}><ChevronRight size={15} /></button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, fontSize: 12, marginBottom: 14, color: "var(--muted)" }}>
        <LegendaItem colore={STATO_COLORE.Prenotata} label="Prenotata" />
        <LegendaItem colore={STATO_COLORE["In corso"]} label="In corso" />
        <LegendaItem colore={STATO_COLORE.Conclusa} label="Conclusa" />
      </div>

      {veicoli.length === 0 ? (
        <div className="ga-card ga-empty"><CalendarDays size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Aggiungi auto alla flotta per vedere il calendario</div></div>
      ) : (
        <div className="ga-card" style={{ overflowX: "auto", padding: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${giorniNelMese}, 28px)`, minWidth: 160 + giorniNelMese * 28 }}>
            <div style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--muted)", borderBottom: "1px solid var(--line)", position: "sticky", left: 0, background: "var(--surface)", zIndex: 2 }}>Auto</div>
            {giorni.map((g) => {
              const isOggi = toISO(anno, mese, g) === oggiISO;
              return (
                <div key={g} style={{ padding: "8px 0", fontSize: 11, textAlign: "center", fontWeight: isOggi ? 800 : 500, color: isOggi ? "#12B097" : "var(--muted)", borderBottom: "1px solid var(--line)", borderLeft: "1px solid #F0EEE8" }}>
                  {g}
                </div>
              );
            })}

            {veicoli.map((v) => (
              <Fragment key={v.id}>
                <div style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, borderBottom: "1px solid #F0EEE8", position: "sticky", left: 0, background: "var(--surface)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", zIndex: 1 }}>
                  {v.marca} {v.modello}
                  <div style={{ fontSize: 10, color: "var(--muted)" }} className="ga-mono">{v.targa}</div>
                </div>
                {giorni.map((g) => {
                  const p = prenotazionePerGiorno(v.id, g);
                  return (
                    <div key={v.id + "-" + g}
                      onClick={() => p && setSelezionata(p)}
                      style={{
                        borderBottom: "1px solid #F0EEE8", borderLeft: "1px solid #F0EEE8",
                        background: p ? STATO_COLORE[p.stato] : "transparent", cursor: p ? "pointer" : "default", minHeight: 34,
                      }}
                      title={p ? `${clienteNome(p.clienteId)} · ${p.dataInizio} → ${p.dataFine}` : ""}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {selezionata && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,31,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setSelezionata(null)}>
          <div className="ga-card" style={{ padding: 22, width: 320 }} onClick={(e) => e.stopPropagation()}>
            <div className="ga-display" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Dettaglio prenotazione</div>
            <div style={{ fontSize: 13, display: "grid", gap: 6 }}>
              <Row label="Cliente" value={clienteNome(selezionata.clienteId)} />
              <Row label="Dal" value={selezionata.dataInizio} />
              <Row label="Al" value={selezionata.dataFine} />
              <Row label="Stato" value={selezionata.stato} />
              <Row label="Ritiro" value={selezionata.luogoRitiro || "—"} />
              <Row label="Riconsegna" value={selezionata.luogoRiconsegna || "—"} />
            </div>
            <button className="ga-btn" style={{ marginTop: 16, width: "100%", justifyContent: "center" }} onClick={() => setSelezionata(null)}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendaItem({ colore, label }: { colore: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: colore, border: "1px solid var(--line)" }} />
      {label}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
