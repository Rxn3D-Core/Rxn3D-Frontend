/**
 * Helpers for the "splinted" feature: connecting two adjacent teeth of a single
 * product with a diamond marker.
 *
 * A splint "link" is identified by the LOWER tooth number of an adjacent pair.
 * e.g. link `6` connects tooth 6 and tooth 7. Links are scoped per product card.
 *
 * Adjacency is purely numeric (the arch midline is not treated as a break), and a
 * link is only eligible when BOTH teeth of the pair belong to the same product.
 */

/** Returns sorted ascending copy of the given teeth. */
function sortedTeeth(teeth: number[]): number[] {
  return [...teeth].sort((a, b) => a - b);
}

/**
 * Adjacent (consecutive-number) pairs within a single product's teeth.
 * Each eligible gap is identified by the lower tooth number.
 */
export function getSplintableLinks(teeth: number[]): number[] {
  const sorted = sortedTeeth(teeth);
  const links: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] === sorted[i] + 1) {
      links.push(sorted[i]);
    }
  }
  return links;
}

/** True when tooth `lower` and `lower + 1` are both present and consecutive. */
export function isSplintableLink(teeth: number[], lower: number): boolean {
  return teeth.includes(lower) && teeth.includes(lower + 1);
}

/**
 * Groups the product's teeth into maximal runs connected by active splint links.
 * Only groups of 2+ connected teeth are returned (singletons are omitted).
 */
export function computeSplintGroups(teeth: number[], links: number[]): number[][] {
  const sorted = sortedTeeth(teeth);
  const linkSet = new Set(links);
  const groups: number[][] = [];
  let current: number[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const tooth = sorted[i];
    if (current.length === 0) {
      current = [tooth];
      continue;
    }
    const prev = current[current.length - 1];
    // Continue the run only when the previous tooth links to this consecutive one.
    if (tooth === prev + 1 && linkSet.has(prev)) {
      current.push(tooth);
    } else {
      if (current.length >= 2) groups.push(current);
      current = [tooth];
    }
  }
  if (current.length >= 2) groups.push(current);
  return groups;
}

/**
 * Human-readable summary of splinted groups, e.g. "6-7-8, 11-12".
 * Returns "" when nothing is splinted.
 */
export function formatSplintGroups(teeth: number[], links: number[]): string {
  return computeSplintGroups(teeth, links)
    .map((group) => group.join("-"))
    .join(", ");
}

/** Drops links whose teeth are no longer both present in the product selection. */
export function pruneSplintLinks(teeth: number[], links: number[]): number[] {
  return links.filter((lower) => isSplintableLink(teeth, lower));
}
