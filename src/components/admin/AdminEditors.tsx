"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import AppointmentDrawer, { type AppointmentEditorOptions } from "./AppointmentDrawer";
import CarDrawer from "./CarDrawer";

// I pannelli di modifica vivono qui, una volta sola, e qualunque pagina li apre
// con una chiamata: la richiesta di un cliente, la scheda di un'auto e l'agenda
// usano lo stesso pannello "Nuovo appuntamento" senza cambiare pagina.

interface EditorsApi {
  openAppointment: (options?: AppointmentEditorOptions) => void;
  openCar: (carId?: string) => void;
}

const EditorsContext = createContext<EditorsApi | undefined>(undefined);

type OpenEditor =
  | { kind: "appointment"; key: number; options: AppointmentEditorOptions }
  | { kind: "car"; key: number; carId?: string }
  | null;

export function EditorsProvider({ children }: { children: React.ReactNode }) {
  const [editor, setEditor] = useState<OpenEditor>(null);

  const openAppointment = useCallback((options: AppointmentEditorOptions = {}) => {
    setEditor({ kind: "appointment", key: Date.now(), options });
  }, []);
  const openCar = useCallback((carId?: string) => {
    setEditor({ kind: "car", key: Date.now(), carId });
  }, []);
  const close = useCallback(() => setEditor(null), []);

  const api = useMemo(() => ({ openAppointment, openCar }), [openAppointment, openCar]);

  return (
    <EditorsContext.Provider value={api}>
      {children}
      {/* `key` azzera il form ogni volta che si riapre il pannello. */}
      {editor?.kind === "appointment" && (
        <AppointmentDrawer key={editor.key} {...editor.options} onClose={close} />
      )}
      {editor?.kind === "car" && (
        <CarDrawer key={editor.key} carId={editor.carId} onClose={close} />
      )}
    </EditorsContext.Provider>
  );
}

export function useEditors() {
  const ctx = useContext(EditorsContext);
  if (!ctx) throw new Error("useEditors must be used within an EditorsProvider");
  return ctx;
}
