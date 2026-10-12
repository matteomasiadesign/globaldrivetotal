"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  Car,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  MoreHorizontal,
  Receipt,
  Search,
  Settings,
  Tags,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { isAdminOnlyPath } from "@/lib/admin/access";
import { isOpenAppointment } from "@/lib/admin/constants";
import { NOME_ATTIVITA, type Attivita } from "@/lib/gestionale/types";
import AdminLogin from "./AdminLogin";
import { AttivitaProvider, HOME, useAttivita } from "./Attivita";
import CommandPalette from "./CommandPalette";
import { EditorsProvider } from "./AdminEditors";
import { EmptyState } from "./ui/Layout";
import RowMenu from "./ui/RowMenu";
import { btnSecondary, focusRing } from "./ui/styles";
import { ToastProvider } from "./ui/Toast";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Numero da mostrare accanto alla voce: cose che aspettano te. */
  badge?: number;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

// Le voci che stanno anche nella barra in basso su telefono: il resto va in "Altro".
const PRIMARY_COUNT = 4;

const SIDEBAR_KEY = "gd_admin_sidebar_ridotta";

// Le pagine raggruppate sotto una sola voce della barra laterale: dentro il gruppo si passa
// dall'una all'altra con le schede in alto (SchedeSezione). Così la barra resta corta.
const SEZIONI: { voce: string; pagine: { href: string; label: string }[] }[] = [
  {
    voce: "/admin/movimenti",
    pagine: [
      { href: "/admin/movimenti", label: "Movimenti" },
      { href: "/admin/scadenzario", label: "Scadenzario" },
      { href: "/admin/banca", label: "Banca" },
    ],
  },
  {
    voce: "/admin/iva",
    pagine: [
      { href: "/admin/iva", label: "IVA" },
      { href: "/admin/analisi", label: "Analisi" },
    ],
  },
  {
    voce: "/admin/impostazioni",
    pagine: [
      { href: "/admin/impostazioni", label: "Impostazioni" },
      { href: "/admin/sito", label: "Sito" },
      { href: "/admin/storico", label: "Storico" },
    ],
  },
];

const sezioneDi = (pathname: string) =>
  SEZIONI.find((s) => s.pagine.some((p) => pathname === p.href || pathname.startsWith(`${p.href}/`)));

function useNavGroups(attivita: Attivita): NavGroup[] {
  const { leads, appointments, today, isAdmin } = useAdmin();
  const { movimenti, noleggio, flotta } = useGestionale();
  const newLeads = leads.filter((l) => l.status === "nuovo").length;
  const todayOpen = appointments.filter((a) => a.date === today && isOpenAppointment(a.status)).length;
  // I conti scaduti contano nella gestione a cui appartengono.
  const overdue = movimenti.filter(
    (m) => m.attivita === attivita && m.statoPagamento === "Da saldare" && m.dataScadenza && m.dataScadenza < today
  ).length;
  const ritiriERiconsegne = noleggio.prenotazioni.filter(
    (p) => (p.stato === "Prenotata" && p.dataInizio === today) || (p.stato === "In corso" && p.dataFine === today)
  ).length;
  const flottaScaduta = flotta.filter((v) =>
    [v.dataRevisione, v.dataBollo, v.dataAssicurazione].some((d) => d && d < today)
  ).length;

  const sistema: NavGroup = {
    title: "Sistema",
    items: isAdmin
      ? [{ href: "/admin/impostazioni", label: "Impostazioni", icon: Settings }]
      : [{ href: "/admin/sito", label: "Sito", icon: Globe }],
  };
  const conti: NavGroup = {
    title: "Contabilità",
    items: [
      // Conti = Movimenti, Scadenzario e Banca; Report = IVA e Analisi (vedi SEZIONI).
      { href: "/admin/movimenti", label: "Conti", icon: Receipt, badge: overdue },
      { href: "/admin/iva", label: "Report", icon: BarChart3 },
    ],
  };

  const groups: NavGroup[] =
    attivita === "Vendita"
      ? [
          {
            items: [
              { href: "/admin", label: "Oggi", icon: LayoutDashboard },
              { href: "/admin/richieste", label: "Richieste", icon: Inbox, badge: newLeads },
              { href: "/admin/agenda", label: "Agenda", icon: CalendarDays, badge: todayOpen },
            ],
          },
          {
            title: "Auto",
            items: [
              { href: "/admin/auto", label: "Parco auto", icon: Car },
              { href: "/admin/documenti", label: "Documenti", icon: FolderOpen },
            ],
          },
          conti,
          { title: "Clienti", items: [{ href: "/admin/contatti", label: "Contatti", icon: Users }] },
          sistema,
        ]
      : [
          {
            items: [
              { href: "/admin/noleggio", label: "Oggi", icon: LayoutDashboard },
              { href: "/admin/noleggio/prenotazioni", label: "Prenotazioni", icon: ClipboardList, badge: ritiriERiconsegne },
              { href: "/admin/noleggio/calendario", label: "Calendario", icon: CalendarRange },
            ],
          },
          {
            title: "Auto",
            items: [
              { href: "/admin/noleggio/flotta", label: "Flotta", icon: KeyRound, badge: flottaScaduta },
              { href: "/admin/noleggio/tariffe", label: "Tariffe", icon: Tags },
              { href: "/admin/documenti", label: "Documenti", icon: FolderOpen },
            ],
          },
          {
            title: "Clienti",
            items: [
              { href: "/admin/noleggio/preventivi", label: "Preventivi", icon: FileText },
              { href: "/admin/contatti", label: "Contatti", icon: Users },
              { href: "/admin/richieste", label: "Richieste", icon: Inbox, badge: newLeads },
              { href: "/admin/agenda", label: "Agenda", icon: CalendarDays, badge: todayOpen },
            ],
          },
          conti,
          sistema,
        ];

  // L'operatore non vede le sezioni dei conti (vedi lib/admin/access.ts).
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => isAdmin || !isAdminOnlyPath(i.href)) }))
    .filter((g) => g.items.length > 0);
}

