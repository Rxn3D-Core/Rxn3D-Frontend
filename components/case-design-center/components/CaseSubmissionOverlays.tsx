"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
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
          <div className="w-[350px] h-[350px]">
            <DotLottieReact
              src="https://lottie.host/b1a1c60d-ee51-497e-ba93-e50e79bf6abb/em5bh3uFj8.lottie"
              autoplay
              speed={2}
            />
          </div>
          <p className="mt-4 text-lg font-semibold text-gray-700">Case submitted successfully!</p>
        </div>
      )}
    </>
  );
}
