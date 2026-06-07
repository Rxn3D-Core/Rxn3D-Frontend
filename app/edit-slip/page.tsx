"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EditSlipFlow } from "@/components/edit-slip/EditSlipFlow";
import { Button } from "@/components/ui/button";

export default function EditSlipPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slipId = Number(searchParams.get("slipId") ?? "");

  const validId = useMemo(() => !Number.isNaN(slipId) && slipId > 0, [slipId]);

  if (!validId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
        <p className="text-sm text-[#64748B]">
          Missing or invalid slip. Open edit slip from a virtual slip.
        </p>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return <EditSlipFlow slipId={slipId} />;
}
