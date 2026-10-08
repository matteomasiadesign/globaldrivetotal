import MovimentiView from "@/components/admin/gestionale/MovimentiView";

export default async function MovimentiPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { auto } = await searchParams;
  const initialAuto = typeof auto === "string" ? auto : undefined;
  return <MovimentiView key={initialAuto ?? "tutte"} initialAuto={initialAuto} />;
}
