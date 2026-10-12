"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  Car,
  ChevronsUpDown,
  ExternalLink,
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
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { useGestionale } from "@/context/GestionaleContext";
import { isAdminOnlyPath } from "@/lib/admin/access";
import { isOpenAppointment } from "@/lib/admin/constants";
import AdminLogin from "./AdminLogin";
import CommandPalette from "./CommandPalette";
import { EditorsProvider } from "./AdminEditors";
import { EmptyState } from "./ui/Layout";
import RowMenu from "./ui/RowMenu";
import { btnSecondary } from "./ui/styles";
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

function useNavGroups(): NavGroup[] {
  const { leads, appointments, today, isAdmin } = useAdmin();
  const { movimenti } = useGestionale();
  const newLeads = leads.filter((l) => l.status === "nuovo").length;
  const todayOpen = appointments.filter(
    (a) => a.date === today && isOpenAppointment(a.status)
  ).length;
  const overdue = movimenti.filter(
    (m) => m.statoPagamento === "Da saldare" && m.dataScadenza && m.dataScadenza < today
  ).length;

  // L'operatore non vede le sezioni dei conti (vedi lib/admin/access.ts).
  return allNavGroups(newLeads, todayOpen, overdue, isAdmin)
    .map((g) => ({ ...g, items: g.items.filter((i) => isAdmin || !isAdminOnlyPath(i.href)) }))
    .filter((g) => g.items.length > 0);
}

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

function allNavGroups(newLeads: number, todayOpen: number, overdue: number, isAdmin: boolean): NavGroup[] {
  return [
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
    {
      title: "Contabilità",
      items: [
        // Conti = Movimenti, Scadenzario e Banca; Report = IVA e Analisi (vedi SEZIONI).
        { href: "/admin/movimenti", label: "Conti", icon: Receipt, badge: overdue },
        { href: "/admin/iva", label: "Report", icon: BarChart3 },
      ],
    },
    {
      title: "Clienti e noleggio",
      items: [
        { href: "/admin/contatti", label: "Contatti", icon: Users },
        { href: "/admin/noleggio", label: "Noleggio", icon: KeyRound },
      ],
    },
    {
      title: "Sistema",
      items: isAdmin
        ? [{ href: "/admin/impostazioni", label: "Impostazioni", icon: Settings }]
        : [{ href: "/admin/sito", label: "Sito", icon: Globe }],
    },
  ];
}

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  const sezione = SEZIONI.find((s) => s.voce === href);
  return sezione ? sezioneDi(pathname) === sezione : pathname.startsWith(href);
}

