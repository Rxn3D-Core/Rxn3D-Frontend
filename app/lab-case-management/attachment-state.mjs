export function applySlipAttachmentState(slips, slipId, hasAttachment) {
  return slips.map((slip) =>
    slip?.id === slipId
      ? {
          ...slip,
          attachment: Boolean(hasAttachment),
        }
      : slip,
  );
}
