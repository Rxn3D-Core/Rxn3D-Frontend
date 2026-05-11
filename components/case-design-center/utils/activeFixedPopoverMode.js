export function shouldUseFixedRetentionMode({
  activeProductCardId,
  activeProductIsRemovables,
  activeFixedGroupProductId,
}) {
  if (activeProductIsRemovables) return false;

  return activeProductCardId !== 0 || activeFixedGroupProductId !== null;
}
