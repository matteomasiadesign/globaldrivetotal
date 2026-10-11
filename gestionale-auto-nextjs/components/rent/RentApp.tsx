"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Car, Users, CalendarRange, LogOut, AlertCircle, Menu, X, ArrowLeftRight, Tag, FileText, CalendarDays } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { RentVeicolo, RentCliente, RentPrenotazione } from "@/lib/rentCalc";
import RentDashboardView from "./RentDashboardView";
import RentFlottaView from "./RentFlottaView";
import RentClientiView from "./RentClientiView";
import RentPrenotazioniView from "./RentPrenotazioniView";
import RentTariffeView from "./RentTariffeView";
import RentPreventiviView from "./RentPreventiviView";
import RentCalendarView from "./RentCalendarView";
import type { RentTariffa, RentPreventivo } from "@/lib/rentCalc";

function mapVeicolo(row: any): RentVeicolo {
  return {
    id: row.id, marca: row.marca || "", modello: row.modello || "", targa: row.targa || "", categoria: row.categoria,
    kmAttuali: row.km_attuali || 0, tariffaGiornaliera: row.tariffa_giornaliera || 0, stato: row.stato,
    dataRevisione: row.data_revisione || "", dataBollo: row.data_bollo || "", dataAssicurazione: row.data_assicurazione || "",
    dataTagliando: row.data_tagliando || "", note: row.note || "",
  };
}
function mapCliente(row: any): RentCliente {
  return {
    id: row.id, nome: row.nome || "", telefono: row.telefono || "", email: row.email || "",
    numeroPatente: row.numero_patente || "", scadenzaPatente: row.scadenza_patente || "",
    numeroDocumento: row.numero_documento || "", note: row.note || "",
  };
}
function mapPrenotazione(row: any): RentPrenotazione {
  return {
    id: row.id, veicoloId: row.veicolo_id, clienteId: row.cliente_id, dataInizio: row.data_inizio, dataFine: row.data_fine,
    kmRitiro: row.km_ritiro, kmRiconsegna: row.km_riconsegna, carburanteRitiro: row.carburante_ritiro || "",
    carburanteRiconsegna: row.carburante_riconsegna || "", tariffaApplicata: row.tariffa_applicata || 0,
    cauzione: row.cauzione || 0, extra: row.extra || "", stato: row.stato, note: row.note || "",
    luogoRitiro: row.luogo_ritiro || "", luogoRiconsegna: row.luogo_riconsegna || "",
  };
}
function mapTariffa(row: any): RentTariffa {
  return {
    id: row.id, categoria: row.categoria, nomePeriodo: row.nome_periodo || "",
    dataInizio: row.data_inizio, dataFine: row.data_fine, tariffaGiornaliera: row.tariffa_giornaliera || 0, note: row.note || "",
  };
}
function mapPreventivo(row: any): RentPreventivo {
  return {
    id: row.id, veicoloId: row.veicolo_id, clienteId: row.cliente_id, clienteNomeLibero: row.cliente_nome_libero || "",
    categoria: row.categoria, dataInizio: row.data_inizio, dataFine: row.data_fine,
    luogoRitiro: row.luogo_ritiro || "", luogoRiconsegna: row.luogo_riconsegna || "",
    tariffaApplicata: row.tariffa_applicata || 0, giorni: row.giorni || 1, totale: row.totale || 0,
    stato: row.stato, note: row.note || "",
  };
}

const VEICOLO_COLS: Record<string, string> = {
  marca: "marca", modello: "modello", targa: "targa", categoria: "categoria", kmAttuali: "km_attuali",
  tariffaGiornaliera: "tariffa_giornaliera", stato: "stato", dataRevisione: "data_revisione", dataBollo: "data_bollo",
  dataAssicurazione: "data_assicurazione", dataTagliando: "data_tagliando", note: "note",
};
const CLIENTE_COLS: Record<string, string> = {
  nome: "nome", telefono: "telefono", email: "email", numeroPatente: "numero_patente",
  scadenzaPatente: "scadenza_patente", numeroDocumento: "numero_documento", note: "note",
};
const PRENOTAZIONE_COLS: Record<string, string> = { stato: "stato", note: "note" };

