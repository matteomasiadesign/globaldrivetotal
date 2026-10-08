import VeicoloView from "@/components/admin/gestionale/VeicoloView";

export default async function VeicoloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VeicoloView veicoloId={id} />;
}
