"use client";

import React, { useState } from "react";
import { Inbox, Search } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { LEAD_TYPE_LABEL } from "@/lib/admin/constants";
import type { Lead, LeadType } from "@/types/lead";
import LeadRow from "../LeadRow";
import { useUrlState } from "../useUrlState";
import { EmptyState, FilterTabs, PageHeader, type TabOption } from "../ui/Layout";
import { inputCls } from "../ui/styles";

export type LeadTab = "nuovo" | "in_gestione" | "chiuse";

const matchesTab = (lead: Lead, tab: LeadTab) =>
  tab === "chiuse"
    ? lead.status === "completato" || lead.status === "scartato"
    : lead.status === tab;

const EMPTY: Record<LeadTab, { title: string; description: string }> = {
  nuovo: {
    title: "Nessuna richiesta nuova",
    description: "Quando un cliente scrive dal sito o da Casper la trovi qui.",
  },
  in_gestione: {
    title: "Nessuna richiesta in gestione",
    description: "Le richieste che chiami o a cui rispondi passano qui in automatico.",
  },
  chiuse: {
    title: "Nessuna richiesta chiusa",
    description: "Le richieste completate o scartate finiscono qui.",
  },
};

export default function LeadsView({ initialTab }: { initialTab?: LeadTab }) {
  const { leads } = useAdmin();

  const count = (tab: LeadTab) => leads.filter((l) => matchesTab(l, tab)).length;

  // Si apre dove c'è lavoro da fare: prima le nuove, poi quelle in corso.
  const [tab, setTab] = useUrlState<LeadTab>(
    "stato",
    initialTab ?? (count("nuovo") > 0 ? "nuovo" : count("in_gestione") > 0 ? "in_gestione" : "chiuse")
  );
  const [query, setQuery] = useState("");
  const [type, setType] = useState<LeadType | "all">("all");

  const tabs: TabOption<LeadTab>[] = [
    { id: "nuovo", label: "Nuove", count: count("nuovo"), alert: true },
    { id: "in_gestione", label: "In gestione", count: count("in_gestione") },
    { id: "chiuse", label: "Chiuse", count: count("chiuse") },
  ];

  const q = query.trim().toLowerCase();
  const visible = leads
    .filter((l) => matchesTab(l, tab))
    .filter((l) => type === "all" || l.type === type)
    .filter(
      (l) =>
        !q ||
        `${l.name ?? ""} ${l.phone} ${l.email ?? ""} ${l.carLabel ?? ""} ${l.message ?? ""}`
          .toLowerCase()
          .includes(q)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filtering = Boolean(q) || type !== "all";

  return (
    <>
      <PageHeader
        title="Richieste"
        description="Chi ti ha scritto dal sito o da Casper. Chiama, rispondi o fissa un appuntamento."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs tabs={tabs} value={tab} onChange={setTab} label="Stato richieste" />
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-adm-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca nome, telefono, auto…"
              aria-label="Cerca richieste"
              className={`${inputCls} pl-9 sm:w-60`}
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LeadType | "all")}
            aria-label="Filtra per tipo"
            className={`${inputCls} sm:w-auto`}
          >
            <option value="all">Tutti i tipi</option>
            {(Object.keys(LEAD_TYPE_LABEL) as LeadType[]).map((t) => (
              <option key={t} value={t}>
                {LEAD_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filtering ? "Nessun risultato" : EMPTY[tab].title}
          description={filtering ? "Prova a cambiare la ricerca o il tipo." : EMPTY[tab].description}
        />
      ) : (
        <div className="divide-y divide-adm-line rounded-xl border border-adm-line bg-adm-surface">
          {visible.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </>
  );
}
