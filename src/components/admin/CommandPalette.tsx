"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CalendarPlus, Car, CornerDownLeft, FileText, Inbox, Receipt, Search, UserPlus, Users, type LucideIcon } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useCars } from "@/context/CarContext";
import { useGestionale } from "@/context/GestionaleContext";
import { isAdminOnlyPath } from "@/lib/admin/access";
import { nomeVeicolo } from "@/lib/gestionale/calc";
import { normTesto } from "@/lib/import/normalizza";
import { useEditors } from "./AdminEditors";

interface Voce {
  id: string;
  gruppo: string;
  titolo: string;
  dettaglio?: string;
  icon: LucideIcon;
  esegui: () => void;
}

/** Le pagine dell'admin, per saltarci scrivendo il nome. */
const PAGINE: [string, string][] = [
  ["/admin", "Oggi"],
  ["/admin/richieste", "Richieste"],
  ["/admin/agenda", "Agenda"],
  ["/admin/auto", "Parco auto"],
  ["/admin/documenti", "Documenti"],
  ["/admin/movimenti", "Movimenti"],
  ["/admin/scadenzario", "Scadenzario"],
  ["/admin/iva", "IVA"],
  ["/admin/banca", "Banca"],
  ["/admin/analisi", "Analisi"],
  ["/admin/contatti", "Contatti"],
  ["/admin/noleggio", "Noleggio"],
  ["/admin/sito", "Sito"],
  ["/admin/impostazioni", "Impostazioni"],
  ["/admin/storico", "Storico"],
];

// Ricerca globale (Ctrl+K o "/"): pagine, azioni rapide, contatti, auto e richieste.
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { leads, isAdmin } = useAdmin();
  const { cars } = useCars();
  const { contatti, veicoli } = useGestionale();
  const { openMovimento, openAppointment, openContatto, openCar } = useEditors();
  const [q, setQ] = useState("");
  const [attiva, setAttiva] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const voci = useMemo<Voce[]>(() => {
    const vai = (href: string) => () => router.push(href);
    const azioni: Voce[] = [
      ...(isAdmin ? [{ id: "a-mov", gruppo: "Crea", titolo: "Nuovo movimento", icon: Receipt, esegui: () => openMovimento() }] : []),
      { id: "a-app", gruppo: "Crea", titolo: "Nuovo appuntamento", icon: CalendarPlus, esegui: () => openAppointment() },
      { id: "a-con", gruppo: "Crea", titolo: "Nuovo contatto", icon: UserPlus, esegui: () => openContatto() },
      { id: "a-car", gruppo: "Crea", titolo: "Nuova auto nel catalogo", icon: Car, esegui: () => openCar() },
    ];
    const pagine: Voce[] = PAGINE.filter(([href]) => isAdmin || !isAdminOnlyPath(href)).map(([href, nome]) => ({
      id: `p-${href}`,
      gruppo: "Vai a",
      titolo: nome,
      icon: FileText,
      esegui: vai(href),
    }));
    const persone: Voce[] = contatti.map((c) => ({
      id: `c-${c.id}`,
      gruppo: "Contatti",
      titolo: c.nome || "Contatto senza nome",
      dettaglio: [c.tipo, c.telefono, c.email].filter(Boolean).join(" · "),
      icon: Users,
      esegui: () => openContatto({ contattoId: c.id }),
    }));
    // Le auto: per l'admin la scheda economica (con targa), per l'operatore la scheda del catalogo.
    const auto: Voce[] = isAdmin
      ? veicoli.map((v) => ({
          id: `v-${v.id}`,
          gruppo: "Auto",
          titolo: nomeVeicolo(v),
          dettaglio: [v.stato, v.servizio].join(" · "),
          icon: Car,
          esegui: vai(`/admin/auto/${v.id}`),
        }))
      : cars.map((c) => ({
          id: `car-${c.id}`,
          gruppo: "Auto",
          titolo: `${c.brand} ${c.model}`,
          dettaglio: [c.version, c.year, c.status].filter(Boolean).join(" · "),
          icon: Car,
          esegui: () => openCar(c.id),
        }));
    const richieste: Voce[] = leads.map((l) => ({
      id: `l-${l.id}`,
      gruppo: "Richieste",
      titolo: l.name || l.phone,
      dettaglio: [l.phone, l.carLabel, l.status.replace("_", " ")].filter(Boolean).join(" · "),
      icon: Inbox,
      esegui: vai(`/admin/richieste?stato=${l.status === "completato" || l.status === "scartato" ? "chiuse" : l.status}`),
    }));
    return [...azioni, ...pagine, ...persone, ...auto, ...richieste];
  }, [router, isAdmin, contatti, veicoli, cars, leads, openMovimento, openAppointment, openContatto, openCar]);

  const filtrate = useMemo(() => {
    const parole = normTesto(q).split(" ").filter(Boolean);
    if (parole.length === 0) return voci.filter((v) => v.gruppo === "Crea" || v.gruppo === "Vai a");
    return voci
      .filter((v) => {
        const testo = normTesto(`${v.titolo} ${v.dettaglio ?? ""}`).replace(/ /g, "") + " " + normTesto(`${v.titolo} ${v.dettaglio ?? ""}`);
        return parole.every((p) => testo.includes(p));
      })
      .slice(0, 40);
  }, [q, voci]);

  if (!open) return null;

  function esegui(v: Voce | undefined) {
    if (!v) return;
    onClose();
    setQ("");
    v.esegui();
  }

  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-start justify-center bg-black/60 px-4 pt-[12vh]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cerca nell'admin"
        onClick={(e) => e.stopPropagation()}
        className="adm-rise w-full max-w-xl overflow-hidden rounded-2xl border border-adm-line bg-adm-surface shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-adm-line px-4">
          <Search className="size-4 text-adm-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setAttiva(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setAttiva((i) => Math.min(i + 1, filtrate.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setAttiva((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                esegui(filtrate[attiva]);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Cerca un cliente, un'auto, una targa, una pagina…"
            aria-label="Cerca"
            className="h-12 flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="rounded border border-adm-line px-1.5 text-[11px] text-adm-muted">Esc</kbd>
        </div>
        <ul role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
          {filtrate.length === 0 && <li className="px-3 py-6 text-center text-sm text-adm-muted">Nessun risultato</li>}
          {filtrate.map((v, i) => {
            const Icon = v.icon;
            const primo = i === 0 || filtrate[i - 1].gruppo !== v.gruppo;
            return (
              <React.Fragment key={v.id}>
                {primo && <li className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-adm-muted">{v.gruppo}</li>}
                <li
                  role="option"
                  aria-selected={i === attiva}
                  onMouseEnter={() => setAttiva(i)}
                  onClick={() => esegui(v)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${i === attiva ? "bg-blue-600/20 text-white" : "text-slate-200"}`}
                >
                  <Icon className="size-4 shrink-0 text-adm-muted" />
                  <span className="min-w-0 flex-1 truncate">
                    {v.titolo}
                    {v.dettaglio && <span className="ml-2 text-xs text-adm-muted">{v.dettaglio}</span>}
                  </span>
                  {i === attiva && <CornerDownLeft className="size-3.5 text-adm-muted" />}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body
  );
}
