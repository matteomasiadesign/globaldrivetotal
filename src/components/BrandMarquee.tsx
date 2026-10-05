import React from "react";
import { Reveal } from "@/components/ui/Reveal";

// Tutti i principali marchi presenti in Italia, esclusi quelli di lusso.
const BRANDS = [
  "Fiat",
  "Alfa Romeo",
  "Lancia",
  "Abarth",
  "Jeep",
  "Volkswagen",
  "Audi",
  "BMW",
  "Mercedes-Benz",
  "MINI",
  "Ford",
  "Opel",
  "Peugeot",
  "Citroën",
  "DS",
  "Renault",
  "Dacia",
  "Toyota",
  "Honda",
  "Nissan",
  "Mazda",
  "Suzuki",
  "Hyundai",
  "Kia",
  "Škoda",
  "SEAT",
  "CUPRA",
  "Volvo",
  "Land Rover",
  "Tesla",
  "MG",
  "smart",
];

export default function BrandMarquee() {
  return (
    <section
      aria-label="Marchi trattati"
      className="relative bg-[#060913] py-16 overflow-hidden border-t border-white/5"
    >
      <Reveal className="text-center px-4 mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-blue-400">
          Marchi trattati
        </p>
        <h2 className="mt-3 text-2xl sm:text-4xl font-black text-white tracking-tight">
          Tutti i marchi, <span className="text-slate-400">senza compromessi</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto text-pretty">
          Dalle utilitarie ai SUV, dalle elettriche alle berline: se la cerchi, te la troviamo.
        </p>
      </Reveal>

      <div className="brand-marquee-mask">
        <div className="brand-marquee-track">
          {/* The list is rendered twice so the loop is seamless. */}
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1}
              className="brand-marquee-list"
            >
              {BRANDS.map((brand) => (
                <li
                  key={brand}
                  className="px-8 sm:px-12 text-xl sm:text-2xl font-extrabold uppercase tracking-[0.12em] text-slate-500 hover:text-white transition-colors duration-300 whitespace-nowrap select-none"
                >
                  {brand}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
