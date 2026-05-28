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

interface UseCaseSubmissionFlowParams {
  createSlip: (
    payload: SlipCreationPayload,
    multipartFiles?: SlipCreationMultipartFile[]
  ) => Promise<SlipCreationResponse["data"] | SlipCreationResponse | any>;
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
