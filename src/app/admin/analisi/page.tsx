import AnalisiView, { type AnalisiTab } from "@/components/admin/gestionale/AnalisiView";

const TABS: AnalisiTab[] = ["mensile", "costi"];

export default async function AnalisiPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  const initialTab = TABS.find((t) => t === tab);
  return <AnalisiView key={initialTab ?? "default"} initialTab={initialTab} />;
}
