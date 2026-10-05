"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Car,
  ChevronsUpDown,
  ExternalLink,
  FolderOpen,
  Globe,
  Inbox,
  LayoutDashboard,
  LogOut,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { isOpenAppointment } from "@/lib/admin/constants";
import AdminLogin from "./AdminLogin";
import { EditorsProvider } from "./AdminEditors";
import RowMenu from "./ui/RowMenu";
import { ToastProvider } from "./ui/Toast";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Numero da mostrare accanto alla voce: cose che aspettano te. */
  badge?: number;
}

function useNavItems(): NavItem[] {
  const { leads, appointments, today } = useAdmin();
  const newLeads = leads.filter((l) => l.status === "nuovo").length;
  const todayOpen = appointments.filter(
    (a) => a.date === today && isOpenAppointment(a.status)
  ).length;

  return [
    { href: "/admin", label: "Oggi", icon: LayoutDashboard },
    { href: "/admin/richieste", label: "Richieste", icon: Inbox, badge: newLeads },
    { href: "/admin/agenda", label: "Agenda", icon: CalendarDays, badge: todayOpen },
    { href: "/admin/auto", label: "Parco auto", icon: Car },
    { href: "/admin/documenti", label: "Documenti", icon: FolderOpen },
    { href: "/admin/sito", label: "Sito", icon: Globe },
  ];
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

function UserMenu({ placement, compact = false }: { placement: "top" | "bottom"; compact?: boolean }) {
  const { user, logout, resetDemoData } = useAdmin();
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
                <span className="block truncate text-xs text-adm-muted">{user?.email}</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-adm-muted" />
            </>
          )}
        </>
      }
      items={[
        {
          label: "Ripristina dati demo",
          icon: RotateCcw,
          confirm: "Conferma: cancella le modifiche",
          onSelect: resetDemoData,
        },
        { label: "Esci", icon: LogOut, onSelect: logout },
      ]}
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

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const items = useNavItems();

  return (
    <div className="min-h-screen bg-adm-bg text-slate-100 lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-adm-line bg-adm-surface lg:flex">
        <div className="px-4 py-5">
          <Brand />
        </div>

        <nav aria-label="Sezioni" className="flex-1 space-y-0.5 px-3">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600/15 text-white"
                    : "text-adm-muted hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`size-4.5 ${active ? "text-blue-400" : ""}`} />
                <span className="flex-1">{label}</span>
                {badge ? (
                  <span className="rounded-full bg-blue-600 px-1.5 text-xs font-semibold tabular-nums text-white">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
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
          <UserMenu placement="bottom" compact />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Navigazione (mobile): le stesse sezioni, a portata di pollice */}
      <nav
        aria-label="Sezioni"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-adm-line bg-adm-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center gap-1 px-0.5 py-2.5 text-[11px] font-medium leading-none transition-colors ${
                active ? "text-white" : "text-adm-muted"
              }`}
            >
              <span className="relative">
                <Icon className={`size-5 ${active ? "text-blue-400" : ""}`} />
                {badge ? (
                  <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-blue-600 px-1 text-center text-[10px] font-semibold leading-4 text-white">
                    {badge}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
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
