import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const headerSource = await readFile(new URL("../../components/header.tsx", import.meta.url), "utf8")

test("renders the waffle launcher before the RXN3D logo", () => {
  assert.match(headerSource, /import Image from ["']next\/image["']/)

  const logoPosition = headerSource.indexOf('src="/images/rxn3d-latest.png"')
  const launcherPosition = headerSource.indexOf("<HeaderWaffleLauncher />")

  assert.notEqual(logoPosition, -1)
  assert.ok(launcherPosition < logoPosition)
  assert.match(headerSource, /alt="RXN3D"/)
})
