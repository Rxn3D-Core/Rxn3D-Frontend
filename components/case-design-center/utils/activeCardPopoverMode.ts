export function shouldUseScopedRetentionMode({
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
