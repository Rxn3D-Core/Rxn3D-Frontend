export function shouldUseFixedRetentionMode({
  activeProductCardId,
  activeProductIsRemovables,
  activeFixedGroupProductId,
}: {
  activeProductCardId: number;
  activeProductIsRemovables: boolean;
  activeFixedGroupProductId: number | null;
}) {
  if (activeProductIsRemovables) return false;

  return activeProductCardId !== 0 || activeFixedGroupProductId !== null;
}
