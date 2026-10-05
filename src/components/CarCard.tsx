"use client";

import React from "react";
import Image from "next/image";
import { Car } from "@/types/car";
import { ShareCarButton } from "@/components/ShareCarButton";
import {
  Gauge,
  Zap,
  Calendar,
  Fuel,
  ArrowUpRight,
  ShieldCheck,
  Star,
} from "lucide-react";

interface CarCardProps {
  car: Car;
  onSelect: (car: Car) => void;
}

export function CarCard({ car, onSelect }: CarCardProps) {
  const formattedPrice = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(car.price);

  const formattedMileage = new Intl.NumberFormat("it-IT").format(car.mileage);

  return (
    // The wrapper is a container: when the card gets wide (e.g. a lone car
    // filling the whole row) it switches to a horizontal layout.
    <div className="@container h-full">
    <div
      onClick={() => onSelect(car)}
      className="group relative flex h-full flex-col @2xl:flex-row rounded-3xl bg-[#0b1021]/90 border border-white/10 hover:border-blue-500/40 shadow-xl hover:shadow-2xl hover:shadow-blue-600/15 transition-all duration-300 overflow-hidden cursor-pointer"
    >
      {/* Image Container with Badges */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900 @2xl:aspect-auto @2xl:w-1/2 @2xl:min-h-[22rem] @2xl:shrink-0">
        <Image
          src={car.images[0]}
          alt={`${car.brand} ${car.model}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Subtle dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1021] via-transparent to-black/30" />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {car.featured && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600/90 text-white shadow-lg shadow-blue-600/30 backdrop-blur-md">
              <Star className="w-3 h-3 fill-white" />
              In Evidenza
            </span>
          )}

          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
              car.status === "Disponibile"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : car.status === "In Trattativa"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
            }`}
          >
            {car.status}
          </span>
        </div>

        <div className="absolute top-3 right-3">
          <ShareCarButton car={car} />
        </div>

        {/* Quick Location Tag */}
        <div className="absolute bottom-3 right-4">
          <span className="text-[11px] font-medium text-slate-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
            {car.location}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex-1 p-5 @2xl:p-8 flex flex-col justify-between space-y-4 @2xl:space-y-6">
        <div>
          <div className="flex items-center justify-between text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">
            <span>{car.brand}</span>
            <span className="text-slate-400">{car.category}</span>
          </div>

          <h3 className="text-lg font-extrabold text-white group-hover:text-blue-300 transition-colors duration-200 line-clamp-1">
            {car.model}
          </h3>

          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{car.version}</p>
        </div>

        {/* Technical Specs Pill Strip */}
        <div className="grid grid-cols-4 gap-1.5 py-2.5 px-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Anno</p>
            <p className="text-xs font-bold text-white mt-0.5">{car.year}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Km</p>
            <p className="text-xs font-bold text-white mt-0.5">{formattedMileage}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">CV</p>
            <p className="text-xs font-bold text-white mt-0.5">{car.power}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Alim.</p>
            <p className="text-xs font-bold text-white mt-0.5 truncate">{car.fuel}</p>
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Prezzo</p>
            <p className="text-xl font-black text-white tracking-tight">{formattedPrice}</p>
          </div>

          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/10 group-hover:bg-blue-600 text-blue-400 group-hover:text-white border border-blue-500/20 group-hover:border-blue-500 shadow-sm transition-all duration-300"
            aria-label="Vedi scheda auto"
          >
            <ArrowUpRight className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45" />
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
