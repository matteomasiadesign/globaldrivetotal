"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { CarProvider } from "@/context/CarContext";
import { SiteProvider } from "@/context/SiteContext";
import CasperChat from "@/components/CasperChat";
import { CarDetailModal } from "@/components/CarDetailModal";
import { Car } from "@/types/car";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [selectedModalCar, setSelectedModalCar] = useState<Car | null>(null);
  const isAdmin = usePathname()?.startsWith("/admin");

  return (
    <SiteProvider>
    <CarProvider>
      {children}
      {!isAdmin && <CasperChat onSelectCar={(car) => setSelectedModalCar(car)} />}
      <CarDetailModal
        car={selectedModalCar}
        onClose={() => setSelectedModalCar(null)}
      />
    </CarProvider>
    </SiteProvider>
  );
}
