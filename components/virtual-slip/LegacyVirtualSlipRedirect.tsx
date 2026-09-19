"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { resolveVirtualSlipCaseId } from "@/lib/virtual-slip-case-id";
import { buildVirtualSlipPath } from "@/lib/virtual-slip-routes";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

type LegacyVirtualSlipRedirectProps = {
  /** Legacy URL segment was slip id (misnamed caseNumber historically). */
  slipIdParam: string;
};

/**
 * Resolves case id for old `/virtual-slip/{slipId}` and `/virtual-slip-v2/{slipId}`
 * bookmarks, then replaces the URL with `/virtual-slip/{caseId}/{slipId}`.
 */
export function LegacyVirtualSlipRedirect({
  slipIdParam,
}: LegacyVirtualSlipRedirectProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const slipId = Number(slipIdParam);
    if (!slipId || Number.isNaN(slipId)) {
      setError("Invalid slip id");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await apiClient.get<unknown>(`/slip/slip/${slipId}/details`);
        const payload = response.data as { data?: unknown } | unknown;
        const details =
          payload &&
          typeof payload === "object" &&
          "data" in payload &&
          (payload as { data?: unknown }).data !== undefined
            ? (payload as { data: unknown }).data
            : payload;

        const caseId = resolveVirtualSlipCaseId(details);
        if (cancelled) return;

        if (!caseId) {
          setError("Unable to resolve case for this slip");
          return;
        }

        router.replace(buildVirtualSlipPath(caseId, slipId));
      } catch {
        if (!cancelled) setError("Unable to open virtual slip");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, slipIdParam]);

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return <LoadingOverlay />;
}
