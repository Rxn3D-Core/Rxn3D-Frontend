import { redirect } from "next/navigation";

/**
 * Legacy v1 virtual slip route.
 *
 * The v1 UI has been retired in favour of /virtual-slip-v2. No in-app
 * navigation targets this path anymore, but old bookmarks, external
 * (AnyLink) deep links and stale browser-history entries can still hit
 * it. Permanently redirect any such request to the v2 route so the
 * virtual slip always opens in v2.
 */
export default function LegacyVirtualSlipPage({
  params,
}: {
  params: { caseNumber: string };
}) {
  redirect(`/virtual-slip-v2/${params.caseNumber}`);
}
