"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddNewStageFlow } from "@/components/add-new-stage/AddNewStageFlow";
import { Button } from "@/components/ui/button";

export default function AddNewStagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSlipId = Number(searchParams.get("sourceSlipId") ?? "");

  const validId = useMemo(
    () => !Number.isNaN(sourceSlipId) && sourceSlipId > 0,
    [sourceSlipId]
  );

  if (!validId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
        <p className="text-sm text-[#64748B]">
          Missing or invalid source slip. Open add stage from a virtual slip in office.
        </p>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return <AddNewStageFlow sourceSlipId={sourceSlipId} />;
}
