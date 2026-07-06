import type { RetentionOptionItem } from "@/components/retention-type-popover";

type RetentionToothImage = {
  tooth_number: number;
  image_url?: string | null;
  image?: string | null;
};

function nonEmptyUrl(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function imageFromToothImages(
  images: RetentionToothImage[] | undefined,
  toothNumber: number
): string | null {
  if (!images?.length) return null;
  const match = images.find((img) => Number(img.tooth_number) === toothNumber);
  if (!match) return null;
  return nonEmptyUrl(match.image_url) ?? nonEmptyUrl(match.image);
}

function globalSampleImageUrl(opt: RetentionOptionItem): string | null {
  const gc = opt.global_connection;
  if (!gc || typeof gc !== "object") return null;
  return nonEmptyUrl(
    typeof gc.sample_image_url === "string" ? gc.sample_image_url : null
  );
}

/** Resolve retention option image for a tooth: images[] → image_url → global sample. */
export function resolveRetentionOptionImageUrl(
  opt: RetentionOptionItem,
  toothNumber: number
): string | null {
  const fromImages = imageFromToothImages(opt.images, toothNumber);
  if (fromImages) return fromImages;

  const fromTopLevel =
    nonEmptyUrl(opt.image_url) ??
    nonEmptyUrl(opt.retention_option?.image_url) ??
    nonEmptyUrl(opt.lab_retention_option?.image_url);
  if (fromTopLevel) return fromTopLevel;

  return globalSampleImageUrl(opt);
}
