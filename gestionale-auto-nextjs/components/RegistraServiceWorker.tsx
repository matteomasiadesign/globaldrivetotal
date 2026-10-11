"use client";

import { useEffect } from "react";

export default function RegistraServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Se la registrazione fallisce (es. sviluppo locale senza HTTPS), non è un problema bloccante.
      });
    }
  }, []);
  return null;
}
