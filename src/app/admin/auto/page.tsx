import CarsView, { type CarFilter } from "@/components/admin/views/CarsView";

const FILTERS: CarFilter[] = ["tutte", "disponibili", "trattativa", "vendute", "nascoste"];

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { filtro } = await searchParams;
  const initialFilter = FILTERS.find((f) => f === filtro);
  return <CarsView key={initialFilter ?? "default"} initialFilter={initialFilter} />;
}
