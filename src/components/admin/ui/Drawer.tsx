"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { btnIcon, btnPrimary, btnSecondary } from "./styles";

interface DrawerProps {
  title: string;
  subtitle?: string;
  submitLabel: string;
  submitDisabled?: boolean;
  onSubmit: () => void;
  onClose: () => void;
  /** Classe di larghezza massima, es. "max-w-xl". */
  width?: string;
  children: React.ReactNode;
}

// Pannello laterale per creare/modificare: la pagina sotto resta visibile, quindi
// non si perde il contesto come con un modale a tutto schermo. Il form è nel
// pannello, con i pulsanti sempre visibili in fondo.
export default function Drawer({
  title,
  subtitle,
  submitLabel,
  submitDisabled,
  onSubmit,
  onClose,
  width = "max-w-lg",
  children,
}: DrawerProps) {
  const titleId = useId();
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="adm-fade-in absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className={`adm-slide-in relative flex h-full w-full ${width} flex-col border-l border-adm-line bg-adm-surface shadow-2xl`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-adm-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-white">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-sm text-adm-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={btnIcon}
            aria-label="Chiudi"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">{children}</div>

        <footer className="flex items-center justify-end gap-2 border-t border-adm-line bg-adm-surface px-5 py-3">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Annulla
          </button>
          <button type="submit" disabled={submitDisabled} className={btnPrimary}>
            {submitLabel}
          </button>
        </footer>
      </form>
    </div>
  );
}
