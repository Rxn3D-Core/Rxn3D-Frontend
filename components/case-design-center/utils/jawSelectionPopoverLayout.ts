export function getJawSelectionPopoverInsets(labelHeight: number, borderWidth = 3) {
  const safeLabelHeight = Number.isFinite(labelHeight) ? Math.max(0, labelHeight) : 0;

  return {
    top: borderWidth + safeLabelHeight,
    right: borderWidth,
    bottom: borderWidth,
    left: borderWidth,
  };
}
