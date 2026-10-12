"use client";

import React from "react";
import { useGestionale } from "@/context/GestionaleContext";
import type { NuovoContatto } from "@/lib/gestionale/defaults";
import type { RigaValutata } from "@/lib/import/mappatura";
import { schemaContatti, schemaFlotta, schemaMovimenti, schemaVeicoli } from "@/lib/import/schemi";
import ImportDialog, { type AzioneDoppioni } from "./ImportDialog";

// Le importazioni pronte per ogni sezione: stesso dialogo, schema e salvataggio diversi.

/** Le righe da salvare come nuove, secondo la scelta sui doppioni. */
function daCreare<T>(righe: RigaValutata<T>[], doppioni: AzioneDoppioni): T[] {
  return righe
    .filter((r) => r.record && (!r.doppione || doppioni === "importa"))
    .map((r) => r.record as T);
}

const plurale = (n: number, uno: string, tanti: string) => `${n} ${n === 1 ? uno : tanti}`;

export function ImportaMovimenti({ onClose }: { onClose: () => void }) {
  const { importaMovimenti } = useGestionale();
  return (
    <ImportDialog
      schema={schemaMovimenti}
      titolo="Importa movimenti"
      descrizione="Prima nota, spese, incassi: da Excel o CSV, anche dal vecchio foglio di calcolo."
      onClose={onClose}
      onImporta={(righe, doppioni, file) => {
        const nuovi = daCreare(righe, doppioni);
        return {
          annulla: importaMovimenti(nuovi, file),
          messaggio: `${plurale(nuovi.length, "movimento importato", "movimenti importati")}`,
        };
      }}
    />
  );
}

export function ImportaContatti({ onClose }: { onClose: () => void }) {
  const { importaContatti } = useGestionale();
  return (
    <ImportDialog
      schema={schemaContatti}
      titolo="Importa contatti"
      descrizione="Clienti e fornitori da una rubrica, da un CRM o da un altro gestionale."
      onClose={onClose}
      conteggio={(righe, doppioni) =>
        righe.filter(
          (r) => r.record && (!r.doppione || doppioni === "importa" || (doppioni === "aggiorna" && r.doppione.idEsistente))
        ).length
      }
      onImporta={(righe, doppioni, file) => {
        const nuovi = daCreare(righe, doppioni);
        const aggiorna =
          doppioni === "aggiorna"
            ? righe
                .filter((r) => r.record && r.doppione?.idEsistente)
                .map((r) => ({ id: r.doppione?.idEsistente as string, dati: r.record as NuovoContatto }))
            : [];
        return {
          annulla: importaContatti(nuovi, aggiorna, file),
          messaggio: `${plurale(nuovi.length, "contatto importato", "contatti importati")}${
            aggiorna.length ? `, ${plurale(aggiorna.length, "completato", "completati")}` : ""
          }`,
        };
      }}
    />
  );
}

export function ImportaVeicoli({ onClose }: { onClose: () => void }) {
  const { importaVeicoli } = useGestionale();
  return (
    <ImportDialog
      schema={schemaVeicoli}
      titolo="Importa auto"
      descrizione="Schede economiche del parco auto (acquisti, vendite, prezzi). Restano fuori dal catalogo finché non le pubblichi."
      onClose={onClose}
      onImporta={(righe, doppioni, file) => {
        const nuovi = daCreare(righe, doppioni);
        return {
          annulla: importaVeicoli(nuovi, file),
          messaggio: `${plurale(nuovi.length, "auto importata", "auto importate")}`,
        };
      }}
    />
  );
}

export function ImportaFlotta({ onClose }: { onClose: () => void }) {
  const { importaFlotta } = useGestionale();
  return (
    <ImportDialog
      schema={schemaFlotta}
      titolo="Importa flotta noleggio"
      descrizione="Le auto a noleggio con tariffe e scadenze (revisione, bollo, assicurazione)."
      onClose={onClose}
      onImporta={(righe, doppioni, file) => {
        const nuovi = daCreare(righe, doppioni);
        return {
          annulla: importaFlotta(nuovi, file),
          messaggio: `${plurale(nuovi.length, "auto aggiunta", "auto aggiunte")} alla flotta`,
        };
      }}
    />
  );
}
