"use client";

import { useMemo } from "react";
import { useCars } from "@/context/CarContext";
import { useGestionale } from "@/context/GestionaleContext";
import type { Car } from "@/types/car";

// I documenti sono legati a un id: quello dell'auto nel catalogo oppure, per le auto fuori
// catalogo (appena acquistate, archiviate…), quello della scheda economica. Qui si
// mettono insieme in un unico elenco, con la scheda travestita da `Car` quanto basta
// per mostrarla nel dossier.
export function useDossierEntries() {
  const { cars } = useCars();
  const { veicoli } = useGestionale();

  return useMemo(() => {
    const idCatalogo = new Set(cars.map((c) => c.id));
    const fuori = veicoli
      .filter((v) => !v.carId || !idCatalogo.has(v.carId))
      .map<Car>((v) => ({
        id: v.id,
        brand: v.marca,
        model: v.modello || v.targa || "Auto senza nome",
        version: v.versione,
        year: v.dataAcquisto ? Number(v.dataAcquisto.slice(0, 4)) : 0,
        mileage: v.chilometraggio,
        price: v.prezzoVendita ?? 0,
        fuel: "Benzina",
        transmission: "Manuale",
        power: 0,
        category: "Utilitaria",
        images: [],
        featured: false,
        hidden: true,
        status: v.stato === "Venduta" ? "Venduta" : "Disponibile",
        description: "",
        features: [],
        location: "",
        createdAt: v.dataAcquisto,
      }));
    return {
      entries: [...cars, ...fuori],
      /** true se l'id è quello di una scheda economica senza auto nel catalogo. */
      isFuoriCatalogo: (id: string) => fuori.some((f) => f.id === id),
    };
  }, [cars, veicoli]);
}
