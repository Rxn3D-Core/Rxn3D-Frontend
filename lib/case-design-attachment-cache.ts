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
