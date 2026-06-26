/**
 * Image-only file helpers for the driver pickup/drop-off photo.
 *
 * The backend accepts photos as multipart files keyed by slip id
 * (`images[{slip_id}]`). We keep the original File for upload and a data-URL
 * for inline preview. Only image files within the size limit are accepted.
 *
 * Allowed types (per API): jpeg, jpg, png, gif, webp. Max 10MB each.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

export type UploadedImage = {
  id: string;
  name: string;
  /** Original file — sent to the backend as multipart. */
  file: File;
  /** Full data URL ("data:<mime>;base64,<data>") — for inline preview only. */
  dataUrl: string;
  size: number;
};

export function isAllowedImage(file: File): boolean {
  return (
    typeof file.type === "string" &&
    (ALLOWED_IMAGE_TYPES.includes(file.type) || file.type.startsWith("image/"))
  );
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read image"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert files to UploadedImage entries, skipping non-images and oversized
 * files. Returns converted images and a list of rejection reasons.
 */
export async function filesToUploadedImages(
  files: FileList | File[]
): Promise<{ images: UploadedImage[]; rejected: string[] }> {
  const list = Array.from(files);
  const images: UploadedImage[] = [];
  const rejected: string[] = [];

  for (const file of list) {
    if (!isAllowedImage(file)) {
      rejected.push(`${file.name} (not an image)`);
      continue;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      rejected.push(`${file.name} (over 10MB)`);
      continue;
    }
    const dataUrl = await fileToDataUrl(file);
    images.push({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      file,
      dataUrl,
      size: file.size,
    });
  }

  return { images, rejected };
}
