"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Field } from "./ui/Field";
import { btnPrimary, inputCls } from "./ui/styles";

// Login su Supabase Auth: gli account si creano solo dalla dashboard Supabase
// (Authentication → Users), qui non c'è registrazione.
export default function AdminLogin() {
  const { login } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const message = await login(email.trim(), password, remember);
    // Se l'accesso riesce il componente sparisce: niente da aggiornare.
    if (message) {
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center bg-adm-bg px-4 py-12">
      <Link
        href="/"
        className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-adm-muted transition-colors hover:text-white sm:left-6 sm:top-6"
      >
        <ArrowLeft className="size-4" />
        <span>Sito pubblico</span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="relative size-12">
            <Image src="/logo.webp" alt="" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Global Drive</h1>
            <p className="text-sm text-adm-muted">Accedi all&apos;area di gestione</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-adm-line bg-adm-surface p-6"
        >
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
          <Field label="Email">
            <input
              required
              autoFocus
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Password">
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 accent-blue-600"
            />
            Resta collegato su questo dispositivo
          </label>

          <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
            {loading ? "Accesso in corso…" : "Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}
