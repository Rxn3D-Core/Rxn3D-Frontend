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
import { markSlipForAutoPrint } from "@/lib/paper-slip-auto-print";
import {
  dropLinkedPendingAttachments,
  localUploadsFromCache,
  pendingAttachmentIdsFromCache,
  uploadCachedAttachmentsToSlip,
  type AttachmentUploadProgress,
} from "@/lib/case-design-attachment-cache";
import {
  isSlipLimitExceededError,
  LAB_SLIP_LIMIT_MESSAGE,
  OFFICE_LAB_UNAVAILABLE_MESSAGE,
} from "@/lib/slip-creation-guardrails";

interface ToastApi {
  (options: { title: string; description: string; variant?: "destructive" }): void;
}

export type AttachmentUploadState =
  | { phase: "idle" }
  | ({ phase: "uploading" | "failed" } & AttachmentUploadProgress);

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
    options?: { notes?: string; attachment_type?: string }
  ) => Promise<any>;
  router: AppRouterInstance;
  toast: ToastApi;
  slipCollectorRef: React.MutableRefObject<(() => SlipProductSnapshot[]) | null>;
  caseSummaryNotesRef?: React.MutableRefObject<string>;
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
  caseSummaryNotesRef,
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
  const [attachmentUpload, setAttachmentUpload] = useState<AttachmentUploadState>({ phase: "idle" });
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadTargetRef = useRef<{ slipId: number; redirectPath: string } | null>(null);
  const uploadInFlightRef = useRef(false);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  // Staged files live only in this tab's memory: warn before a reload or close
  // while they are uploading or waiting for a retry.
  const attachmentsAtRisk = attachmentUpload.phase !== "idle";
  useEffect(() => {
    if (!attachmentsAtRisk || typeof window === "undefined") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [attachmentsAtRisk]);

  const scheduleRedirect = useCallback(
    (redirectPath: string) => {
      redirectTimerRef.current = setTimeout(() => {
        router.push(redirectPath);
      }, successRedirectDelayMs);
    },
    [router, successRedirectDelayMs]
  );

  /**
   * Uploads the locally staged files to the new slip and keeps the user on the
   * page until every file is saved. Failures stay in the cache and show a
   * persistent panel with Retry; the redirect only runs once nothing is left.
   */
  const runAttachmentUploads = useCallback(async () => {
    const target = uploadTargetRef.current;
    if (!target || !uploadSlipAttachment || uploadInFlightRef.current) return;
    uploadInFlightRef.current = true;
    const result = await uploadCachedAttachmentsToSlip(target.slipId, uploadSlipAttachment, (progress) =>
      setAttachmentUpload({ phase: "uploading", ...progress })
    ).finally(() => {
      uploadInFlightRef.current = false;
    });
    if (result.failed.length > 0) {
      setAttachmentUpload({ phase: "failed", total: result.total, completed: result.completed, failed: result.failed });
      toast({
        title: "Some attachments failed",
        description: `${result.failed.length} file(s) could not be uploaded. Retry before leaving this page.`,
        variant: "destructive",
      });
      return;
    }
    setAttachmentUpload({ phase: "idle" });
    scheduleRedirect(target.redirectPath);
  }, [uploadSlipAttachment, toast, scheduleRedirect]);

  const retryAttachmentUploads = useCallback(() => {
    if (attachmentUpload.phase !== "failed") return;
    void runAttachmentUploads();
  }, [attachmentUpload.phase, runAttachmentUploads]);

  /** Leaves for the slip page without the failed files (the user chose to re-attach later). */
  const continueWithoutFailedAttachments = useCallback(() => {
    const target = uploadTargetRef.current;
    if (attachmentUpload.phase !== "failed" || !target) return;
    setAttachmentUpload({ phase: "idle" });
    router.push(target.redirectPath);
  }, [attachmentUpload.phase, router]);

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
      caseSummaryNotes: caseSummaryNotesRef?.current,
    });

    const pendingAttachmentIds = pendingAttachmentIdsFromCache();
    if (pendingAttachmentIds.length > 0 && payload.slips[0]) {
      payload.slips[0] = {
        ...payload.slips[0],
        pending_attachment_ids: pendingAttachmentIds,
      };
    }

    setSubmissionError(null);
    setSubmissionState("submitting");
    setSlipHeaderLoading(true);

    try {
      const rawResponse = await createSlip(
        payload,
        multipartFiles.length > 0 ? multipartFiles : undefined
      );
      if (pendingAttachmentIds.length > 0) {
        dropLinkedPendingAttachments(pendingAttachmentIds);
      }
      const result = resolveCaseSubmissionResult(rawResponse);
      const redirectPath = resolveVirtualSlipPath(result);
      const responseData = "data" in (rawResponse ?? {}) ? rawResponse.data ?? null : rawResponse ?? null;

      setSlipResponseData(responseData);
      setSubmissionResult(result);
      setCaseSubmitted(true);
      setSlipHeaderLoading(false);
      setSubmissionState("success-transition");

      toast({ title: "Case submitted", description: "Slip created successfully." });

      // The virtual slip page consumes this flag on mount to auto-open the
      // paper slip print window exactly once for the new slip.
      markSlipForAutoPrint(result.slipId);

      // Local files staged before the slip existed are posted to
      // /slip/attachments/{slipId}/upload now. The redirect waits for them so
      // leaving the page can't drop files that are still in memory.
      uploadTargetRef.current = { slipId: result.slipId, redirectPath };
      if (uploadSlipAttachment && localUploadsFromCache().length > 0) {
        await runAttachmentUploads();
      } else {
        scheduleRedirect(redirectPath);
      }
    } catch (error: any) {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }

      const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
      const limitHit = isSlipLimitExceededError(error);
      const message = limitHit
        ? role === "office_admin"
          ? OFFICE_LAB_UNAVAILABLE_MESSAGE
          : LAB_SLIP_LIMIT_MESSAGE
        : (error?.message ?? "Something went wrong.");
      setSubmissionError(message);
      setSlipHeaderLoading(false);
      setCaseSubmitted(false);
      setSubmissionState("error");
      toast({ title: "Submit failed", description: message, variant: "destructive" });
    }
  }, [
    submissionState,
    slipCollectorRef,
    caseSummaryNotesRef,
    completedLab?.id,
    completedDoctor?.id,
    completedPatientName,
    completedGender,
    completedAge,
    labCustomerId,
    createSlip,
    uploadSlipAttachment,
    runAttachmentUploads,
    scheduleRedirect,
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
    attachmentUpload,
    retryAttachmentUploads,
    continueWithoutFailedAttachments,
  };
}
