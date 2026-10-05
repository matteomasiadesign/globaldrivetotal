"use client";

import React, { useState } from "react";
import { Phone, Send, CheckCircle2 } from "lucide-react";
import { submitLead } from "@/lib/leads/client";
import { Honeypot } from "@/components/ui/Honeypot";

// Cattura un recapito direttamente dalla chat. `context` è la domanda che
// l'utente ha fatto a Casper, così chi richiama sa di cosa si parlava.
export default function CasperCallbackForm({ context }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("sending");
    const saved = await submitLead(
      { type: "casper", name, phone, message: context },
      form
    );
    setStatus(saved ? "sent" : "error");
  };

  if (status === "sent") {
    return (
      <div className="flex items-center gap-2 text-[11px] text-emerald-300 font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Perfetto, ti richiamiamo al più presto!</span>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold text-[11px] uppercase tracking-wider transition-all"
      >
        <Phone className="w-3 h-3" />
        <span>Fatti richiamare</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-1.5">
      <Honeypot />
      <input
        type="text"
        required
        placeholder="Il tuo nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
      />
      <input
        type="tel"
        required
        placeholder="Numero di telefono"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
      />
      {status === "error" && (
        <p className="text-[10px] text-rose-300" role="alert">
          Invio non riuscito. Riprova o scrivici su WhatsApp.
        </p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-[11px] uppercase tracking-wider transition-all"
      >
        <Send className="w-3 h-3" />
        <span>{status === "sending" ? "Invio in corso..." : "Richiamami"}</span>
      </button>
    </form>
  );
}
