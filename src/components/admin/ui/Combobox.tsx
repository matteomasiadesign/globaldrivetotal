"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { normTesto } from "@/lib/import/normalizza";
import { inputCls } from "./styles";

export interface OpzioneCombo {
  value: string;
  label: string;
  /** Testo secondario (telefono, targa…), usato anche nella ricerca. */
  dettaglio?: string;
}

// Scelta da un elenco lungo (clienti, auto) scrivendo qualche lettera, al posto di una
// tendina da scorrere. Se non c'è, «Crea …» aggiunge al volo un nuovo elemento.
export default function Combobox({
  value,
  onChange,
  opzioni,
  placeholder = "Scrivi per cercare…",
  vuoto,
  onCrea,
  creaLabel = "Crea",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  opzioni: OpzioneCombo[];
  placeholder?: string;
  /** Testo della scelta "nessuno" (es. "— generale —"); senza, non si può svuotare. */
  vuoto?: string;
  /** Crea un elemento col testo scritto e restituisce il suo valore. */
  onCrea?: (testo: string) => string;
  creaLabel?: string;
  ariaLabel?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState("");
  const [attiva, setAttiva] = useState(0);
  const scelta = opzioni.find((o) => o.value === value);

  const filtrate = useMemo(() => {
    const parole = normTesto(testo).split(" ").filter(Boolean);
    const lista = parole.length
      ? opzioni.filter((o) => {
          const t = normTesto(`${o.label} ${o.dettaglio ?? ""}`);
          return parole.every((p) => t.includes(p));
        })
      : opzioni;
    return lista.slice(0, 60);
  }, [opzioni, testo]);

  const puoCreare = Boolean(onCrea && testo.trim() && !opzioni.some((o) => normTesto(o.label) === normTesto(testo)));
  const voci = [...(vuoto ? [{ value: "", label: vuoto }] : []), ...filtrate];
  const totale = voci.length + (puoCreare ? 1 : 0);

  function scegli(v: string) {
    onChange(v);
    setTesto("");
    setAperto(false);
  }

  function crea() {
    if (!onCrea) return;
    scegli(onCrea(testo.trim()));
  }

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setAperto(false);
          setTesto("");
        }
      }}
    >
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={aperto}
        aria-controls={listId}
        aria-label={ariaLabel}
        autoComplete="off"
        value={aperto ? testo : (scelta?.label ?? "")}
        placeholder={aperto ? (scelta?.label ?? placeholder) : vuoto && !scelta ? vuoto : placeholder}
        onFocus={() => {
          setAperto(true);
          setAttiva(0);
        }}
        onChange={(e) => {
          setTesto(e.target.value);
          setAperto(true);
          setAttiva(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAperto(true);
            setAttiva((i) => Math.min(i + 1, totale - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAttiva((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && aperto) {
            e.preventDefault();
            if (attiva < voci.length) scegli(voci[attiva].value);
            else if (puoCreare) crea();
          } else if (e.key === "Escape" && aperto) {
            e.stopPropagation();
            setAperto(false);
            setTesto("");
          }
        }}
        className={`${inputCls} pr-16 ${scelta && !aperto ? "text-white" : ""}`}
      />
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1">
        {scelta && vuoto && !aperto && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange("")}
            aria-label="Togli la scelta"
            className="pointer-events-auto grid size-6 cursor-pointer place-items-center rounded text-adm-muted hover:text-white"
          >
            <X className="size-3.5" />
          </button>
        )}
        <ChevronDown className="size-4 text-adm-muted" />
      </div>
      {aperto && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-adm-line bg-adm-raised p-1 shadow-2xl"
        >
          {voci.map((o, i) => (
            <li
              key={o.value || "_vuoto"}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setAttiva(i)}
              onClick={() => scegli(o.value)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                i === attiva ? "bg-blue-600/20 text-white" : o.value ? "text-slate-200" : "text-adm-muted"
              }`}
            >
              <span className="truncate">{o.label}</span>
              {"dettaglio" in o && o.dettaglio && <span className="shrink-0 truncate text-xs text-adm-muted">{o.dettaglio}</span>}
            </li>
          ))}
          {puoCreare && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setAttiva(voci.length)}
              onClick={crea}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-300 ${attiva === voci.length ? "bg-blue-600/20" : ""}`}
            >
              <Plus className="size-4" />
              {creaLabel} «{testo.trim()}»
            </li>
          )}
          {voci.length === 0 && !puoCreare && <li className="px-3 py-2 text-sm text-adm-muted">Nessun risultato</li>}
        </ul>
      )}
    </div>
  );
}
