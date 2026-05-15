type ExtractionMeta = {
  code: string;
  name: string;
  visibility_type?: string;
  overlay?: string;
};

type ClaspOverlayImageParams = {
  toothNumber: number;
  claspTeeth: number[];
  toothExtractionMap?: Record<number, string>;
  extractionImagesByCode?: Record<string, Record<number, string | null>>;
  extractionsByCode?: Record<string, ExtractionMeta>;
};

function isClaspExtraction(meta: ExtractionMeta | undefined): boolean {
  if (!meta) return false;
  const normalizedCode = meta.code.trim().toUpperCase();
  if (normalizedCode === "CLASP" || normalizedCode.startsWith("CLASP_")) return true;
  const normalizedName = meta.name.trim().toLowerCase();
  return normalizedName === "clasp" || normalizedName === "clasps";
}

function isImageOverlayClasp(meta: ExtractionMeta | undefined): boolean {
  return (
    isClaspExtraction(meta) &&
    meta?.visibility_type === "Image" &&
    meta?.overlay === "Yes"
  );
}

export function getClaspOverlayImageUrl({
  toothNumber,
  claspTeeth,
  toothExtractionMap = {},
  extractionImagesByCode = {},
  extractionsByCode = {},
}: ClaspOverlayImageParams): string | null {
  if (!claspTeeth.includes(toothNumber)) return null;

  const mappedCode = toothExtractionMap[toothNumber];
  if (mappedCode) {
    const mappedExtraction = extractionsByCode[mappedCode];
    const mappedUrl = extractionImagesByCode[mappedCode]?.[toothNumber];
    if (isImageOverlayClasp(mappedExtraction) && mappedUrl) {
      return mappedUrl;
    }
  }

  for (const [code, extraction] of Object.entries(extractionsByCode)) {
    const url = extractionImagesByCode[code]?.[toothNumber];
    if (isImageOverlayClasp(extraction) && url) {
      return url;
    }
  }

  return null;
}
