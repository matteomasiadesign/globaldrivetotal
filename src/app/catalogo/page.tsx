"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCars } from "@/context/CarContext";
import { CarCard } from "@/components/CarCard";
import { CarDetailModal } from "@/components/CarDetailModal";
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  LayoutGrid,
  List,
  Sparkles,
  Car as CarIcon,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";

function CatalogoContent() {
  const searchParams = useSearchParams();
  const { cars } = useCars();
  // Link condivisibile: /catalogo?auto=<id> apre direttamente la scheda.
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("auto"));
  const selectedCar = cars.find((c) => c.id === selectedId && !c.hidden) ?? null;

  // Filters state
  const initialBrand = searchParams.get("brand") || "";
  const initialCategory = searchParams.get("category") || "";
  const initialMaxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : 300000;

  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState(initialBrand);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [fuelFilter, setFuelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "year-desc" | "km-asc">("price-desc");

  // Filter logic
  const filteredCars = useMemo(() => {
    return cars
      .filter((car) => !car.hidden)
      .filter((car) => {
        const matchesSearch =
          searchTerm === "" ||
          `${car.brand} ${car.model} ${car.version}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        const matchesBrand = brandFilter === "" || car.brand === brandFilter;
        const matchesCategory = categoryFilter === "" || car.category === categoryFilter;
        const matchesFuel = fuelFilter === "" || car.fuel === fuelFilter;
        const matchesStatus = statusFilter === "" || car.status === statusFilter;
        const matchesPrice = car.price <= maxPrice;

        return (
          matchesSearch &&
          matchesBrand &&
          matchesCategory &&
          matchesFuel &&
          matchesStatus &&
          matchesPrice
        );
      })
      .sort((a, b) => {
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "year-desc") return b.year - a.year;
        if (sortBy === "km-asc") return a.mileage - b.mileage;
        return 0;
      });
  }, [cars, searchTerm, brandFilter, categoryFilter, fuelFilter, statusFilter, maxPrice, sortBy]);

  const publicCars = useMemo(() => cars.filter((c) => !c.hidden), [cars]);
  const uniqueBrands = Array.from(new Set(publicCars.map((c) => c.brand)));
  const uniqueCategories = Array.from(new Set(publicCars.map((c) => c.category)));
  const uniqueFuels = Array.from(new Set(publicCars.map((c) => c.fuel)));

  // Filtri attivi (ricerca esclusa, è sempre visibile): serve al badge del toggle mobile.
  const activeFilters = [
    brandFilter !== "",
    categoryFilter !== "",
    fuelFilter !== "",
    statusFilter !== "",
    maxPrice < 300000,
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSearchTerm("");
    setBrandFilter("");
    setCategoryFilter("");
    setFuelFilter("");
    setStatusFilter("");
    setMaxPrice(300000);
    setSortBy("price-desc");
  };

  return (
    <div className="pt-24 sm:pt-28 pb-24 min-h-screen bg-[#060913] text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title & Breadcrumb */}
        <div className="mb-6 sm:mb-10 text-center sm:text-left">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Catalogo Vetture
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-xl">
            Tutte le auto sono visionabili in sede, coperte da garanzia totale e subito disponibili per il ritiro.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-white/10 mb-8 sm:mb-10 space-y-4 sm:space-y-5 bg-[#0a1024]/90">
          {/* Top Row: Search input & quick buttons */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca marca o modello…"
                className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
              <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-slate-400 md:flex-none">
                <span className="hidden sm:inline">Ordina:</span>
                <CustomSelect
                  value={sortBy}
                  onChange={(val) => setSortBy(val as any)}
                  options={[
                    { value: "price-desc", label: "Prezzo: Più alto" },
                    { value: "price-asc", label: "Prezzo: Più basso" },
                    { value: "year-desc", label: "Anno: Più recente" },
                    { value: "km-asc", label: "Chilometri: Minori" },
                  ]}
                  className="min-w-0 flex-1 md:w-40 md:flex-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                aria-controls="catalogo-filtri"
                className="md:hidden flex h-10 shrink-0 items-center gap-1.5 px-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                <span>Filtri</span>
                {activeFilters > 0 && (
                  <span className="grid min-w-4 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-4 text-white">
                    {activeFilters}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
              </button>

              <button
                onClick={handleResetFilters}
                className="flex h-10 shrink-0 items-center gap-1.5 px-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
                title="Azzera filtri"
                aria-label="Azzera filtri"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Dropdown Filters & Price Slider */}
          <div
            id="catalogo-filtri"
            className={`${filtersOpen ? "grid" : "hidden"} md:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-4 border-t border-white/10`}
          >
            {/* Brand */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Marca
              </label>
              <CustomSelect
                value={brandFilter}
                onChange={(val) => setBrandFilter(val)}
                options={[
                  { value: "", label: "Tutte le marche" },
                  ...uniqueBrands.map((b) => ({ value: b, label: b })),
                ]}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Carrozzeria
              </label>
              <CustomSelect
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                options={[
                  { value: "", label: "Tutti i modelli" },
                  ...uniqueCategories.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>

            {/* Fuel */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Alimentazione
              </label>
              <CustomSelect
                value={fuelFilter}
                onChange={(val) => setFuelFilter(val)}
                options={[
                  { value: "", label: "Tutte" },
                  ...uniqueFuels.map((f) => ({ value: f, label: f })),
                ]}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Disponibilità
              </label>
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: "", label: "Tutti gli stati" },
                  { value: "Disponibile", label: "Solo Disponibili" },
                  { value: "In Trattativa", label: "In Trattativa" },
                  { value: "Venduta", label: "Vendute" },
                ]}
              />
            </div>

            {/* Max Price Range Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Prezzo Max
                </label>
                <span className="text-xs font-bold text-blue-400">
                  € {new Intl.NumberFormat("it-IT").format(maxPrice)}
                </span>
              </div>
              <input
                type="range"
                min="50000"
                max="300000"
                step="10000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Results Counter & Grid */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Trovate <span className="text-white font-extrabold">{filteredCars.length}</span> vetture
          </p>
        </div>

        {filteredCars.length === 0 ? (
          <div className="p-8 sm:p-16 rounded-3xl glass-panel text-center space-y-4 border border-white/10">
            <CarIcon className="w-12 h-12 text-slate-500 mx-auto stroke-1" />
            <h3 className="text-xl font-bold text-white">Nessuna vettura trovata</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Nessun veicolo soddisfa i criteri di ricerca selezionati. Prova a modificare i filtri o premi reset.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-all"
            >
              Azzera Tutti i Filtri
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredCars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onSelect={(c) => setSelectedId(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Interactive Detail Modal */}
      <CarDetailModal
        car={selectedCar}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

export default function CatalogoPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-32 pb-24 min-h-screen bg-[#060913] text-center text-slate-400">
          <p>Caricamento catalogo vetture...</p>
        </div>
      }
    >
      <CatalogoContent />
    </Suspense>
  );
}
