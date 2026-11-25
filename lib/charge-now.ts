/**
 * RXN-127 "Charge now": pure helpers (no React, no I/O) so they run under node:test.
 *
 * A lab on product based invoicing can charge an abandoned multi-stage arch before it reaches its releasing stage.
 * The modal pre-fills the library price (grade price, else product price) plus the slip's add-ons, asks for a price
 * for every library stage with a $0 or unset price, and lets the user override the final total.
 */
import { isSlipCaseCancelled, isSlipCaseDeleted, isSlipCaseFinished } from "@/lib/slip-case-status"
import { roundMoney, toMoney } from "@/lib/product-invoicing"
import type { ArchType, ChargeNowPayload, InvoicingMode } from "@/types/product-invoicing"

export interface ChargeNowAddonLine {
  name: string
  quantity: number
  unitPrice: number
  total: number
}

export interface ChargeNowStagePrompt {
  stageId: number
  stageName: string
  sequence: number
}

/** One arch of the slip that can be charged now. */
export interface ChargeNowArchCandidate {
  arch: ArchType
  /** Library (catalog) product id, for the library price lookup. */
  productId: number | null
  productName: string
  gradeId: number | null
  gradeName: string
  /** Product price from the slip payload; used when the library has no grade price. */
  slipProductPrice: number
  addons: ChargeNowAddonLine[]
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function positiveId(value: unknown): number | null {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** Slip product `type` ("Upper"/"Lower") or the view-model arch key -> API arch. */
export function toChargeNowArch(value: unknown): ArchType | null {
  const v = str(value).toLowerCase()
  if (v === "upper" || v === "maxillary") return "Upper"
  if (v === "lower" || v === "mandibular") return "Lower"
  return null
}

/** Arch can still be charged: not finished, cancelled or deleted (on hold is allowed: that is the abandoned case). */
export function isChargeableStatus(status: string | null | undefined): boolean {
  if (!str(status)) return true
  return !isSlipCaseFinished(status) && !isSlipCaseCancelled(status) && !isSlipCaseDeleted(status)
}

/** Add-on rows of a slip product (`addons[]` with `addon.price` per unit). */
export function slipAddonLines(rawAddons: unknown): ChargeNowAddonLine[] {
  if (!Array.isArray(rawAddons)) return []
  return rawAddons.map((row) => {
    const r = (row ?? {}) as { quantity?: unknown; name?: unknown; price?: unknown; addon?: { name?: unknown; price?: unknown } }
    const quantity = Math.max(1, Math.round(toMoney(r.quantity) || 1))
    const unitPrice = toMoney(r.addon?.price ?? r.price)
    return {
      name: str(r.addon?.name) || str(r.name) || "Add-on",
      quantity,
      unitPrice,
      total: roundMoney(unitPrice * quantity),
    }
  })
}

/** Build the candidate for one slip product row (SlipProductDetailResource shape). */
export function chargeNowCandidateFromSlipProduct(apiProduct: unknown): ChargeNowArchCandidate | null {
  const p = (apiProduct ?? {}) as {
    type?: unknown
    product?: { id?: unknown; name?: unknown; price?: unknown }
    grade?: { id?: unknown; name?: unknown }
    price?: unknown
    addons?: unknown
    add_ons?: unknown
  }
  const arch = toChargeNowArch(p.type)
  if (!arch) return null
  return {
    arch,
    productId: positiveId(p.product?.id),
    productName: str(p.product?.name) || "Product",
    gradeId: positiveId(p.grade?.id),
    gradeName: str(p.grade?.name),
    slipProductPrice: toMoney(p.price ?? p.product?.price),
    addons: slipAddonLines(p.addons ?? p.add_ons),
  }
}

export interface ChargeNowEligibilityInput {
  invoicingMode: InvoicingMode | null | undefined
  /** Lab admin gate (same as Finalize arch invoice and Undo location). */
  isLabAdmin: boolean
  slipStatus: string | null | undefined
  /** Slip product rows with their own status. */
  products: Array<{ apiProduct: unknown; status?: string | null }>
  /** Arches that already have a product invoice; null while unknown (loading or failed), which hides the button. */
  invoicedArches: ReadonlySet<ArchType> | null
}

/**
 * Arches the "Charge now" button may offer. Empty means the button is hidden:
 * stage-mode labs (or settings still loading), non-admins, a finished/cancelled/deleted slip,
 * finished/cancelled arches and arches that already have a product invoice.
 */
export function chargeNowCandidates(input: ChargeNowEligibilityInput): ChargeNowArchCandidate[] {
  if (input.invoicingMode !== "product" || !input.isLabAdmin) return []
  if (!isChargeableStatus(input.slipStatus)) return []
  if (input.invoicedArches == null) return []
  const out: ChargeNowArchCandidate[] = []
  for (const row of input.products) {
    if (!isChargeableStatus(row.status)) continue
    const candidate = chargeNowCandidateFromSlipProduct(row.apiProduct)
    if (!candidate || input.invoicedArches.has(candidate.arch)) continue
    if (out.some((c) => c.arch === candidate.arch)) continue
    out.push(candidate)
  }
  return out.sort((a, b) => (a.arch === b.arch ? 0 : a.arch === "Upper" ? -1 : 1))
}

/** Library product detail (`GET /library/products/{id}?customer_id=lab`) fields the modal reads. */
export interface ChargeNowLibraryProduct {
  price?: unknown
  grades?: Array<{ id?: unknown; grade_id?: unknown; price?: unknown }> | null
  stages?: Array<{ id?: unknown; stage_id?: unknown; name?: unknown; sequence?: unknown; price?: unknown; status?: unknown }> | null
  stage_grade_details?: Array<{ stage_id?: unknown; grade_id?: unknown; price?: unknown }> | null
}

/** Library base price: the slip grade's price when it is set, else the product price, else the slip's product price. */
export function chargeNowBasePrice(candidate: ChargeNowArchCandidate, library: ChargeNowLibraryProduct | null): number {
  if (library) {
    const grade = candidate.gradeId
      ? (library.grades ?? []).find((g) => positiveId(g.grade_id ?? g.id) === candidate.gradeId)
      : undefined
    const gradePrice = toMoney(grade?.price)
    if (gradePrice > 0) return roundMoney(gradePrice)
    const productPrice = toMoney(library.price)
    if (productPrice > 0) return roundMoney(productPrice)
  }
  return roundMoney(candidate.slipProductPrice)
}

/** Active library stages whose price for the slip's grade (else the stage price) is $0 or unset, in sequence order. */
export function chargeNowStagePrompts(
  candidate: ChargeNowArchCandidate,
  library: ChargeNowLibraryProduct | null,
): ChargeNowStagePrompt[] {
  if (!library || !Array.isArray(library.stages)) return []
  const out: ChargeNowStagePrompt[] = []
  for (const stage of library.stages) {
    const stageId = positiveId(stage.stage_id ?? stage.id)
    const stageName = str(stage.name)
    if (!stageId || !stageName) continue
    if (str(stage.status).toLowerCase() === "inactive") continue
    const gradeRow = candidate.gradeId
      ? (library.stage_grade_details ?? []).find(
          (d) => positiveId(d.stage_id) === stageId && positiveId(d.grade_id) === candidate.gradeId,
        )
      : undefined
    const price = gradeRow && gradeRow.price != null && gradeRow.price !== "" ? toMoney(gradeRow.price) : toMoney(stage.price)
    if (price > 0) continue
    if (out.some((s) => s.stageId === stageId)) continue
    out.push({ stageId, stageName, sequence: Number(stage.sequence) || 0 })
  }
  return out.sort((a, b) => a.sequence - b.sequence || a.stageId - b.stageId)
}

/** Parse a money input ("12.5", "", "abc"): null when blank, NaN when invalid or negative. */
export function parseMoneyInput(raw: string | null | undefined): number | null {
  const text = (raw ?? "").trim()
  if (text === "") return null
  if (!/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(text)) return Number.NaN
  return roundMoney(Number.parseFloat(text))
}

/** Entered stage prices keyed by stage id (as the API's `stage_prices` map); blank inputs are left out. */
export function chargeNowStagePrices(inputs: Record<number, string>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [stageId, raw] of Object.entries(inputs)) {
    const value = parseMoneyInput(raw)
    if (value == null || Number.isNaN(value)) continue
    out[stageId] = value
  }
  return out
}

/** True when any stage input holds something that is not a valid non-negative amount. */
export function hasInvalidStageInput(inputs: Record<number, string>): boolean {
  return Object.values(inputs).some((raw) => Number.isNaN(parseMoneyInput(raw)))
}

/** Calculated total: base + add-ons + entered stage prices. */
export function chargeNowTotal(base: number, addons: ChargeNowAddonLine[], stagePrices: Record<string, number>): number {
  const addonSum = addons.reduce((sum, a) => sum + a.total, 0)
  const stageSum = Object.values(stagePrices).reduce((sum, v) => sum + v, 0)
  return roundMoney(base + addonSum + stageSum)
}

export function buildChargeNowPayload(params: {
  slipId: number
  arch: ArchType
  amount: number
  stagePrices: Record<string, number>
}): ChargeNowPayload {
  const payload: ChargeNowPayload = { slip_id: params.slipId, arch: params.arch, amount: roundMoney(params.amount) }
  if (Object.keys(params.stagePrices).length > 0) payload.stage_prices = params.stagePrices
  return payload
}
