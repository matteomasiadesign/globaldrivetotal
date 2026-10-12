import { notFound } from "next/navigation";
import NoleggioView from "@/components/admin/gestionale/NoleggioView";
import { SEZIONI_NOLEGGIO } from "@/lib/gestionale/rent";

export default async function SezioneNoleggioPage({ params }: { params: Promise<{ sezione: string }> }) {
  const { sezione } = await params;
  const trovata = SEZIONI_NOLEGGIO.find((s) => s === sezione && s !== "panoramica");
  if (!trovata) notFound();
  return <NoleggioView sezione={trovata} />;
}
