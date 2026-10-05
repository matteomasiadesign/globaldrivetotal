"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CalendarPlus, Car as CarIcon, FolderOpen, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useCars } from "@/context/CarContext";
import { eur } from "@/lib/admin/constants";
import type { Car, CarStatus } from "@/types/car";
import { useEditors } from "../AdminEditors";
import { Switch } from "../ui/Field";
import { EmptyState, FilterTabs, PageHeader, type TabOption } from "../ui/Layout";
import RowMenu from "../ui/RowMenu";
import { btnPrimary, btnSecondary, focusRing, inputCls } from "../ui/styles";
import { useToast } from "../ui/Toast";

export type CarFilter = "tutte" | "disponibili" | "trattativa" | "vendute" | "nascoste";

const STATUSES: CarStatus[] = ["Disponibile", "In Trattativa", "Venduta"];

const STATUS_TEXT: Record<CarStatus, string> = {
  Disponibile: "text-emerald-300",
  "In Trattativa": "text-amber-300",
  Venduta: "text-slate-400",
};

const matches = (car: Car, filter: CarFilter) => {
  switch (filter) {
    case "disponibili":
      return car.status === "Disponibile";
    case "trattativa":
      return car.status === "In Trattativa";
    case "vendute":
      return car.status === "Venduta";
    case "nascoste":
      return Boolean(car.hidden);
    default:
      return true;
  }
};

const GRID =
  "md:grid-cols-[minmax(0,1fr)_6.5rem_9rem_4rem_4rem_2rem] md:items-center";

function CarRow({ car }: { car: Car }) {
  const router = useRouter();
  const toast = useToast();
  const { updateCar, toggleHidden, toggleFeatured, deleteCar } = useCars();
  const { deleteDocumentsOfCar } = useAdmin();
  const { openCar, openAppointment } = useEditors();

  const hidden = Boolean(car.hidden);
  const name = `${car.brand} ${car.model}`;

  return (
    <div className={`relative grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 ${GRID}`}>
      <div className="col-span-2 flex min-w-0 items-center gap-3 pr-10 md:col-span-1 md:pr-0">
        <div
          className={`relative h-11 w-16 shrink-0 overflow-hidden rounded-md border border-adm-line bg-adm-bg ${hidden ? "opacity-50" : ""}`}
        >
          {car.images[0] && (
            <Image src={car.images[0]} alt="" fill unoptimized className="object-cover" />
          )}
        </div>
        <button
          type="button"
          onClick={() => openCar(car.id)}
          className={`min-w-0 cursor-pointer rounded text-left ${focusRing}`}
        >
          <span className="block truncate font-medium text-white">{name}</span>
          <span className="block truncate text-sm text-adm-muted">
            {car.version} · {car.year} · {new Intl.NumberFormat("it-IT").format(car.mileage)} km
          </span>
        </button>
      </div>

      <div>
        <p className="font-medium tabular-nums text-white">{eur(car.price)}</p>
      </div>

      <select
        value={car.status}
        onChange={(e) => updateCar(car.id, { status: e.target.value as CarStatus })}
        aria-label={`Stato di ${name}`}
        className={`${inputCls} ${STATUS_TEXT[car.status]} font-medium`}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s} className="text-white">
            {s}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2 md:justify-center">
        <span className="text-xs text-adm-muted md:hidden">Nel catalogo</span>
        <Switch
          compact
          checked={!hidden}
          onChange={() => toggleHidden(car.id)}
          label={hidden ? `Rendi visibile ${name} nel catalogo` : `Nascondi ${name} dal catalogo`}
        />
      </div>

      <div className="flex items-center gap-2 md:justify-center">
        <span className="text-xs text-adm-muted md:hidden">In vetrina</span>
        <button
          type="button"
          disabled={hidden}
          onClick={() => toggleFeatured(car.id)}
          aria-pressed={car.featured && !hidden}
          aria-label={car.featured ? `Togli ${name} dalla vetrina` : `Metti ${name} in vetrina`}
          title={
            hidden
              ? "Rendi prima visibile l'auto nel catalogo"
              : car.featured
                ? "In vetrina in home: clic per togliere"
                : "Metti in vetrina in home"
          }
          className={`grid size-8 cursor-pointer place-items-center rounded-lg transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 ${focusRing}`}
        >
          <Star
            className={`size-4.5 ${
              car.featured && !hidden ? "fill-amber-400 text-amber-400" : "text-adm-muted"
            }`}
          />
        </button>
      </div>

      <div className="absolute right-3 top-3 md:static md:justify-self-end">
        <RowMenu
          label={`Azioni per ${name}`}
          items={[
            { label: "Modifica scheda", icon: Pencil, onSelect: () => openCar(car.id) },
            {
              label: "Documenti",
              icon: FolderOpen,
              onSelect: () => router.push(`/admin/documenti?auto=${car.id}`),
            },
            {
              label: "Fissa appuntamento",
              icon: CalendarPlus,
              onSelect: () =>
                openAppointment({
                  prefill: { carId: car.id, carName: name, location: car.location },
                }),
            },
            {
              label: "Elimina auto",
              icon: Trash2,
              danger: true,
              confirm: "Conferma: elimina anche i documenti",
              onSelect: () => {
                deleteCar(car.id);
                deleteDocumentsOfCar(car.id);
                toast(`${name} eliminata`);
              },
            },
          ]}
        />
      </div>
    </div>
  );
}

