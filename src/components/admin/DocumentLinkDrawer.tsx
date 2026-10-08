"use client";

import React, { useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { useDossierEntries } from "./useDossierEntries";
import { DOCUMENT_CATEGORIES } from "@/lib/admin/constants";
import {
  ACCEPT_ATTR,
  deleteVehicleFile,
  formatBytes,
  saveVehicleFile,
  validateVehicleFile,
} from "@/lib/storage/vehicleFiles";
import type { DocumentCategory } from "@/types/admin";
import Drawer from "./ui/Drawer";
import { Field } from "./ui/Field";
import { inputCls, textareaCls } from "./ui/styles";
import { useToast } from "./ui/Toast";

const OTHER_SUGGESTIONS = [
  "Passaggio di proprietà",
  "Fattura di acquisto",
  "Revisione",
  "Assicurazione",
  "Foto e video",
  "Visura PRA",
];

type Mode = "file" | "link";

// Aggiunge un documento al dossier: un file caricato (PDF o immagine, finisce nell'archivio
// dei documenti: oggi nel browser, poi su Supabase) oppure il link a un file che sta già su
// Google Drive, che resta dov'è.
export default function DocumentLinkDrawer({
  carId,
  category: presetCategory,
  onClose,
}: {
  carId: string;
  category?: DocumentCategory;
  onClose: () => void;
}) {
  const { entries: cars } = useDossierEntries();
  const { addDocument } = useAdmin();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>("file");
  const [selectedCarId, setSelectedCarId] = useState(carId);
  const [category, setCategory] = useState<DocumentCategory>(presetCategory ?? "Libretto / DUC");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  // "Altro" è il tipo libero: qui il nome lo scegli tu (es. "Passaggio di proprietà").
  const isOther = category === "Altro";

  function scegliFile(f: File | null) {
    setFile(f);
    setErrore(f ? validateVehicleFile(f) : null);
  }

  async function submit() {
    const car = cars.find((c) => c.id === selectedCarId);
    if (!car) return;
    const carTitle = `${car.brand} ${car.model}`;

    if (mode === "link") {
      addDocument({
        carId: car.id,
        carTitle,
        title: title.trim() || category,
        category,
        source: "google_drive",
        fileUrl: url.trim(),
        notes: notes.trim() || undefined,
      });
      toast(`Documento collegato a ${carTitle}`);
      onClose();
      return;
    }

    if (!file) {
      setErrore("Scegli il file da caricare.");
      return;
    }
    const problema = validateVehicleFile(file);
    if (problema) {
      setErrore(problema);
      return;
    }
    setSaving(true);
    setErrore(null);
    let storagePath: string;
    try {
      storagePath = await saveVehicleFile(file, car.id);
    } catch (e) {
      setSaving(false);
      setErrore(e instanceof Error ? e.message : "Caricamento non riuscito, riprova.");
      return;
    }
    try {
      addDocument({
        carId: car.id,
        carTitle,
        title: title.trim() || (isOther ? file.name : category),
        category,
        source: "upload",
        storagePath,
        fileName: file.name,
        fileSize: formatBytes(file.size),
        notes: notes.trim() || undefined,
      });
    } catch (e) {
      await deleteVehicleFile(storagePath);
      throw e;
    }
    toast(`File aggiunto al dossier di ${carTitle}`);
    onClose();
  }

  return (
    <Drawer
      title="Aggiungi un documento"
      subtitle="Carica un file oppure incolla il link di Google Drive."
      submitLabel={mode === "file" ? (saving ? "Carico…" : "Carica") : "Collega"}
      submitDisabled={saving || (mode === "file" && Boolean(errore))}
      busy={saving}
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div role="tablist" aria-label="Come aggiungere il documento" className="inline-flex rounded-lg border border-adm-line bg-adm-bg p-1">
          {(
            [
              ["file", "Carica un file"],
              ["link", "Link di Google Drive"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => {
                setMode(id);
                setErrore(null);
              }}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === id ? "bg-adm-raised text-white shadow-sm" : "text-adm-muted hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Field label="Auto">
          <select
            required
            value={selectedCarId}
            onChange={(e) => setSelectedCarId(e.target.value)}
            className={inputCls}
          >
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand} {c.model} · {c.version}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tipo di documento">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            className={inputCls}
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === "Altro" ? "Altro (scegli tu il nome)" : c}
              </option>
            ))}
          </select>
        </Field>
        {isOther && (
          <Field label="Nome del documento">
            <input
              required={mode === "link"}
              list="document-title-suggestions"
              placeholder="es. Passaggio di proprietà"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
            <datalist id="document-title-suggestions">
              {OTHER_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
        )}

        {mode === "file" ? (
          <Field label="File" hint="PDF, JPG, PNG o WEBP, fino a 25 MB.">
            <input
              required
              type="file"
              accept={ACCEPT_ATTR}
              onChange={(e) => scegliFile(e.target.files?.[0] ?? null)}
              className={`${inputCls} cursor-pointer py-1.5 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-sm file:text-white`}
            />
          </Field>
        ) : (
          <Field label="Link di Google Drive">
            <input
              required
              type="url"
              placeholder="https://drive.google.com/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputCls}
            />
          </Field>
        )}
        {errore && (
          <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {errore}
          </p>
        )}

        {!isOther && (
          <Field label="Titolo (facoltativo)" hint={`Se vuoto: «${category}»`}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </Field>
        )}
        <Field label="Note (facoltative)">
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={textareaCls}
          />
        </Field>
      </div>
    </Drawer>
  );
}