/** Schede in alto per passare tra le pagine dello stesso gruppo (Conti, Report, Impostazioni). */
function SchedeSezione({ pathname, isAdmin }: { pathname: string; isAdmin: boolean }) {
  const sezione = sezioneDi(pathname);
  const pagine = sezione?.pagine.filter((p) => isAdmin || !isAdminOnlyPath(p.href)) ?? [];
  if (pagine.length < 2) return null;
  return (
    <nav aria-label="Pagine della sezione" className="no-scrollbar -mt-1 mb-5 flex gap-1 overflow-x-auto border-b border-adm-line">
      {pagine.map((p) => {
        const attiva = pathname === p.href || pathname.startsWith(`${p.href}/`);
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={attiva ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-400 ${
              attiva ? "border-blue-500 text-white" : "border-transparent text-adm-muted hover:text-white"
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </nav>
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
          ? "flex cursor-pointer items-center gap-2 rounded-lg p-1 hover:bg-white/8"
          : "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-white/8"
      }
      trigger={
        <>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-semibold text-white">
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

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <span className="relative size-8 shrink-0">
        <Image src="/logo.webp" alt="" fill className="object-contain" />
      </span>
      <span className="text-sm font-semibold leading-tight text-white">
        Global Drive
        <span className="block text-xs font-normal text-adm-muted">Gestionale</span>
      </span>
    </Link>
  );
}

function Badge({ value, className }: { value: number; className: string }) {
  return value ? <span className={className}>{value}</span> : null;
}

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const { isAdmin } = useAdmin();
  const [cerca, setCerca] = useState(false);

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
  const groups = useNavGroups();
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
    <div className="min-h-screen bg-adm-bg text-slate-100 lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-adm-line bg-adm-surface lg:flex">
        <div className="px-4 py-5">
          <Brand />
          <button
            type="button"
            onClick={() => setCerca(true)}
            className="mt-4 flex w-full cursor-pointer items-center gap-2 rounded-lg border border-adm-line bg-white/5 px-3 py-2 text-sm text-adm-muted transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Cerca o crea…</span>
            <kbd className="rounded border border-adm-line px-1 text-[11px]">Ctrl K</kbd>
          </button>
        </div>

        <nav aria-label="Sezioni" className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.title && (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-adm-muted">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon, badge }) => {
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-400 ${
                        active
                          ? "bg-blue-600/15 text-white"
                          : "text-adm-muted hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className={`size-4.5 ${active ? "text-blue-400" : ""}`} />
                      <span className="flex-1">{label}</span>
                      <Badge
                        value={badge ?? 0}
                        className="rounded-full bg-blue-600 px-1.5 text-xs font-semibold tabular-nums text-white"
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-adm-line p-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-adm-muted transition-colors hover:bg-white/5 hover:text-white"
          >
            <ExternalLink className="size-4.5" />
            <span>Vedi il sito</span>
          </Link>
          <UserMenu placement="top" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superiore (mobile) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-adm-line bg-adm-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <Brand />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCerca(true)}
              aria-label="Cerca o crea"
              className="grid size-10 cursor-pointer place-items-center rounded-lg text-adm-muted hover:bg-white/8 hover:text-white"
            >
              <Search className="size-5" />
            </button>
            <UserMenu placement="bottom" compact />
          </div>
        </header>
        <CommandPalette open={cerca} onClose={() => setCerca(false)} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-10">
          {!isAdmin && isAdminOnlyPath(pathname) ? (
            <EmptyState
              icon={Lock}
              title="Sezione riservata all'amministratore"
              description="Qui ci sono prezzi d'acquisto, margini e conti. Se ti serve accedere, chiedi all'amministratore di cambiarti il ruolo."
              action={
                <Link href="/admin" className={btnSecondary}>
                  Torna a Oggi
                </Link>
              }
            />
          ) : (
            <>
              <SchedeSezione pathname={pathname} isAdmin={isAdmin} />
              {children}
            </>
          )}
        </main>
      </div>

      {/* "Altro" (mobile): tutte le sezioni che non stanno nella barra */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="adm-fade-in absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Tutte le sezioni"
            className="adm-rise absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-adm-line bg-adm-surface px-4 pb-24 pt-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Tutte le sezioni</h2>
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
                            active ? "border-blue-500/40 bg-blue-600/15 text-white" : "border-adm-line bg-adm-bg text-slate-200"
                          }`}
                        >
                          <Icon className={`size-4.5 ${active ? "text-blue-400" : "text-adm-muted"}`} />
                          <span className="flex-1">{label}</span>
                          <Badge value={badge ?? 0} className="rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white" />
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

      {/* Navigazione (mobile): le sezioni di ogni giorno, a portata di pollice */}
      <nav
        aria-label="Sezioni"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-adm-line bg-adm-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {primary.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMoreOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center gap-1 px-0.5 py-2.5 text-[11px] font-medium leading-none transition-colors ${
                active ? "text-white" : "text-adm-muted"
              }`}
            >
              <span className="relative">
                <Icon className={`size-5 ${active ? "text-blue-400" : ""}`} />
                <Badge
                  value={badge ?? 0}
                  className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-blue-600 px-1 text-center text-[10px] font-semibold leading-4 text-white"
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
          className={`relative flex min-w-0 cursor-pointer flex-col items-center gap-1 px-0.5 py-2.5 text-[11px] font-medium leading-none transition-colors ${
            moreOpen || moreActive ? "text-white" : "text-adm-muted"
          }`}
        >
          <span className="relative">
            <MoreHorizontal className={`size-5 ${moreActive && !moreOpen ? "text-blue-400" : ""}`} />
            <Badge
              value={moreBadge}
              className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-blue-600 px-1 text-center text-[10px] font-semibold leading-4 text-white"
            />
          </span>
          <span>Altro</span>
        </button>
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
      <EditorsProvider>
        <Frame>{children}</Frame>
      </EditorsProvider>
    </ToastProvider>
  );
}
