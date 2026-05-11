/**
 * Resolves which product card should own a tooth while a removable product is active.
 * This lets added removable cards reclaim a tooth even when that tooth was already
 * selected earlier under another card.
 */
export function resolveRemovableOwnershipUpdate({
  isActiveProductRemovables,
  activeProductCardId,
  activeArchMatches,
  activeProductId,
  currentCardId,
  selectedProductId,
}) {
  if (!isActiveProductRemovables) return null;

  if (activeProductCardId !== 0) {
    if (!activeArchMatches || !activeProductId) return null;
    if (currentCardId === activeProductCardId) {
      return {
        targetCardId: activeProductCardId,
        targetProductId: activeProductId,
      };
    }
    return {
      targetCardId: activeProductCardId,
      targetProductId: activeProductId,
    };
  }

  if (!selectedProductId) return null;

  return {
    targetCardId: 0,
    targetProductId: selectedProductId,
  };
}
