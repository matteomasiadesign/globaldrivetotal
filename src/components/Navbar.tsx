"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSite } from "@/context/SiteContext";
import {
  Menu,
  X,
  Settings,
  Clock,
  MessageCircle,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { site, whatsappUrl } = useSite();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Menu aperto: la pagina sotto non deve scorrere, Esc lo chiude.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  const handleScrollToSection = (id: string) => {
    if (pathname === "/") {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.location.href = `/#${id}`;
  };

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-[#060913]/90 backdrop-blur-xl border-b border-white/10 py-3 sm:py-4 shadow-2xl"
            : "bg-gradient-to-b from-black/80 via-black/30 to-transparent py-4 sm:py-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 flex items-center justify-between gap-3">
          {/* Logo Originale Awwwards Style */}
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            <div className="relative w-9 h-9 flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.webp"
                alt="Global Drive Logo"
                fill
                priority
                className="object-contain drop-shadow-[0_0_12px_rgba(37,99,235,0.6)]"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-wider text-white uppercase flex items-center gap-1 leading-none">
                GLOBAL<span className="text-blue-500">DRIVE</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.3em] text-slate-400 font-semibold mt-1">
                {site.tagline}
              </span>
            </div>
          </Link>

          {/* Clean Navigation: Veicoli | Chi siamo | Parla con noi | Noleggia */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {/* 1. Veicoli */}
            <button
              onClick={() => handleScrollToSection("catalogo")}
              className="text-xs sm:text-sm font-semibold tracking-wider text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Veicoli
            </button>

            {/* 2. Chi siamo */}
            <button
              onClick={() => handleScrollToSection("showroom")}
              className="text-xs sm:text-sm font-semibold tracking-wider text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Chi siamo
            </button>

            {/* 3. Parla con noi */}
            <button
              onClick={() => handleScrollToSection("contatti")}
              className="text-xs sm:text-sm font-semibold tracking-wider text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Parla con noi</span>
            </button>

            {/* 4. Noleggia (con popup in hover "Presto disponibile") */}
            <div className="relative group">
              <button
                type="button"
                className="relative text-xs sm:text-sm font-semibold tracking-wider text-slate-300 hover:text-white transition-all px-3.5 py-1.5 rounded-full border border-white/10 hover:border-blue-400/50 hover:bg-white/5 cursor-pointer backdrop-blur-md flex items-center gap-1.5"
              >
                <span>Noleggia</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400/80 animate-ping"></span>
              </button>

              {/* Popup Tooltip in Hover */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 w-48 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 pointer-events-none transition-all duration-200 ease-out z-50">
                <div className="relative glass-panel p-3 rounded-2xl border border-blue-500/30 bg-[#0b1024]/95 shadow-2xl shadow-blue-900/50 text-center">
                  {/* Freccia tooltip posizionata correttamente sul bordo superiore */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#0b1024] border-t border-l border-blue-500/30 rotate-45 pointer-events-none" />

                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <Clock className="w-3 h-3" />
                    <span>In arrivo</span>
                  </div>
                  <p className="text-xs font-bold text-white">Presto disponibile</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                    Servizio di noleggio a breve e lungo termine attivo a breve.
                  </p>
                </div>
              </div>
            </div>
          </nav>

          {/* Right: Admin shortcut & Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
              title="Area Gestionale"
            >
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              <span>Admin</span>
            </Link>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="grid size-11 place-items-center rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all hover:border-white/20"
              aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Minimal Fullscreen Slide-out Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-[#060913]/95 backdrop-blur-2xl flex flex-col justify-between gap-8 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:p-16 pt-24 sm:pt-28 animate-in fade-in duration-300">
          <div className="max-w-xl mx-auto w-full space-y-6 text-center my-auto">
            <p className="text-[11px] uppercase tracking-[0.3em] text-blue-400 font-bold">
              Menu Navigazione
            </p>
            <div className="space-y-4">
              <Link
                href="/catalogo"
                onClick={() => setMenuOpen(false)}
                className="block w-full py-1 text-2xl sm:text-4xl font-extrabold text-white hover:text-blue-400 transition-colors"
              >
                Catalogo
              </Link>
              <Link
                href="/servizi"
                onClick={() => setMenuOpen(false)}
                className="block w-full py-1 text-2xl sm:text-4xl font-extrabold text-white hover:text-blue-400 transition-colors"
              >
                Servizi
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleScrollToSection("showroom");
                }}
                className="block w-full py-1 text-2xl sm:text-4xl font-extrabold text-white hover:text-blue-400 transition-colors"
              >
                Chi siamo
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleScrollToSection("contatti");
                }}
                className="block w-full py-1 text-2xl sm:text-4xl font-extrabold text-white hover:text-blue-400 transition-colors"
              >
                Parla con noi
              </button>
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="block text-xl sm:text-2xl font-bold text-blue-400 hover:text-blue-300 transition-colors pt-4 border-t border-white/10"
              >
                Pannello Admin
              </Link>
            </div>
          </div>

          <div className="max-w-xl mx-auto w-full pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <p>{site.location}</p>
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-400 font-bold">
              Scrivici su WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}
