import { apiClient } from "@/lib/api/client";
import { printPaperSlipV5, printPaperSlipV5Many } from "@/lib/paper-slip-v5-html";
import { resolveVirtualSlipCaseId } from "@/lib/virtual-slip-case-id";
import { buildVirtualSlipVM } from "@/lib/virtual-slip-view-model";

/** Listing print: load the slip already used by the virtual slip, then print v5. */
export async function printPaperSlipV5ForSlip(slipId: number, fallbackCaseId?: number): Promise<void> {
  const { data } = await apiClient.get<unknown>(`/slip/slip/${slipId}/details`);
  const details = data && typeof data === "object" ? data : {};
  const vm = buildVirtualSlipVM(details);
  const caseId = resolveVirtualSlipCaseId(details) ?? fallbackCaseId ?? 0;
  await printPaperSlipV5({ vm, caseId, slipId, details });
}

/** Listing bulk print: one v5 letter page per selected slip. */
export async function printPaperSlipV5ForSlips(
  slips: Array<{ slipId: number; caseId?: number }>,
): Promise<void> {
  const inputs = await Promise.all(
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
  );
  await printPaperSlipV5Many(inputs);
}
