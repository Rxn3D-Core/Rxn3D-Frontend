import { FileLoader, type BufferGeometry } from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { getStlSourceUrls, isS3Url } from "@/lib/file-proxy"
import { downloadRanged } from "@/lib/ranged-download"
import { createSharedDownloadCache, type SharedDownloadCache } from "@/lib/shared-download-cache"

export type StlLoadProgress =
  /** `total` is 0 when the server did not send a Content-Length. */
  | { phase: "download"; loaded: number; total: number }
  | { phase: "processing" }

const MB = 1024 * 1024

// One cache for the whole page, kept on globalThis so every viewer (and a hot-reloaded copy
// of this module in dev) shares the same downloads instead of fetching a file twice.
const globalStore = globalThis as { __rxnStlDownloads?: SharedDownloadCache<StlLoadProgress> }
const downloads = (globalStore.__rxnStlDownloads ??= createSharedDownloadCache<StlLoadProgress>(300 * MB))

function nextPaint(): Promise<void> {
  if (typeof requestAnimationFrame !== "function") return Promise.resolve()
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
}

/**
 * Download the file: S3 files in parallel chunks first, then a single request; if that
 * fails (CORS, network) the same file is retried through /api/file-proxy.
 */
async function downloadStlBuffer(sources: string[], emit: (progress: StlLoadProgress) => void): Promise<ArrayBuffer> {
  const fileLoader = new FileLoader()
  fileLoader.setResponseType("arraybuffer")
  for (let i = 0; ; i++) {
    try {
      const t0 = performance.now()
      let buffer: ArrayBuffer | undefined
      let mode = "single"
      if (isS3Url(sources[i])) {
        try {
          buffer = await downloadRanged(sources[i], {
            onProgress: (loaded, total) => emit({ phase: "download", loaded, total }),
          })
          mode = "parallel"
        } catch (rangedErr) {
          console.warn("[stl-load] parallel download unavailable, using a single download →", sources[i], rangedErr)
        }
      }
      buffer ??= (await fileLoader.loadAsync(sources[i], (event) => {
        emit({ phase: "download", loaded: event.loaded, total: event.lengthComputable ? event.total : 0 })
      })) as ArrayBuffer
      const seconds = (performance.now() - t0) / 1000
      const mb = buffer.byteLength / MB
      console.info(
        `[stl-load] ${mb.toFixed(1)} MB, ${mode} download ${seconds.toFixed(1)}s ` +
          `(${(mb / seconds).toFixed(1)} MB/s = ${((mb * 8) / seconds).toFixed(0)} Mbps), ` +
          `source ${sources[i].startsWith("/api/") ? "proxy" : "direct"}`,
      )
      return buffer
    } catch (err) {
      if (i === sources.length - 1) throw err
      console.warn("[stl-load] direct S3 load failed, retrying via proxy →", sources[i], err)
    }
  }
}

/**
 * Load and parse an STL. The download is shared: any number of viewers asking for the same
 * file get one download (and later ones get the bytes straight away). Each caller parses
 * its own geometry, so it is free to modify it.
 *
 * Download and parse are separate steps so the UI can show download progress
 * and get a frame painted ("processing") before the blocking parse starts.
 */
export async function loadStlGeometry(
  url: string,
  onProgress?: (progress: StlLoadProgress) => void,
): Promise<BufferGeometry> {
  const sources = getStlSourceUrls(url)
  // Direct and proxied URLs for one file share the first source as their key
  const buffer = await downloads.get(sources[0], (emit) => downloadStlBuffer(sources, emit), onProgress)
  onProgress?.({ phase: "processing" })
  await nextPaint()
  const t0 = performance.now()
  const geometry = new STLLoader().parse(buffer)
  console.info(`[stl-load] parse ${((performance.now() - t0) / 1000).toFixed(1)}s`)
  return geometry
}
