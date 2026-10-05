"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, Plus, RotateCcw, Trash2 } from "lucide-react";
import { defaultSiteSettings } from "@/config/site";
import { useSite } from "@/context/SiteContext";
import type { SiteSettings } from "@/types/site";
import { Field, Switch } from "../ui/Field";
import { PageHeader, Panel } from "../ui/Layout";
import { btnPrimary, btnSecondary, inputCls, textareaCls } from "../ui/styles";
import { useToast } from "../ui/Toast";

const clean = (lines: string[]) => lines.map((l) => l.trim()).filter(Boolean);

// Pulisce gli elenchi (righe vuote, voci senza testo) prima di salvare.
function normalize(s: SiteSettings): SiteSettings {
  return {
    ...s,
    services: s.services.map((sv) => ({ ...sv, highlights: clean(sv.highlights) })),
    aboutBullets: clean(s.aboutBullets),
    stats: s.stats.filter((x) => x.value.trim() || x.label.trim()),
    reviews: s.reviews.filter((r) => r.quote.trim()),
  };
}

function validate(s: SiteSettings): string | null {
  if (!s.companyName.trim()) return "Scrivi il nome dell'azienda";
  if (s.phone.replace(/\D/g, "").length < 8) return "Il numero di telefono non sembra valido";
  if (!/^\S+@\S+\.\S+$/.test(s.email.trim())) return "L'indirizzo email non sembra valido";
  return null;
}

/** Textarea per elenchi: una voce per riga. */
function LinesField({
  label,
  hint,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (v: string[]) => void;
  rows?: number;
}) {
  return (
    <Field label={label} hint={hint ?? "Una voce per riga."}>
      <textarea
        rows={rows}
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
        className={textareaCls}
      />
    </Field>
  );
}

function Grid({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 }) {
  return (
    <div className={`grid grid-cols-1 gap-4 p-4 ${cols === 2 ? "sm:grid-cols-2" : ""}`}>
      {children}
    </div>
  );
}

