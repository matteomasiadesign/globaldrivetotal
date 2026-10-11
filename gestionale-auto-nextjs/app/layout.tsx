import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegistraServiceWorker from "@/components/RegistraServiceWorker";

export const metadata: Metadata = {
  title: "Global Drive & Rent",
  description: "Gestionale per rivendita e noleggio auto",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Global Group",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1B1F23",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        {children}
        <RegistraServiceWorker />
      </body>
    </html>
  );
}
