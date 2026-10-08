"use client";

import React, { useMemo, useState } from "react";
import { useCars } from "@/context/CarContext";
import { useGestionale } from "@/context/GestionaleContext";
import { deleteCarPhoto, uploadCarPhoto } from "@/lib/storage/carPhotos";
import type {
  CarStatus,
  CategoryType,
  FuelType,
  TransmissionType,
} from "@/types/car";
import CarPhotosField, { newPhotoKey, type PhotoItem } from "./CarPhotosField";
import Drawer from "./ui/Drawer";
import { Field, Section, ToggleRow } from "./ui/Field";
import { inputCls, textareaCls } from "./ui/styles";
import { useToast } from "./ui/Toast";

interface CarForm {
  brand: string;
  model: string;
  version: string;
  price: string;
  year: string;
  mileage: string;
  power: string;
  fuel: FuelType;
  transmission: TransmissionType;
  category: CategoryType;
  location: string;
  description: string;
  features: string;
  status: CarStatus;
  visible: boolean;
  featured: boolean;
}

const FUELS: FuelType[] = ["Benzina", "Diesel", "Ibrida", "Elettrica"];
const TRANSMISSIONS: TransmissionType[] = ["Automatico", "Manuale"];
const CATEGORIES: CategoryType[] = [
  "Utilitaria",
  "Berlina",
  "SUV",
  "Station Wagon",
  "Monovolume",
  "Coupé",
  "Cabrio",
  "Sportiva",
];
const STATUSES: CarStatus[] = ["Disponibile", "In Trattativa", "Venduta"];

// Finché le auto stanno nel localStorage (circa 5 milioni di caratteri) le foto
// devono starci dentro: si avvisa prima di salvare invece di perderle in silenzio.
// Sparisce quando le foto passano al bucket Supabase.
const STORAGE_BUDGET_CHARS = 4_500_000;

