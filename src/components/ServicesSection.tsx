"use client";

import React, { useState } from "react";
import Link from "next/link";
import { submitLead } from "@/lib/leads/client";
import { Honeypot } from "@/components/ui/Honeypot";
import { defaultSiteSettings } from "@/config/site";
import { useSite } from "@/context/SiteContext";
import { Reveal } from "@/components/ui/Reveal";
import {
  ShieldCheck,
  Search,
  Handshake,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Car,
  FileCheck,
  Camera,
  Truck,
  MessageSquare,
  Send,
  X,
  HelpCircle,
} from "lucide-react";

const SERVICE_UI = [
  {
    id: "01",
    number: "01",
    icon: ShieldCheck,
    ctaText: "Scopri le Auto Disponibili",
    ctaType: "catalog",
    gradient: "from-blue-600/20 via-blue-900/10 to-transparent",
  },
  {
    id: "02",
    number: "02",
    icon: Search,
    ctaText: "Richiedi Auto su Commissione",
    ctaType: "commission",
    gradient: "from-indigo-600/20 via-blue-900/10 to-transparent",
  },
  {
    id: "03",
    number: "03",
    icon: Handshake,
    ctaText: "Affidaci la Tua Auto in Conto Vendita",
    ctaType: "contovendita",
    gradient: "from-cyan-600/20 via-blue-900/10 to-transparent",
  },
];

