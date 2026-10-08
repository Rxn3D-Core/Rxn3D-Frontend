/**
 * Regenerate favicon / PWA icons from public/images/rxn3d-submark.png
 * and OG preview image from public/images/rxn3d-logo.svg
 *
 * Usage: node scripts/generate-brand-assets.mjs
 */
import sharp from "sharp"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const imagesDir = path.join(root, "public", "images")
const submark = path.join(imagesDir, "rxn3d-submark.png")
const logoSvg = path.join(imagesDir, "rxn3d-logo.svg")

async function makeIcons() {
  const sizes = [
    ["rxn3d-favicon-16.png", 16],
    ["rxn3d-favicon-32.png", 32],
    ["rxn3d-apple-touch-icon.png", 180],
    ["rxn3d-icon-192.png", 192],
    ["rxn3d-icon-512.png", 512],
  ]

  for (const [name, size] of sizes) {
    await sharp(submark)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png()
      .toFile(path.join(imagesDir, name))
    console.log("wrote", name)
  }

  await sharp(submark)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .toFile(path.join(root, "public", "favicon.ico"))

  console.log("wrote favicon.ico")
}

async function makeOg() {
  const width = 1200
  const height = 630
  const logoBuffer = await sharp(logoSvg).resize(900, null, { fit: "inside" }).png().toBuffer()
  const logoMeta = await sharp(logoBuffer).metadata()
  const left = Math.round((width - logoMeta.width) / 2)
  const top = Math.round((height - logoMeta.height) / 2)

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logoBuffer, left, top }])
    .png()
    .toFile(path.join(imagesDir, "rxn3d-og.png"))

  console.log("wrote rxn3d-og.png")
}

await makeIcons()
await makeOg()
