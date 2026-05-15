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
    if (card != null && !cardToRepresentativeTooth.has(card)) {
      cardToRepresentativeTooth.set(card, tooth);
    }
  }

  return [...cardToRepresentativeTooth.values()];
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
  const found = candidateTeeth.find((tooth) => getToothProductCard(arch, tooth) === 0);
  return found ?? null;
}
