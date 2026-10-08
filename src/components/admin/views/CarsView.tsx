"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Calculator, CalendarPlus, Car as CarIcon, FolderOpen, Pencil, Plus, Receipt, Search, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAdmin } from "@/context/AdminContext";
import { useCars } from "@/context/CarContext";
import { useGestionale } from "@/context/GestionaleContext";
import { eur } from "@/lib/admin/constants";
import { computeVeicolo, euro, nomeVeicolo } from "@/lib/gestionale/calc";
import type { Car, CarStatus } from "@/types/car";
import { useEditors } from "../AdminEditors";
import { useUrlState } from "../useUrlState";
import { StatoPill } from "../ui/Data";
import { Switch } from "../ui/Field";
import { EmptyState, FilterTabs, PageHeader, Panel, type TabOption } from "../ui/Layout";
import RowMenu from "../ui/RowMenu";
import { btnPrimary, btnSecondary, focusRing, inputCls, rowDivider } from "../ui/styles";
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
  const { toggleFeatured, deleteCar } = useCars();
  const { deleteDocumentsOfCar, reassignDocuments, today } = useAdmin();
  const {
    veicoli,
    movimenti,
    impostazioni,
    schedaDellAuto,
    cambiaStatoCatalogo,
    impostaVisibilita,
    scollegaAuto,
  } = useGestionale();
  const { openCar, openAppointment } = useEditors();

  const hidden = Boolean(car.hidden);
  const name = `${car.brand} ${car.model}`;
  const scheda = veicoli.find((v) => v.carId === car.id);
  const conti = scheda ? computeVeicolo(scheda, movimenti, impostazioni, today) : null;
  const costo = conti?.costoTotale ?? 0;

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
        {costo > 0 && (
          <p className="text-xs tabular-nums text-adm-muted">
            costo {euro(costo)}
            {conti?.risultatoDopoIva != null && (
              <span className={conti.risultatoDopoIva >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {" "}
                · risultato {euro(conti.risultatoDopoIva)}
              </span>
            )}
          </p>
        )}
      </div>

      <select
        value={car.status}
        onChange={(e) => cambiaStatoCatalogo(car.id, e.target.value as CarStatus)}
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
          onChange={() => impostaVisibilita(car.id, !hidden)}
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
              label: "Scheda economica e contratto",
              icon: Calculator,
              onSelect: () => router.push(`/admin/auto/${schedaDellAuto(car).id}`),
            },
            {
              label: "Movimenti",
              icon: Receipt,
              onSelect: () => router.push(`/admin/movimenti?auto=${schedaDellAuto(car).id}`),
            },
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
              confirm: "Conferma: toglie l'auto dal sito",
              onSelect: () => {
                scollegaAuto(car.id);
                deleteCar(car.id);
                if (scheda) reassignDocuments(car.id, scheda.id);
                else deleteDocumentsOfCar(car.id);
                toast(
                  scheda
                    ? `${name} eliminata dal catalogo: la scheda economica e i documenti restano archiviati`
                    : `${name} eliminata`
                );
              },
            },
          ]}
        />
      </div>
    </div>
  );
}

export default function CarsView({ initialFilter }: { initialFilter?: CarFilter }) {
  const router = useRouter();
  const { cars } = useCars();
  const { veicoli, addVeicolo } = useGestionale();
  const { openCar } = useEditors();
  const [filter, setFilter] = useUrlState<CarFilter>("filtro", initialFilter ?? "tutte");
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
    .filter(
      (c) =>
        !q ||
        `${c.brand} ${c.model} ${c.version} ${c.year} ${veicoli.find((v) => v.carId === c.id)?.targa ?? ""}`
          .toLowerCase()
          .includes(q)
    );

  // Schede dei conti senza un'auto nel catalogo: appena acquistate, in preparazione o archiviate.
  const fuoriCatalogo = veicoli.filter((v) => !v.carId || !cars.some((c) => c.id === v.carId));

  return (
    <>
      <PageHeader
        title="Parco auto"
        description="Cosa è online sul sito, a che prezzo e in che stato."
        actions={
          <>
            <button
              type="button"
              onClick={() => router.push(`/admin/auto/${addVeicolo({ stato: "Acquistata" }).id}`)}
              className={btnSecondary}
            >
              <Calculator className="size-4" />
              <span className="hidden sm:inline">Auto fuori catalogo</span>
              <span className="sm:hidden">Fuori catalogo</span>
            </button>
            <button type="button" onClick={() => openCar()} className={btnPrimary}>
              <Plus className="size-4" />
              Aggiungi auto
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs tabs={tabs} value={filter} onChange={setFilter} label="Filtra auto" />
        <div className="relative w-full sm:w-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-adm-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca marca, modello o targa…"
            aria-label="Cerca auto"
            className={`${inputCls} pl-9 sm:w-60`}
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

      {fuoriCatalogo.length > 0 && (
        <div className="mt-8">
          <Panel title={`Fuori catalogo (${fuoriCatalogo.length})`}>
            <div className={rowDivider}>
              {fuoriCatalogo.map((v) => (
                <Link
                  key={v.id}
                  href={`/admin/auto/${v.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-white">{nomeVeicolo(v)}</span>
                    <span className="block truncate text-sm text-adm-muted">
                      {v.versione || "Scheda economica senza pubblicazione sul sito"}
                    </span>
                  </span>
                  <StatoPill stato={v.stato} />
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
