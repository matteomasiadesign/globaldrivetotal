"use client";

import { useState } from "react";
import { Plus, Car, ArrowLeft, Trash2, Search, FileText } from "lucide-react";
import type { Veicolo, Movimento, Impostazioni, Documento } from "@/lib/calc";
import { computeVeicolo, eur, pct, SERVIZI, STATI, CATEGORIE, NATURE_COSTO, PAGAMENTI } from "@/lib/calc";
import { Field, Row, StatoBadge, ServizioTag } from "../ui/Shared";
import DocumentiAuto from "./DocumentiAuto";
import { generaContrattoVenditaPDF } from "@/lib/contractPdf";

export default function VeicoliView(props: {
  veicoli: Veicolo[]; movimenti: Movimento[]; impostazioni: Impostazioni; isAdmin: boolean;
  onAdd: () => Promise<string | null>; onField: (id: string, field: keyof Veicolo, value: any) => void;
  onDelete: (id: string) => void; onAddMovimento: (autoId: string | null) => void;
  onUpdateMovimento: (id: string, field: keyof Movimento, value: any) => void; onDeleteMovimento: (id: string) => void;
  documenti: Documento[]; onDocumentoCaricato: (doc: Documento) => void; onDocumentoEliminato: (id: string) => void;
  onContrattoGenerato: () => void;
}) {
  const { veicoli, movimenti, impostazioni, isAdmin } = props;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("tutte");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const selected = veicoli.find((v) => v.id === selectedId) || null;

  async function handleAdd() {
    const id = await props.onAdd();
    if (id) setSelectedId(id);
  }

  if (selected) {
    return (
      <DetailView veicolo={selected} movimenti={movimenti.filter((m) => m.autoId === selected.id)} impostazioni={impostazioni} isAdmin={isAdmin}
        documenti={props.documenti.filter((d) => d.autoId === selected.id)}
        onDocumentoCaricato={props.onDocumentoCaricato} onDocumentoEliminato={props.onDocumentoEliminato}
        onContrattoGenerato={props.onContrattoGenerato}
        onBack={() => setSelectedId(null)}
        onField={(f, v) => props.onField(selected.id, f, v)}
        onDelete={() => setConfirmDelete(selected.id)}
        onAddMovimento={() => props.onAddMovimento(selected.id)}
        onUpdateMovimento={props.onUpdateMovimento}
        onDeleteMovimento={props.onDeleteMovimento}
        confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
        onConfirmedDelete={() => { props.onDelete(selected.id); setSelectedId(null); setConfirmDelete(null); }} />
    );
  }

  const enriched = veicoli.map((v) => ({ ...v, _calc: computeVeicolo(v, movimenti, impostazioni) }));
  const filtered = enriched.filter((v) => {
    if (filter !== "tutte" && v.stato !== filter) return false;
    if (search && !`${v.nome}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div className="ga-display" style={{ fontSize: 22, fontWeight: 700 }}>Parco auto</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{veicoli.length} {veicoli.length === 1 ? "scheda" : "schede"} totali</div>
        </div>
        <button className="ga-btn ga-btn-primary" onClick={handleAdd}><Plus size={15} /> Nuova auto</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 10 }}>
        <div className="ga-tabbar" style={{ border: "none", marginBottom: 0, flexWrap: "wrap" }}>
          <div className={`ga-tab ${filter === "tutte" ? "active" : ""}`} onClick={() => setFilter("tutte")}>Tutte</div>
          {STATI.map((s) => <div key={s} className={`ga-tab ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>{s}</div>)}
        </div>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--muted)" }} />
          <input className="ga-input" style={{ paddingLeft: 30, width: 200 }} placeholder="Cerca auto…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div style={{ borderBottom: "1px solid var(--line)", marginBottom: 18 }} />

      {filtered.length === 0 ? (
        <div className="ga-card ga-empty"><Car size={28} style={{ margin: "0 auto 10px", color: "var(--muted)" }} /><div style={{ fontWeight: 600 }}>Nessuna auto in questa categoria</div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filtered.map((v) => (
            <div key={v.id} className="ga-carcard" onClick={() => setSelectedId(v.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <ServizioTag servizio={v.servizio} /><StatoBadge stato={v.stato} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{v.nome || "Auto senza nome"}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>{v.dataAcquisto ? `Acquistata il ${v.dataAcquisto}` : "Data acquisto non impostata"}</div>
              {isAdmin && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                  <div><div style={{ color: "var(--muted)" }}>Costo totale</div><div className="ga-mono" style={{ fontWeight: 600 }}>{eur(v._calc.costoTotale)}</div></div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "var(--muted)" }}>Risultato</div>
                    <div className="ga-mono" style={{ fontWeight: 700, color: (v._calc.risultatoDopoIva || 0) >= 0 ? "var(--good)" : "var(--bad)" }}>
                      {v._calc.risultatoDopoIva !== null ? eur(v._calc.risultatoDopoIva) : "—"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailView({ veicolo, movimenti, impostazioni, isAdmin, onBack, onField, onDelete, onAddMovimento, onUpdateMovimento, onDeleteMovimento, confirmDelete, setConfirmDelete, onConfirmedDelete, documenti, onDocumentoCaricato, onDocumentoEliminato, onContrattoGenerato }: any) {
  const calc = computeVeicolo(veicolo, movimenti, impostazioni);
  const isContoVendita = veicolo.servizio === "Conto vendita";
  const [showContratto, setShowContratto] = useState(false);
  const parti = String(veicolo.nome || "").trim().split(/\s+/);
  const [contrattoForm, setContrattoForm] = useState({
    marca: parti[0] || "", modello: parti.slice(1).join(" ") || "",
    targa: String(veicolo.nome || "").match(/[A-Z]{2}\d{3}[A-Z]{2}/)?.[0] || "",
    nomeAcquirente: "", nascitaSede: "", codiceFiscale: "", residenza: "", telefonoAcquirente: "", emailAcquirente: "",
    prezzoVendita: veicolo.prezzoVendita || 0, dataVendita: veicolo.dataVendita || new Date().toISOString().slice(0, 10),
    dataConsegna: "", strumentoPagamento: "Bonifico bancario", estensioneGaranzia: false,
    luogoData: "",
  });
  const [generandoContratto, setGenerandoContratto] = useState(false);

  async function handleGeneraContratto() {
    setGenerandoContratto(true);
    try {
      await generaContrattoVenditaPDF(
        { ...veicolo, prezzoVendita: contrattoForm.prezzoVendita, dataVendita: contrattoForm.dataVendita },
        { marca: contrattoForm.marca, modello: contrattoForm.modello, targa: contrattoForm.targa },
        impostazioni,
        {
          nome: contrattoForm.nomeAcquirente, nascitaSede: contrattoForm.nascitaSede, codiceFiscale: contrattoForm.codiceFiscale,
          residenza: contrattoForm.residenza, telefono: contrattoForm.telefonoAcquirente, email: contrattoForm.emailAcquirente,
        },
        {
          dataConsegna: contrattoForm.dataConsegna, strumentoPagamento: contrattoForm.strumentoPagamento,
          estensioneGaranzia: contrattoForm.estensioneGaranzia, luogoData: contrattoForm.luogoData,
        }
      );
      // Registra la vendita sull'auto, cosa che aggiorna anche i calcoli IVA
      if (contrattoForm.prezzoVendita !== veicolo.prezzoVendita) onField("prezzoVendita", contrattoForm.prezzoVendita);
      if (contrattoForm.dataVendita !== veicolo.dataVendita) onField("dataVendita", contrattoForm.dataVendita);
      onContrattoGenerato({
        nome: contrattoForm.nomeAcquirente, nascitaSede: contrattoForm.nascitaSede, codiceFiscale: contrattoForm.codiceFiscale,
        residenza: contrattoForm.residenza, telefono: contrattoForm.telefonoAcquirente, email: contrattoForm.emailAcquirente,
      });
      setShowContratto(false);
    } finally {
      setGenerandoContratto(false);
    }
  }

  return (
    <div>
      <button className="ga-btn" style={{ marginBottom: 16 }} onClick={onBack}><ArrowLeft size={14} /> Torna al parco auto</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <input className="ga-display" style={{ fontSize: 20, fontWeight: 700, border: "none", background: "transparent", padding: 0, marginBottom: 4 }}
            defaultValue={veicolo.nome} onBlur={(e) => onField("nome", e.target.value)} placeholder="Nome auto (es. LANCIA Y CK135MZ)" />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ServizioTag servizio={veicolo.servizio} /><StatoBadge stato={veicolo.stato} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ga-btn" onClick={() => setShowContratto(true)}><FileText size={14} /> Genera contratto</button>
          {isAdmin && <button className="ga-btn ga-btn-danger" onClick={onDelete}><Trash2 size={14} /> Elimina scheda</button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "2fr 1fr" : "1fr", gap: 20 }}>
        <div style={{ display: "grid", gap: 20 }}>
          <div className="ga-card" style={{ padding: 20 }}>
            <div className="ga-display" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Dati auto</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Servizio">
                <select className="ga-input" defaultValue={veicolo.servizio} onChange={(e) => onField("servizio", e.target.value)}>
                  {SERVIZI.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Stato">
                <select className="ga-input" defaultValue={veicolo.stato} onChange={(e) => onField("stato", e.target.value)}>
                  {STATI.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Data acquisto"><input type="date" className="ga-input" defaultValue={veicolo.dataAcquisto} onBlur={(e) => onField("dataAcquisto", e.target.value)} /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Data vendita"><input type="date" className="ga-input" defaultValue={veicolo.dataVendita} onBlur={(e) => onField("dataVendita", e.target.value)} /></Field>
              <Field label="Fatturata"><div className="ga-input" style={{ display: "flex", alignItems: "center" }}><label className="ga-checkbox-row"><input type="checkbox" defaultChecked={veicolo.fatturata} onChange={(e) => onField("fatturata", e.target.checked)} /> Sì</label></div></Field>
              <Field label="Passaggio proprietà"><div className="ga-input" style={{ display: "flex", alignItems: "center" }}><label className="ga-checkbox-row"><input type="checkbox" defaultChecked={veicolo.passaggioProprieta} onChange={(e) => onField("passaggioProprieta", e.target.checked)} /> Fatto</label></div></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Garanzia"><div className="ga-input" style={{ display: "flex", alignItems: "center" }}><label className="ga-checkbox-row"><input type="checkbox" defaultChecked={veicolo.garanzia} onChange={(e) => onField("garanzia", e.target.checked)} /> Con garanzia</label></div></Field>
              {isContoVendita && <Field label="Commissione %"><input className="ga-input ga-mono" type="number" step="0.01" defaultValue={veicolo.commissionePercentuale} onBlur={(e) => onField("commissionePercentuale", parseFloat(e.target.value) || 0)} /></Field>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Versione / allestimento"><input className="ga-input" defaultValue={veicolo.versione} onBlur={(e) => onField("versione", e.target.value)} placeholder="es. 1.5 EcoBlue 120 CV 5 porte" /></Field>
              <Field label="Chilometraggio"><input className="ga-input ga-mono" type="number" defaultValue={veicolo.chilometraggio} onBlur={(e) => onField("chilometraggio", parseFloat(e.target.value) || 0)} placeholder="es. 58467" /></Field>
              <Field label="Alimentazione">
                <select className="ga-input" defaultValue={veicolo.alimentazione} onChange={(e) => onField("alimentazione", e.target.value)}>
                  <option value="">—</option>
                  <option value="Benzina">Benzina</option>
                  <option value="Diesel">Diesel</option>
                  <option value="GPL">GPL</option>
                  <option value="Metano">Metano</option>
                  <option value="Ibrida">Ibrida</option>
                  <option value="Elettrica">Elettrica</option>
                </select>
              </Field>
            </div>
            <Field label="Note"><textarea className="ga-input" rows={2} defaultValue={veicolo.note} onBlur={(e) => onField("note", e.target.value)} /></Field>
          </div>

          <div className="ga-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="ga-display" style={{ fontSize: 14, fontWeight: 700 }}>Movimenti collegati</div>
              <button className="ga-btn" onClick={onAddMovimento}><Plus size={14} /> Aggiungi movimento</button>
            </div>
            {movimenti.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--muted)", padding: "16px 0", textAlign: "center" }}>Nessun movimento registrato per questa auto.</div>
            ) : (
              <table className="ga-table">
                <thead><tr><th style={{ width: 100 }}>Data</th><th>Categoria</th><th>Tipo</th><th style={{ width: 90, textAlign: "right" }}>Totale</th><th style={{ width: 30 }}></th></tr></thead>
                <tbody>
                  {movimenti.map((m: Movimento) => (
                    <tr key={m.id}>
                      <td><input type="date" defaultValue={m.data} onBlur={(e) => onUpdateMovimento(m.id, "data", e.target.value)} /></td>
                      <td>
                        <select defaultValue={m.categoria} onChange={(e) => onUpdateMovimento(m.id, "categoria", e.target.value)} style={{ border: "1px solid var(--line)", borderRadius: 5, padding: "4px 5px", fontSize: 13, width: "100%", background: "#fff" }}>
                          {CATEGORIE.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td>
                        <select defaultValue={m.tipo} onChange={(e) => onUpdateMovimento(m.id, "tipo", e.target.value)} style={{ border: "1px solid var(--line)", borderRadius: 5, padding: "4px 5px", fontSize: 13, width: "100%", background: "#fff" }}>
                          <option value="Uscita">Uscita</option><option value="Entrata">Entrata</option>
                        </select>
                      </td>
                      <td style={{ textAlign: "right" }} className="ga-mono">{eur(m.totale)}</td>
                      <td><button onClick={() => onDeleteMovimento(m.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", display: "flex" }}><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>Per compilare tutti i dettagli (fornitore, imponibile, IVA, pagamento…) apri il movimento dalla sezione "Movimenti" del menu.</div>
          </div>

          <DocumentiAuto autoId={veicolo.id} documenti={documenti} onUploaded={onDocumentoCaricato} onDeleted={onDocumentoEliminato} />
        </div>

        {isAdmin && (
          <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
            <div className="ga-card" style={{ padding: 20 }}>
              <div className="ga-display" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Prezzi</div>
              <div style={{ display: "grid", gap: 12 }}>
                <Field label="Prezzo acquisto (€)"><input className="ga-input ga-mono" type="number" defaultValue={veicolo.prezzoAcquisto} onBlur={(e) => onField("prezzoAcquisto", parseFloat(e.target.value) || 0)} /></Field>
                <Field label={isContoVendita ? "Prezzo vendita (per il proprietario) (€)" : "Prezzo vendita (€)"}>
                  <input className="ga-input ga-mono" type="number" defaultValue={veicolo.prezzoVendita ?? ""} onBlur={(e) => onField("prezzoVendita", e.target.value === "" ? null : parseFloat(e.target.value))} />
                </Field>
                <Field label="Numero fattura"><input className="ga-input" defaultValue={veicolo.numeroFattura} onBlur={(e) => onField("numeroFattura", e.target.value)} placeholder="es. 12/2026" /></Field>
              </div>
            </div>

            <div className="ga-card" style={{ padding: 20, background: "var(--ink)", color: "#EDEBE5" }}>
              <div className="ga-display" style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "#fff" }}>Conto economico</div>
              <Row label="Costi diretti" value={eur(calc.costiDiretti)} />
              <Row label="Costo totale" value={eur(calc.costoTotale)} />
              {isContoVendita ? (
                <>
                  <Row label="Commissione imponibile" value={calc.commissioneImponibile !== null ? eur(calc.commissioneImponibile) : "—"} />
                  <Row label="IVA su commissione" value={calc.ivaCommissione !== null ? eur(calc.ivaCommissione) : "—"} />
                  <Row label="Totale fattura intermediazione" value={calc.totaleFatturaIntermediazione !== null ? eur(calc.totaleFatturaIntermediazione) : "—"} />
                </>
              ) : (
                <>
                  <Row label="Margine regime IVA" value={calc.margineRegimeIva !== null ? eur(calc.margineRegimeIva) : "—"} />
                  <Row label="IVA regime del margine" value={calc.ivaRegimeMargine !== null ? eur(calc.ivaRegimeMargine) : "—"} />
                </>
              )}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", margin: "10px 0" }} />
              <Row label="Margine gestionale" value={calc.margineGestionale !== null ? eur(calc.margineGestionale) : "—"} bold color={(calc.margineGestionale || 0) >= 0 ? "#7FD9AC" : "#F3A99C"} />
              <Row label="Risultato dopo IVA" value={calc.risultatoDopoIva !== null ? eur(calc.risultatoDopoIva) : "—"} bold color={(calc.risultatoDopoIva || 0) >= 0 ? "#7FD9AC" : "#F3A99C"} />
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", margin: "10px 0" }} />
              <Row label="ROI" value={calc.roi !== null ? pct(calc.roi) : "—"} />
              <Row label="Giorni stock" value={calc.giorniStock !== null ? String(calc.giorniStock) : "—"} />
              <Row label="Margine / giorno" value={calc.margineGiorno !== null ? eur(calc.margineGiorno) : "—"} />
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,31,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="ga-card" style={{ padding: 24, width: 360 }}>
            <div className="ga-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Eliminare questa scheda auto?</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>Anche tutti i movimenti collegati verranno eliminati. L'operazione non si può annullare.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="ga-btn" onClick={() => setConfirmDelete(null)}>Annulla</button>
              <button className="ga-btn ga-btn-danger" onClick={onConfirmedDelete}>Elimina definitivamente</button>
            </div>
          </div>
        </div>
      )}

      {showContratto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(27,31,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20, overflowY: "auto" }}>
          <div className="ga-card" style={{ padding: 24, width: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="ga-display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Genera contratto di vendita</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Sarà il contratto N° {impostazioni.prossimoNumeroContratto} / {impostazioni.annoGestione}. Verifica i dati auto sotto.</div>

            <div className="ga-display" style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--muted)", textTransform: "uppercase" }}>Veicolo</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              <Field label="Marca"><input className="ga-input" value={contrattoForm.marca} onChange={(e) => setContrattoForm((f) => ({ ...f, marca: e.target.value }))} /></Field>
              <Field label="Modello"><input className="ga-input" value={contrattoForm.modello} onChange={(e) => setContrattoForm((f) => ({ ...f, modello: e.target.value }))} /></Field>
              <Field label="Targa"><input className="ga-input ga-mono" value={contrattoForm.targa} onChange={(e) => setContrattoForm((f) => ({ ...f, targa: e.target.value.toUpperCase() }))} /></Field>
            </div>

            <div className="ga-display" style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--muted)", textTransform: "uppercase" }}>Acquirente</div>
            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <Field label="Nome / Ragione sociale"><input className="ga-input" value={contrattoForm.nomeAcquirente} onChange={(e) => setContrattoForm((f) => ({ ...f, nomeAcquirente: e.target.value }))} placeholder="es. Mario Rossi" /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Luogo e data di nascita"><input className="ga-input" value={contrattoForm.nascitaSede} onChange={(e) => setContrattoForm((f) => ({ ...f, nascitaSede: e.target.value }))} placeholder="es. Sassari, 15/10/1990" /></Field>
                <Field label="Codice fiscale / P.IVA"><input className="ga-input ga-mono" value={contrattoForm.codiceFiscale} onChange={(e) => setContrattoForm((f) => ({ ...f, codiceFiscale: e.target.value.toUpperCase() }))} /></Field>
              </div>
              <Field label="Residenza"><input className="ga-input" value={contrattoForm.residenza} onChange={(e) => setContrattoForm((f) => ({ ...f, residenza: e.target.value }))} placeholder="es. Via Roma 1, Sassari" /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Telefono"><input className="ga-input" value={contrattoForm.telefonoAcquirente} onChange={(e) => setContrattoForm((f) => ({ ...f, telefonoAcquirente: e.target.value }))} /></Field>
                <Field label="Email"><input className="ga-input" value={contrattoForm.emailAcquirente} onChange={(e) => setContrattoForm((f) => ({ ...f, emailAcquirente: e.target.value }))} /></Field>
              </div>
            </div>

            <div className="ga-display" style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--muted)", textTransform: "uppercase" }}>Termini del contratto</div>
            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Prezzo di vendita (€)"><input type="number" className="ga-input ga-mono" value={contrattoForm.prezzoVendita} onChange={(e) => setContrattoForm((f) => ({ ...f, prezzoVendita: parseFloat(e.target.value) || 0 }))} /></Field>
                <Field label="Data vendita"><input type="date" className="ga-input" value={contrattoForm.dataVendita} onChange={(e) => setContrattoForm((f) => ({ ...f, dataVendita: e.target.value }))} /></Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Data consegna"><input type="date" className="ga-input" value={contrattoForm.dataConsegna} onChange={(e) => setContrattoForm((f) => ({ ...f, dataConsegna: e.target.value }))} /></Field>
                <Field label="Strumento di pagamento">
                  <select className="ga-input" value={contrattoForm.strumentoPagamento} onChange={(e) => setContrattoForm((f) => ({ ...f, strumentoPagamento: e.target.value }))}>
                    <option value="Bonifico bancario">Bonifico bancario</option>
                    <option value="Contanti">Contanti</option>
                    <option value="Assegno">Assegno</option>
                    <option value="Finanziamento">Finanziamento</option>
                  </select>
                </Field>
              </div>
              <Field label="Luogo e data di sottoscrizione"><input className="ga-input" value={contrattoForm.luogoData} onChange={(e) => setContrattoForm((f) => ({ ...f, luogoData: e.target.value }))} placeholder="es. Sassari, 19/06/2026" /></Field>
              <label className="ga-checkbox-row"><input type="checkbox" checked={contrattoForm.estensioneGaranzia} onChange={(e) => setContrattoForm((f) => ({ ...f, estensioneGaranzia: e.target.checked }))} /> L'acquirente sottoscrive anche l'estensione di garanzia</label>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="ga-btn" onClick={() => setShowContratto(false)}>Annulla</button>
              <button className="ga-btn ga-btn-primary" onClick={handleGeneraContratto} disabled={generandoContratto}>
                {generandoContratto ? "Genero…" : "Genera e scarica PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
