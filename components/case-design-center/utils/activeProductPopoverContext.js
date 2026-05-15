export function getActiveProductPopoverContextToken({
  arch,
  activeProductCardId,
  activeFixedGroupProductId,
  activeProductIsRemovables,
  hasOpposingProduct,
}) {
  if (activeProductCardId !== 0) {
    return `${arch}:${activeProductIsRemovables ? "removable" : "fixed"}:card:${activeProductCardId}`;
  }

  if (activeProductIsRemovables) {
    return `${arch}:removable:card:0`;
  }

  if (hasOpposingProduct) {
    return `${arch}:opposing:card:0`;
  }

  return `${arch}:fixed-group:${activeFixedGroupProductId ?? "none"}`;
}
