"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Email o password non corrette."
            : error.message
        );
      } else {
        router.push(nextPath);
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setInfo("Account creato. Controlla la tua email per confermare, poi accedi.");
        setMode("login");
      }
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--paper)", gap: 24 }}>
      <img src="/logo-full.png" alt="Global Drive" style={{ height: 48, objectFit: "contain" }} />
      <div className="ga-card" style={{ padding: 32, width: 380 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: ".04em" }}>Gestionale auto</div>

        <div className="ga-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          {mode === "login" ? "Accedi" : "Crea il tuo account"}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
          {mode === "login"
            ? "Inserisci le credenziali per entrare nel gestionale."
            : "Il primo account creato va reso amministratore da Supabase (vedi README)."}
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: "9px 12px", background: "var(--bad-bg)", color: "var(--bad)", borderRadius: 8, fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
          </div>
        )}
        {info && (
          <div style={{ marginBottom: 14, padding: "9px 12px", background: "var(--good-bg)", color: "var(--good)", borderRadius: 8, fontSize: 13 }}>
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="ga-field-label">Email</label>
            <input className="ga-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@esempio.it" />
          </div>
          <div>
            <label className="ga-field-label">Password</label>
            <input className="ga-input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="ga-btn ga-btn-primary" type="submit" disabled={loading} style={{ justifyContent: "center", marginTop: 4 }}>
            {loading ? "Attendere…" : mode === "login" ? "Accedi" : "Registrati"}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 13, textAlign: "center", color: "var(--muted)" }}>
          {mode === "login" ? (
            <>Non hai un account? <a style={{ color: "var(--amber)", cursor: "pointer", fontWeight: 600 }} onClick={() => { setMode("signup"); setError(null); setInfo(null); }}>Registrati</a></>
          ) : (
            <>Hai già un account? <a style={{ color: "var(--amber)", cursor: "pointer", fontWeight: 600 }} onClick={() => { setMode("login"); setError(null); setInfo(null); }}>Accedi</a></>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
      <LoginForm />
    </Suspense>
  );
}
