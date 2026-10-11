import { Bell, AlertTriangle, TriangleAlert } from "lucide-react";
import type { Avviso } from "@/lib/calc";

export default function AvvisiView({ avvisi, onNavigate }: { avvisi: Avviso[]; onNavigate: (view: string) => void }) {
  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Avvisi</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{avvisi.length} segnalazioni attive</div>
      </div>

      {avvisi.length === 0 ? (
        <div className="ga-card ga-empty"><Bell size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Tutto in ordine, nessun avviso</div></div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {avvisi.map((a, i) => (
            <div key={i} className="ga-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: a.view ? "pointer" : "default", borderColor: a.livello === "danger" ? "#e3b3ac" : "#EFDCB0" }}
              onClick={() => a.view && onNavigate(a.view)}>
              {a.livello === "danger" ? <TriangleAlert size={18} style={{ color: "var(--bad)", flexShrink: 0 }} /> : <AlertTriangle size={18} style={{ color: "var(--warning)", flexShrink: 0 }} />}
              <div style={{ fontSize: 13, fontWeight: 500 }}>{a.messaggio}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
