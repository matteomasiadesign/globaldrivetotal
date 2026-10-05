import DocumentsView from "@/components/admin/views/DocumentsView";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { auto, filtro } = await searchParams;
  const carId = typeof auto === "string" ? auto : undefined;
  const onlyIncomplete = filtro === "incompleti";
  return (
    <DocumentsView
      key={`${carId ?? ""}-${onlyIncomplete}`}
      initialCarId={carId}
      onlyIncomplete={onlyIncomplete}
    />
  );
}
