"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, Mail, Pencil, Phone, Plus, Search, Trash2, Upload, Users } from "lucide-react";
import { foglioContatti } from "@/lib/export/gestionale";
import { nomeFile, scaricaXlsx } from "@/lib/export/scrivi";
import ExportMenu, { useContestoExport } from "../ui/ExportMenu";
import { useUrlState } from "../useUrlState";
import { ImportaContatti } from "./import/Importa";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { telLink } from "@/lib/admin/phone";
import type { Contatto, TipoContatto } from "@/lib/gestionale/types";
import { useEditors } from "../AdminEditors";
import { EmptyState, FilterTabs, PageHeader, Pill, type TabOption } from "../ui/Layout";
import DataTable from "../ui/DataTable";
import { btnPrimary, btnSecondary, focusRing, inputCls } from "../ui/styles";
import { useToast } from "../ui/Toast";

type Filtro = "tutti" | TipoContatto;

export default function ContattiView() {
  const { today } = useAdmin();
  const { contatti, veicoli, deleteContatto } = useGestionale();
  const { openContatto } = useEditors();
  const toast = useToast();
  const ctx = useContestoExport();
  const [filtro, setFiltro] = useUrlState<Filtro>("tipo", "tutti");
  const [query, setQuery] = useState("");
  const [importa, setImporta] = useState(false);

  // «Entrambi» compare tra i clienti e tra i fornitori.
  const matchTipo = (c: Contatto, f: Filtro) => f === "tutti" || c.tipo === f || c.tipo === "Entrambi";
  const tabs: TabOption<Filtro>[] = [
    { id: "tutti", label: "Tutti", count: contatti.length },
    { id: "Cliente", label: "Clienti", count: contatti.filter((c) => matchTipo(c, "Cliente")).length },
    { id: "Fornitore", label: "Fornitori", count: contatti.filter((c) => matchTipo(c, "Fornitore")).length },
  ];

  // Chi ha venduto o comprato un'auto resta in anagrafica: è la controparte della scheda e del contratto.
  function elimina(lista: Contatto[]) {
    const bloccati = lista.filter((c) => veicoli.some((v) => v.fornitoreId === c.id || v.acquirenteId === c.id));
    const eliminabili = lista.filter((c) => !bloccati.includes(c));
    const annulla = eliminabili.map((c) => deleteContatto(c.id));
    const msg = [
      eliminabili.length === 1
        ? `${eliminabili[0].nome || "Contatto"} eliminato`
        : eliminabili.length
          ? `${eliminabili.length} contatti eliminati`
          : "",
      bloccati.length === 1
        ? `${bloccati[0].nome || "Un contatto"} resta: è collegato a un'auto come fornitore o acquirente`
        : bloccati.length
          ? `${bloccati.length} restano perché collegati ad auto come fornitore o acquirente`
          : "",
    ].filter(Boolean).join(" · ");
    toast(msg, eliminabili.length ? { label: "Annulla", onClick: () => annulla.reverse().forEach((a) => a()) } : undefined);
  }

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
          <>
            <ExportMenu
              nome={nomeFile("Contatti", filtro === "tutti" ? undefined : filtro)}
              fogli={() => [foglioContatti(visibili, ctx, false)]}
              extra={[
                {
                  // Patente e documento sono dati personali: si esportano solo se servono davvero.
                  label: "Excel con patente e documento",
                  icon: FileSpreadsheet,
                  onSelect: () => void scaricaXlsx([foglioContatti(visibili, ctx, true)], nomeFile("Contatti_documenti")),
                },
              ]}
            />
            <button type="button" onClick={() => setImporta(true)} className={btnSecondary}>
              <Upload className="size-4" />
              <span className="hidden sm:inline">Importa</span>
            </button>
            <button type="button" onClick={() => openContatto()} className={btnPrimary}>
              <Plus className="size-4" />
              Nuovo contatto
            </button>
          </>
        }
      />
      {importa && <ImportaContatti onClose={() => setImporta(false)} />}

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

      <DataTable
        etichetta="Contatti"
        righe={visibili}
        chiave={(c) => c.id}
        onApri={(c) => openContatto({ contattoId: c.id })}
        ordineIniziale={{ id: "nome", verso: "asc" }}
        vuoto={
          <EmptyState
            icon={Users}
            title={contatti.length === 0 ? "L'anagrafica è vuota" : "Nessun contatto trovato"}
            description={
              contatti.length === 0 ? "I clienti dei contratti vengono salvati qui in automatico; puoi anche importarli da Excel." : undefined
            }
            action={
              contatti.length === 0 ? (
                <button type="button" onClick={() => openContatto()} className={btnPrimary}>
                  <Plus className="size-4" />
                  Nuovo contatto
                </button>
              ) : undefined
            }
          />
        }
        colonne={[
          {
            id: "nome",
            titolo: "Nome",
            cella: (c) => (
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium text-white">{c.nome || "Senza nome"}</span>
                {c.scadenzaPatente && c.scadenzaPatente < today && <Pill tone="red">Patente scaduta</Pill>}
              </span>
            ),
            ordina: (c) => c.nome.toLowerCase(),
            mobile: "titolo",
          },
          {
            id: "tipo",
            titolo: "Tipo",
            cella: (c) => <Pill tone={c.tipo === "Cliente" ? "blue" : c.tipo === "Fornitore" ? "amber" : "slate"}>{c.tipo}</Pill>,
            ordina: (c) => c.tipo,
            mobile: "destra",
          },
          {
            id: "telefono",
            titolo: "Telefono",
            cella: (c) =>
              c.telefono ? (
                <a href={telLink(c.telefono)} onClick={(e) => e.stopPropagation()} className={`inline-flex items-center gap-1.5 rounded hover:text-white ${focusRing}`}>
                  <Phone className="size-3.5 text-adm-muted" />
                  {c.telefono}
                </a>
              ) : (
                <span className="text-adm-muted">—</span>
              ),
            mobile: "sotto",
          },
          {
            id: "email",
            titolo: "Email",
            cella: (c) =>
              c.email ? (
                <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className={`inline-flex max-w-[14rem] items-center gap-1.5 truncate rounded hover:text-white ${focusRing}`}>
                  <Mail className="size-3.5 shrink-0 text-adm-muted" />
                  <span className="truncate">{c.email}</span>
                </a>
              ) : (
                <span className="text-adm-muted">—</span>
              ),
            mobile: "nascosta",
          },
          {
            id: "auto",
            titolo: "Auto",
            destra: true,
            cella: (c) => {
              const n = veicoli.filter((v) => v.fornitoreId === c.id || v.acquirenteId === c.id).length;
              return n ? n : <span className="text-adm-muted">—</span>;
            },
            ordina: (c) => veicoli.filter((v) => v.fornitoreId === c.id || v.acquirenteId === c.id).length,
            mobile: "nascosta",
          },
        ]}
        azioni={(c) => [
          { label: "Apri scheda", icon: Pencil, onSelect: () => openContatto({ contattoId: c.id }) },
          {
            label: "Elimina",
            icon: Trash2,
            danger: true,
            confirm: "Conferma: elimina",
            onSelect: () => elimina([c]),
          },
        ]}
        azioniMultiple={[
          {
            label: "Esporta",
            icon: Download,
            esegui: (righe) => void scaricaXlsx([foglioContatti(righe, ctx, false)], nomeFile("Contatti_selezionati")),
          },
          { label: "Elimina", icon: Trash2, danger: true, esegui: elimina },
        ]}
      />
    </>
  );
}
