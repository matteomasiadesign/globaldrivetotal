import { Settings } from "lucide-react";
import type { Impostazioni } from "@/lib/calc";
import { Field } from "../ui/Shared";

export default function ImpostazioniView({ impostazioni, onField }: { impostazioni: Impostazioni; onField: (field: keyof Impostazioni, value: any) => void }) {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Impostazioni</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Parametri globali usati in tutti i calcoli</div>
      </div>

      <div className="ga-card" style={{ padding: 24, maxWidth: 480, marginBottom: 20 }}>
        <div className="ga-display" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Dati aziendali</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Usati per intestare i contratti generati automaticamente.</div>
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Ragione sociale">
            <input className="ga-input" defaultValue={impostazioni.ragioneSociale} onBlur={(e) => onField("ragioneSociale", e.target.value)} placeholder="es. Global Drive S.r.l." />
          </Field>
          <Field label="Partita IVA">
            <input className="ga-input ga-mono" defaultValue={impostazioni.partitaIva} onBlur={(e) => onField("partitaIva", e.target.value)} placeholder="es. 00000000000" />
          </Field>
          <Field label="Indirizzo">
            <input className="ga-input" defaultValue={impostazioni.indirizzoAzienda} onBlur={(e) => onField("indirizzoAzienda", e.target.value)} placeholder="es. Via Roma 1, 08042 Bari Sardo (NU)" />
          </Field>
          <Field label="Telefono azienda">
            <input className="ga-input" defaultValue={impostazioni.telefonoAzienda} onBlur={(e) => onField("telefonoAzienda", e.target.value)} placeholder="es. 342 1420499" />
          </Field>
          <Field label="Email azienda">
            <input className="ga-input" defaultValue={impostazioni.emailAzienda} onBlur={(e) => onField("emailAzienda", e.target.value)} placeholder="es. info@globaldrive.it" />
          </Field>
          <Field label="PEC">
            <input className="ga-input" defaultValue={impostazioni.pecAzienda} onBlur={(e) => onField("pecAzienda", e.target.value)} placeholder="es. globaldrive@pro-pec.it" />
          </Field>
          <Field label="Prossimo numero contratto">
            <input className="ga-input ga-mono" type="number" defaultValue={impostazioni.prossimoNumeroContratto} onBlur={(e) => onField("prossimoNumeroContratto", parseInt(e.target.value) || 1)} />
          </Field>
        </div>
      </div>

      <div className="ga-card" style={{ padding: 24, maxWidth: 480 }}>
        <div className="ga-display" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Parametri di calcolo</div>
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Anno gestione">
            <input className="ga-input ga-mono" type="number" defaultValue={impostazioni.annoGestione} onBlur={(e) => onField("annoGestione", parseInt(e.target.value) || new Date().getFullYear())} />
          </Field>
          <Field label="Aliquota IVA ordinaria">
            <input className="ga-input ga-mono" type="number" step="0.01" defaultValue={impostazioni.aliquotaIva} onBlur={(e) => onField("aliquotaIva", parseFloat(e.target.value) || 0.22)} />
          </Field>
          <Field label="Maggiorazione liquidazione trimestrale">
            <input className="ga-input ga-mono" type="number" step="0.001" defaultValue={impostazioni.maggiorazioneTrimestrale} onBlur={(e) => onField("maggiorazioneTrimestrale", parseFloat(e.target.value) || 0.01)} />
          </Field>
          <Field label="Commissione conto vendita predefinita">
            <input className="ga-input ga-mono" type="number" step="0.01" defaultValue={impostazioni.commissionePredefinita} onBlur={(e) => onField("commissionePredefinita", parseFloat(e.target.value) || 0.07)} />
          </Field>
          <Field label="Soglia ROI obiettivo">
            <input className="ga-input ga-mono" type="number" step="0.01" defaultValue={impostazioni.sogliaRoi} onBlur={(e) => onField("sogliaRoi", parseFloat(e.target.value) || 0.15)} />
          </Field>
          <Field label="Soglia giorni stock">
            <input className="ga-input ga-mono" type="number" defaultValue={impostazioni.sogliaGiorniStock} onBlur={(e) => onField("sogliaGiorniStock", parseInt(e.target.value) || 60)} />
          </Field>
        </div>
        <div style={{ marginTop: 18, fontSize: 12, color: "var(--muted)", display: "flex", gap: 8 }}>
          <Settings size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          Verifica sempre con il tuo commercialista l'aliquota IVA, la maggiorazione trimestrale e il metodo del regime del margine adottato per la tua attività.
        </div>
      </div>
    </div>
  );
}
