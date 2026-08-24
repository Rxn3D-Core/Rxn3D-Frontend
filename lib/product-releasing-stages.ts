/**
 * Product-stage releasing flags are owned by the modal checkbox list (`releasingStageIds`),
 * not by leftover `is_releasing_stage` values from product GET / form hydrate.
 */

export function isStageMarkedReleasing(
  stageId: unknown,
  releasingStageIds: Array<string | number> | undefined,
): boolean {
  const key = stageId == null ? "" : String(stageId)
  if (!key) return false
  if (!Array.isArray(releasingStageIds) || releasingStageIds.length === 0) return false
  return releasingStageIds.some((id) => String(id) === key)
}

export function applyReleasingStageFlagsToStages<T extends Record<string, unknown>>(
  stages: T[] | undefined,
  releasingStageIds: Array<string | number> | undefined,
): Array<T & { is_releasing_stage: "Yes" | "No" }> {
  if (!Array.isArray(stages)) return []
  return stages.map((stage) => {
    const stageId = stage.stage_id ?? stage.id
    return {
      ...stage,
      is_releasing_stage: isStageMarkedReleasing(stageId, releasingStageIds) ? "Yes" : "No",
    }
  })
}
