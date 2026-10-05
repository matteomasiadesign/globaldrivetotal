"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { compressPhoto, formatBytes, PhotoError } from "@/lib/images/compress";

export const MAX_PHOTOS = 12;

/** Una foto della scheda: già salvata (url remoto/dati) o appena scelta (blob da caricare al salvataggio). */
export interface PhotoItem {
  key: string;
  url: string;
  blob?: Blob;
}

let counter = 0;
export const newPhotoKey = () => `p${Date.now()}-${counter++}`;

export default function CarPhotosField({
  photos,
  onChange,
}: {
  photos: PhotoItem[];
  onChange: (next: PhotoItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [saved, setSaved] = useState<{ before: number; after: number }>({ before: 0, after: 0 });

  // Stato aggiornato per le callback asincrone e per ripulire gli object URL.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  });
  useEffect(
    () => () => {
      photosRef.current.forEach((p) => p.blob && URL.revokeObjectURL(p.url));
    },
    []
  );

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;

    const errors: string[] = [];
    const room = MAX_PHOTOS - photosRef.current.length;
    if (files.length > room) {
      errors.push(
        room > 0
          ? `Massimo ${MAX_PHOTOS} foto per auto: ne aggiungo solo ${room}.`
          : `Hai già ${MAX_PHOTOS} foto: togline una per aggiungerne altre.`
      );
    }

    setBusy(true);
    const added: PhotoItem[] = [];
    let before = 0;
    let after = 0;
    for (const file of files.slice(0, Math.max(room, 0))) {
      try {
        const result = await compressPhoto(file);
        before += result.originalBytes;
        after += result.blob.size;
        added.push({ key: newPhotoKey(), url: URL.createObjectURL(result.blob), blob: result.blob });
      } catch (e) {
        errors.push(e instanceof PhotoError ? e.message : `Errore con "${file.name}".`);
      }
    }
    setBusy(false);
    setMessages(errors);
    if (added.length) {
      setSaved({ before, after });
      onChange([...photosRef.current, ...added]);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(key: string) {
    const target = photos.find((p) => p.key === key);
    if (target?.blob) URL.revokeObjectURL(target.url);
    onChange(photos.filter((p) => p.key !== key));
  }

  function makeCover(key: string) {
    const target = photos.find((p) => p.key === key);
    if (!target) return;
    onChange([target, ...photos.filter((p) => p.key !== key)]);
  }

  const full = photos.length >= MAX_PHOTOS;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!full) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!full) void addFiles(e.dataTransfer.files);
        }}
        className={`rounded-lg border border-dashed px-4 py-5 text-center transition-colors ${
          dragging ? "border-blue-400 bg-blue-500/10" : "border-adm-line bg-adm-bg"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => e.target.files && void addFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={busy || full}
          onClick={() => inputRef.current?.click()}
          className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {busy ? "Comprimo le foto…" : "Carica foto dal computer"}
        </button>
        <p className="mt-1 text-xs text-adm-muted">
          Anche trascinandole qui. Vengono ridimensionate e compresse in automatico
          ({photos.length}/{MAX_PHOTOS}).
        </p>
        {saved.before > 0 && !busy && (
          <p className="mt-1 text-xs text-emerald-300">
            Ultimo caricamento: {formatBytes(saved.before)} → {formatBytes(saved.after)}
          </p>
        )}
      </div>

      {messages.length > 0 && (
        <ul className="space-y-0.5 text-xs text-amber-300" role="alert">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p, i) => (
            <li
              key={p.key}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-adm-line bg-adm-bg"
            >
              <Image
                src={p.url}
                alt={`Foto ${i + 1}`}
                fill
                unoptimized
                sizes="160px"
                className="object-cover"
              />
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                  Copertina
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(p.key)}
                  title="Usa come copertina"
                  aria-label={`Usa la foto ${i + 1} come copertina`}
                  className="absolute left-1 top-1 grid size-6 cursor-pointer place-items-center rounded bg-black/70 text-white opacity-100 transition-opacity hover:bg-blue-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <Star className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(p.key)}
                title="Rimuovi foto"
                aria-label={`Rimuovi la foto ${i + 1}`}
                className="absolute right-1 top-1 grid size-6 cursor-pointer place-items-center rounded bg-black/70 text-white transition-colors hover:bg-rose-600"
              >
                <X className="size-3.5" />
              </button>
              {p.blob && (
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-slate-200">
                  {formatBytes(p.blob.size)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