export default function CarsView({ initialFilter }: { initialFilter?: CarFilter }) {
  const { cars } = useCars();
  const { openCar } = useEditors();
  const [filter, setFilter] = useState<CarFilter>(initialFilter ?? "tutte");
  const [query, setQuery] = useState("");

  const count = (f: CarFilter) => cars.filter((c) => matches(c, f)).length;
  const tabs: TabOption<CarFilter>[] = [
    { id: "tutte", label: "Tutte", count: count("tutte") },
    { id: "disponibili", label: "Disponibili", count: count("disponibili") },
    { id: "trattativa", label: "In trattativa", count: count("trattativa") },
    { id: "vendute", label: "Vendute", count: count("vendute") },
    { id: "nascoste", label: "Nascoste", count: count("nascoste") },
  ];

  const q = query.trim().toLowerCase();
  const visible = cars
    .filter((c) => matches(c, filter))
    .filter((c) => !q || `${c.brand} ${c.model} ${c.version} ${c.year}`.toLowerCase().includes(q));

  return (
    <>
      <PageHeader
        title="Parco auto"
        description="Cosa è online sul sito, a che prezzo e in che stato."
        actions={
          <button type="button" onClick={() => openCar()} className={btnPrimary}>
            <Plus className="size-4" />
            Aggiungi auto
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs tabs={tabs} value={filter} onChange={setFilter} label="Filtra auto" />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-adm-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca marca o modello…"
            aria-label="Cerca auto"
            className={`${inputCls} w-60 pl-9`}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={CarIcon}
          title={cars.length === 0 ? "Il parco auto è vuoto" : "Nessuna auto trovata"}
          description={
            cars.length === 0
              ? "Aggiungi la prima auto per mostrarla nel catalogo."
              : "Prova a cambiare filtro o ricerca."
          }
          action={
            cars.length === 0 ? (
              <button type="button" onClick={() => openCar()} className={btnSecondary}>
                Aggiungi auto
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-adm-line bg-adm-surface">
          <div
            className={`hidden gap-x-4 border-b border-adm-line px-4 py-2.5 text-xs font-medium text-adm-muted md:grid ${GRID}`}
          >
            <span>Auto</span>
            <span>Prezzo</span>
            <span>Stato</span>
            <span className="text-center">Catalogo</span>
            <span className="text-center">Vetrina</span>
            <span />
          </div>
          <div className="divide-y divide-adm-line">
            {visible.map((car) => (
              <CarRow key={car.id} car={car} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
