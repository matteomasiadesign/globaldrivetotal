"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Car, Receipt, Percent, TrendingUp, BarChart3, Settings, LogOut, AlertCircle, Users, History, CalendarClock, BookOpen, Landmark, Menu, X, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Veicolo, Movimento, Impostazioni, Contatto, AuditEntry } from "@/lib/calc";
import DashboardView from "./views/DashboardView";
import VeicoliView from "./views/VeicoliView";
import MovimentiView from "./views/MovimentiView";
import LiquidazioneIvaView from "./views/LiquidazioneIvaView";
import AnalisiCostiView from "./views/AnalisiCostiView";
import AnalisiMensileView from "./views/AnalisiMensileView";
import ImpostazioniView from "./views/ImpostazioniView";
import ContattiView from "./views/ContattiView";
import StoricoView from "./views/StoricoView";
import ScadenzarioView from "./views/ScadenzarioView";
import RegistroIvaView from "./views/RegistroIvaView";
import RiconciliazioneView from "./views/RiconciliazioneView";
import AvvisiView from "./views/AvvisiView";
import type { Documento } from "@/lib/calc";
import { computeAvvisi } from "@/lib/calc";

function mapDbToVeicolo(row: any): Veicolo {
  return {
    id: row.id, nome: row.nome || "", servizio: row.servizio, stato: row.stato,
    fatturata: !!row.fatturata, passaggioProprieta: !!row.passaggio_proprieta, garanzia: !!row.garanzia,
    dataAcquisto: row.data_acquisto || "", dataVendita: row.data_vendita || "",
    prezzoAcquisto: row.prezzo_acquisto || 0, prezzoVendita: row.prezzo_vendita,
    commissionePercentuale: row.commissione_percentuale ?? 0.07, note: row.note || "",
    numeroFattura: row.numero_fattura || "", chilometraggio: row.chilometraggio || 0,
    alimentazione: row.alimentazione || "", versione: row.versione || "",
  };
}
function mapDbToMovimento(row: any): Movimento {
  return {
    id: row.id, data: row.data || "", autoId: row.auto_id, descrizione: row.descrizione || "",
    fornitoreCliente: row.fornitore_cliente || "", tipo: row.tipo, categoria: row.categoria || "Altro",
    naturaCosto: row.natura_costo, pagamento: row.pagamento, imponibile: row.imponibile || 0,
    iva: row.iva || 0, totale: row.totale || 0, ivaDetraibile: !!row.iva_detraibile,
    dataScadenza: row.data_scadenza || "", statoPagamento: row.stato_pagamento || "Saldato",
    dataSaldo: row.data_saldo || "", numeroDocumento: row.numero_documento || "",
    riconciliato: !!row.riconciliato, riferimentoEstratto: row.riferimento_estratto || "",
  };
}
function mapDbToContatto(row: any): Contatto {
  return {
    id: row.id, tipo: row.tipo, nome: row.nome || "", telefono: row.telefono || "", email: row.email || "", note: row.note || "",
    codiceFiscale: row.codice_fiscale || "", residenza: row.residenza || "", nascitaSede: row.nascita_sede || "",
  };
}
function mapDbToAudit(row: any): AuditEntry {
  return {
    id: row.id, tabella: row.tabella, recordId: row.record_id, azione: row.azione,
    datiPrecedenti: row.dati_precedenti, datiNuovi: row.dati_nuovi, utenteEmail: row.utente_email, avvenutoIl: row.avvenuto_il,
  };
}

