/**
 * Image (and optional video) helpers for driver / ready-to-send proof media.
 *
 * The backend accepts files as multipart (`image` or `images[{slip_id}]`).
 * We keep the original File for upload and a preview URL (data URL for images,
 * object URL for video).
 *
 * Images (default): jpeg, jpg, png, gif, webp, svg — max 10MB.
 * Video (opt-in): mp4, mov, avi — max 500MB (matches slip attachments).
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500MB

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/avi",
  "video/msvideo",
];

const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi"];

export type UploadedImage = {
  id: string;
  name: string;
  /** Original file — sent to the backend as multipart. */
  file: File;
  /** Preview URL (data URL for images, object URL for video). */
  dataUrl: string;
  size: number;
};

export type FilesToUploadedImagesOptions = {
  /** When true, also accept mp4/mov/avi (ready-to-send proof media). */
  allowVideo?: boolean;
};

export function isAllowedImage(file: File): boolean {
  if (typeof file.type === "string" && file.type.length > 0) {
    if (
      ALLOWED_IMAGE_TYPES.includes(file.type) ||
      file.type.startsWith("image/")
    ) {
      return true;
    }
  }
  const name = file.name.toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function isAllowedVideo(file: File): boolean {
  if (typeof file.type === "string" && file.type.length > 0) {
    if (
      ALLOWED_VIDEO_TYPES.includes(file.type) ||
      file.type.startsWith("video/")
    ) {
      const name = file.name.toLowerCase();
      // Prefer extension check so exotic video/* types still must be mp4/mov/avi.
      if (ALLOWED_VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext))) {
        return true;
      }
      return ALLOWED_VIDEO_TYPES.includes(file.type);
    }
  }
  const name = file.name.toLowerCase();
  return ALLOWED_VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function isUploadedVideo(file: File): boolean {
  return isAllowedVideo(file);
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
 * Convert files to UploadedImage entries, skipping disallowed / oversized
 * files. Returns converted entries and a list of rejection reasons.
 */
export async function filesToUploadedImages(
  files: FileList | File[],
  options: FilesToUploadedImagesOptions = {}
): Promise<{ images: UploadedImage[]; rejected: string[] }> {
  const allowVideo = Boolean(options.allowVideo);
  const list = Array.from(files);
  const images: UploadedImage[] = [];
  const rejected: string[] = [];

  for (const file of list) {
    const asImage = isAllowedImage(file);
    const asVideo = allowVideo && isAllowedVideo(file);
    if (!asImage && !asVideo) {
      rejected.push(
        `${file.name} (${allowVideo ? "not an image or allowed video" : "not an image"})`
      );
      continue;
    }
    if (asVideo && file.size > MAX_VIDEO_BYTES) {
      rejected.push(`${file.name} (over 500MB)`);
      continue;
    }
    if (asImage && !asVideo && file.size > MAX_IMAGE_BYTES) {
      rejected.push(`${file.name} (over 10MB)`);
      continue;
    }
    // Object URL for video avoids loading large files into a data URL.
    const dataUrl = asVideo
      ? URL.createObjectURL(file)
      : await fileToDataUrl(file);
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
