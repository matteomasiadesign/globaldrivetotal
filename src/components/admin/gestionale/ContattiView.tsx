"use client";

import React, { useState } from "react";
import { Mail, Pencil, Phone, Plus, Search, Trash2, Users } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { telLink } from "@/lib/admin/phone";
import type { Contatto, TipoContatto } from "@/lib/gestionale/types";
import { useEditors } from "../AdminEditors";
import { EmptyState, FilterTabs, PageHeader, Pill, type TabOption } from "../ui/Layout";
import RowMenu from "../ui/RowMenu";
import { btnPrimary, focusRing, inputCls, rowDivider } from "../ui/styles";
import { useToast } from "../ui/Toast";

type Filtro = "tutti" | TipoContatto;

export default function ContattiView() {
  const { today } = useAdmin();
  const { contatti, deleteContatto } = useGestionale();
  const { openContatto } = useEditors();
  const toast = useToast();
  const [filtro, setFiltro] = useState<Filtro>("tutti");
  const [query, setQuery] = useState("");

  // «Entrambi» compare tra i clienti e tra i fornitori.
  const matchTipo = (c: Contatto, f: Filtro) => f === "tutti" || c.tipo === f || c.tipo === "Entrambi";
  const tabs: TabOption<Filtro>[] = [
    { id: "tutti", label: "Tutti", count: contatti.length },
    { id: "Cliente", label: "Clienti", count: contatti.filter((c) => matchTipo(c, "Cliente")).length },
    { id: "Fornitore", label: "Fornitori", count: contatti.filter((c) => matchTipo(c, "Fornitore")).length },
  ];

  const q = query.trim().toLowerCase();
  const visibili = contatti
    .filter((c) => matchTipo(c, filtro))
    .filter((c) => !q || `${c.nome} ${c.telefono} ${c.email}`.toLowerCase().includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));

  return (
    <>
      <PageHeader
        title="Contatti"
        description="Clienti e fornitori in un'unica anagrafica: servono ai contratti, ai movimenti e al noleggio."
        actions={
          <button type="button" onClick={() => openContatto()} className={btnPrimary}>
            <Plus className="size-4" />
            Nuovo contatto
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs tabs={tabs} value={filtro} onChange={setFiltro} label="Filtra contatti" />
        <div className="relative w-full sm:w-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-adm-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca nome, telefono, email…"
            aria-label="Cerca contatto"
            className={`${inputCls} pl-9 sm:w-64`}
          />
        </div>
      </div>

      {visibili.length === 0 ? (
        <EmptyState
          icon={Users}
          title={contatti.length === 0 ? "L'anagrafica è vuota" : "Nessun contatto trovato"}
          description={contatti.length === 0 ? "I clienti dei contratti vengono salvati qui in automatico." : undefined}
        />
      ) : (
        <div className={`rounded-xl border border-adm-line bg-adm-surface ${rowDivider}`}>
          {visibili.map((c) => {
            const patenteScaduta = Boolean(c.scadenzaPatente && c.scadenzaPatente < today);
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => openContatto({ contattoId: c.id })}
                  className={`min-w-0 flex-1 cursor-pointer rounded text-left ${focusRing}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium text-white">{c.nome || "Senza nome"}</span>
                    <Pill tone={c.tipo === "Cliente" ? "blue" : c.tipo === "Fornitore" ? "amber" : "slate"}>{c.tipo}</Pill>
                    {patenteScaduta && <Pill tone="red">Patente scaduta</Pill>}
                  </span>
                  <span className="block truncate text-sm text-adm-muted">
                    {[c.telefono, c.email, c.residenza].filter(Boolean).join(" · ") || "Nessun recapito"}
                  </span>
                </button>
                {c.telefono && (
                  <a href={telLink(c.telefono)} aria-label={`Chiama ${c.nome}`} className="grid size-8 place-items-center rounded-lg text-adm-muted hover:bg-white/10 hover:text-white">
                    <Phone className="size-4" />
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} aria-label={`Scrivi a ${c.nome}`} className="grid size-8 place-items-center rounded-lg text-adm-muted hover:bg-white/10 hover:text-white">
                    <Mail className="size-4" />
                  </a>
                )}
                <RowMenu
                  label={`Azioni per ${c.nome}`}
                  items={[
                    { label: "Modifica", icon: Pencil, onSelect: () => openContatto({ contattoId: c.id }) },
                    {
                      label: "Elimina",
                      icon: Trash2,
                      danger: true,
                      confirm: "Conferma: elimina",
                      onSelect: () => {
                        deleteContatto(c.id);
                        toast(`${c.nome || "Contatto"} eliminato`);
                      },
                    },
                  ]}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
