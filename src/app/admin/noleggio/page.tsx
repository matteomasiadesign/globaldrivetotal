import { redirect } from "next/navigation";
import NoleggioView from "@/components/admin/gestionale/NoleggioView";
import { SEZIONI_NOLEGGIO } from "@/lib/gestionale/rent";

// La «Oggi» di Global Rent. I vecchi link con ?tab= portano alla pagina della sezione.
export default async function NoleggioPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  const sezione = SEZIONI_NOLEGGIO.find((s) => s === tab);
  if (sezione && sezione !== "panoramica") redirect(`/admin/noleggio/${sezione}`);
  return <NoleggioView />;
}