type View = "dashboard" | "flotta" | "clienti" | "prenotazioni" | "tariffe" | "preventivi" | "calendario";

export default function RentApp({ userEmail, isAdmin }: { userEmail: string; isAdmin: boolean }) {
  const supabase = createClient();
  const router = useRouter();

  const [veicoli, setVeicoli] = useState<RentVeicolo[]>([]);
  const [clienti, setClienti] = useState<RentCliente[]>([]);
  const [prenotazioni, setPrenotazioni] = useState<RentPrenotazione[]>([]);
  const [tariffe, setTariffe] = useState<RentTariffa[]>([]);
  const [preventivi, setPreventivi] = useState<RentPreventivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: v, error: e1 }, { data: c, error: e2 }, { data: p, error: e3 }, { data: t, error: e4 }, { data: pv, error: e5 }] = await Promise.all([
      supabase.from("rent_veicoli").select("*").order("created_at", { ascending: false }),
      supabase.from("rent_clienti").select("*").order("nome", { ascending: true }),
      supabase.from("rent_prenotazioni").select("*").order("data_inizio", { ascending: false }),
      supabase.from("rent_tariffe").select("*").order("data_inizio", { ascending: true }),
      supabase.from("rent_preventivi").select("*").order("created_at", { ascending: false }),
    ]);
    if (e1 || e2 || e3) { setError("Errore nel caricamento dei dati."); setLoading(false); return; }
    setVeicoli((v || []).map(mapVeicolo));
    setClienti((c || []).map(mapCliente));
    setPrenotazioni((p || []).map(mapPrenotazione));
    setTariffe((t || []).map(mapTariffa));
    setPreventivi((pv || []).map(mapPreventivo));
    setLoading(false);
  }

  async function addVeicolo() {
    const { data, error } = await supabase.from("rent_veicoli").insert({}).select().single();
    if (error || !data) { setError("Impossibile creare l'auto."); return null; }
    const nuovo = mapVeicolo(data);
    setVeicoli((prev) => [nuovo, ...prev]);
    return nuovo.id;
  }
  function updateVeicoloField(id: string, field: keyof RentVeicolo, value: any) {
    setVeicoli((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
    const col = VEICOLO_COLS[field as string];
    if (!col) return;
    supabase.from("rent_veicoli").update({ [col]: value === "" ? null : value }).eq("id", id).then(({ error }) => {
      if (error) setError("Salvataggio auto non riuscito.");
    });
  }
  async function deleteVeicolo(id: string) {
    const { error } = await supabase.from("rent_veicoli").delete().eq("id", id);
    if (error) { setError("Impossibile eliminare (solo admin)."); return; }
    setVeicoli((prev) => prev.filter((v) => v.id !== id));
  }

  async function addCliente() {
    const { data, error } = await supabase.from("rent_clienti").insert({}).select().single();
    if (error || !data) { setError("Impossibile creare il cliente."); return; }
    setClienti((prev) => [mapCliente(data), ...prev]);
  }
  function updateClienteField(id: string, field: keyof RentCliente, value: any) {
    setClienti((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    const col = CLIENTE_COLS[field as string];
    if (!col) return;
    supabase.from("rent_clienti").update({ [col]: value === "" ? null : value }).eq("id", id).then(({ error }) => {
      if (error) setError("Salvataggio cliente non riuscito.");
    });
  }
  async function deleteCliente(id: string) {
    const { error } = await supabase.from("rent_clienti").delete().eq("id", id);
    if (error) { setError("Impossibile eliminare il cliente."); return; }
    setClienti((prev) => prev.filter((c) => c.id !== id));
  }

  async function addPrenotazione(p: Partial<RentPrenotazione>): Promise<{ ok: boolean; errore?: string }> {
    const { data, error } = await supabase.from("rent_prenotazioni").insert({
      veicolo_id: p.veicoloId, cliente_id: p.clienteId, data_inizio: p.dataInizio, data_fine: p.dataFine,
      tariffa_applicata: p.tariffaApplicata, cauzione: p.cauzione,
      luogo_ritiro: p.luogoRitiro || "", luogo_riconsegna: p.luogoRiconsegna || "",
    }).select().single();
    if (error || !data) {
      if (error?.code === "23P01") return { ok: false, errore: "L'auto risulta già prenotata in questo periodo (verificato dal database)." };
      return { ok: false, errore: "Impossibile salvare la prenotazione." };
    }
    setPrenotazioni((prev) => [mapPrenotazione(data), ...prev]);
    return { ok: true };
  }
  function updatePrenotazioneField(id: string, field: keyof RentPrenotazione, value: any) {
    setPrenotazioni((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    const col = PRENOTAZIONE_COLS[field as string];
    if (!col) return;
    supabase.from("rent_prenotazioni").update({ [col]: value }).eq("id", id).then(({ error }) => {
      if (error) setError("Salvataggio prenotazione non riuscito.");
    });
  }
  async function deletePrenotazione(id: string) {
    const { error } = await supabase.from("rent_prenotazioni").delete().eq("id", id);
    if (error) { setError("Impossibile eliminare la prenotazione."); return; }
    setPrenotazioni((prev) => prev.filter((p) => p.id !== id));
  }

  // --- Tariffe CRUD ---
  async function addTariffa() {
    const { data, error } = await supabase.from("rent_tariffe").insert({
      categoria: "Economy", data_inizio: new Date().toISOString().slice(0, 10), data_fine: new Date().toISOString().slice(0, 10),
    }).select().single();
    if (error || !data) { setError("Impossibile creare la tariffa."); return; }
    setTariffe((prev) => [...prev, mapTariffa(data)]);
  }
  function updateTariffaField(id: string, field: keyof RentTariffa, value: any) {
    setTariffe((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
    const colMap: Record<string, string> = { categoria: "categoria", nomePeriodo: "nome_periodo", dataInizio: "data_inizio", dataFine: "data_fine", tariffaGiornaliera: "tariffa_giornaliera", note: "note" };
    const col = colMap[field as string];
    if (!col) return;
    supabase.from("rent_tariffe").update({ [col]: value }).eq("id", id).then(({ error }) => { if (error) setError("Salvataggio tariffa non riuscito."); });
  }
  async function deleteTariffa(id: string) {
    const { error } = await supabase.from("rent_tariffe").delete().eq("id", id);
    if (error) { setError("Impossibile eliminare la tariffa."); return; }
    setTariffe((prev) => prev.filter((t) => t.id !== id));
  }

  // --- Preventivi CRUD ---
  async function addPreventivo(p: Partial<RentPreventivo>): Promise<{ ok: boolean; errore?: string }> {
    const { data, error } = await supabase.from("rent_preventivi").insert({
      veicolo_id: p.veicoloId || null, cliente_id: p.clienteId || null, cliente_nome_libero: p.clienteNomeLibero || "",
      categoria: p.categoria, data_inizio: p.dataInizio, data_fine: p.dataFine,
      luogo_ritiro: p.luogoRitiro || "", luogo_riconsegna: p.luogoRiconsegna || "",
      tariffa_applicata: p.tariffaApplicata, giorni: p.giorni, totale: p.totale,
    }).select().single();
    if (error || !data) return { ok: false, errore: "Impossibile salvare il preventivo." };
    setPreventivi((prev) => [mapPreventivo(data), ...prev]);
    return { ok: true };
  }
  function updatePreventivoField(id: string, field: keyof RentPreventivo, value: any) {
    setPreventivi((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    const colMap: Record<string, string> = { stato: "stato", note: "note" };
    const col = colMap[field as string];
    if (!col) return;
    supabase.from("rent_preventivi").update({ [col]: value }).eq("id", id).then(({ error }) => { if (error) setError("Salvataggio preventivo non riuscito."); });
  }
  async function deletePreventivo(id: string) {
    const { error } = await supabase.from("rent_preventivi").delete().eq("id", id);
    if (error) { setError("Impossibile eliminare il preventivo."); return; }
    setPreventivi((prev) => prev.filter((p) => p.id !== id));
  }
  async function convertiPreventivoInPrenotazione(pv: RentPreventivo): Promise<{ ok: boolean; errore?: string }> {
    const res = await addPrenotazione({
      veicoloId: pv.veicoloId!, clienteId: pv.clienteId, dataInizio: pv.dataInizio, dataFine: pv.dataFine,
      tariffaApplicata: pv.tariffaApplicata, cauzione: 0, luogoRitiro: pv.luogoRitiro, luogoRiconsegna: pv.luogoRiconsegna,
    });
    if (res.ok) updatePreventivoField(pv.id, "stato", "Accettato");
    return res;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  function goTo(v: View) { setView(v); setMobileMenuOpen(false); }

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Caricamento Global Rent…</div>;
  }

  const navItems: { key: View; label: string; icon: any }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "flotta", label: "Flotta", icon: Car },
    { key: "clienti", label: "Clienti", icon: Users },
    { key: "prenotazioni", label: "Prenotazioni", icon: CalendarRange },
    { key: "calendario", label: "Calendario", icon: CalendarDays },
    { key: "preventivi", label: "Preventivi", icon: FileText },
    { key: "tariffe", label: "Tariffe", icon: Tag },
  ];

  return (
    <div className="ga-shell">
      <div className="ga-mobile-topbar" style={{ background: "#0E4A40" }}>
        <button onClick={() => setMobileMenuOpen(true)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}><Menu size={22} /></button>
        <img src="/logo-rent-icon.png" alt="Global Rent" style={{ width: 22, height: 22 }} />
        <div className="ga-display" style={{ fontSize: 15, fontWeight: 700 }}>Global Rent</div>
      </div>
      <div className={`ga-mobile-overlay ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen(false)} />

      <aside className={`ga-sidebar ${mobileMenuOpen ? "open" : ""}`} style={{ background: "#0E4A40" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 20px 8px" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0 }}>
            <img src="/logo-rent-icon.png" alt="Global Rent" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <div className="ga-display" style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Global Rent</div>
            <div style={{ fontSize: 10, color: "#9FC7BE" }}>noleggio auto</div>
          </div>
        </div>
        {navItems.map((item) => (
          <button key={item.key} onClick={() => goTo(item.key)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer",
            fontSize: 14, fontWeight: 500, color: view === item.key ? "#8CE0CC" : "#C9E4DD",
            border: "none", background: view === item.key ? "rgba(18,176,151,0.18)" : "transparent", width: "100%", textAlign: "left",
          }}>
            <item.icon size={16} /> {item.label}
          </button>
        ))}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: "#C9E4DD", fontSize: 13, textDecoration: "none", marginTop: 6 }}>
          <ArrowLeftRight size={15} /> Cambia gestionale
        </Link>
        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 11, color: "#9FC7BE", marginBottom: 8, wordBreak: "break-all" }}>{userEmail}</div>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#C9E4DD", cursor: "pointer", fontSize: 13, padding: "6px 4px" }}>
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
        {view === "dashboard" && <RentDashboardView veicoli={veicoli} clienti={clienti} prenotazioni={prenotazioni} />}
        {view === "flotta" && <RentFlottaView veicoli={veicoli} isAdmin={isAdmin} onAdd={addVeicolo} onField={updateVeicoloField} onDelete={deleteVeicolo} />}
        {view === "clienti" && <RentClientiView clienti={clienti} isAdmin={isAdmin} onAdd={addCliente} onField={updateClienteField} onDelete={deleteCliente} />}
        {view === "prenotazioni" && <RentPrenotazioniView prenotazioni={prenotazioni} veicoli={veicoli} clienti={clienti} isAdmin={isAdmin} onAdd={addPrenotazione} onField={updatePrenotazioneField} onDelete={deletePrenotazione} />}
        {view === "tariffe" && <RentTariffeView tariffe={tariffe} isAdmin={isAdmin} onAdd={addTariffa} onField={updateTariffaField} onDelete={deleteTariffa} />}
        {view === "calendario" && <RentCalendarView veicoli={veicoli} prenotazioni={prenotazioni} clienti={clienti} />}
        {view === "preventivi" && (
          <RentPreventiviView preventivi={preventivi} veicoli={veicoli} clienti={clienti} tariffe={tariffe} prenotazioni={prenotazioni} isAdmin={isAdmin}
            onAdd={addPreventivo} onField={updatePreventivoField} onDelete={deletePreventivo} onConverti={convertiPreventivoInPrenotazione} />
        )}
      </main>
    </div>
  );
}
