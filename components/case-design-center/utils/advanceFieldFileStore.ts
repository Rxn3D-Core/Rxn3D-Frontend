/** In-memory store for advance field file uploads until slip submit. */
const filesByKey = new Map<string, File>();

export function advanceFieldFileKey(
  arch: string,
  cardId: number,
  fieldId: number,
): string {
  return `${arch}_${cardId}_af_${fieldId}`;
}

export function setAdvanceFieldFile(key: string, file: File | null): void {
  if (file) filesByKey.set(key, file);
  else filesByKey.delete(key);
}

export function getAdvanceFieldFile(key: string): File | undefined {
  return filesByKey.get(key);
}

/** Map field id string → File for a card snapshot. */
export function collectAdvanceFieldFilesForCard(
  arch: string,
  cardId: number,
): Record<string, File> {
  const prefix = `${arch}_${cardId}_af_`;
  const out: Record<string, File> = {};
  for (const [key, file] of filesByKey.entries()) {
    if (key.startsWith(prefix)) {
      out[key.slice(prefix.length)] = file;
    }
  }
  return out;
}

export function clearAdvanceFieldFiles(): void {
  filesByKey.clear();
}
