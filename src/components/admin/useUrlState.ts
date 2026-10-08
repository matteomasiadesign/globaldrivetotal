"use client";

import { useCallback, useState } from "react";

// Stato di una vista (tab, filtro) che vive anche nell'indirizzo: ricaricando la pagina o
// condividendo il link si ritrova la stessa vista. Scrive con `replaceState`, così i
// cambi di tab non riempiono la cronologia e il pulsante Indietro torna alla pagina
// precedente, non al tab precedente. Next integra `history.replaceState` con il router
// (useSearchParams si aggiorna) senza ricaricare la pagina dal server.
export function useUrlState<T extends string>(param: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set(param, next);
        window.history.replaceState(null, "", url);
      } catch {
        // Senza accesso alla cronologia la vista funziona lo stesso, solo non è condivisibile.
      }
    },
    [param]
  );

  return [value, set] as const;
}
