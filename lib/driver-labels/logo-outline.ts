/**
 * RXN-65: turn a lab logo into a black outline on white for the driver label.
 * `logoToOutlineRgba` is a pure pixel function (unit tested in node); `prepareLabelLogo` wraps it with the
 * browser canvas. Any failure returns null so the label prints the lab name instead and printing never stops.
 */

export const LOGO_MAX_SIDE_PX = 600;
/** Sobel response above which a pixel counts as an edge (a full black/white step gives about 1000). */
const EDGE_THRESHOLD = 160;

export interface PreparedLogo {
  /** PNG data URL, black on white when outlined. */
  dataUrl: string;
  /** Width divided by height. */
  aspect: number;
}

/**
 * RGBA in, RGBA out. Transparent pixels count as white. With `outline` the result is a thickened Sobel edge
 * image (black lines on white); without it the image is only flattened onto white. `blank` is true when the
 * result has no dark pixel at all (nothing worth printing).
 */
export function logoToOutlineRgba(
  src: ArrayLike<number>,
  width: number,
  height: number,
  outline: boolean,
): { data: Uint8ClampedArray<ArrayBuffer>; blank: boolean } {
  const n = width * height;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = src[i * 4 + 3] / 255;
    const r = src[i * 4] * a + 255 * (1 - a);
    const g = src[i * 4 + 1] * a + 255 * (1 - a);
    const b = src[i * 4 + 2] * a + 255 * (1 - a);
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const dark = new Uint8Array(n);
  if (outline) {
    // Outside the image counts as white, so a logo that touches the border still gets a closed outline.
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= width || y >= height ? 255 : lum[y * width + x]);
    const edge = new Uint8Array(n);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gx =
          -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) + at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
        const gy =
          -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) + at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
        if (Math.hypot(gx, gy) >= EDGE_THRESHOLD) edge[y * width + x] = 1;
      }
    }
    // Thicken by one pixel so thin lines survive scaling down to a small label.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!edge[y * width + x]) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < width && ny < height) dark[ny * width + nx] = 1;
          }
        }
      }
    }
  } else {
    for (let i = 0; i < n; i++) dark[i] = lum[i] < 250 ? 1 : 0;
  }

  const out = new Uint8ClampedArray(new ArrayBuffer(n * 4));
  let blank = true;
  for (let i = 0; i < n; i++) {
    let v: number;
    if (outline) {
      v = dark[i] ? 0 : 255;
    } else {
      v = Math.round(lum[i]); // keep the original, only flattened onto white
    }
    if (outline ? dark[i] : lum[i] < 250) blank = false;
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return { data: out, blank };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo could not be decoded"));
    img.src = dataUrl;
  });
}

/**
 * Decode a logo (data URL), scale it to at most 600 px, and return it as a black-on-white PNG.
 * The un-outlined path keeps the original colours (flattened onto white). Returns null on any failure.
 */
export async function prepareLabelLogo(dataUrl: string | null, outline: boolean): Promise<PreparedLogo | null> {
  if (!dataUrl || typeof document === "undefined") return null;
  try {
    const img = await loadImage(dataUrl);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!(nw > 0 && nh > 0)) return null;
    const scale = Math.min(1, LOGO_MAX_SIDE_PX / Math.max(nw, nh));
    const w = Math.max(1, Math.round(nw * scale));
    const h = Math.max(1, Math.round(nh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h);
    const { data, blank } = logoToOutlineRgba(px.data, w, h, outline);
    if (blank) return null;
    ctx.putImageData(new ImageData(data, w, h), 0, 0);
    return { dataUrl: canvas.toDataURL("image/png"), aspect: w / h };
  } catch {
    return null;
  }
}
