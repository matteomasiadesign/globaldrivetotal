"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import type { Car } from "@/types/car";

// Il link porta al catalogo con la scheda già aperta (vedi app/catalogo/page.tsx).
export const carShareUrl = (carId: string) =>
  `${window.location.origin}/catalogo?auto=${encodeURIComponent(carId)}`;

async function share(car: Car): Promise<"shared" | "copied" | "cancelled"> {
  const url = carShareUrl(car.id);
  const price = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(car.price);
  const title = `${car.brand} ${car.model} ${car.version}`;

  // Sul telefono si apre il menu di condivisione (WhatsApp, Instagram…); sul PC
  // si copia il link, che è quello che ci si aspetta.
  if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ title, text: `${title} · ${price} su Global Drive`, url });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    window.prompt("Copia il link della scheda:", url);
  }
  return "copied";
}

export function ShareCarButton({
  car,
  variant = "icon",
  className = "",
}: {
  car: Car;
  /** "icon": tondo, per le card. "full": con testo, per l'intestazione della scheda. */
  variant?: "icon" | "full";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function onClick(e: React.MouseEvent) {
    e.stopPropagation(); // sulle card non deve aprire la scheda
    if ((await share(car)) !== "copied") return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2200);
  }

  const Icon = copied ? Check : Share2;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? "Link copiato" : `Condividi ${car.brand} ${car.model}`}
      title="Condividi questo annuncio"
      className={`inline-flex cursor-pointer items-center justify-center gap-2 border transition-all ${
        copied
          ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
          : "border-white/15 bg-black/50 text-white hover:border-blue-500 hover:bg-blue-600"
      } ${
        variant === "icon"
          ? "size-9 rounded-full backdrop-blur-md"
          : "h-10 rounded-full px-4 text-xs font-bold uppercase tracking-wider"
      } ${className}`}
    >
      <Icon className="size-4" />
      {variant === "full" && <span className="hidden sm:inline">{copied ? "Link copiato" : "Condividi"}</span>}
    </button>
  );
}
