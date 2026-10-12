"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { btnIcon, btnPrimary, btnSecondary } from "./styles";

interface DrawerProps {
  title: string;
  subtitle?: string;
  submitLabel: string;
  submitDisabled?: boolean;
  /** Salvataggio in corso: Esc, sfondo e «Annulla» non chiudono il pannello. */
  busy?: boolean;
  onSubmit: () => void;
  onClose: () => void;
  /** Classe di larghezza massima, es. "max-w-xl". */
  width?: string;
  children: React.ReactNode;
}

// Pannello laterale per creare/modificare: la pagina sotto resta visibile, quindi
// non si perde il contesto come con un modale a tutto schermo. Il form è nel
// pannello, con i pulsanti sempre visibili in fondo.
//
// Si monta direttamente nel <body>, così sta sopra a tutto (anche alla barra in basso
// su telefono) da qualunque pagina venga aperto. Se si è scritto qualcosa, chiuderlo
// senza salvare (Esc, sfondo, X, Annulla) chiede prima conferma.
export default function Drawer({
  title,
  subtitle,
  submitLabel,
  submitDisabled,
  busy = false,
  onSubmit,
  onClose,
  width = "max-w-lg",
  children,
}: DrawerProps) {
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  // Qualcosa è stato modificato nel form: chiudere senza salvare va confermato.
  const dirtyRef = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const confirmingRef = useRef(false);

  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
    confirmingRef.current = confirming;
  });

  const requestClose = () => {
    if (busyRef.current) return;
    if (dirtyRef.current && !confirmingRef.current) {
      setConfirming(true);
      return;
    }
    closeRef.current();
  };
  const requestCloseRef = useRef(requestClose);
  useEffect(() => {
    requestCloseRef.current = requestClose;
  });

  // Apre col focus dentro il pannello e lo restituisce a chiusura. Su telefono il focus va al
  // pannello e non al primo campo, altrimenti la tastiera si apre subito e copre il form.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const form = formRef.current;
    if (form && !form.contains(document.activeElement)) {
      const desktop = window.matchMedia("(pointer: fine)").matches;
      const campo = desktop ? form.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea") : null;
      (campo ?? form).focus();
    }
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const markDirty = (e: React.SyntheticEvent) => {
    // Anche gli interruttori (pulsanti role="switch") contano come modifiche.
    const t = e.target as HTMLElement;
    if (e.type === "click" && !t.closest('[role="switch"], [aria-pressed]')) return;
    dirtyRef.current = true;
    if (confirmingRef.current) setConfirming(false);
  };

  const panel = (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div
        className="adm-fade-in absolute inset-0 bg-black/60"
        onClick={requestClose}
        aria-hidden="true"
      />
      <form
        ref={formRef}
        tabIndex={-1}
        onInputCapture={markDirty}
        onChangeCapture={markDirty}
        onClickCapture={markDirty}
        // Tab non esce dal pannello: dall'ultimo elemento si torna al primo e viceversa.
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const campi = Array.from(
            e.currentTarget.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          );
          if (campi.length === 0) return;
          const primo = campi[0];
          const ultimo = campi[campi.length - 1];
          if (e.shiftKey && (document.activeElement === primo || document.activeElement === e.currentTarget)) {
            e.preventDefault();
            ultimo.focus();
          } else if (!e.shiftKey && document.activeElement === ultimo) {
            e.preventDefault();
            primo.focus();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        // Ctrl/Cmd+S salva come il pulsante principale.
        onKeyDownCapture={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
            e.preventDefault();
            if (!submitDisabled && !busy) e.currentTarget.requestSubmit();
          }
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
            onClick={requestClose}
            disabled={busy}
            className={btnIcon}
            aria-label="Chiudi"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">{children}</div>

        {confirming ? (
          <footer
            role="alertdialog"
            aria-label="Modifiche non salvate"
            className="flex flex-wrap items-center justify-end gap-2 border-t border-amber-500/40 bg-amber-500/10 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <p className="mr-auto text-sm text-amber-200">Hai modifiche non salvate.</p>
            <button type="button" onClick={() => setConfirming(false)} className={btnSecondary} autoFocus>
              Continua a modificare
            </button>
            <button type="button" onClick={onClose} className={btnSecondary}>
              Chiudi senza salvare
            </button>
          </footer>
        ) : (
          <footer className="flex items-center justify-end gap-2 border-t border-adm-line bg-adm-surface px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={requestClose} disabled={busy} className={btnSecondary}>
              Annulla
            </button>
            <button type="submit" disabled={submitDisabled} className={btnPrimary}>
              {submitLabel}
            </button>
          </footer>
        )}
      </form>
    </div>
  );

  return createPortal(panel, document.body);
}
