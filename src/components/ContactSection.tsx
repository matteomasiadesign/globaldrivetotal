"use client";

import React, { useState } from "react";
import { submitLead } from "@/lib/leads/client";
import { Honeypot } from "@/components/ui/Honeypot";
import { useSite } from "@/context/SiteContext";
import { Reveal } from "@/components/ui/Reveal";
import {
  Phone,
  Mail,
  Clock,
  MessageSquare,
  Send,
  CheckCircle2,
  ExternalLink,
  MapPin,
  ArrowRight,
} from "lucide-react";

export default function ContactSection() {
  const { site, phoneHref, whatsappUrl } = useSite();
  const [formData, setFormData] = useState({
    nome: "",
    telefono: "",
    messaggio: "",
  });
  const [inviato, setInviato] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setInviato(true);

    // Il salvataggio è best-effort: se fallisce il cliente può comunque
    // scriverci su WhatsApp, quindi non blocca il flusso.
    await Promise.all([
      submitLead(
        {
          type: "contatto",
          name: formData.nome,
          phone: formData.telefono,
          message: formData.messaggio,
        },
        form
      ),
      new Promise((resolve) => setTimeout(resolve, 800)),
    ]);

    window.open(
      whatsappUrl(
        `Salve ${site.companyName}, sono ${formData.nome} (${formData.telefono}). ${formData.messaggio}`
      ),
      "_blank"
    );
    setInviato(false);
    setFormData({ nome: "", telefono: "", messaggio: "" });
  };

  return (
    <section
      id="contatti"
      className="py-24 bg-[#060913] relative overflow-hidden scroll-mt-20 border-t border-white/5"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Direct Official Contact Info */}
          <Reveal className="lg:col-span-7 space-y-8">
            <div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Parla con noi.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 mt-4 font-light leading-relaxed max-w-xl text-pretty">
                Hai bisogno di informazioni o stai cercando la tua prossima auto?
                Il team di <strong>{site.companyName}</strong> è a tua completa disposizione
                per offrirti consulenza e accompagnarti nella scelta della soluzione
                più adatta alle tue esigenze.
              </p>
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Telefono */}
              <a
                href={phoneHref}
                className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-blue-500/50 hover:bg-[#0b1228] transition-all group block"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Telefono Diretto
                    </p>
                    <p className="text-sm font-extrabold text-white group-hover:text-blue-300 transition-colors mt-0.5">
                      {site.phone}
                    </p>
                  </div>
                </div>
              </a>

              {/* WhatsApp */}
              <a
                href={whatsappUrl(`Salve ${site.companyName}, vorrei avere maggiori informazioni.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-emerald-500/50 hover:bg-[#081a17] transition-all group block"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      WhatsApp 24/7
                    </p>
                    <p className="text-sm font-extrabold text-white group-hover:text-emerald-300 transition-colors mt-0.5">
                      Chatta con Noi
                    </p>
                  </div>
                </div>
              </a>

              {/* Email */}
              <a
                href={`mailto:${site.email}`}
                className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-blue-500/50 hover:bg-[#0b1228] transition-all group block sm:col-span-2"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Email Ufficiale
                    </p>
                    <p className="text-sm font-extrabold text-white group-hover:text-blue-300 transition-colors mt-0.5 truncate">
                      {site.email}
                    </p>
                  </div>
                </div>
              </a>

              {/* Orari di contatto */}
              <div className="glass-panel p-5 rounded-2xl border border-white/10 sm:col-span-2 flex items-start gap-3.5 bg-white/[0.02]">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Orari di contatto
                  </p>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {site.hours}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {site.hoursNote}
                  </p>
                </div>
              </div>
            </div>

            {/* Social Channels Cliccabili con icone brand */}
            <div className="pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Seguici sui Canali Ufficiali:
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {/* Instagram */}
                <a
                  href={site.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-rose-900/40 hover:from-purple-600 hover:to-pink-600 text-slate-200 hover:text-white border border-pink-500/30 hover:border-pink-500 shadow-lg transition-all duration-300 group cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current text-pink-400 group-hover:text-white transition-colors" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <span className="text-xs font-bold">{site.instagramHandle}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-white" />
                </a>

                {/* Facebook */}
                <a
                  href={site.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-blue-950/40 hover:bg-blue-600 text-slate-200 hover:text-white border border-blue-500/30 hover:border-blue-500 shadow-lg transition-all duration-300 group cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current text-blue-400 group-hover:text-white transition-colors" viewBox="0 0 24 24">
                    <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.592 0 9 1.583 9 4.615V8z"/>
                  </svg>
                  <span className="text-xs font-bold">{site.facebookLabel}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-white" />
                </a>
              </div>
            </div>
          </Reveal>

          {/* Right Column: Quick Contact Form */}
          <Reveal delay={0.15} className="lg:col-span-5">
            <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/15 bg-gradient-to-b from-[#0c142b] to-[#080d1e] shadow-2xl relative">
              <div className="mb-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-md border border-blue-500/20">
                  Risposta Rapida
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
                  Invia un Messaggio
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ti risponderemo subito su WhatsApp o telefono.
                </p>
              </div>

              {inviato ? (
                <div className="p-8 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-white">Reindirizzamento in corso...</h4>
                  <p className="text-xs text-slate-300">
                    Apertura della chat con {site.companyName}...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="relative space-y-4 text-xs">
                  <Honeypot />
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                      Il Tuo Nome *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="es. Mario Rossi"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                      Numero di Telefono *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="es. +39 340 1234567"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                      Come possiamo aiutarti? *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Vorrei informazioni sull'auto..."
                      value={formData.messaggio}
                      onChange={(e) => setFormData({ ...formData, messaggio: e.target.value })}
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/30 transition-all cursor-pointer mt-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Invia Richiesta Diretta</span>
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
