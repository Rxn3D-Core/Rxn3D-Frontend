type Arch = "maxillary" | "mandibular";

type GetToothProduct = (arch: Arch, tooth: number) => unknown;
type GetToothProductCard = (arch: Arch, tooth: number) => number;

function getCandidateTeeth({
  allTeeth,
  selectedTeeth,
  getToothProduct,
  arch,
}: {
  allTeeth: number[];
  selectedTeeth: number[];
  getToothProduct: GetToothProduct;
  arch: Arch;
}) {
  const selectedSet = new Set(selectedTeeth);
  const selectedAssigned = allTeeth.filter((tooth) => selectedSet.has(tooth) && !!getToothProduct(arch, tooth));

  return selectedAssigned.length > 0
    ? selectedAssigned
    : allTeeth.filter((tooth) => !!getToothProduct(arch, tooth));
}

export function getRepresentativeTeethByCard({
  allTeeth,
  selectedTeeth,
  getToothProduct,
  getToothProductCard,
  arch,
}: {
  allTeeth: number[];
  selectedTeeth: number[];
  getToothProduct: GetToothProduct;
  getToothProductCard: GetToothProductCard;
  arch: Arch;
}) {
  const candidateTeeth = getCandidateTeeth({ allTeeth, selectedTeeth, getToothProduct, arch });
  const cardToRepresentativeTooth = new Map<number, number>();

  for (const tooth of candidateTeeth) {
    const card = getToothProductCard(arch, tooth);
    if (card == null) continue;
    const existing = cardToRepresentativeTooth.get(card);
    if (existing === undefined || tooth < existing) {
      cardToRepresentativeTooth.set(card, tooth);
    }
  }

  return [...cardToRepresentativeTooth.values()];
}

/** Lowest tooth number on a product card — matches panel `cardTeeth[0]` ordering. */
export function getCardRepresentativeTooth({
  allTeeth,
  cardId,
  getToothProduct,
  getToothProductCard,
  arch,
}: {
  allTeeth: number[];
  cardId: number;
  getToothProduct: GetToothProduct;
  getToothProductCard: GetToothProductCard;
  arch: Arch;
}) {
  const cardTeeth = allTeeth.filter(
    (tooth) => !!getToothProduct(arch, tooth) && getToothProductCard(arch, tooth) === cardId
  );
  return cardTeeth.length > 0 ? cardTeeth[0] : null;
}

export function getPrimaryCardRepresentativeTooth({
  allTeeth,
  selectedTeeth,
  getToothProduct,
  getToothProductCard,
  arch,
}: {
  allTeeth: number[];
  selectedTeeth: number[];
  getToothProduct: GetToothProduct;
  getToothProductCard: GetToothProductCard;
  arch: Arch;
}) {
  const candidateTeeth = getCandidateTeeth({ allTeeth, selectedTeeth, getToothProduct, arch });
  const card0Teeth = candidateTeeth.filter((tooth) => getToothProductCard(arch, tooth) === 0);
  return card0Teeth.length > 0 ? Math.min(...card0Teeth) : null;
}