const VEICOLO_COLS: Record<string, string> = {
  nome: "nome", servizio: "servizio", stato: "stato", fatturata: "fatturata",
  passaggioProprieta: "passaggio_proprieta", garanzia: "garanzia", dataAcquisto: "data_acquisto",
  dataVendita: "data_vendita", prezzoAcquisto: "prezzo_acquisto", prezzoVendita: "prezzo_vendita",
  commissionePercentuale: "commissione_percentuale", note: "note", numeroFattura: "numero_fattura",
  chilometraggio: "chilometraggio", alimentazione: "alimentazione", versione: "versione",
};
const MOVIMENTO_COLS: Record<string, string> = {
  data: "data", autoId: "auto_id", descrizione: "descrizione", fornitoreCliente: "fornitore_cliente",
  tipo: "tipo", categoria: "categoria", naturaCosto: "natura_costo", pagamento: "pagamento",
  imponibile: "imponibile", iva: "iva", ivaDetraibile: "iva_detraibile",
  dataScadenza: "data_scadenza", statoPagamento: "stato_pagamento", dataSaldo: "data_saldo",
  numeroDocumento: "numero_documento", riconciliato: "riconciliato", riferimentoEstratto: "riferimento_estratto",
};

type View = "dashboard" | "veicoli" | "movimenti" | "iva" | "costi" | "mensile" | "contatti" | "storico" | "impostazioni" | "scadenzario" | "registroiva" | "riconciliazione" | "avvisi";

