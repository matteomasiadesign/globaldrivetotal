import type { Metadata, Viewport } from "next";
import { AdminProvider } from "@/context/AdminContext";
import { GestionaleProvider } from "@/context/GestionaleContext";
import AdminShell from "@/components/admin/AdminShell";

// L'area admin è installabile come app (manifest in public/manifest.json, ambito /admin).
export const metadata: Metadata = {
  title: "Gestionale | Global Drive",
  robots: { index: false, follow: false },
  manifest: "/manifest.json",
  icons: { apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "Global Drive", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#070b16",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <GestionaleProvider>
        <AdminShell>{children}</AdminShell>
      </GestionaleProvider>
    </AdminProvider>
  );
}