export default function CarDrawer({
  carId,
  onClose,
}: {
  /** Se assente si crea una nuova auto. */
  carId?: string;
  onClose: () => void;
}) {
  const { cars, addCar, updateCar } = useCars();
  const { veicoli, updateVeicolo, schedaDellAuto, cambiaStatoCatalogo } = useGestionale();
  const toast = useToast();
  const car = cars.find((c) => c.id === carId);

  const [form, setForm] = useState<CarForm>(() => ({
    brand: car?.brand ?? "",
    model: car?.model ?? "",
    version: car?.version ?? "",
    price: car ? String(car.price) : "",
    year: car ? String(car.year) : String(new Date().getFullYear()),
    mileage: car ? String(car.mileage) : "",
    power: car ? String(car.power) : "",
    fuel: car?.fuel ?? "Benzina",
    transmission: car?.transmission ?? "Automatico",
    category: car?.category ?? "Sportiva",
    location: car?.location ?? cars[0]?.location ?? "",
    description: car?.description ?? "",
    features: car?.features.join(", ") ?? "",
    status: car?.status ?? "Disponibile",
    visible: car ? !car.hidden : true,
    featured: car?.featured ?? false,
  }));
  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    (car?.images ?? []).map((url) => ({ key: newPhotoKey(), url }))
  );
  const [saving, setSaving] = useState(false);

  const overBudget = useMemo(() => {
    const others = JSON.stringify(cars.filter((c) => c.id !== car?.id)).length;
    const mine = photos.reduce(
      (n, p) => n + (p.blob ? Math.ceil((p.blob.size * 4) / 3) + 40 : p.url.length),
      0
    );
    return others + mine > STORAGE_BUDGET_CHARS;
  }, [cars, car?.id, photos]);

  const set = <K extends keyof CarForm>(key: K, value: CarForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit() {
    if (photos.length === 0) {
      toast("Aggiungi almeno una foto: la prima sarà la copertina");
      return;
    }

    // Le foto nuove si caricano solo ora, così "Annulla" non lascia file orfani.
    setSaving(true);
    let images: string[];
    try {
      images = await Promise.all(
        photos.map((p) => (p.blob ? uploadCarPhoto(p.blob, car?.id ?? "nuova") : p.url))
      );
    } catch {
      setSaving(false);
      toast("Caricamento delle foto non riuscito, riprova");
      return;
    }
    const kept = new Set(photos.filter((p) => !p.blob).map((p) => p.url));
    const removed = (car?.images ?? []).filter((url) => !kept.has(url));
    await Promise.all(removed.map(deleteCarPhoto)).catch(() => {});

    const data = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      version: form.version.trim(),
      year: Number(form.year),
      mileage: Number(form.mileage),
      price: Number(form.price),
      fuel: form.fuel,
      transmission: form.transmission,
      power: Number(form.power),
      category: form.category,
      images,
      featured: form.visible && form.featured,
      hidden: !form.visible,
      status: form.status,
      description: form.description.trim(),
      features: form.features
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      location: form.location.trim(),
    };

    // Ogni auto del catalogo ha la sua scheda dei conti: dati tecnici e stato restano allineati.
    if (car) {
      updateCar(car.id, data);
      const scheda = veicoli.find((v) => v.carId === car.id);
      if (scheda) {
        updateVeicolo(scheda.id, {
          marca: data.brand,
          modello: data.model,
          versione: data.version,
          chilometraggio: data.mileage,
          alimentazione: data.fuel,
        });
        if (data.status !== car.status) cambiaStatoCatalogo(car.id, data.status);
      }
      toast(`${data.brand} ${data.model} aggiornata`);
    } else {
      schedaDellAuto(addCar(data));
      toast(`${data.brand} ${data.model} aggiunta al parco auto`);
    }
    onClose();
  }

  return (
    <Drawer
      title={car ? `${car.brand} ${car.model}` : "Nuova auto"}
      subtitle={car ? "Modifica scheda" : "Compila la scheda: apparirà nel catalogo se è visibile"}
      submitLabel={car ? "Salva modifiche" : "Aggiungi auto"}
      submitDisabled={saving || overBudget}
      onSubmit={submit}
      onClose={onClose}
      width="max-w-xl"
    >
      <Section title="Veicolo" columns={2}>
        <Field label="Marca">
          <input
            required
            autoFocus={!car}
            placeholder="Fiat"
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Modello">
          <input
            required
            placeholder="Panda"
            value={form.model}
            onChange={(e) => set("model", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Versione / allestimento" className="sm:col-span-2">
          <input
            required
            placeholder="1.0 FireFly Hybrid"
            value={form.version}
            onChange={(e) => set("version", e.target.value)}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Prezzo" columns={1}>
        <Field label="Prezzo di vendita (€)">
          <input
            required
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Dati tecnici" columns={3}>
        <Field label="Anno">
          <input
            required
            type="number"
            min={1990}
            max={new Date().getFullYear() + 1}
            value={form.year}
            onChange={(e) => set("year", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Chilometri">
          <input
            required
            type="number"
            min={0}
            value={form.mileage}
            onChange={(e) => set("mileage", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Potenza (CV)">
          <input
            required
            type="number"
            min={1}
            value={form.power}
            onChange={(e) => set("power", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Alimentazione">
          <select
            value={form.fuel}
            onChange={(e) => set("fuel", e.target.value as FuelType)}
            className={inputCls}
          >
            {FUELS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Cambio">
          <select
            value={form.transmission}
            onChange={(e) => set("transmission", e.target.value as TransmissionType)}
            className={inputCls}
          >
            {TRANSMISSIONS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Carrozzeria">
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value as CategoryType)}
            className={inputCls}
          >
            {CATEGORIES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Sede" className="sm:col-span-3">
          <input
            required
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Foto" columns={1}>
        <CarPhotosField photos={photos} onChange={setPhotos} />
        {overBudget && (
          <p className="text-xs text-amber-300" role="alert">
            Troppe foto per la memoria di prova del browser: togline qualcuna o elimina
            un&apos;auto di prova. Il limite sparirà con il salvataggio online.
          </p>
        )}
      </Section>

      <Section title="Descrizione" columns={1}>
        <Field label="Testo della scheda">
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={textareaCls}
          />
        </Field>
        <Field label="Dotazioni (separate da virgola)">
          <input
            value={form.features}
            onChange={(e) => set("features", e.target.value)}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="Pubblicazione" columns={1}>
        <Field label="Stato">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as CarStatus)}
            className={inputCls}
          >
            {STATUSES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <ToggleRow
          title="Visibile nel catalogo"
          description="Se spento resta solo in admin e non compare sul sito."
          checked={form.visible}
          onChange={(v) => set("visible", v)}
        />
        <ToggleRow
          title="In vetrina in home"
          description={
            form.visible
              ? "Compare nella sezione in evidenza della home page."
              : "Disponibile solo per le auto visibili nel catalogo."
          }
          checked={form.visible && form.featured}
          onChange={(v) => set("featured", v)}
        />
      </Section>
    </Drawer>
  );
}
