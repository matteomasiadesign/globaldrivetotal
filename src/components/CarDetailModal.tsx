"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Car } from "@/types/car";
import { submitLead } from "@/lib/leads/client";
import { Honeypot } from "@/components/ui/Honeypot";
import { ShareCarButton } from "@/components/ShareCarButton";
import { useSite } from "@/context/SiteContext";
import {
  X,
  Gauge,
  Zap,
  Calendar,
  Fuel,
  MapPin,
  CheckCircle,
  Phone,
  MessageSquare,
  Shield,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";

interface CarDetailModalProps {
  car: Car | null;
  onClose: () => void;
}

// Il modale vive in document.body: dentro alle pagine finiva sotto la navbar
// (stacking context delle sezioni) e il titolo risultava tagliato.
export function CarDetailModal({ car, onClose }: CarDetailModalProps) {
  if (!car) return null;
  // key: ogni auto riparte dalla prima foto e da un form pulito.
  return createPortal(<CarDetail key={car.id} car={car} onClose={onClose} />, document.body);
}

function CarDetail({ car, onClose }: { car: Car; onClose: () => void }) {
  const { phoneHref, whatsappUrl } = useSite();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [testDriveSuccess, setTestDriveSuccess] = useState(false);
  const [testDriveSending, setTestDriveSending] = useState(false);
  const [testDriveError, setTestDriveError] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });

  const imageCount = car.images.length;
  const goPrev = () => setActiveImageIndex((i) => (i === 0 ? imageCount - 1 : i - 1));
  const goNext = () => setActiveImageIndex((i) => (i === imageCount - 1 ? 0 : i + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (imageCount > 1 && e.key === "ArrowLeft") {
        setActiveImageIndex((i) => (i === 0 ? imageCount - 1 : i - 1));
      } else if (imageCount > 1 && e.key === "ArrowRight") {
        setActiveImageIndex((i) => (i === imageCount - 1 ? 0 : i + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, imageCount]);

  const handleTestDriveSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setTestDriveError(false);
    setTestDriveSending(true);

    const saved = await submitLead(
      {
        type: "test_drive",
        name: formData.name,
        phone: formData.phone,
        carId: car.id,
        carLabel: `${car.brand} ${car.model} (${car.year})`,
        message: "Richiesta di test drive o preventivo dalla scheda auto.",
      },
      form
    );

    setTestDriveSending(false);
    if (!saved) {
      setTestDriveError(true);
      return;
    }
    setTestDriveSuccess(true);
    setFormData({ name: "", phone: "", email: "", notes: "" });
    setTimeout(() => {
      setTestDriveSuccess(false);
    }, 4000);
  };

  const formattedPrice = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(car.price);

  const formattedMileage = new Intl.NumberFormat("it-IT").format(car.mileage);

  const whatsappMessage = (
    `Salve, vorrei avere maggiori informazioni sulla vettura: ${car.brand} ${car.model} (${car.year}) - Prezzo: ${formattedPrice}. È ancora disponibile per un appuntamento o test drive?`
  );

  const specs = [
    { icon: Calendar, label: "Anno", value: String(car.year) },
    { icon: Gauge, label: "Chilometraggio", value: `${formattedMileage} km` },
    { icon: Zap, label: "Potenza", value: `${car.power} CV` },
    { icon: Fuel, label: "Alimentazione", value: car.fuel },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 sm:items-center sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${car.brand} ${car.model}`}
        className="relative flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-[#0b1021] shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0d142b] px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400">
              {car.brand} • {car.category}
            </span>
            <h2 className="truncate text-lg font-black text-white sm:text-2xl">
              {car.brand} {car.model}
            </h2>
            <p className="truncate text-xs text-slate-400">{car.version}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ShareCarButton car={car} variant="full" />
            <button
              onClick={onClose}
              className="size-10 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10"
              aria-label="Chiudi finestra"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
            {/* Gallery */}
            <div className="space-y-3 lg:col-span-3">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900 sm:aspect-[3/2]">
                <Image
                  src={car.images[activeImageIndex] || car.images[0]}
                  alt={`${car.brand} ${car.model}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 640px"
                  className="object-cover"
                  priority
                />

                {imageCount > 1 && (
                  <>
                    <div className="pointer-events-none absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
                      <button
                        onClick={goPrev}
                        aria-label="Foto precedente"
                        className="pointer-events-auto p-2 rounded-full bg-black/60 hover:bg-blue-600 text-white backdrop-blur-md transition-all"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={goNext}
                        aria-label="Foto successiva"
                        className="pointer-events-auto p-2 rounded-full bg-black/60 hover:bg-blue-600 text-white backdrop-blur-md transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                      {activeImageIndex + 1} / {imageCount}
                    </span>
                  </>
                )}

                {/* Status pill */}
                <div className="absolute top-3 left-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md ${
                      car.status === "Disponibile"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : car.status === "In Trattativa"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    }`}
                  >
                    {car.status}
                  </span>
                </div>
              </div>

              {/* Thumbnail selector */}
              {imageCount > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {car.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      aria-label={`Mostra foto ${idx + 1}`}
                      className={`relative w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                        activeImageIndex === idx
                          ? "border-blue-500 ring-2 ring-blue-500/30"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`Miniatura ${idx + 1}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price & Action Box */}
            <aside className="glass-panel flex flex-col space-y-6 self-start rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e1633] to-[#0a1024] p-5 sm:p-6 lg:sticky lg:top-0 lg:col-span-2 lg:row-span-2">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Prezzo di Vendita</span>
                <p className="text-3xl font-black text-white mt-1">{formattedPrice}</p>
              </div>

              {/* Direct Actions */}
              <div className="space-y-3">
                <a
                  href={whatsappUrl(whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chiedi Info su WhatsApp</span>
                </a>

                <a
                  href={phoneHref}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all"
                >
                  <Phone className="w-4 h-4" />
                  <span>Chiamaci</span>
                </a>
              </div>

              {/* Quick Test Drive Booking Form */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs font-bold uppercase tracking-wider text-white mb-2 flex items-center gap-2">
                  <span>Richiedi Test Drive o Preventivo</span>
                </p>

                {testDriveSuccess ? (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-medium">
                    ✓ Richiesta inviata! Ti ricontatteremo entro 30 minuti.
                  </div>
                ) : (
                  <form onSubmit={handleTestDriveSubmit} className="relative space-y-2">
                    <Honeypot />
                    <input
                      type="text"
                      placeholder="Nome e Cognome"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full text-xs bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="tel"
                      placeholder="Telefono cellulare"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full text-xs bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    {testDriveError && (
                      <p className="text-[11px] text-rose-300" role="alert">
                        Invio non riuscito. Riprova oppure scrivici su WhatsApp.
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={testDriveSending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-all shadow-md shadow-blue-600/30"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{testDriveSending ? "Invio in corso..." : "Invia Richiesta"}</span>
                    </button>
                  </form>
                )}
              </div>
            </aside>

            {/* Specs, description & equipment */}
            <div className="space-y-6 lg:col-span-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {specs.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5"
                  >
                    <div className="rounded-xl bg-blue-500/10 p-2 text-blue-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[10px] text-slate-400 uppercase font-semibold">{label}</p>
                      <p className="truncate text-sm font-bold text-white">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {car.description && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Descrizione Veicolo</h3>
                  <p className="text-sm text-slate-300 leading-relaxed bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    {car.description}
                  </p>
                </div>
              )}

              {car.features.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">Dotazioni & Optional Principali</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {car.features.map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 text-xs text-slate-200 bg-white/5 px-3.5 py-2 rounded-xl border border-white/5"
                      >
                        <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-2xl border border-blue-500/20 bg-blue-950/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 shrink-0 text-blue-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Garanzia legale di conformità</p>
                    <p className="text-[11px] text-slate-400">Possibilità di garanzie aggiuntive personalizzate e assistenza dopo l&apos;acquisto.</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span>{car.location}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
