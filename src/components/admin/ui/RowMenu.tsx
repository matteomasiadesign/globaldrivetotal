"use client";

import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { btnIcon } from "./styles";

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  /** Se presente serve un secondo clic: la voce diventa questo testo. */
  confirm?: string;
}

interface RowMenuProps {
  items: MenuItem[];
  label?: string;
  /** "top" apre il menu verso l'alto (per i menu in fondo alla pagina). */
  placement?: "bottom" | "top";
  align?: "right" | "left";
  trigger?: React.ReactNode;
  triggerClassName?: string;
}

// Menu "…" con conferma in linea per le azioni distruttive: niente finestre
// confirm() del browser, due clic sulla stessa voce e fatto.
export default function RowMenu({
  items,
  label = "Altre azioni",
  placement = "bottom",
  align = "right",
  trigger,
  triggerClassName,
}: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setArmed(null);
  }

  function select(item: MenuItem, index: number) {
    if (item.confirm && armed !== index) {
      setArmed(index);
      return;
    }
    close();
    item.onSelect();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className={triggerClassName ?? btnIcon}
      >
        {trigger ?? <MoreHorizontal className="size-4" />}
      </button>

      {open && (
        <div
          role="menu"
          className={`adm-rise absolute z-40 min-w-52 rounded-xl border border-adm-line bg-adm-raised p-1 shadow-2xl ${
            align === "right" ? "right-0" : "left-0"
          } ${placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
        >
          {items.map((item, i) => {
            const Icon = item.icon;
            const isArmed = armed === i;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => select(item, i)}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isArmed
                    ? "bg-rose-600 font-semibold text-white"
                    : item.danger
                      ? "text-rose-300 hover:bg-rose-500/15"
                      : "text-slate-200 hover:bg-white/8"
                }`}
              >
                {Icon && <Icon className="size-4 shrink-0 opacity-80" />}
                <span>{isArmed && item.confirm ? item.confirm : item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
