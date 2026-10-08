import IvaView, { type IvaTab } from "@/components/admin/gestionale/IvaView";

const TABS: IvaTab[] = ["liquidazione", "vendite", "acquisti"];

export default async function IvaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  const initialTab = TABS.find((t) => t === tab);
  return <IvaView key={initialTab ?? "default"} initialTab={initialTab} />;
}
