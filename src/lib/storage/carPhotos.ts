// Unico punto di contatto con lo storage delle foto auto. Oggi le foto finiscono
// nel localStorage come data URL (stesso posto dei dati finti delle auto);
// quando arriva Supabase si riscrivono SOLO queste due funzioni:
//
//   uploadCarPhoto → supabase.storage.from("cars").upload(`${carId}/${uuid}.webp`, blob)
//                    e ritorna getPublicUrl(path)
//   deleteCarPhoto → supabase.storage.from("cars").remove([path ricavato dall'url])
//
// Regole che tengono pulito il bucket:
//  - si carica solo al salvataggio della scheda (mai alla scelta del file),
//    così "Annulla" non lascia file orfani;
//  - le foto tolte da una scheda e quelle di un'auto eliminata vengono cancellate;
//  - le foto arrivano già compresse (vedi lib/images/compress.ts).
// Dopo la migrazione ricordarsi di aggiungere l'host Supabase in
// `images.remotePatterns` di next.config.ts.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function uploadCarPhoto(blob: Blob, _carFolder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lettura della foto non riuscita"));
    reader.readAsDataURL(blob);
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deleteCarPhoto(_url: string): Promise<void> {
  // Le data URL vivono dentro la scheda: eliminarla le elimina. Con Supabase
  // qui va la remove() sull'oggetto del bucket (ignorando gli URL non nostri,
  // come le vecchie foto Unsplash).
}
