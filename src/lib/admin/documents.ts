import type { DocumentCategory, VehicleDocument } from "@/types/admin";
import { REQUIRED_DOCUMENT_CATEGORIES } from "./constants";

export interface Dossier {
  documents: VehicleDocument[];
  /** Categorie obbligatorie ancora senza nessun documento. */
  missing: DocumentCategory[];
  /** Quante delle categorie obbligatorie sono coperte. */
  covered: number;
  total: number;
  complete: boolean;
}

// Il "dossier" di un'auto è l'insieme dei suoi documenti; è completo quando ogni
// categoria obbligatoria ne ha almeno uno.
export function getDossier(carId: string, documents: VehicleDocument[]): Dossier {
  const mine = documents.filter((d) => d.carId === carId);
  const missing = REQUIRED_DOCUMENT_CATEGORIES.filter(
    (cat) => !mine.some((d) => d.category === cat)
  );
  const total = REQUIRED_DOCUMENT_CATEGORIES.length;
  return {
    documents: mine,
    missing,
    covered: total - missing.length,
    total,
    complete: missing.length === 0,
  };
}
