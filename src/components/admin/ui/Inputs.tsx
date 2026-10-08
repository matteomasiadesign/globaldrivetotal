"use client";

import React, { useState } from "react";
import { inputCls } from "./styles";

// Campi che salvano quando si esce dal campo (non a ogni tasto): le schede con
// molti dati si compilano senza che ogni lettera finisca nello storico modifiche.
// Mentre si scrive il campo tiene una bozza; quando il dato salvato cambia (o resta
// quello di prima perché il valore è stato rifiutato o normalizzato) la bozza si
// riallinea, così il campo mostra sempre ciò che è davvero salvato.

type BaseProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "onBlur" | "type"
>;

/** Bozza di un campo: parte dal valore salvato e lo riprende quando questo cambia. */
function useDraft<T extends string | number>(value: T) {
  const [draft, setDraft] = useState<string>(String(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setDraft(String(value));
  }
  return [draft, setDraft] as const;
}

export function TextField({
  value,
  onCommit,
  type = "text",
  className = inputCls,
  ...rest
}: BaseProps & {
  value: string;
  onCommit: (value: string) => void;
  type?: "text" | "date" | "email" | "tel";
}) {
  const [draft, setDraft] = useDraft(value);
  return (
    <input
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        const next = type === "text" ? e.target.value.trim() : e.target.value;
        if (next !== value) onCommit(next);
        // Se il dato salvato non cambia (rifiutato o già uguale) si torna a mostrarlo.
        setDraft(value);
      }}
      className={className}
      {...rest}
    />
  );
}

export function NumberField({
  value,
  onCommit,
  allowEmpty = false,
  className = inputCls,
  ...rest
}: BaseProps & {
  value: number | null;
  /** Con `allowEmpty` un campo vuoto diventa `null` invece di 0. */
  onCommit: (value: number | null) => void;
  allowEmpty?: boolean;
}) {
  const [draft, setDraft] = useDraft(value ?? "");
  return (
    <input
      type="number"
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        const raw = e.target.value.trim();
        // Un testo non valido ("1e") arriva come stringa vuota: non va letto come 0.
        const valido = e.target.validity.valid;
        const next = raw === "" ? (allowEmpty ? null : 0) : Number(raw);
        if (valido && !(typeof next === "number" && Number.isNaN(next)) && next !== value) onCommit(next);
        setDraft(String(value ?? ""));
      }}
      className={className}
      {...rest}
    />
  );
}

export function SelectField<T extends string>({
  value,
  options,
  onChange,
  className = inputCls,
  blank,
  ...rest
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & {
  value: T | "";
  options: readonly T[] | { value: T; label: string }[];
  onChange: (value: T) => void;
  /** Voce vuota iniziale, ad esempio "— nessuna —". */
  blank?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={className}
      {...rest}
    >
      {blank !== undefined && <option value="">{blank}</option>}
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        );
      })}
    </select>
  );
}