export default function SiteView() {
  const { site, updateSite, resetSite } = useSite();
  const toast = useToast();
  const [draft, setDraft] = useState<SiteSettings>(site);
  const [confirmReset, setConfirmReset] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(site);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setService = (i: number, patch: Partial<SiteSettings["services"][number]>) =>
    set(
      "services",
      draft.services.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    );

  function save() {
    const next = normalize(draft);
    const error = validate(next);
    if (error) {
      toast(error);
      return;
    }
    updateSite(next);
    setDraft(next);
    toast("Contenuti del sito salvati");
  }

  function reset() {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    resetSite();
    setDraft(defaultSiteSettings);
    setConfirmReset(false);
    toast("Testi originali ripristinati");
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Contenuti del sito"
        description="Contatti, testi e numeri che i clienti vedono. Le auto si gestiscono da Parco auto."
        actions={
          <>
            <a href="/" target="_blank" rel="noopener noreferrer" className={btnSecondary}>
              <ExternalLink className="size-4" />
              Vedi il sito
            </a>
            <button type="button" onClick={reset} className={btnSecondary}>
              <RotateCcw className="size-4" />
              {confirmReset ? "Conferma: perdi le modifiche" : "Ripristina originali"}
            </button>
          </>
        }
      />

      <Panel title="Azienda">
        <Grid>
          <Field label="Nome dell'azienda">
            <input
              value={draft.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Sottotitolo sotto il logo" hint="Piccola scritta nella barra in alto.">
            <input
              value={draft.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Partita IVA" hint="Se vuota non compare nel footer.">
            <input
              value={draft.vatNumber}
              onChange={(e) => set("vatNumber", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Sede legale" hint="Usata nell'intestazione dei contratti.">
            <input
              value={draft.legalAddress}
              onChange={(e) => set("legalAddress", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Presentazione nel footer" className="sm:col-span-2">
            <textarea
              rows={3}
              value={draft.footerText}
              onChange={(e) => set("footerText", e.target.value)}
              className={textareaCls}
            />
          </Field>
        </Grid>
      </Panel>

      <Panel title="Contatti e orari">
        <Grid>
          <Field label="Telefono / WhatsApp" hint="Con prefisso, es. +39 342 142 0499. Serve per chiamate e WhatsApp.">
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Zona" hint="Es. Provincia di Sassari.">
            <input
              value={draft.location}
              onChange={(e) => set("location", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Orari">
            <input
              value={draft.hours}
              onChange={(e) => set("hours", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Note sugli orari" className="sm:col-span-2">
            <input
              value={draft.hoursNote}
              onChange={(e) => set("hoursNote", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Instagram (indirizzo)">
            <input
              type="url"
              value={draft.instagramUrl}
              onChange={(e) => set("instagramUrl", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Instagram (nome mostrato)">
            <input
              value={draft.instagramHandle}
              onChange={(e) => set("instagramHandle", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Facebook (indirizzo)">
            <input
              type="url"
              value={draft.facebookUrl}
              onChange={(e) => set("facebookUrl", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Facebook (nome mostrato)">
            <input
              value={draft.facebookLabel}
              onChange={(e) => set("facebookLabel", e.target.value)}
              className={inputCls}
            />
          </Field>
        </Grid>
      </Panel>

      <Panel title="Home page">
        <Grid>
          <Field label="Titolo">
            <input
              value={draft.heroTitle}
              onChange={(e) => set("heroTitle", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Seconda riga (colorata)">
            <input
              value={draft.heroHighlight}
              onChange={(e) => set("heroHighlight", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Sottotitolo" className="sm:col-span-2">
            <input
              value={draft.heroSubtitle}
              onChange={(e) => set("heroSubtitle", e.target.value)}
              className={inputCls}
            />
          </Field>
        </Grid>
      </Panel>

      <Panel title="Servizi">
        <div className="divide-y divide-adm-line">
          {draft.services.map((sv, i) => (
            <div key={i}>
              <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-adm-muted">
                Servizio {i + 1}
              </p>
              <Grid>
                <Field label="Nome">
                  <input
                    value={sv.title}
                    onChange={(e) => setService(i, { title: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Etichetta">
                  <input
                    value={sv.badge}
                    onChange={(e) => setService(i, { badge: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Frase breve" className="sm:col-span-2">
                  <input
                    value={sv.tagline}
                    onChange={(e) => setService(i, { tagline: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Descrizione" className="sm:col-span-2">
                  <textarea
                    rows={3}
                    value={sv.description}
                    onChange={(e) => setService(i, { description: e.target.value })}
                    className={textareaCls}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <LinesField
                    label="Cosa comprende"
                    value={sv.highlights}
                    onChange={(v) => setService(i, { highlights: v })}
                    rows={5}
                  />
                </div>
              </Grid>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Chi siamo">
        <Grid>
          <Field label="Titolo" className="sm:col-span-2">
            <input
              value={draft.aboutTitle}
              onChange={(e) => set("aboutTitle", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Testo" className="sm:col-span-2">
            <textarea
              rows={4}
              value={draft.aboutText}
              onChange={(e) => set("aboutText", e.target.value)}
              className={textareaCls}
            />
          </Field>
          <div className="sm:col-span-2">
            <LinesField
              label="Punti di forza"
              value={draft.aboutBullets}
              onChange={(v) => set("aboutBullets", v)}
              rows={3}
            />
          </div>
          <Field label="Didascalia sulla foto (titolo)">
            <input
              value={draft.aboutCaptionTitle}
              onChange={(e) => set("aboutCaptionTitle", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Didascalia sulla foto (testo)">
            <input
              value={draft.aboutCaptionText}
              onChange={(e) => set("aboutCaptionText", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Link “Indicazioni” (Google Maps)" className="sm:col-span-2">
            <input
              type="url"
              value={draft.mapsUrl}
              onChange={(e) => set("mapsUrl", e.target.value)}
              className={inputCls}
            />
          </Field>
        </Grid>
      </Panel>

      <Panel
        title="Numeri in evidenza"
        action={
          <div className="flex items-center gap-2 text-xs text-adm-muted">
            Mostra nel sito
            <Switch
              checked={draft.showStats}
              onChange={(v) => set("showStats", v)}
              label="Mostra i numeri nel sito"
              compact
            />
          </div>
        }
      >
        <div className="space-y-3 p-4">
          <p className="text-xs text-amber-300">
            Inserisci solo numeri reali: sono dichiarazioni al pubblico. Se non sei sicuro, spegni la sezione.
          </p>
          {draft.stats.map((st, i) => (
            <div key={i} className="grid grid-cols-[6rem_minmax(0,1fr)_2rem] items-center gap-2">
              <input
                aria-label="Numero"
                placeholder="15+"
                value={st.value}
                onChange={(e) =>
                  set(
                    "stats",
                    draft.stats.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x))
                  )
                }
                className={inputCls}
              />
              <input
                aria-label="Descrizione"
                placeholder="Anni di esperienza"
                value={st.label}
                onChange={(e) =>
                  set(
                    "stats",
                    draft.stats.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x))
                  )
                }
                className={inputCls}
              />
              <button
                type="button"
                aria-label="Rimuovi"
                onClick={() =>
                  set(
                    "stats",
                    draft.stats.filter((_, idx) => idx !== i)
                  )
                }
                className="grid size-8 cursor-pointer place-items-center rounded-lg text-adm-muted hover:bg-white/10 hover:text-rose-300"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {draft.stats.length < 4 && (
            <button
              type="button"
              onClick={() => set("stats", [...draft.stats, { value: "", label: "" }])}
              className={btnSecondary}
            >
              <Plus className="size-4" />
              Aggiungi numero
            </button>
          )}
        </div>
      </Panel>

      <Panel
        title="Recensioni"
        action={
          <div className="flex items-center gap-2 text-xs text-adm-muted">
            Mostra nel sito
            <Switch
              checked={draft.showReviews}
              onChange={(v) => set("showReviews", v)}
              label="Mostra le recensioni nel sito"
              compact
            />
          </div>
        }
      >
        <div className="space-y-4 p-4">
          <p className="text-xs text-amber-300">
            Pubblica solo recensioni vere di clienti che hanno dato il consenso. Se non ne hai, spegni la sezione.
          </p>
          {draft.reviews.map((r, i) => {
            const patch = (p: Partial<typeof r>) =>
              set(
                "reviews",
                draft.reviews.map((x, idx) => (idx === i ? { ...x, ...p } : x))
              );
            return (
              <div key={i} className="space-y-3 rounded-lg border border-adm-line bg-adm-bg p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    aria-label="Cliente"
                    placeholder="Nome cliente"
                    value={r.author}
                    onChange={(e) => patch({ author: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    aria-label="Città"
                    placeholder="Città"
                    value={r.city}
                    onChange={(e) => patch({ city: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    aria-label="Auto acquistata"
                    placeholder="Auto acquistata"
                    value={r.car}
                    onChange={(e) => patch({ car: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <textarea
                  aria-label="Testo della recensione"
                  rows={3}
                  placeholder="Testo della recensione"
                  value={r.quote}
                  onChange={(e) => patch({ quote: e.target.value })}
                  className={textareaCls}
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "reviews",
                      draft.reviews.filter((_, idx) => idx !== i)
                    )
                  }
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-adm-muted hover:text-rose-300"
                >
                  <Trash2 className="size-3.5" />
                  Rimuovi recensione
                </button>
              </div>
            );
          })}
          {draft.reviews.length < 6 && (
            <button
              type="button"
              onClick={() =>
                set("reviews", [...draft.reviews, { author: "", city: "", car: "", quote: "" }])
              }
              className={btnSecondary}
            >
              <Plus className="size-4" />
              Aggiungi recensione
            </button>
          )}
        </div>
      </Panel>

      {/* Barra di salvataggio, sempre a portata di mano */}
      <div
        className={`fixed inset-x-0 bottom-16 z-20 flex justify-center px-4 transition-all lg:bottom-6 lg:left-60 ${
          dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-adm-line bg-adm-raised px-4 py-2.5 shadow-2xl">
          <span className="text-sm text-white">Modifiche non salvate</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDraft(site)} className={btnSecondary}>
              Annulla
            </button>
            <button type="button" onClick={save} className={btnPrimary}>
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
