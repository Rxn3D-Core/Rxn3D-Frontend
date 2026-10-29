export type CachedCaseDesignAttachment = {
  file?: File;
  url?: string;
  type?: string;
  archived?: boolean;
  remoteId?: number;
  generatedPath?: string;
  notes?: string;
  description?: string;
  source?: "attachment";
  pending?: boolean;
  _impressionKey?: string;
};

function readCache(): CachedCaseDesignAttachment[] {
  if (typeof window === "undefined") return [];
  const cached = (window as unknown as { __caseDesignAttachments?: CachedCaseDesignAttachment[] })
    .__caseDesignAttachments;
  return Array.isArray(cached) ? cached : [];
}

function writeCache(items: CachedCaseDesignAttachment[]) {
  if (typeof window === "undefined") return;
  (window as unknown as { __caseDesignAttachments: CachedCaseDesignAttachment[] }).__caseDesignAttachments =
    items;
}

export function pendingAttachmentIdsFromCache(): number[] {
  return readCache()
    .filter((item) => item.source === "attachment" && item.pending && typeof item.remoteId === "number")
    .map((item) => item.remoteId as number);
}

export function rememberPendingAttachment(item: {
  remoteId: number;
  file: File;
  url: string;
  notes?: string;
}) {
  const next = readCache().filter((cached) => cached.remoteId !== item.remoteId);
  next.push({
    file: item.file,
    url: item.url,
    remoteId: item.remoteId,
    notes: item.notes,
    source: "attachment",
    pending: true,
    archived: false,
  });
  writeCache(next);
}

export function forgetPendingAttachment(remoteId: number) {
  writeCache(readCache().filter((item) => item.remoteId !== remoteId));
}

export function dropLinkedPendingAttachments(ids: number[]) {
  const linked = new Set(ids);
  writeCache(
    readCache().filter((item) => !(item.source === "attachment" && item.remoteId && linked.has(item.remoteId)))
  );
}

/**
 * Identity of a picked file. Name alone is not enough: two different scans can
 * share a name (e.g. `upper.stl` exported from two folders).
 */
export function attachmentFileKey(file: Pick<File, "name" | "size" | "lastModified">): string {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}`;
}

/**
 * Adds files staged in the attachment dialog (no slip yet) to the cache, skipping
 * files that are already cached or repeated in the batch. Returns how many were added.
 */
export function cacheStagedFiles(files: Array<{ file: File; url: string }>): number {
  const existing = readCache();
  const seen = new Set(
    existing.filter((item) => item.file instanceof File).map((item) => attachmentFileKey(item.file as File))
  );
  const additions: CachedCaseDesignAttachment[] = [];
  for (const { file, url } of files) {
    const key = attachmentFileKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    additions.push({ file, url, type: "stl", archived: false });
  }
  if (additions.length > 0) writeCache([...existing, ...additions]);
  return additions.length;
}

/** Local files still waiting to be uploaded to the slip once it exists. */
export function localUploadsFromCache(): CachedCaseDesignAttachment[] {
  return readCache().filter(
    (item) =>
      typeof File !== "undefined" &&
      item.file instanceof File &&
      !item.remoteId &&
      !item.generatedPath &&
      item.source !== "attachment"
  );
}

export type AttachmentUploadFailure = { name: string; error: string };

export type AttachmentUploadProgress = {
  total: number;
  completed: number;
  failed: AttachmentUploadFailure[];
};

/**
 * Uploads every local cached file to the slip, one at a time. Each file leaves
 * the cache as soon as it is saved, so a retry only sends the files that failed;
 * failed files stay in the cache. Never throws.
 */
export async function uploadCachedAttachmentsToSlip(
  slipId: number,
  upload: (slipId: number, file: File, options?: { notes?: string }) => Promise<unknown>,
  onProgress?: (progress: AttachmentUploadProgress) => void
): Promise<AttachmentUploadProgress & { uploaded: number }> {
  const pending = localUploadsFromCache();
  const failed: AttachmentUploadFailure[] = [];
  let uploaded = 0;
  onProgress?.({ total: pending.length, completed: 0, failed: [] });
  for (const item of pending) {
    const file = item.file as File;
    try {
      const notes = item.notes ?? item.description;
      await upload(slipId, file, notes ? { notes } : undefined);
      writeCache(readCache().filter((cached) => cached !== item));
      uploaded += 1;
    } catch (error) {
      failed.push({ name: file.name, error: error instanceof Error ? error.message : "Upload failed" });
    }
    onProgress?.({ total: pending.length, completed: uploaded + failed.length, failed: [...failed] });
  }
  return { total: pending.length, completed: uploaded + failed.length, failed, uploaded };
}

/** Clears all staged/pending create-slip attachments from the window cache. */
export function clearCaseDesignAttachmentCache(): number[] {
  const pendingIds = pendingAttachmentIdsFromCache();
  writeCache([]);
  if (typeof window !== "undefined") {
    delete (window as unknown as { __caseDesignAttachments?: CachedCaseDesignAttachment[] })
      .__caseDesignAttachments;
  }
  return pendingIds;
}
