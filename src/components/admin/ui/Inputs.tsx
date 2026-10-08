"use client";

import React from "react";
import { inputCls } from "./styles";

// Campi che salvano quando si esce dal campo (non a ogni tasto): le schede con
// molti dati si compilano senza che ogni lettera finisca nello storico modifiche.
// `key` sul valore ricrea il campo se il dato cambia da fuori (es. dopo un annulla).

type BaseProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "onBlur" | "type"
>;

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
  return (
    <input
      key={value}
      type={type}
      defaultValue={value}
      onBlur={(e) => {
        if (e.target.value !== value) onCommit(e.target.value);
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
  return (
    <input
      key={value ?? "vuoto"}
      type="number"
      inputMode="decimal"
      defaultValue={value ?? ""}
      onBlur={(e) => {
        const raw = e.target.value.trim();
        const next = raw === "" ? (allowEmpty ? null : 0) : Number(raw);
        if (Number.isNaN(next) || next === value) return;
        onCommit(next);
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
