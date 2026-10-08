/** Product-level slip demographic flags from GET /v1/library/products/{id}. */
export type ProductDemographicSource = {
  gender_required?: string | boolean | null
  age_required?: string | boolean | null
}

function isYes(value: string | boolean | null | undefined): boolean {
  return value === true || value === "Yes" || value === "yes"
}

export function productRequiresGender(product: ProductDemographicSource | null | undefined): boolean {
  return isYes(product?.gender_required ?? null)
}

export function productRequiresAge(product: ProductDemographicSource | null | undefined): boolean {
  return isYes(product?.age_required ?? null)
}

/** Fields still needed before continuing after a product is selected. */
export function resolvePendingDemographics(
  product: ProductDemographicSource | null | undefined,
  gender: string,
  age: string | number | undefined | null,
): { needsGender: boolean; needsAge: boolean } {
  const needsGender = productRequiresGender(product) && !gender?.trim()
  const needsAge = productRequiresAge(product) && !(age !== undefined && age !== null && String(age).trim() !== "")
  return { needsGender, needsAge }
}

export function hasPendingDemographics(
  product: ProductDemographicSource | null | undefined,
  gender: string,
  age: string | number | undefined | null,
): boolean {
  const pending = resolvePendingDemographics(product, gender, age)
  return pending.needsGender || pending.needsAge
}
