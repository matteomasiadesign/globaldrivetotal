"use client";

import React from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { useSite } from "@/context/SiteContext";
import type { Contesto } from "@/lib/export/gestionale";
import { scaricaCsv, scaricaXlsx } from "@/lib/export/scrivi";
import type { Foglio } from "@/lib/export/types";
import RowMenu, { type MenuItem } from "./RowMenu";
import { btnSecondary } from "./styles";
import { useToast } from "./Toast";

/** I dati che servono ai riepiloghi, presi dai contesti dell'admin. */
export function useContestoExport(): Contesto {
  const { today } = useAdmin();
  const { site } = useSite();
  const { veicoli, movimenti, contatti, impostazioni, noleggio } = useGestionale();
  return { veicoli, movimenti, contatti, impostazioni, noleggio, oggi: today, azienda: site.companyName };
}

// Pulsante "Esporta" delle viste: Excel (tutti i fogli) o CSV (il primo). I fogli si
// costruiscono solo al clic, con i filtri attivi in quel momento.
export default function ExportMenu({
  nome,
  fogli,
  extra = [],
  label = "Esporta",
}: {
  /** Nome del file senza estensione (vedi nomeFile). */
  nome: string;
  fogli: () => Foglio[];
  /** Voci in più (es. il pacchetto per il commercialista). */
  extra?: MenuItem[];
  label?: string;
}) {
  const toast = useToast();

  async function excel() {
    try {
      await scaricaXlsx(fogli(), nome);
    } catch (e) {
      console.error("Export Excel non riuscito", e);
      toast("Non sono riuscito a creare il file Excel, riprova");
    }
  }

  function csv() {
    const tutti = fogli();
    if (tutti.length === 0) return;
    scaricaCsv(tutti[0], tutti.length > 1 ? `${nome}_${tutti[0].nome}` : nome);
  }

  return (
    <RowMenu
      label={label}
      align="right"
      triggerClassName={btnSecondary}
      trigger={
        <>
          <Download className="size-4" />
          <span className="hidden sm:inline">{label}</span>
        </>
      }
      items={[
        { label: "Excel (.xlsx)", icon: FileSpreadsheet, onSelect: () => void excel() },
        { label: "CSV per Excel", icon: FileText, onSelect: csv },
        ...extra,
      ]}
    />
  );
}
