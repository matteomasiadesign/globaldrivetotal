import NoleggioView, { type NoleggioTab } from "@/components/admin/gestionale/NoleggioView";

const TABS: NoleggioTab[] = ["panoramica", "prenotazioni", "calendario", "preventivi", "flotta", "tariffe"];

export default async function NoleggioPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  const initialTab = TABS.find((t) => t === tab);
  return <NoleggioView key={initialTab ?? "default"} initialTab={initialTab} />;
}
