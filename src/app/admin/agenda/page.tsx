import AgendaView, { type AgendaTab } from "@/components/admin/views/AgendaView";

const TABS: AgendaTab[] = ["prossimi", "calendario", "confermare", "storico"];

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  const initialTab = TABS.find((t) => t === tab);
  return <AgendaView key={initialTab ?? "default"} initialTab={initialTab} />;
}
