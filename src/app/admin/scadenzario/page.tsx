import ScadenzarioView, { type ScadenzarioTab } from "@/components/admin/gestionale/ScadenzarioView";

const TABS: ScadenzarioTab[] = ["incassi", "pagamenti"];

export default async function ScadenzarioPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  const initialTab = TABS.find((t) => t === tab);
  return <ScadenzarioView key={initialTab ?? "default"} initialTab={initialTab} />;
}
