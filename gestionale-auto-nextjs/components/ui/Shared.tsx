import { Car, CheckCircle2, Wrench, Search, Archive, FileCheck, Tag } from "lucide-react";
import type { Stato } from "@/lib/calc";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="ga-field-label">{label}</label>{children}</div>;
}

export function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", color: color || "#C9C6BE" }}>
      <div>{label}</div>
      <div className="ga-mono" style={{ fontWeight: bold ? 700 : 500, color: color || "#EDEBE5" }}>{value}</div>
    </div>
  );
}

export function Kpi({ label, value, color, small }: { label: string; value: string | number; color?: string; small?: boolean }) {
  return (
    <div className="ga-card" style={{ padding: "16px 18px" }}>
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div className="ga-mono" style={{ fontSize: small ? 18 : 24, fontWeight: 700, marginTop: 4, color: color || "var(--ink)" }}>{value}</div>
    </div>
  );
}

const STATO_MAP: Record<Stato, { cls: string; icon: any; color: string; bg: string }> = {
  "In valutazione": { cls: "", icon: Search, color: "#7A6A4B", bg: "#EFEAE0" },
  "Acquistata": { cls: "", icon: Tag, color: "#7A6A4B", bg: "#EFEAE0" },
  "In preparazione": { cls: "", icon: Wrench, color: "#8A5A2E", bg: "#F5E6D3" },
  "In vendita": { cls: "", icon: Car, color: "#2E5C8A", bg: "#E5EEF7" },
  "Prenotata": { cls: "", icon: FileCheck, color: "#6A4C93", bg: "#EEE5F7" },
  "Venduta": { cls: "", icon: CheckCircle2, color: "#2E7D5B", bg: "#E8F3EC" },
  "Archiviata": { cls: "", icon: Archive, color: "#767066", bg: "#EFEDE7" },
};

export function StatoBadge({ stato }: { stato: Stato }) {
  const m = STATO_MAP[stato] || STATO_MAP["In valutazione"];
  const Icon = m.icon;
  return (
    <span className="ga-badge" style={{ background: m.bg, color: m.color }}>
      <Icon size={11} strokeWidth={2.5} />{stato}
    </span>
  );
}

export function ServizioTag({ servizio }: { servizio: string }) {
  const colors: Record<string, string> = {
    "Vendita diretta": "#2E5C8A", "Conto vendita": "#8A5A2E", "Auto su commissione": "#6A4C93",
  };
  return <span style={{ fontSize: 11, fontWeight: 600, color: colors[servizio] || "var(--muted)" }}>{servizio}</span>;
}
