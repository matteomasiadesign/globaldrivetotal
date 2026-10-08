"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Check,
  Cloud,
  ExternalLink,
  FilePlus2,
  FileText,
  Link2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { REQUIRED_DOCUMENT_CATEGORIES, eur } from "@/lib/admin/constants";
import { getDossier } from "@/lib/admin/documents";
import { formatShortDate } from "@/lib/admin/dates";
import type { DocumentCategory, VehicleDocument } from "@/types/admin";
import type { Car } from "@/types/car";
import { useEditors } from "../AdminEditors";
import { useDossierEntries } from "../useDossierEntries";
import DocumentLinkDrawer from "../DocumentLinkDrawer";
import { getVehicleFileUrl } from "@/lib/storage/vehicleFiles";
import { EmptyState, PageHeader, Panel, Pill } from "../ui/Layout";
import RowMenu from "../ui/RowMenu";
import { btnPrimary, btnSecondary, focusRing, inputCls } from "../ui/styles";
import { useToast } from "../ui/Toast";

const docText = (d: VehicleDocument) =>
  `${d.title} ${d.category} ${d.notes ?? ""}`.toLowerCase();

const SOURCE_LABEL: Record<VehicleDocument["source"], string> = {
  google_drive: "Google Drive",
  upload: "File caricato",
  local_pdf: "Generato qui",
  generated_html: "Generato qui",
};

function DocRow({ doc, highlight = false }: { doc: VehicleDocument; highlight?: boolean }) {
  const { deleteDocument } = useAdmin();
  const toast = useToast();

  async function openFile() {
    if (!doc.storagePath) return;
    const url = await getVehicleFileUrl(doc.storagePath).catch(() => null);
    if (url) window.open(url, "_blank", "noopener");
    else toast("Non trovo il file: potrebbe essere stato caricato da un altro browser");
  }
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${highlight ? "bg-blue-500/10" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-white">{doc.title}</p>
        <p className="truncate text-sm text-adm-muted">
          {SOURCE_LABEL[doc.source]}
          {doc.fileSize ? ` · ${doc.fileSize}` : ""} · {formatShortDate(doc.dateAdded)}
          {doc.notes ? ` · ${doc.notes}` : ""}
        </p>
      </div>
      {doc.storagePath && (
        <button type="button" onClick={openFile} className={btnSecondary}>
          Apri
          <ExternalLink className="size-3.5" />
        </button>
      )}
      {doc.fileUrl && (
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={btnSecondary}
        >
          Apri
          <ExternalLink className="size-3.5" />
        </a>
      )}
      <RowMenu
        label={`Azioni per ${doc.title}`}
        items={[
          {
            label: "Rimuovi dal dossier",
            icon: Trash2,
            danger: true,
            confirm: "Conferma rimozione",
            onSelect: () => deleteDocument(doc.id),
          },
        ]}
      />
    </div>
  );
}

