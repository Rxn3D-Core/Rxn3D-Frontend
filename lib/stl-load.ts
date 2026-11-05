import type { BufferGeometry } from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { getStlSourceUrls } from "@/lib/file-proxy"

/**
 * Load and parse an STL. S3 files are fetched directly first; if that fails
 * (CORS, network) the same file is retried through /api/file-proxy.
 */
export async function loadStlGeometry(
  url: string,
  onProgress?: (event: ProgressEvent) => void,
): Promise<BufferGeometry> {
  const sources = getStlSourceUrls(url)
  const loader = new STLLoader()
  for (let i = 0; ; i++) {
    try {
      return await loader.loadAsync(sources[i], onProgress)
    } catch (err) {
      if (i === sources.length - 1) throw err
      console.warn("[stl-load] direct S3 load failed, retrying via proxy →", sources[i], err)
    }
  }
}
