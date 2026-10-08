// Unico punto di contatto con lo storage dei documenti delle auto (libretto, fatture,
// perizie, foto). Oggi i file stanno nel browser, in IndexedDB (il localStorage è troppo
// piccolo per i PDF); quando arriva Supabase si riscrivono SOLO queste tre funzioni:
//
//   saveVehicleFile      → supabase.storage.from("vehicle-documents").upload(`${folder}/${uuid}-${nome}`, file)
//                          e ritorna il percorso nel bucket
//   getVehicleFileUrl    → supabase.storage.from("vehicle-documents").createSignedUrl(path, 3600)
//   deleteVehicleFile    → supabase.storage.from("vehicle-documents").remove([path])
//
// Il record del documento (VehicleDocument.storagePath) non cambia: contiene già il percorso.
// I limiti qui sotto sono gli stessi del bucket in supabase/schema.sql.

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png,.webp";

const DB_NAME = "global_drive_files";
const STORE = "files";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error("Archivio dei file non disponibile in questo browser"));
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error("Operazione sull'archivio non riuscita"));
        };
      })
  );
}

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

export function validateVehicleFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Formato non supportato: usa PDF, JPG, PNG o WEBP.";
  if (file.size > MAX_FILE_BYTES) return "Il file supera i 25 MB.";
  return null;
}

export const formatBytes = (n: number) =>
  n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

/** Salva il file e ritorna il percorso con cui ritrovarlo. */
export async function saveVehicleFile(file: File, folder: string): Promise<string> {
  const errore = validateVehicleFile(file);
  if (errore) throw new Error(errore);
  const path = `${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
  await run("readwrite", (store) => store.put(file, path));
  return path;
}

/** Un indirizzo temporaneo per aprire il file in una nuova scheda. */
export async function getVehicleFileUrl(path: string): Promise<string | null> {
  const blob = await run<Blob | undefined>("readonly", (store) => store.get(path));
  return blob ? URL.createObjectURL(blob) : null;
}

export async function deleteVehicleFile(path: string): Promise<void> {
  try {
    await run("readwrite", (store) => store.delete(path));
  } catch {
    // Un file già sparito non è un problema: il documento si rimuove comunque.
  }
}