export default function ServicesSection() {
  const { site, whatsappUrl } = useSite();
  const [activeService, setActiveService] = useState<number>(0);

  // Commission Modal State
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [commissionForm, setCommissionForm] = useState({
    carModel: "",
    budget: "",
    yearMin: "",
    notes: "",
    phone: "",
  });
  const [commissionSubmitted, setCommissionSubmitted] = useState(false);

  // Conto Vendita Modal State
  const [isContoVenditaModalOpen, setIsContoVenditaModalOpen] = useState(false);
  const [contoVenditaForm, setContoVenditaForm] = useState({
    carModel: "",
    year: "",
    km: "",
    priceExpectation: "",
    phone: "",
  });
  const [contoVenditaSubmitted, setContoVenditaSubmitted] = useState(false);

  // Testi dal sito (modificabili in admin); icone, colori e azioni restano qui.
  const servicesData = SERVICE_UI.map((ui, i) => ({
    ...ui,
    ...(site.services[i] ?? defaultSiteSettings.services[i]),
  }));

  const handleCtaClick = (type: string) => {
    if (type === "catalog") {
      const el = document.getElementById("catalogo");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (type === "commission") {
      setIsCommissionModalOpen(true);
    } else if (type === "contovendita") {
      setIsContoVenditaModalOpen(true);
    }
  };

  // Il salvataggio del lead è best-effort: se fallisce il cliente può comunque
  // scriverci su WhatsApp, quindi non blocca il flusso.
  const handleCommissionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setCommissionSubmitted(true);

    await Promise.all([
      submitLead(
        {
          type: "commissione",
          phone: commissionForm.phone,
          carLabel: commissionForm.carModel,
          message: commissionForm.notes,
          details: { budget: commissionForm.budget, annoMinimo: commissionForm.yearMin },
        },
        form
      ),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);

    window.open(
      whatsappUrl(
        `Salve ${site.companyName}, vorrei richiedere un'auto su commissione:\n- Modello: ${commissionForm.carModel}\n- Budget: ${commissionForm.budget}\n- Anno min: ${commissionForm.yearMin}\n- Note: ${commissionForm.notes}\n- Telefono: ${commissionForm.phone}`
      ),
      "_blank"
    );
    setIsCommissionModalOpen(false);
    setCommissionSubmitted(false);
  };

  const handleContoVenditaSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setContoVenditaSubmitted(true);

    await Promise.all([
      submitLead(
        {
          type: "conto_vendita",
          phone: contoVenditaForm.phone,
          carLabel: contoVenditaForm.carModel,
          details: {
            anno: contoVenditaForm.year,
            km: contoVenditaForm.km,
            prezzoDesiderato: contoVenditaForm.priceExpectation,
          },
        },
        form
      ),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);

    window.open(
      whatsappUrl(
        `Salve ${site.companyName}, vorrei proporre un'auto in Conto Vendita:\n- Veicolo: ${contoVenditaForm.carModel}\n- Anno: ${contoVenditaForm.year}\n- Chilometri: ${contoVenditaForm.km} km\n- Prezzo desiderato: € ${contoVenditaForm.priceExpectation}\n- Telefono: ${contoVenditaForm.phone}`
      ),
      "_blank"
    );
    setIsContoVenditaModalOpen(false);
    setContoVenditaSubmitted(false);
  };

  return (
    <section id="servizi" className="py-24 bg-[#060913] relative overflow-hidden">
      {/* Background radial ambient lights */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        {/* Section Header */}
        <Reveal className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Soluzioni Automotive su Misura
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3 font-light leading-relaxed max-w-2xl mx-auto text-pretty">
            Dalla scelta dell&apos;usato garantito alla ricerca personalizzata,
            <br className="hidden sm:inline" /> fino alla valorizzazione della tua auto in conto vendita.
          </p>
        </Reveal>

        {/* Interactive Service Selector Pills (Quick Navigation) */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {servicesData.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveService(idx)}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeService === idx
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40 border-blue-500 scale-105"
                  : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10"
              }`}
            >
              <span className="text-blue-300 text-[10px] font-mono">{s.number}</span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* 3 Interactive Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {servicesData.map((service, index) => {
            const Icon = service.icon;
            const isSelected = activeService === index;

            return (
              <Reveal key={service.id} delay={index * 0.12} className="h-full">
              <div
                onClick={() => setActiveService(index)}
                className={`group relative h-full rounded-3xl transition-all duration-500 flex flex-col justify-between overflow-hidden cursor-pointer ${
                  isSelected
                    ? "bg-[#0b1228] border-2 border-blue-500/80 shadow-2xl shadow-blue-600/20 -translate-y-2"
                    : "bg-[#080d1e]/80 border border-white/10 hover:border-blue-500/40 hover:bg-[#0a1024] hover:-translate-y-1"
                }`}
              >
                {/* Luminous Gradient Header inside card */}
                <div
                  className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b ${service.gradient} pointer-events-none transition-opacity duration-300 ${
                    isSelected ? "opacity-100" : "opacity-40 group-hover:opacity-75"
                  }`}
                />

                {/* Card Top: Number, Badge, Title */}
                <div className="p-8 relative z-10 flex-1 flex flex-col">
                  {/* Row: Index number & Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-2xl font-black text-blue-500 tracking-wider">
                      {service.number}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition-all ${
                        isSelected
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                          : "bg-white/5 text-slate-400 border-white/10"
                      }`}
                    >
                      {service.badge}
                    </span>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-center gap-3.5 mb-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40 scale-105"
                          : "bg-blue-500/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div>
                      <h3 className="text-xl font-extrabold text-white leading-tight">
                        {service.title}
                      </h3>
                      <p className="text-[11px] text-blue-400 font-medium">
                        {service.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 leading-relaxed font-light mt-3 mb-6">
                    {service.description}
                  </p>

                  {/* Highlights Checklist */}
                  <div className="pt-4 border-t border-white/10 space-y-2.5 mt-auto">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                      {index === 0
                        ? "Cosa offriamo:"
                        : index === 1
                        ? "Il servizio comprende:"
                        : "Ci occupiamo di:"}
                    </p>

                    {service.highlights.map((item, hi) => (
                      <div
                        key={hi}
                        className={`flex items-start gap-2.5 text-xs transition-colors ${
                          isSelected ? "text-slate-200" : "text-slate-300"
                        }`}
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 transition-colors ${
                            isSelected ? "text-blue-400" : "text-slate-500 group-hover:text-blue-400"
                          }`}
                        />
                        <span className="leading-snug text-[11px]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-6 pt-0 relative z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCtaClick(service.ctaType);
                    }}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/40"
                        : "bg-white/5 hover:bg-blue-600 text-slate-300 hover:text-white border border-white/10 hover:border-blue-500"
                    }`}
                  >
                    <span>{service.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* Modal: Auto su Commissione */}
      {isCommissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0c1226] border border-blue-500/30 rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Auto su Commissione</h3>
                  <p className="text-[11px] text-slate-400">Descrivici la vettura che stai cercando</p>
                </div>
              </div>
              <button
                onClick={() => setIsCommissionModalOpen(false)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {commissionSubmitted ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Richiesta Ricevuta!</h4>
                <p className="text-xs text-slate-300">
                  Apertura diretta su WhatsApp in corso per metterti in contatto con il nostro team...
                </p>
              </div>
            ) : (
              <form onSubmit={handleCommissionSubmit} className="relative space-y-4 text-xs">
                <Honeypot />
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                    Marca e Modello Desiderato *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="es. Volkswagen Tiguan, Fiat 500X, Toyota Yaris Cross..."
                    value={commissionForm.carModel}
                    onChange={(e) =>
                      setCommissionForm({ ...commissionForm, carModel: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                      Budget Massimo (€) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="es. € 35.000"
                      value={commissionForm.budget}
                      onChange={(e) =>
                        setCommissionForm({ ...commissionForm, budget: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                      Anno Minimo
                    </label>
                    <input
                      type="text"
                      placeholder="es. dal 2020"
                      value={commissionForm.yearMin}
                      onChange={(e) =>
                        setCommissionForm({ ...commissionForm, yearMin: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                    Tuo Recapito Telefonico *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="es. +39 340 1234567"
                    value={commissionForm.phone}
                    onChange={(e) =>
                      setCommissionForm({ ...commissionForm, phone: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                    Note Aggiuntive (optional, allestimento, carburante)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="es. Cambio automatico obbligatorio, tetto panoramico..."
                    value={commissionForm.notes}
                    onChange={(e) =>
                      setCommissionForm({ ...commissionForm, notes: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition-all cursor-pointer mt-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Invia Richiesta di Ricerca</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Conto Vendita */}
      {isContoVenditaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0c1226] border border-cyan-500/30 rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white">
                  <Handshake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Conto Vendita</h3>
                  <p className="text-[11px] text-slate-400">Affida la vendita del tuo veicolo ai nostri esperti</p>
                </div>
              </div>
              <button
                onClick={() => setIsContoVenditaModalOpen(false)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {contoVenditaSubmitted ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Richiesta Ricevuta!</h4>
                <p className="text-xs text-slate-300">
                  Apertura diretta su WhatsApp in corso per concordare la valutazione della vettura...
                </p>
              </div>
            ) : (
              <form onSubmit={handleContoVenditaSubmit} className="relative space-y-4 text-xs">
                <Honeypot />
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                    Veicolo da Vendere (Marca, Modello, Versione) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="es. Audi A4 Avant 2.0 TDI S Line"
                    value={contoVenditaForm.carModel}
                    onChange={(e) =>
                      setContoVenditaForm({ ...contoVenditaForm, carModel: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                      Anno Immatricolazione *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="es. 2021"
                      value={contoVenditaForm.year}
                      onChange={(e) =>
                        setContoVenditaForm({ ...contoVenditaForm, year: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                      Chilometri Attuali *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="es. 62.000 km"
                      value={contoVenditaForm.km}
                      onChange={(e) =>
                        setContoVenditaForm({ ...contoVenditaForm, km: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                      Prezzo Desiderato Realizzo (€)
                    </label>
                    <input
                      type="text"
                      placeholder="es. € 24.500"
                      value={contoVenditaForm.priceExpectation}
                      onChange={(e) =>
                        setContoVenditaForm({ ...contoVenditaForm, priceExpectation: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                      Tuo Recapito Telefonico *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="es. +39 333 1234567"
                      value={contoVenditaForm.phone}
                      onChange={(e) =>
                        setContoVenditaForm({ ...contoVenditaForm, phone: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer mt-2"
                >
                  <Handshake className="w-4 h-4" />
                  <span>Richiedi Valutazione Conto Vendita</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
