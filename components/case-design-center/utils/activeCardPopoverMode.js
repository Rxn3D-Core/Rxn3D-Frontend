export function shouldUseScopedRetentionMode({
  activeProductCardId,
  activeProductIsRemovables,
  activeFixedGroupProductId,
}) {
  if (activeProductIsRemovables) return false;

  return activeProductCardId !== 0 || activeFixedGroupProductId !== null;
}