function isActive(pathname: string, href: string) {
  // Le «Oggi» delle due gestioni sono anche l'inizio di altri percorsi: vale solo la pagina esatta.
  if (href === HOME.Vendita || href === HOME.Noleggio) return pathname === href;
  const sezione = SEZIONI.find((s) => s.voce === href);
  return sezione ? sezioneDi(pathname) === sezione : pathname === href || pathname.startsWith(`${href}/`);
}

/** Schede in alto per passare tra le pagine dello stesso gruppo (Conti, Report, Impostazioni). */
function SchedeSezione({ pathname, isAdmin }: { pathname: string; isAdmin: boolean }) {
  const sezione = sezioneDi(pathname);
  const pagine = sezione?.pagine.filter((p) => isAdmin || !isAdminOnlyPath(p.href)) ?? [];
  if (pagine.length < 2) return null;
  return (
    <nav
      aria-label="Pagine della sezione"
      className="no-scrollbar mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-adm-line bg-adm-surface/60 p-1"
    >
      {pagine.map((p) => {
        const attiva = pathname === p.href || pathname.startsWith(`${p.href}/`);
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={attiva ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${focusRing} ${
              attiva ? "bg-acc-600 text-white shadow-md shadow-acc-600/25" : "text-adm-muted hover:bg-white/5 hover:text-white"
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Interruttore Global Drive | Global Rent, sempre in vista. La pillola colorata scivola sotto la
 * gestione aperta; ridotto (barra a icone) mostra solo la gestione aperta e un clic passa all'altra.
 */
function AttivitaToggle({ ridotto = false }: { ridotto?: boolean }) {
  const { attivita, cambia } = useAttivita();
  const opzioni: { id: Attivita; label: string; icon: LucideIcon }[] = [
    { id: "Vendita", label: "Drive", icon: Car },
    { id: "Noleggio", label: "Rent", icon: KeyRound },
  ];

  if (ridotto) {
    const altra: Attivita = attivita === "Vendita" ? "Noleggio" : "Vendita";
    const Icon = attivita === "Vendita" ? Car : KeyRound;
    return (
      <button
        type="button"
        onClick={() => cambia(altra)}
        title={`${NOME_ATTIVITA[attivita]}: passa a ${NOME_ATTIVITA[altra]}`}
        aria-label={`Gestione aperta: ${NOME_ATTIVITA[attivita]}. Passa a ${NOME_ATTIVITA[altra]}`}
        className={`grid size-11 cursor-pointer place-items-center rounded-xl bg-acc-600 text-white shadow-lg shadow-acc-600/30 transition-colors hover:bg-acc-500 ${focusRing}`}
      >
        <Icon className="size-5" />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Gestione"
      className="relative grid grid-cols-2 rounded-xl border border-adm-line bg-black/25 p-1"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-acc-600 shadow-lg shadow-acc-600/30 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          attivita === "Noleggio" ? "translate-x-full" : ""
        }`}
      />
      {opzioni.map(({ id, label, icon: Icon }) => {
        const attiva = attivita === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={attiva}
            onClick={() => cambia(id)}
            title={NOME_ATTIVITA[id]}
            className={`relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors ${focusRing} ${
              attiva ? "text-white" : "text-adm-muted hover:text-white"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function UserMenu({ placement, compact = false }: { placement: "top" | "bottom"; compact?: boolean }) {
  const { user, logout } = useAdmin();
  const name = user?.name ?? "Admin";

  return (
    <RowMenu
      label="Menu utente"
      placement={placement}
      align={compact ? "right" : "left"}
      triggerClassName={
        compact
          ? "flex cursor-pointer items-center gap-2 rounded-xl p-1 hover:bg-white/8"
          : "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-white/8"
      }
      trigger={
        <>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-acc-400 to-acc-600 text-sm font-semibold text-white">
            {name.charAt(0).toUpperCase()}
          </span>
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{name}</span>
                <span className="block truncate text-xs text-adm-muted">
                  {user?.role === "operatore" ? "Operatore · " : ""}
                  {user?.email}
                </span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-adm-muted" />
            </>
          )}
        </>
      }
      items={[{ label: "Esci", icon: LogOut, onSelect: logout }]}
    />
  );
}

function Brand({ ridotto = false }: { ridotto?: boolean }) {
  const { attivita } = useAttivita();
  return (
    <Link href={HOME[attivita]} className={`flex min-w-0 items-center gap-2.5 rounded-lg ${focusRing}`}>
      <span className="relative size-8 shrink-0">
        <Image src="/logo.webp" alt="" fill className="object-contain" />
      </span>
      {!ridotto && (
        <span className="min-w-0 truncate text-sm font-semibold leading-tight text-white">
          {NOME_ATTIVITA[attivita]}
          <span className="block text-xs font-normal text-adm-muted">Gestionale</span>
        </span>
      )}
    </Link>
  );
}

function Badge({ value, className }: { value: number; className: string }) {
  return value ? <span className={className}>{value}</span> : null;
}

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const { isAdmin } = useAdmin();
  const { attivita } = useAttivita();
  const [cerca, setCerca] = useState(false);
  const [ridotta, setRidotta] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  });
  const riduci = () =>
    setRidotta((r) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, r ? "0" : "1");
      } catch {
        // Senza memoria del browser la scelta vale per questa visita.
      }
      return !r;
    });

  // Ctrl+K (o Cmd+K) apre la ricerca da qualunque pagina; "/" anche, se non si sta scrivendo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const scrivendo = t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !scrivendo)) {
        e.preventDefault();
        setCerca(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const groups = useNavGroups(attivita);
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        moreBtnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  const all = groups.flatMap((g) => g.items);
  const primary = all.slice(0, PRIMARY_COUNT);
  const moreActive = !primary.some((i) => isActive(pathname, i.href));
  const moreBadge = all.slice(PRIMARY_COUNT).reduce((n, i) => n + (i.badge ?? 0), 0);

  return (
    <div className="adm-backdrop min-h-screen text-slate-100 lg:flex">
      {/* Barra laterale sospesa (desktop) */}
      <aside className={`sticky top-0 hidden h-screen shrink-0 p-3 transition-[width] duration-300 lg:block ${ridotta ? "w-[5.5rem]" : "w-64"}`}>
        <div className="adm-float flex h-full flex-col rounded-2xl">
          <div className={`space-y-3 p-3 ${ridotta ? "flex flex-col items-center" : ""}`}>
            <div className={`flex items-center gap-2 ${ridotta ? "justify-center" : "justify-between px-1 pt-1"}`}>
              <Brand ridotto={ridotta} />
            </div>
            <AttivitaToggle ridotto={ridotta} />
            <button
              type="button"
              onClick={() => setCerca(true)}
              title="Cerca o crea (Ctrl K)"
              aria-label={ridotta ? "Cerca o crea" : undefined}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border border-adm-line bg-white/5 text-sm text-adm-muted transition-colors hover:border-white/15 hover:text-white ${focusRing} ${
                ridotta ? "size-11 justify-center" : "w-full px-3 py-2"
              }`}
            >
              <Search className="size-4" />
              {!ridotta && (
                <>
                  <span className="flex-1 text-left">Cerca o crea…</span>
                  <kbd className="rounded border border-adm-line px-1 text-[11px]">Ctrl K</kbd>
                </>
              )}
            </button>
          </div>

          <nav aria-label="Sezioni" className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-3 pb-3">
            {groups.map((group, gi) => (
              <div key={`${attivita}-${gi}`}>
                {group.title &&
                  (ridotta ? (
                    <div className="mx-auto mb-2 h-px w-6 bg-adm-line" aria-hidden="true" />
                  ) : (
                    <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-adm-muted/80">{group.title}</p>
                  ))}
                <div className="space-y-0.5">
                  {group.items.map(({ href, label, icon: Icon, badge }) => {
                    const active = isActive(pathname, href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        title={ridotta ? label : undefined}
                        aria-label={ridotta ? label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={`group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all ${focusRing} ${
                          ridotta ? "mx-auto size-11 justify-center" : "px-3 py-[0.45rem]"
                        } ${
                          active
                            ? "bg-gradient-to-r from-acc-600/25 to-acc-600/5 text-white"
                            : "text-adm-muted hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {active && (
                          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-acc-400" />
                        )}
                        <Icon
                          className={`size-[1.15rem] shrink-0 transition-transform group-hover:scale-110 ${active ? "text-acc-300" : ""}`}
                        />
                        {!ridotta && <span className="flex-1 truncate">{label}</span>}
                        <Badge
                          value={badge ?? 0}
                          className={
                            ridotta
                              ? "absolute right-1 top-1 min-w-4 rounded-full bg-acc-500 px-1 text-center text-[10px] font-semibold leading-4 text-white"
                              : "rounded-full bg-acc-600 px-1.5 text-xs font-semibold tabular-nums text-white"
                          }
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* In fondo, su una riga: utente, sito e riduci (in colonna quando la barra è a icone). */}
          <div className={`flex gap-1 border-t border-adm-line p-2 ${ridotta ? "flex-col-reverse items-center" : "items-center"}`}>
            <div className={ridotta ? "" : "min-w-0 flex-1"}>
              {ridotta ? <UserMenu placement="top" compact /> : <UserMenu placement="top" />}
            </div>
            <Link
              href="/"
              target="_blank"
              title="Vedi il sito"
              aria-label="Vedi il sito"
              className={`grid size-9 shrink-0 place-items-center rounded-xl text-adm-muted transition-colors hover:bg-white/5 hover:text-white ${focusRing}`}
            >
              <ExternalLink className="size-[1.05rem]" />
            </Link>
            <button
              type="button"
              onClick={riduci}
              title={ridotta ? "Allarga la barra" : "Riduci a icone"}
              aria-label={ridotta ? "Allarga la barra" : "Riduci a icone"}
              className={`grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl text-adm-muted transition-colors hover:bg-white/5 hover:text-white ${focusRing}`}
            >
              {ridotta ? <ChevronsRight className="size-[1.05rem]" /> : <ChevronsLeft className="size-[1.05rem]" />}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superiore sospesa (telefono): gestione sempre in vista */}
        <header className="sticky top-0 z-30 px-3 pt-3 lg:hidden">
          <div className="adm-float flex items-center gap-2 rounded-2xl px-3 py-2">
            <Brand ridotto />
            <div className="min-w-0 flex-1">
              <AttivitaToggle />
            </div>
            <button
              type="button"
              onClick={() => setCerca(true)}
              aria-label="Cerca o crea"
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-adm-muted hover:bg-white/8 hover:text-white"
            >
              <Search className="size-5" />
            </button>
            <UserMenu placement="bottom" compact />
          </div>
        </header>
        <CommandPalette open={cerca} onClose={() => setCerca(false)} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-32 sm:px-6 lg:px-8 lg:py-8 lg:pb-10">
          {!isAdmin && isAdminOnlyPath(pathname) ? (
            <EmptyState
              icon={Lock}
              title="Sezione riservata all'amministratore"
              description="Qui ci sono prezzi d'acquisto, margini e conti. Se ti serve accedere, chiedi all'amministratore di cambiarti il ruolo."
              action={
                <Link href={HOME[attivita]} className={btnSecondary}>
                  Torna a Oggi
                </Link>
              }
            />
          ) : (
            // La chiave rifà partire l'ingresso a ogni cambio di pagina o di gestione.
            <div key={`${pathname}|${attivita}`} className="adm-page">
              <SchedeSezione pathname={pathname} isAdmin={isAdmin} />
              {children}
            </div>
          )}
        </main>
      </div>

      {/* "Altro" (telefono): tutte le sezioni che non stanno nel dock */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="adm-fade-in absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Tutte le sezioni"
            className="adm-rise adm-float absolute inset-x-3 bottom-24 max-h-[75vh] overflow-y-auto rounded-2xl px-4 pb-4 pt-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{NOME_ATTIVITA[attivita]} · tutte le sezioni</h2>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Chiudi" className="grid size-8 cursor-pointer place-items-center rounded-lg text-adm-muted hover:bg-white/10 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            {groups.map((group, gi) => {
              const items = group.items.filter((i) => !primary.includes(i));
              if (items.length === 0) return null;
              return (
                <div key={gi} className="mb-4">
                  {group.title && (
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-adm-muted">{group.title}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {items.map(({ href, label, icon: Icon, badge }) => {
                      const active = isActive(pathname, href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMoreOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium ${
                            active ? "border-acc-500/40 bg-acc-600/15 text-white" : "border-adm-line bg-adm-bg/60 text-slate-200"
                          }`}
                        >
                          <Icon className={`size-4.5 ${active ? "text-acc-400" : "text-adm-muted"}`} />
                          <span className="flex-1">{label}</span>
                          <Badge value={badge ?? 0} className="rounded-full bg-acc-600 px-1.5 text-xs font-semibold text-white" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <Link href="/" target="_blank" className="flex items-center gap-2.5 rounded-xl border border-adm-line px-3 py-3 text-sm text-slate-200">
              <ExternalLink className="size-4.5 text-adm-muted" />
              Vedi il sito
            </Link>
          </div>
        </div>
      )}

      {/* Dock sospeso (telefono): le sezioni di ogni giorno, a portata di pollice */}
      <nav
        aria-label="Sezioni"
        className="fixed inset-x-3 bottom-3 z-50 mb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="adm-float grid grid-cols-5 rounded-2xl p-1.5">
          {primary.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-[11px] font-medium leading-none transition-colors ${
                  active ? "bg-acc-600/20 text-white" : "text-adm-muted"
                }`}
              >
                <span className="relative">
                  <Icon className={`size-5 ${active ? "text-acc-300" : ""}`} />
                  <Badge
                    value={badge ?? 0}
                    className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-acc-500 px-1 text-center text-[10px] font-semibold leading-4 text-white"
                  />
                </span>
                <span className="max-w-full truncate">{label}</span>
              </Link>
            );
          })}
          <button
            ref={moreBtnRef}
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            className={`relative flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-[11px] font-medium leading-none transition-colors ${
              moreOpen || moreActive ? "bg-acc-600/20 text-white" : "text-adm-muted"
            }`}
          >
            <span className="relative">
              <MoreHorizontal className={`size-5 ${moreActive && !moreOpen ? "text-acc-300" : ""}`} />
              <Badge
                value={moreBadge}
                className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-acc-500 px-1 text-center text-[10px] font-semibold leading-4 text-white"
              />
            </span>
            <span>Altro</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { ready, user } = useAdmin();

  // Prima di aver letto la sessione non si mostra né il login né i dati.
  if (!ready) return <div className="min-h-screen bg-adm-bg" />;
  if (!user) return <AdminLogin />;

  return (
    <ToastProvider>
      {/* Fuori dai pannelli di modifica: anche loro sanno in quale gestione si sta lavorando. */}
      <AttivitaProvider>
        <EditorsProvider>
          <Frame>{children}</Frame>
        </EditorsProvider>
      </AttivitaProvider>
    </ToastProvider>
  );
}
