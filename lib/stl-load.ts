import { FileLoader, type BufferGeometry } from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { getStlSourceUrls } from "@/lib/file-proxy"

export type StlLoadProgress =
  /** `total` is 0 when the server did not send a Content-Length. */
  | { phase: "download"; loaded: number; total: number }
  | { phase: "processing" }

function nextPaint(): Promise<void> {
  if (typeof requestAnimationFrame !== "function") return Promise.resolve()
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
}

/**
 * Load and parse an STL. S3 files are fetched directly first; if that fails
 * (CORS, network) the same file is retried through /api/file-proxy.
 *
 * Download and parse are separate steps so the UI can show download progress
 * and get a frame painted ("processing") before the blocking parse starts.
 */
export async function loadStlGeometry(
  url: string,
  onProgress?: (progress: StlLoadProgress) => void,
): Promise<BufferGeometry> {
  const sources = getStlSourceUrls(url)
  const fileLoader = new FileLoader()
  fileLoader.setResponseType("arraybuffer")
  for (let i = 0; ; i++) {
    try {
      const buffer = (await fileLoader.loadAsync(sources[i], (event) => {
        onProgress?.({ phase: "download", loaded: event.loaded, total: event.lengthComputable ? event.total : 0 })
      })) as ArrayBuffer
      onProgress?.({ phase: "processing" })
      await nextPaint()
      return new STLLoader().parse(buffer)
    } catch (err) {
      if (i === sources.length - 1) throw err
      console.warn("[stl-load] direct S3 load failed, retrying via proxy →", sources[i], err)
    }
  }
}
