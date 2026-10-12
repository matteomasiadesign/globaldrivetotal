"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGestionale } from "@/context/GestionaleContext";
import { NOME_ATTIVITA, type Attivita } from "@/lib/gestionale/types";
import { useToast } from "./ui/Toast";

/**
 * Sposta un veicolo da Global Drive a Global Rent o viceversa, con un avviso che dice com'è
 * andata e porta alla lista di destinazione. Restituisce false se lo spostamento non è possibile.
 */
export function useSpostaVeicolo() {
  const { assegnaAttivita } = useGestionale();
  const toast = useToast();
  const router = useRouter();

  return useCallback(
    (veicoloId: string, nome: string, verso: Attivita) => {
      const esito = assegnaAttivita(veicoloId, verso);
      if (!esito.ok) {
        toast(`${nome}: ${esito.errore}`);
        return false;
      }
      toast(
        verso === "Noleggio"
          ? `${nome} è passata a ${NOME_ATTIVITA.Noleggio}: completa categoria e tariffa nella flotta`
          : `${nome} è tornata a ${NOME_ATTIVITA.Vendita}, «In preparazione»`,
        {
          label: "Apri",
          onClick: () => router.push(verso === "Noleggio" ? "/admin/noleggio/flotta" : "/admin/auto"),
        }
      );
      return true;
    },
    [assegnaAttivita, router, toast]
  );
}
