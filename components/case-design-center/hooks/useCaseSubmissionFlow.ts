import { useCallback, useEffect, useRef, useState } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { SlipProductSnapshot } from "../types";
import type { WizardDoctorShape, WizardLabShape } from "@/components/new-case-wizard";
import type {
  SlipCreationMultipartFile,
  SlipCreationPayload,
  SlipCreationResponse,
} from "@/services/slip-creation-service";
import { buildCaseSubmissionPayloadAsync } from "../utils/caseSubmissionPayload";
import {
  resolveCaseSubmissionResult,
  resolveVirtualSlipPath,
  type CaseSubmissionResult,
  type CaseSubmissionState,
} from "../utils/caseCompletionDestination";

interface ToastApi {
  (options: { title: string; description: string; variant?: "destructive" }): void;
}

interface CachedAttachment {
  file?: unknown;
  url?: string;
  description?: string;
  remoteId?: unknown;
  generatedPath?: string;
}

/**
 * Reads attachments cached during slip creation (window.__caseDesignAttachments)
 * and uploads any local files to the freshly created slip. Already-remote files
 * (remoteId/generatedPath set) are skipped. Failures are collected, not thrown,
 * so a bad attachment never blocks the successful submit redirect.
 */
async function uploadCachedAttachmentsToSlip(
  slipId: number,
  upload: (slipId: number, file: File, notes?: string) => Promise<any>,
): Promise<{ uploaded: number; failed: number }> {
  if (typeof window === "undefined") return { uploaded: 0, failed: 0 };

  const cached = (window as any).__caseDesignAttachments as CachedAttachment[] | undefined;
  if (!Array.isArray(cached) || cached.length === 0) return { uploaded: 0, failed: 0 };

  const pending = cached.filter(
    (item) =>
      item.file instanceof File && !item.remoteId && !item.generatedPath,
  );
  if (pending.length === 0) return { uploaded: 0, failed: 0 };

  let uploaded = 0;
  let failed = 0;
  for (const item of pending) {
    try {
      await upload(slipId, item.file as File, item.description);
      uploaded += 1;
    } catch (error) {
      failed += 1;
      console.error("Failed to upload cached attachment:", error);
    }
  }

  // Clear the cache so a later submit doesn't re-upload the same files.
  if (failed === 0) {
    (window as any).__caseDesignAttachments = [];
  }

  return { uploaded, failed };
}

interface UseCaseSubmissionFlowParams {
  createSlip: (
    payload: SlipCreationPayload,
    multipartFiles?: SlipCreationMultipartFile[]
  ) => Promise<SlipCreationResponse["data"] | SlipCreationResponse | any>;
  /**
   * Uploads a single attachment file to a slip. Provided by the slip-creation
   * context. When present, attachments cached during slip creation are uploaded
   * to the newly created slip after a successful submit.
   */
  uploadSlipAttachment?: (
    slipId: number,
    file: File,
    notes?: string
  ) => Promise<any>;
  router: AppRouterInstance;
  toast: ToastApi;
  slipCollectorRef: React.MutableRefObject<(() => SlipProductSnapshot[]) | null>;
  completedLab: WizardLabShape | null;
  completedDoctor: WizardDoctorShape | null;
  completedPatientName: string;
  completedGender: string;
  completedAge: string;
  labCustomerId?: number | null;
  successRedirectDelayMs?: number;
}

export function useCaseSubmissionFlow({
  createSlip,
  uploadSlipAttachment,
  router,
  toast,
  slipCollectorRef,
  completedLab,
  completedDoctor,
  completedPatientName,
  completedGender,
  completedAge,
  labCustomerId = null,
  successRedirectDelayMs = 2500,
}: UseCaseSubmissionFlowParams) {
  const [submissionState, setSubmissionState] = useState<CaseSubmissionState>("idle");
  const [caseSubmitted, setCaseSubmitted] = useState(false);
  const [slipHeaderLoading, setSlipHeaderLoading] = useState(false);
  const [slipResponseData, setSlipResponseData] = useState<SlipCreationResponse["data"] | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<CaseSubmissionResult | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const submit = useCallback(async () => {
    if (submissionState === "submitting" || submissionState === "success-transition") {
      return;
    }

    const snapshots = slipCollectorRef.current?.() ?? [];
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    const customerId = Number(typeof window !== "undefined" ? localStorage.getItem("customerId") : 0) || 0;
    const { payload, multipartFiles } = await buildCaseSubmissionPayloadAsync({
      snapshots,
      role,
      customerId,
      completedLabId: completedLab?.id,
      completedDoctorId: completedDoctor?.id,
      patientName: completedPatientName,
      gender: completedGender,
      age: completedAge,
      labCustomerId: labCustomerId ?? undefined,
    });

    setSubmissionError(null);
    setSubmissionState("submitting");
    setSlipHeaderLoading(true);

    try {
      const rawResponse = await createSlip(
        payload,
        multipartFiles.length > 0 ? multipartFiles : undefined
      );
      const result = resolveCaseSubmissionResult(rawResponse);
      const redirectPath = resolveVirtualSlipPath(result);
      const responseData = "data" in (rawResponse ?? {}) ? rawResponse.data ?? null : rawResponse ?? null;

      setSlipResponseData(responseData);
      setSubmissionResult(result);
      setCaseSubmitted(true);
      setSlipHeaderLoading(false);
      setSubmissionState("success-transition");

      toast({ title: "Case submitted", description: "Slip created successfully." });

      // Upload attachments cached during slip creation now that we have a slip id.
      // Never block the redirect — surface a non-fatal warning if any fail.
      if (uploadSlipAttachment) {
        try {
          const { failed } = await uploadCachedAttachmentsToSlip(
            result.slipId,
            uploadSlipAttachment,
          );
          if (failed > 0) {
            toast({
              title: "Some attachments failed",
              description: `${failed} file(s) could not be uploaded. You can re-attach them on the slip.`,
              variant: "destructive",
            });
          }
        } catch (attachmentError) {
          console.error("Attachment upload step failed:", attachmentError);
        }
      }

      redirectTimerRef.current = setTimeout(() => {
        router.push(redirectPath);
      }, successRedirectDelayMs);
    } catch (error: any) {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }

      const message = error?.message ?? "Something went wrong.";
      setSubmissionError(message);
      setSlipHeaderLoading(false);
      setCaseSubmitted(false);
      setSubmissionState("error");
      toast({ title: "Submit failed", description: message, variant: "destructive" });
    }
  }, [
    submissionState,
    slipCollectorRef,
    completedLab?.id,
    completedDoctor?.id,
    completedPatientName,
    completedGender,
    completedAge,
    labCustomerId,
    createSlip,
    uploadSlipAttachment,
    router,
    successRedirectDelayMs,
    toast,
  ]);

  return {
    submissionState,
    caseSubmitted,
    slipHeaderLoading,
    slipResponseData,
    submissionError,
    submissionResult,
    submit,
  };
}
