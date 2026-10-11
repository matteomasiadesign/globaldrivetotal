"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 36 }}>
      <div style={{ textAlign: "center" }}>
        <div className="ga-display" style={{ fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Global Group</div>
        <div className="ga-display" style={{ fontSize: 26, fontWeight: 700 }}>Scegli il gestionale</div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", maxWidth: 760 }}>
        <Link href="/login" style={{ textDecoration: "none" }}>
          <div className="ga-card" style={{ width: 320, padding: 28, cursor: "pointer", transition: "box-shadow .15s, border-color .15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(27,31,35,0.08)"; e.currentTarget.style.borderColor = "#cfc9ba"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--line)"; }}>
            <img src="/logo-icon.png" alt="Global Drive" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 18 }} />
            <div className="ga-display" style={{ fontSize: 19, fontWeight: 700, marginBottom: 4 }}>Global Drive</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Gestionale per la rivendita di auto usate: parco auto, contabilità, IVA e movimenti.</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--amber)" }}>
              Entra nel gestionale <ArrowRight size={15} />
            </div>
          </div>
        </Link>

        <Link href="/login?next=/rent/dashboard" style={{ textDecoration: "none" }}>
          <div className="ga-card" style={{ width: 320, padding: 28, cursor: "pointer", transition: "box-shadow .15s, border-color .15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(27,31,35,0.08)"; e.currentTarget.style.borderColor = "#cfc9ba"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--line)"; }}>
            <img src="/logo-rent-icon.png" alt="Global Rent" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 18, objectFit: "contain" }} />
            <div className="ga-display" style={{ fontSize: 19, fontWeight: 700, marginBottom: 4 }}>Global Rent</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Noleggio auto: flotta, clienti e prenotazioni. Struttura in costruzione.</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#0E7C6B" }}>
              Entra nel gestionale <ArrowRight size={15} />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
