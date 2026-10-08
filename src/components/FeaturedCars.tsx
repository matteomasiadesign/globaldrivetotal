"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useCars } from "@/context/CarContext";
import { CarCard } from "./CarCard";
import { CarDetailModal } from "./CarDetailModal";
import { Car } from "@/types/car";
import {
  Sparkles,
  ArrowRight,
  Search,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Reveal } from "@/components/ui/Reveal";

const HOME_CARS_LIMIT = 3;

// 6-column grid: cards share the row evenly, so 1 or 2 cars fill the space
// left by the missing ones. On md the third car takes the full row.
const SPANS_BY_COUNT: Record<number, string[]> = {
  1: ["md:col-span-6"],
  2: ["md:col-span-3", "md:col-span-3"],
  3: [
    "md:col-span-3 lg:col-span-2",
    "md:col-span-3 lg:col-span-2",
    "md:col-span-6 lg:col-span-2",
  ],
};

export default function FeaturedCars() {
  const { cars } = useCars();
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const publicCars = useMemo(
    () =>
      cars
        .filter((c) => !c.hidden && c.status === "Disponibile")
        .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))),
    [cars],
  );
  const uniqueBrands = Array.from(new Set(publicCars.map((c) => c.brand)));

  // Filtered cars for Home section
  const filteredCars = useMemo(() => {
    return publicCars.filter((car) => {
      const matchesSearch =
        searchTerm === "" ||
        `${car.brand} ${car.model} ${car.version}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesBrand = brandFilter === "" || car.brand === brandFilter;

      let matchesCategory = true;
      if (categoryFilter === "Utilitaria") {
        matchesCategory = car.category === "Utilitaria" || car.category === "Berlina";
      } else if (categoryFilter === "SUV") {
        matchesCategory = car.category === "SUV";
      } else if (categoryFilter === "Eco") {
        matchesCategory = car.fuel === "Elettrica" || car.fuel === "Ibrida";
      }

      return matchesSearch && matchesBrand && matchesCategory;
    });
  }, [publicCars, searchTerm, brandFilter, categoryFilter]);

  // Home only teases the first few cars; the rest lives in /catalogo
  const displayCars = filteredCars.slice(0, HOME_CARS_LIMIT);
  const hiddenCount = filteredCars.length - displayCars.length;
  const spans = SPANS_BY_COUNT[displayCars.length] ?? [];

  return (
    <section
      id="catalogo"
      className="relative z-20 -mt-16 sm:-mt-24 pt-24 sm:pt-28 pb-16 sm:pb-24 bg-[#060913] rounded-t-[2.5rem] sm:rounded-t-[3.5rem] border-t border-white/[0.08] shadow-[0_-30px_70px_rgba(0,0,0,0.9)] overflow-hidden scroll-mt-12"
    >
      {/* Top subtle highlight line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Top mist feathering overlay */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#060913] to-transparent pointer-events-none z-0" />

      {/* Background ambient subtle glow */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <Reveal>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Le Nostre Vetture in Stock
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mt-2 text-pretty">
              Auto usate selezionate e controllate, con garanzia legale di conformità
              <br className="hidden sm:inline" /> e possibilità di consegna a domicilio.
            </p>
          </Reveal>

          {/* Quick Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                categoryFilter === "all"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Tutte ({publicCars.length})
            </button>
            <button
              onClick={() => setCategoryFilter("Utilitaria")}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                categoryFilter === "Utilitaria"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Utilitarie & Berline
            </button>
            <button
              onClick={() => setCategoryFilter("SUV")}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                categoryFilter === "SUV"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              SUV
            </button>
            <button
              onClick={() => setCategoryFilter("Eco")}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                categoryFilter === "Eco"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Elettriche & Ibride
            </button>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <div className="glass-panel p-4 rounded-2xl border border-white/10 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0a1024]/80">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca modello o versione..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <CustomSelect
              value={brandFilter}
              onChange={(val) => setBrandFilter(val)}
              options={[
                { value: "", label: "Tutte le marche" },
                ...uniqueBrands.map((b) => ({ value: b, label: b })),
              ]}
              className="flex-1 sm:w-44 sm:flex-none"
            />

            {(searchTerm || brandFilter || categoryFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setBrandFilter("");
                  setCategoryFilter("all");
                }}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Azzera filtri"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Cars Grid */}
        {displayCars.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 sm:gap-8">
            {displayCars.map((car, i) => (
              <div key={car.id} className={spans[i]}>
                <Reveal delay={i * 0.12} className="h-full">
                  <CarCard car={car} onSelect={(c) => setSelectedCar(c)} />
                </Reveal>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-slate-400 py-12">
            Nessuna vettura disponibile per i filtri selezionati.
          </p>
        )}

        {/* Bottom CTA to Full Catalog */}
        <Reveal className="mt-14 text-center">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-blue-500/50 shadow-xl transition-all group"
          >
            <span>
              {hiddenCount > 0
                ? `Scopri altre ${hiddenCount} ${hiddenCount === 1 ? "vettura" : "vetture"} nel Catalogo Completo`
                : "Apri il Catalogo Completo con Filtri Avanzati"}
            </span>
            <ArrowRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Reveal>
      </div>

      {/* Interactive Detail Modal */}
      <CarDetailModal
        car={selectedCar}
        onClose={() => setSelectedCar(null)}
      />
    </section>
  );
}
