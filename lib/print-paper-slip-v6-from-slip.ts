import { apiClient } from "@/lib/api/client";
import { printPaperSlipV6, printPaperSlipV6Many } from "@/lib/paper-slip-v6-html";
import { resolveVirtualSlipCaseId } from "@/lib/virtual-slip-case-id";
import { buildVirtualSlipVM } from "@/lib/virtual-slip-view-model";

/** Listing print: load the slip already used by the virtual slip, then print v6. */
export async function printPaperSlipV6ForSlip(slipId: number, fallbackCaseId?: number): Promise<void> {
  await printPaperSlipV6(async () => {
    const { data } = await apiClient.get<unknown>(`/slip/slip/${slipId}/details`);
    const details = data && typeof data === "object" ? data : {};
    const vm = buildVirtualSlipVM(details);
    const caseId = resolveVirtualSlipCaseId(details) ?? fallbackCaseId ?? 0;
    return { vm, caseId, slipId, details };
  });
}

/** Listing bulk print: one v6 letter page per selected slip. */
export async function printPaperSlipV6ForSlips(
  slips: Array<{ slipId: number; caseId?: number }>,
): Promise<void> {
  await printPaperSlipV6Many(() =>
    Promise.all(
      slips.map(async ({ slipId, caseId }) => {
        const { data } = await apiClient.get<unknown>(`/slip/slip/${slipId}/details`);
        const details = data && typeof data === "object" ? data : {};
        const vm = buildVirtualSlipVM(details);
        return {
          vm,
          caseId: resolveVirtualSlipCaseId(details) ?? caseId ?? 0,
          slipId,
          details,
        };
      }),
    ),
  );
}
