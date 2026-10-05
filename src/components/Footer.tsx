"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ArrowUp,
  Lock,
  MessageCircle,
} from "lucide-react";
import { useSite } from "@/context/SiteContext";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const { site, phoneHref, whatsappUrl } = useSite();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-[#04060d] text-slate-400 border-t border-white/10 relative overflow-hidden">
      {/* Glow decorative element */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-blue-600/10 blur-[100px] pointer-events-none" />

      {/* pb extra: lascia libero l'angolo dove sta il pulsante di Casper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-28 sm:pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="relative w-8 h-8 flex-shrink-0">
                <Image
                  src="/logo.webp"
                  alt="Global Drive Logo"
                  fill
                  className="object-contain drop-shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                />
              </div>
              <span className="font-extrabold tracking-wider text-xl text-white">
                GLOBAL<span className="text-blue-500">DRIVE</span>
              </span>
            </Link>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm font-light">
              {site.footerText}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-gradient-to-tr hover:from-purple-600 hover:to-pink-600 hover:text-white flex items-center justify-center text-slate-300 transition-colors border border-white/10"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href={site.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-blue-600 hover:text-white flex items-center justify-center text-slate-300 transition-colors border border-white/10"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.592 0 9 1.583 9 4.615V8z"/>
                </svg>
              </a>
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-emerald-600 hover:text-white flex items-center justify-center text-slate-300 transition-colors border border-white/10"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navigazione */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Navigazione
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-blue-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/catalogo" className="hover:text-blue-400 transition-colors">
                  Auto disponibili
                </Link>
              </li>
              <li>
                <Link href="/#showroom" className="hover:text-blue-400 transition-colors">
                  Chi siamo
                </Link>
              </li>
              <li>
                <Link href="/#contatti" className="hover:text-blue-400 transition-colors">
                  Contattaci
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 transition-colors">
                  <Lock className="w-3 h-3" />
                  <span>Area Amministrazione</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Servizi */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Cosa facciamo
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/catalogo" className="hover:text-blue-400 transition-colors">
                  Auto usate garantite
                </Link>
              </li>
              <li>
                <Link href="/servizi" className="hover:text-blue-400 transition-colors">
                  Auto su commissione
                </Link>
              </li>
              <li>
                <Link href="/servizi" className="hover:text-blue-400 transition-colors">
                  Conto vendita
                </Link>
              </li>
            </ul>
          </div>

          {/* Contatti */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Contatti & Orari
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>{site.location}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <a href={phoneHref} className="hover:text-white transition-colors">
                  {site.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <a href={`mailto:${site.email}`} className="hover:text-white transition-colors">
                  {site.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>{site.hours}<br />{site.hoursNote}</span>
              </li>
            </ul>
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Scrivici su WhatsApp
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>
            © {new Date().getFullYear()} {site.companyName} • {site.location}
            {site.vatNumber && ` • P.IVA ${site.vatNumber}`} • Tutti i diritti riservati.
          </p>

          <div className="flex items-center gap-6 sm:pr-20">
            <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Cookie Policy</a>
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1.5 text-blue-400 hover:text-white transition-colors"
            >
              <span>Torna su</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
