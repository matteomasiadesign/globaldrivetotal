// Compressione delle foto nel browser, prima di qualunque upload. Lato storage
// arriva sempre un file piccolo: lato lungo max 1600px, WebP (JPEG se il browser
// non sa scrivere WebP). Passando dal canvas i metadati EXIF (GPS compreso) si
// perdono e l'orientamento scattato dal telefono viene applicato ai pixel.

export const MAX_EDGE = 1600;
export const QUALITY = 0.8;
export const MAX_ORIGINAL_BYTES = 30 * 1024 * 1024;

export interface CompressedPhoto {
  blob: Blob;
  width: number;
  height: number;
  /** Peso del file originale, per mostrare il risparmio. */
  originalBytes: number;
}

export class PhotoError extends Error {}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError(`"${file.name}" non è un'immagine leggibile (usa JPG, PNG o WebP).`);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  if (!file.type.startsWith("image/")) {
    throw new PhotoError(`"${file.name}" non è un'immagine.`);
  }
  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new PhotoError(`"${file.name}" supera i 30 MB.`);
  }

  const bitmap = await decode(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("Il browser non riesce a elaborare le immagini.");
  // Sfondo bianco: i PNG trasparenti diventerebbero neri in JPEG.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = (await toBlob(canvas, "image/webp")) ?? (await toBlob(canvas, "image/jpeg"));
  if (!blob) throw new PhotoError(`Compressione di "${file.name}" non riuscita.`);

  // Se l'originale era già più leggero (e non serviva ridimensionarlo) teniamo quello.
  const keepOriginal = scale === 1 && file.size <= blob.size && file.type === blob.type;
  return {
    blob: keepOriginal ? file : blob,
    width,
    height,
    originalBytes: file.size,
  };
}

export const formatBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
