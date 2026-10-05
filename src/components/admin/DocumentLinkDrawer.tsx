"use client";

import React, { useState } from "react";
import { useAdmin } from "@/context/AdminContext";
import { useCars } from "@/context/CarContext";
import { DOCUMENT_CATEGORIES } from "@/lib/admin/constants";
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

// Collega all'auto un file (o una cartella) che sta già su Google Drive: qui si
// salva solo il link, il file resta dove sta.
export default function DocumentLinkDrawer({
  carId,
  category: presetCategory,
  onClose,
}: {
  carId: string;
  category?: DocumentCategory;
  onClose: () => void;
}) {
  const { cars } = useCars();
  const { addDocument } = useAdmin();
  const toast = useToast();

  const [selectedCarId, setSelectedCarId] = useState(carId);
  const [category, setCategory] = useState<DocumentCategory>(presetCategory ?? "Libretto / DUC");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  // "Altro" è il tipo libero: qui il nome lo scegli tu (es. "Passaggio di proprietà").
  const isOther = category === "Altro";

  function submit() {
    const car = cars.find((c) => c.id === selectedCarId);
    if (!car) return;
    addDocument({
      carId: car.id,
      carTitle: `${car.brand} ${car.model}`,
      title: title.trim() || category,
      category,
      source: "google_drive",
      fileUrl: url.trim(),
      notes: notes.trim() || undefined,
    });
    toast(`Documento collegato a ${car.brand} ${car.model}`);
    onClose();
  }

  return (
    <Drawer
      title="Collega un documento"
      subtitle="Incolla il link di Google Drive: il file resta su Drive."
      submitLabel="Collega"
      onSubmit={submit}
      onClose={onClose}
    >
      <div className="space-y-3">
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
              required
              autoFocus
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
        <Field label="Link di Google Drive">
          <input
            required
            autoFocus={!isOther}
            type="url"
            placeholder="https://drive.google.com/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputCls}
          />
        </Field>
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
