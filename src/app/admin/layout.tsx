import type { Metadata } from "next";
import { AdminProvider } from "@/context/AdminContext";
import { GestionaleProvider } from "@/context/GestionaleContext";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Gestionale | Global Drive",
  robots: { index: false, follow: false },
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
