function filterToothArrayForCard(teeth, activeProductCardId, arch, getToothProductCard) {
  return (teeth ?? []).filter((toothNumber) => getToothProductCard(arch, toothNumber) === activeProductCardId);
}

function filterToothMapForCard(toothMap, activeProductCardId, arch, getToothProductCard) {
  return Object.fromEntries(
    Object.entries(toothMap ?? {}).filter(([toothNumber]) => getToothProductCard(arch, Number(toothNumber)) === activeProductCardId)
  );
}

export function filterToothStateForActiveCard({
  activeProductCardId,
  selectedTeeth,
  toothExtractionMap,
  toothStatusByTooth,
  claspTeeth,
  willExtractTeeth,
  missingTeeth,
  getToothProductCard,
  arch,
}) {
  if (activeProductCardId === 0) {
    return {
      selectedTeeth: selectedTeeth ?? [],
      toothExtractionMap: toothExtractionMap ?? {},
      toothStatusByTooth: toothStatusByTooth ?? {},
      claspTeeth: claspTeeth ?? [],
      willExtractTeeth: willExtractTeeth ?? [],
      missingTeeth: missingTeeth ?? [],
    };
  }

  return {
    selectedTeeth: filterToothArrayForCard(selectedTeeth, activeProductCardId, arch, getToothProductCard),
    toothExtractionMap: filterToothMapForCard(toothExtractionMap, activeProductCardId, arch, getToothProductCard),
    toothStatusByTooth: filterToothMapForCard(toothStatusByTooth, activeProductCardId, arch, getToothProductCard),
    claspTeeth: filterToothArrayForCard(claspTeeth, activeProductCardId, arch, getToothProductCard),
    willExtractTeeth: filterToothArrayForCard(willExtractTeeth, activeProductCardId, arch, getToothProductCard),
    missingTeeth: filterToothArrayForCard(missingTeeth, activeProductCardId, arch, getToothProductCard),
  };
}
