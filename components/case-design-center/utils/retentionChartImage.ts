import type { RetentionOptionItem } from "@/components/retention-type-popover";

export type RetentionChartType = "Implant" | "Prep" | "Pontic";
export type RetentionArch = "maxillary" | "mandibular";

export const MAXILLARY_CHART_TEETH = Array.from({ length: 16 }, (_, i) => i + 1);
export const MANDIBULAR_CHART_TEETH = Array.from({ length: 16 }, (_, i) => i + 17);

const NAME_TO_RETENTION_TYPE: Record<string, RetentionChartType> = {
  Implant: "Implant",
  Prepped: "Prep",
  Prep: "Prep",
  Pontic: "Pontic",
};

function normalizeChartType(raw: string | null | undefined): RetentionChartType | null {
  if (!raw) return null;
  if (NAME_TO_RETENTION_TYPE[raw]) return NAME_TO_RETENTION_TYPE[raw];
  if (raw === "Implant" || raw === "Prep" || raw === "Pontic") return raw;
  return null;
}

function nonEmptyUrl(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

export function getArchForTooth(toothNumber: number): RetentionArch | null {
  if (toothNumber >= 1 && toothNumber <= 16) return "maxillary";
  if (toothNumber >= 17 && toothNumber <= 32) return "mandibular";
  return null;
}

export function getChartTeethForArch(arch: RetentionArch): number[] {
  return arch === "maxillary" ? MAXILLARY_CHART_TEETH : MANDIBULAR_CHART_TEETH;
}

function toothImageFromImagesArray(
  images: RetentionOptionItem["images"],
  toothNumber: number
): string | null {
  if (!images?.length) return null;
  const match = images.find((img) => Number(img.tooth_number) === toothNumber);
  if (!match) return null;
  return nonEmptyUrl(match.image_url) ?? nonEmptyUrl(match.image);
}

function optionChartType(opt: RetentionOptionItem): RetentionChartType | null {
  const raw =
    opt.tooth_chart_type ||
    opt.retention_option?.tooth_chart_type ||
    opt.lab_retention_option?.tooth_chart_type ||
    opt.name;
  return normalizeChartType(raw);
}

function resolveSelectorShape(opt: RetentionOptionItem): string | null {
  const raw =
    opt.selector_shape ??
    opt.retention_option?.selector_shape ??
    opt.lab_retention_option?.selector_shape;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

export function getRetentionChartTypeForTooth(
  retentionTypesByTooth: Record<number, Array<RetentionChartType>> | undefined,
  toothNumber: number
): RetentionChartType | null {
  const types = retentionTypesByTooth?.[toothNumber] ?? [];
  if (!types.length) return null;
  return normalizeChartType(types[0]);
}

export function findRetentionOptionForChartType(
  retentionOptions: RetentionOptionItem[] | undefined,
  chartType: RetentionChartType
): RetentionOptionItem | null {
  if (!retentionOptions?.length) return null;

  for (const opt of retentionOptions) {
    if (optionChartType(opt) === chartType) {
      return opt;
    }
  }

  return null;
}

/** True when the retention option has a per-tooth image for every tooth on the arch (16 teeth). */
export function retentionOptionHasFullArchImages(
  opt: RetentionOptionItem,
  arch: RetentionArch
): boolean {
  return getChartTeethForArch(arch).every(
    (toothNumber) => toothImageFromImagesArray(opt.images, toothNumber) !== null
  );
}

function getRetentionOptionForTooth(
  toothNumber: number,
  retentionTypesByTooth: Record<number, Array<RetentionChartType>> | undefined,
  retentionOptions: RetentionOptionItem[] | undefined
): RetentionOptionItem | null {
  const chartType = getRetentionChartTypeForTooth(retentionTypesByTooth, toothNumber);
  if (!chartType) return null;
  return findRetentionOptionForChartType(retentionOptions, chartType);
}

/**
 * Chart tooth image: only when all 16 arch images exist in `images[]`, return this tooth's URL.
 * Does not use image_url or global sample fallbacks (popover still does).
 */
export function getRetentionChartImageUrl(
  toothNumber: number,
  retentionTypesByTooth: Record<number, Array<RetentionChartType>> | undefined,
  retentionOptions: RetentionOptionItem[] | undefined
): string | null {
  const arch = getArchForTooth(toothNumber);
  if (!arch) return null;

  const opt = getRetentionOptionForTooth(
    toothNumber,
    retentionTypesByTooth,
    retentionOptions
  );
  if (!opt || !retentionOptionHasFullArchImages(opt, arch)) return null;

  return toothImageFromImagesArray(opt.images, toothNumber);
}

/** Selector shape for chart when the arch does not have a full 16-tooth image set. */
export function getRetentionSelectorShape(
  toothNumber: number,
  retentionTypesByTooth: Record<number, Array<RetentionChartType>> | undefined,
  retentionOptions: RetentionOptionItem[] | undefined
): string | null {
  const arch = getArchForTooth(toothNumber);
  if (!arch) return null;
  if (!getRetentionChartTypeForTooth(retentionTypesByTooth, toothNumber)) return null;

  const opt = getRetentionOptionForTooth(
    toothNumber,
    retentionTypesByTooth,
    retentionOptions
  );
  if (!opt || retentionOptionHasFullArchImages(opt, arch)) return null;

  return resolveSelectorShape(opt);
}

export function isToothShowingRetentionChartImage(
  toothNumber: number,
  retentionTypesByTooth: Record<number, Array<RetentionChartType>> | undefined,
  retentionOptions: RetentionOptionItem[] | undefined
): boolean {
  return !!getRetentionChartImageUrl(toothNumber, retentionTypesByTooth, retentionOptions);
}

export function isToothShowingRetentionSelectorShape(
  toothNumber: number,
  retentionTypesByTooth: Record<number, Array<RetentionChartType>> | undefined,
  retentionOptions: RetentionOptionItem[] | undefined
): boolean {
  return !!getRetentionSelectorShape(toothNumber, retentionTypesByTooth, retentionOptions);
}

export function isToothShowingRetentionOnChart(
  toothNumber: number,
  retentionTypesByTooth: Record<number, Array<RetentionChartType>> | undefined,
  retentionOptions: RetentionOptionItem[] | undefined
): boolean {
  return (
    isToothShowingRetentionChartImage(toothNumber, retentionTypesByTooth, retentionOptions) ||
    isToothShowingRetentionSelectorShape(toothNumber, retentionTypesByTooth, retentionOptions)
  );
}
