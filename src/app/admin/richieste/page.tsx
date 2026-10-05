import LeadsView, { type LeadTab } from "@/components/admin/views/LeadsView";

const TABS: LeadTab[] = ["nuovo", "in_gestione", "chiuse"];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { stato } = await searchParams;
  const initialTab = TABS.find((t) => t === stato);
  // `key` rimonta la vista se si arriva con un altro filtro dall'URL.
  return <LeadsView key={initialTab ?? "default"} initialTab={initialTab} />;
}
