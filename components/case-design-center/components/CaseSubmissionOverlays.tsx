"use client";

import type { CaseSubmissionState } from "../utils/caseCompletionDestination";

interface CaseSubmissionOverlaysProps {
  submissionState: CaseSubmissionState;
}

export function CaseSubmissionOverlays({ submissionState }: CaseSubmissionOverlaysProps) {
  const isSubmitting = submissionState === "submitting";
  const showSuccessOverlay = submissionState === "success-transition";

  return (
    <>
      {isSubmitting && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <img
            src="/images/ajax-loader.gif?v=20260602"
            alt="Submitting..."
            className="w-[300px] h-[300px]"
          />
          <p className="mt-4 text-lg font-semibold text-gray-700">Submitting case...</p>
        </div>
      )}

      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <img
            src="/images/success-orbit.gif?v=20260610"
            alt="Case submitted successfully!"
            className="w-[300px] h-[300px]"
          />
          <p className="mt-4 text-lg font-semibold text-gray-700">Case submitted successfully!</p>
        </div>
      )}
    </>
  );
}