function Dossier({
  car,
  query,
  onLink,
  onContract,
}: {
  car: Car;
  /** Testo cercato: i documenti che lo contengono vengono evidenziati. */
  query: string;
  onLink: (category?: DocumentCategory) => void;
  onContract: () => void;
}) {
  const { documents } = useAdmin();
  const dossier = getDossier(car.id, documents);
  const isMatch = (d: VehicleDocument) => query !== "" && docText(d).includes(query);
  const other = dossier.documents.filter((d) => !REQUIRED_DOCUMENT_CATEGORIES.includes(d.category));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-white">
            {car.brand} {car.model}
          </h2>
          <p className="text-sm text-adm-muted">
            {[car.version, car.year > 0 && car.year, car.price > 0 && eur(car.price)].filter(Boolean).join(" · ") ||
              "Auto fuori catalogo"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onLink()} className={btnSecondary}>
            <Link2 className="size-4" />
            Collega documento
          </button>
          <button type="button" onClick={onContract} className={btnPrimary}>
            <FilePlus2 className="size-4" />
            Genera contratto
          </button>
        </div>
      </div>

      <Panel
        title="Documenti richiesti"
        action={
          <Pill tone={dossier.complete ? "green" : "amber"}>
            {dossier.covered}/{dossier.total}
          </Pill>
        }
      >
        <div className="divide-y divide-adm-line">
          {REQUIRED_DOCUMENT_CATEGORIES.map((category) => {
            const docs = dossier.documents.filter((d) => d.category === category);
            if (docs.length === 0) {
              return (
                <div key={category} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full border border-dashed border-slate-600" />
                  <p className="flex-1 text-slate-300">{category}</p>
                  <button
                    type="button"
                    onClick={() => onLink(category)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/10 ${focusRing}`}
                  >
                    <Plus className="size-4" />
                    Aggiungi
                  </button>
                </div>
              );
            }
            return (
              <div key={category}>
                <div className="flex items-center gap-3 px-4 pt-3">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
                    <Check className="size-3.5" />
                  </span>
                  <p className="text-sm font-medium text-slate-300">{category}</p>
                </div>
                {docs.map((d) => (
                  <DocRow key={d.id} doc={d} highlight={isMatch(d)} />
                ))}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Altri documenti e contratti"
        action={
          <button
            type="button"
            onClick={() => onLink("Altro")}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/10 ${focusRing}`}
          >
            <Plus className="size-4" />
            Aggiungi
          </button>
        }
      >
        {other.length === 0 ? (
          <p className="px-4 py-5 text-sm text-adm-muted">
            Qui vanno i documenti fuori dall&apos;elenco (passaggio di proprietà, fatture…) e i
            contratti generati. Con «Aggiungi» scegli tu il nome.
          </p>
        ) : (
          <div className="divide-y divide-adm-line">
            {other.map((d) => (
              <DocRow key={d.id} doc={d} highlight={isMatch(d)} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function DocumentsView({
  initialCarId,
  onlyIncomplete: initialIncomplete = false,
}: {
  initialCarId?: string;
  onlyIncomplete?: boolean;
}) {
  const { entries: cars, isFuoriCatalogo } = useDossierEntries();
  const { documents } = useAdmin();
  const { schedaDellAuto } = useGestionale();
  const { openContratto } = useEditors();

  const [selectedId, setSelectedId] = useState<string | null>(
    cars.some((c) => c.id === initialCarId) ? (initialCarId ?? null) : null
  );
  const [query, setQuery] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(initialIncomplete);
  const [linking, setLinking] = useState<{ carId: string; category?: DocumentCategory } | null>(null);

  const q = query.trim().toLowerCase();
  // La ricerca guarda sia l'auto sia i titoli, i tipi e le note dei suoi documenti.
  const docHits = (carId: string) =>
    q ? documents.filter((d) => d.carId === carId && docText(d).includes(q)) : [];
  const list = cars
    .filter(
      (c) =>
        !q ||
        `${c.brand} ${c.model} ${c.version}`.toLowerCase().includes(q) ||
        docHits(c.id).length > 0
    )
    .filter((c) => !onlyIncomplete || (c.status !== "Venduta" && !getDossier(c.id, documents).complete));

  const incompleteCount = cars.filter((c) => c.status !== "Venduta" && !getDossier(c.id, documents).complete).length;

  // Su schermi larghi si vede sempre un dossier (il primo, se non ne hai scelto uno);
  // su telefono si parte dall'elenco e si apre il dossier con un tocco.
  const activeCar =
    cars.find((c) => c.id === selectedId) ?? (selectedId === null ? list[0] : undefined);

  if (cars.length === 0) {
    return (
      <>
        <PageHeader title="Documenti" />
        <EmptyState
          icon={FileText}
          title="Nessuna auto"
          description="I documenti si collegano alle auto del parco: aggiungine una prima."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Documenti"
        description="Il dossier di ogni auto: cosa c'è, cosa manca e i contratti di vendita."
      />

      <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* Elenco auto */}
        <div className={`${selectedId ? "hidden lg:block" : ""}`}>
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-adm-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca auto o documento…"
                aria-label="Cerca auto o documento"
                className={`${inputCls} pl-9`}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 px-1 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={onlyIncomplete}
                onChange={(e) => setOnlyIncomplete(e.target.checked)}
                className="size-4 accent-blue-600"
              />
              Solo con documenti mancanti ({incompleteCount})
            </label>
          </div>

          <div className="mt-3 divide-y divide-adm-line rounded-xl border border-adm-line bg-adm-surface">
            {list.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-adm-muted">Nessuna auto trovata.</p>
            ) : (
              list.map((car) => {
                const dossier = getDossier(car.id, documents);
                const active = activeCar?.id === car.id;
                const hits = docHits(car.id);
                return (
                  <button
                    key={car.id}
                    type="button"
                    onClick={() => setSelectedId(car.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${
                      active ? "bg-blue-600/15" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate font-medium ${car.status === "Venduta" ? "text-slate-400" : "text-white"}`}
                      >
                        {car.brand} {car.model}
                      </span>
                      <span className="block truncate text-sm text-adm-muted">
                        {car.status === "Venduta" ? "Venduta · " : ""}
                        {car.version}
                      </span>
                      {hits.length > 0 && (
                        <span className="block truncate text-sm text-blue-300">
                          {hits.length === 1 ? hits[0].title : `${hits.length} documenti trovati`}
                        </span>
                      )}
                    </span>
                    <Pill tone={dossier.complete ? "green" : "amber"}>
                      {dossier.covered}/{dossier.total}
                    </Pill>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Dossier dell'auto scelta */}
        <div className={`min-w-0 ${selectedId ? "" : "hidden lg:block"}`}>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className={`mb-4 inline-flex cursor-pointer items-center gap-2 rounded text-sm text-adm-muted hover:text-white lg:hidden ${focusRing}`}
          >
            <ArrowLeft className="size-4" />
            Tutte le auto
          </button>
          {activeCar ? (
            <Dossier
              key={activeCar.id}
              car={activeCar}
              query={q}
              onLink={(category) => setLinking({ carId: activeCar.id, category })}
              onContract={() =>
                openContratto(isFuoriCatalogo(activeCar.id) ? activeCar.id : schedaDellAuto(activeCar).id)
              }
            />
          ) : (
            <EmptyState icon={Cloud} title="Scegli un'auto per vedere il suo dossier" />
          )}
        </div>
      </div>

      {linking && (
        <DocumentLinkDrawer
          carId={linking.carId}
          category={linking.category}
          onClose={() => setLinking(null)}
        />
      )}
    </>
  );
}