export default function GestionaleApp({ userEmail, ruolo }: { userEmail: string; ruolo: string }) {
  const supabase = createClient();
  const router = useRouter();
  const isAdmin = ruolo === "admin";

  const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
  const [movimenti, setMovimenti] = useState<Movimento[]>([]);
  const [contatti, setContatti] = useState<Contatto[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [impostazioni, setImpostazioni] = useState<Impostazioni>({
    annoGestione: new Date().getFullYear(), aliquotaIva: 0.22, maggiorazioneTrimestrale: 0.01,
    commissionePredefinita: 0.07, sogliaRoi: 0.15, sogliaGiorniStock: 60,
    ragioneSociale: "", partitaIva: "", indirizzoAzienda: "",
    telefonoAzienda: "", emailAzienda: "", pecAzienda: "", prossimoNumeroContratto: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [documenti, setDocumenti] = useState<Documento[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: v, error: e1 }, { data: m, error: e2 }, { data: imp, error: e3 }, contattiRes, auditRes, documentiRes] = await Promise.all([
      supabase.from("veicoli").select("*").order("created_at", { ascending: false }),
      supabase.from("movimenti").select("*").order("data", { ascending: false }),
      supabase.from("impostazioni").select("*").eq("id", 1).single(),
      supabase.from("contatti").select("*").order("nome", { ascending: true }),
      isAdmin ? supabase.from("audit_log").select("*").order("avvenuto_il", { ascending: false }).limit(300) : Promise.resolve({ data: [], error: null }),
      supabase.from("documenti").select("*").order("created_at", { ascending: false }),
    ]);
    if (e1 || e2 || e3) { setError("Errore nel caricamento dei dati."); setLoading(false); return; }
    setVeicoli((v || []).map(mapDbToVeicolo));
    setMovimenti((m || []).map(mapDbToMovimento));
    setContatti((contattiRes.data || []).map(mapDbToContatto));
    setAudit((auditRes.data || []).map(mapDbToAudit));
    setDocumenti((documentiRes.data || []).map((d: any) => ({ id: d.id, autoId: d.auto_id, nomeFile: d.nome_file, tipo: d.tipo, storagePath: d.storage_path })));
    if (imp) {
      setImpostazioni({
        annoGestione: imp.anno_gestione, aliquotaIva: imp.aliquota_iva, maggiorazioneTrimestrale: imp.maggiorazione_trimestrale,
        commissionePredefinita: imp.commissione_predefinita, sogliaRoi: imp.soglia_roi, sogliaGiorniStock: imp.soglia_giorni_stock,
        ragioneSociale: imp.ragione_sociale || "", partitaIva: imp.partita_iva || "", indirizzoAzienda: imp.indirizzo_azienda || "",
        telefonoAzienda: imp.telefono_azienda || "", emailAzienda: imp.email_azienda || "", pecAzienda: imp.pec_azienda || "",
        prossimoNumeroContratto: imp.prossimo_numero_contratto ?? 1,
      });
    }
    setLoading(false);
  }

  // --- Veicoli CRUD ---
  async function addVeicolo() {
    const { data, error } = await supabase.from("veicoli").insert({ commissione_percentuale: impostazioni.commissionePredefinita }).select().single();
    if (error || !data) { setError("Impossibile creare il veicolo."); return null; }
    const nuovo = mapDbToVeicolo(data);
    setVeicoli((prev) => [nuovo, ...prev]);
    return nuovo.id;
  }
  function updateVeicoloField(id: string, field: keyof Veicolo, value: any) {
    setVeicoli((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
    const col = VEICOLO_COLS[field as string];
    if (!col) return;
    supabase.from("veicoli").update({ [col]: value === "" ? null : value }).eq("id", id).then(({ error }) => {
      if (error) setError("Salvataggio veicolo non riuscito.");
    });
  }
  async function deleteVeicolo(id: string) {
    const { error } = await supabase.from("veicoli").delete().eq("id", id);
    if (error) { setError("Impossibile eliminare (solo admin)."); return; }
    setVeicoli((prev) => prev.filter((v) => v.id !== id));
    setMovimenti((prev) => prev.filter((m) => m.autoId !== id));
  }

  // --- Movimenti CRUD ---
  async function addMovimento(autoId: string | null) {
    const { data, error } = await supabase.from("movimenti").insert({ auto_id: autoId }).select().single();
    if (error || !data) { setError("Impossibile creare il movimento."); return; }
    setMovimenti((prev) => [mapDbToMovimento(data), ...prev]);
  }
  function updateMovimentoField(id: string, field: keyof Movimento, value: any) {
    setMovimenti((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
    const col = MOVIMENTO_COLS[field as string];
    if (!col) return;
    supabase.from("movimenti").update({ [col]: value === "" ? null : value }).eq("id", id).select().single().then(({ data, error }) => {
      if (error || !data) { setError("Salvataggio movimento non riuscito."); return; }
      setMovimenti((prev) => prev.map((m) => (m.id === id ? mapDbToMovimento(data) : m)));
    });
  }
  async function deleteMovimento(id: string) {
    const { error } = await supabase.from("movimenti").delete().eq("id", id);
    if (error) { setError("Impossibile eliminare il movimento."); return; }
    setMovimenti((prev) => prev.filter((m) => m.id !== id));
  }

  // --- Contatti CRUD ---
  async function addContatto() {
    const { data, error } = await supabase.from("contatti").insert({}).select().single();
    if (error || !data) { setError("Impossibile creare il contatto."); return; }
    setContatti((prev) => [mapDbToContatto(data), ...prev]);
  }
  function updateContattoField(id: string, field: keyof Contatto, value: any) {
    setContatti((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    const colMap: Record<string, string> = {
      tipo: "tipo", nome: "nome", telefono: "telefono", email: "email", note: "note",
      codiceFiscale: "codice_fiscale", residenza: "residenza", nascitaSede: "nascita_sede",
    };
    const col = colMap[field as string];
    if (!col) return;
    supabase.from("contatti").update({ [col]: value }).eq("id", id).then(({ error }) => {
      if (error) setError("Salvataggio contatto non riuscito.");
    });
  }
  async function deleteContatto(id: string) {
    const { error } = await supabase.from("contatti").delete().eq("id", id);
    if (error) { setError("Impossibile eliminare il contatto."); return; }
    setContatti((prev) => prev.filter((c) => c.id !== id));
  }

  // --- Dopo la generazione di un contratto: salva o aggiorna il cliente in anagrafica ---
  async function handleContrattoGenerato(acquirente: { nome: string; nascitaSede: string; codiceFiscale: string; residenza: string; telefono: string; email: string }) {
    updateImpostazione("prossimoNumeroContratto", (impostazioni.prossimoNumeroContratto || 1) + 1);

    const nome = (acquirente.nome || "").trim();
    if (!nome) return;
    const esistente = contatti.find((c) => c.nome.trim().toLowerCase() === nome.toLowerCase());

    if (esistente) {
      if (acquirente.telefono) updateContattoField(esistente.id, "telefono", acquirente.telefono);
      if (acquirente.email) updateContattoField(esistente.id, "email", acquirente.email);
      if (acquirente.codiceFiscale) updateContattoField(esistente.id, "codiceFiscale", acquirente.codiceFiscale);
      if (acquirente.residenza) updateContattoField(esistente.id, "residenza", acquirente.residenza);
      if (acquirente.nascitaSede) updateContattoField(esistente.id, "nascitaSede", acquirente.nascitaSede);
    } else {
      const { data, error } = await supabase.from("contatti").insert({
        tipo: "Cliente", nome, telefono: acquirente.telefono || "", email: acquirente.email || "",
        codice_fiscale: acquirente.codiceFiscale || "", residenza: acquirente.residenza || "", nascita_sede: acquirente.nascitaSede || "",
      }).select().single();
      if (!error && data) setContatti((prev) => [mapDbToContatto(data), ...prev]);
    }
  }

  // --- Impostazioni ---
  function updateImpostazione(field: keyof Impostazioni, value: any) {
    setImpostazioni((prev) => ({ ...prev, [field]: value }));
    const colMap: Record<string, string> = {
      annoGestione: "anno_gestione", aliquotaIva: "aliquota_iva", maggiorazioneTrimestrale: "maggiorazione_trimestrale",
      commissionePredefinita: "commissione_predefinita", sogliaRoi: "soglia_roi", sogliaGiorniStock: "soglia_giorni_stock",
      ragioneSociale: "ragione_sociale", partitaIva: "partita_iva", indirizzoAzienda: "indirizzo_azienda",
      telefonoAzienda: "telefono_azienda", emailAzienda: "email_azienda", pecAzienda: "pec_azienda",
      prossimoNumeroContratto: "prossimo_numero_contratto",
    };
    supabase.from("impostazioni").update({ [colMap[field]]: value }).eq("id", 1).then(({ error }) => {
      if (error) setError("Salvataggio impostazioni non riuscito.");
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleDocumentoCaricato(doc: Documento) { setDocumenti((prev) => [doc, ...prev]); }
  function handleDocumentoEliminato(id: string) { setDocumenti((prev) => prev.filter((d) => d.id !== id)); }

  function goTo(v: string) { setView(v as View); setMobileMenuOpen(false); }

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Caricamento gestionale…</div>;
  }

  const navItems: { key: View; label: string; icon: any }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "avvisi", label: "Avvisi", icon: Bell },
    { key: "veicoli", label: "Parco auto", icon: Car },
    { key: "movimenti", label: "Movimenti", icon: Receipt },
    { key: "scadenzario", label: "Scadenzario", icon: CalendarClock },
    { key: "contatti", label: "Clienti e fornitori", icon: Users },
    { key: "iva", label: "Liquidazione IVA", icon: Percent },
    { key: "registroiva", label: "Registro IVA", icon: BookOpen },
    { key: "riconciliazione", label: "Riconciliazione banca", icon: Landmark },
    { key: "costi", label: "Analisi costi", icon: TrendingUp },
    { key: "mensile", label: "Analisi mensile", icon: BarChart3 },
  ];
  const avvisi = computeAvvisi(veicoli, movimenti, impostazioni);

  return (
    <div className="ga-shell">
      <div className="ga-mobile-topbar">
        <button onClick={() => setMobileMenuOpen(true)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}>
          <Menu size={22} />
        </button>
        <img src="/logo-icon.png" alt="Global Drive" style={{ width: 24, height: 24, borderRadius: 6 }} />
        <div className="ga-display" style={{ fontSize: 15, fontWeight: 700 }}>Global Drive</div>
      </div>
      <div className={`ga-mobile-overlay ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen(false)} />

      <aside className={`ga-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 20px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/logo-icon.png" alt="Global Drive" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
            <div>
              <div className="ga-display" style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Global Drive</div>
              <div style={{ fontSize: 10, color: "#8B8579" }}>gestionale auto</div>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} style={{ background: "none", border: "none", color: "#C9C6BE", cursor: "pointer", display: "none" }} className="ga-mobile-close">
            <X size={18} />
          </button>
        </div>
        {navItems.map((item) => (
          <NavBtn key={item.key} active={view === item.key} icon={item.icon} label={item.label} onClick={() => goTo(item.key)} badge={item.key === "avvisi" && avvisi.length > 0 ? avvisi.length : undefined} />
        ))}
        {isAdmin && <NavBtn active={view === "impostazioni"} icon={Settings} label="Impostazioni" onClick={() => goTo("impostazioni")} />}
        {isAdmin && <NavBtn active={view === "storico"} icon={History} label="Storico modifiche" onClick={() => goTo("storico")} />}
        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, color: "#8B8579", marginBottom: 8, wordBreak: "break-all" }}>{userEmail} · {isAdmin ? "admin" : "venditore"}</div>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#C9C6BE", cursor: "pointer", fontSize: 13, padding: "6px 4px" }}>
            <LogOut size={14} /> Esci
          </button>
        </div>
      </aside>

      <main className="ga-main">
        {error && (
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--bad-bg)", color: "var(--bad)", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {view === "dashboard" && <DashboardView veicoli={veicoli} movimenti={movimenti} impostazioni={impostazioni} isAdmin={isAdmin} onOpenVeicoli={() => setView("veicoli")} onNavigate={goTo} />}
        {view === "avvisi" && <AvvisiView avvisi={avvisi} onNavigate={goTo} />}
        {view === "veicoli" && (
          <VeicoliView veicoli={veicoli} movimenti={movimenti} impostazioni={impostazioni} isAdmin={isAdmin}
            onAdd={addVeicolo} onField={updateVeicoloField} onDelete={deleteVeicolo}
            onAddMovimento={addMovimento} onUpdateMovimento={updateMovimentoField} onDeleteMovimento={deleteMovimento}
            documenti={documenti} onDocumentoCaricato={handleDocumentoCaricato} onDocumentoEliminato={handleDocumentoEliminato}
            onContrattoGenerato={handleContrattoGenerato} />
        )}
        {view === "movimenti" && (
          <MovimentiView movimenti={movimenti} veicoli={veicoli} isAdmin={isAdmin}
            onAdd={addMovimento} onField={updateMovimentoField} onDelete={deleteMovimento} />
        )}
        {view === "iva" && <LiquidazioneIvaView veicoli={veicoli} movimenti={movimenti} impostazioni={impostazioni} />}
        {view === "costi" && <AnalisiCostiView veicoli={veicoli} movimenti={movimenti} impostazioni={impostazioni} />}
        {view === "mensile" && <AnalisiMensileView veicoli={veicoli} movimenti={movimenti} impostazioni={impostazioni} />}
        {view === "contatti" && <ContattiView contatti={contatti} isAdmin={isAdmin} onAdd={addContatto} onField={updateContattoField} onDelete={deleteContatto} />}
        {view === "scadenzario" && <ScadenzarioView movimenti={movimenti} veicoli={veicoli} onField={updateMovimentoField} />}
        {view === "registroiva" && <RegistroIvaView veicoli={veicoli} movimenti={movimenti} impostazioni={impostazioni} />}
        {view === "riconciliazione" && <RiconciliazioneView movimenti={movimenti} veicoli={veicoli} onField={updateMovimentoField} />}
        {view === "storico" && isAdmin && <StoricoView audit={audit} />}
        {view === "impostazioni" && isAdmin && <ImpostazioniView impostazioni={impostazioni} onField={updateImpostazione} />}
      </main>
    </div>
  );
}

function NavBtn({ active, icon: Icon, label, onClick, badge }: any) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer",
      fontSize: 14, fontWeight: 500, color: active ? "var(--amber-light)" : "#C9C6BE",
      border: "none", background: active ? "var(--amber-bg)" : "transparent", width: "100%", textAlign: "left",
    }}>
      <Icon size={16} /> {label}
      {badge ? <span style={{ marginLeft: "auto", background: "var(--bad)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 6px" }}>{badge}</span> : null}
    </button>
  );
}
