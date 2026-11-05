/**
 * Shares one download per key between everything that asks for it.
 *
 * - Callers that ask while a download is running join it (and see its progress).
 * - Callers that ask later get the finished bytes without downloading again.
 * - A failed download is not remembered, so the next caller retries.
 * - Finished downloads are evicted oldest-first once they exceed `maxBytes`.
 *
 * Bytes are shared read-only: consumers must not modify or transfer the buffer.
 */
export interface SharedDownloadCache<P> {
  get(
    key: string,
    start: (emit: (progress: P) => void) => Promise<ArrayBuffer>,
    onProgress?: (progress: P) => void,
  ): Promise<ArrayBuffer>
}

export function createSharedDownloadCache<P>(maxBytes: number): SharedDownloadCache<P> {
  const entries = new Map<string, { promise: Promise<ArrayBuffer>; bytes: number }>()
  const listeners = new Map<string, Set<(progress: P) => void>>()
  const lastProgress = new Map<string, P>()
  let totalBytes = 0

  const evict = (keep: string) => {
    for (const [key, entry] of entries) {
      if (totalBytes <= maxBytes) return
      if (key === keep || entry.bytes === 0) continue // never drop the newest or an in-flight download
      entries.delete(key)
      totalBytes -= entry.bytes
    }
  }

  return {
    get(key, start, onProgress) {
      if (onProgress) {
        let set = listeners.get(key)
        if (!set) listeners.set(key, (set = new Set()))
        set.add(onProgress)
        if (lastProgress.has(key)) onProgress(lastProgress.get(key) as P)
      }

      let entry = entries.get(key)
      if (!entry) {
        const created = { promise: undefined as unknown as Promise<ArrayBuffer>, bytes: 0 }
        const emit = (progress: P) => {
          lastProgress.set(key, progress)
          listeners.get(key)?.forEach((fn) => fn(progress))
        }
        created.promise = start(emit).then(
          (buffer) => {
            lastProgress.delete(key)
            created.bytes = buffer.byteLength
            totalBytes += created.bytes
            evict(key)
            return buffer
          },
          (err) => {
            lastProgress.delete(key)
            entries.delete(key)
            throw err
          },
        )
        entries.set(key, created)
        entry = created
      }

      const unsubscribe = () => {
        if (!onProgress) return
        const set = listeners.get(key)
        set?.delete(onProgress)
        if (set && set.size === 0) listeners.delete(key)
      }
      return entry.promise.finally(unsubscribe)
    },
  }
}
