"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
}

type PushToast = (message: string, action?: ToastAction) => void;

const ToastContext = createContext<PushToast | undefined>(undefined);

// Conferme brevi in basso ("Salvato", "Spostata in completate") con eventuale
// "Annulla": sostituiscono le finestre di dialogo e permettono di tornare
// indietro senza chiedere prima il permesso.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<PushToast>(
    (message, action) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev.slice(-2), { id, message, action }]);
      setTimeout(() => dismiss(id), action ? 7000 : 3500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="adm-rise pointer-events-auto flex items-center gap-4 rounded-xl border border-adm-line bg-adm-raised px-4 py-2.5 text-sm text-white shadow-2xl"
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="cursor-pointer font-semibold text-blue-400 hover:text-blue-300"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): PushToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
