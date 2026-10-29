"use client";

import type { CaseSubmissionState } from "../utils/caseCompletionDestination";
import type { AttachmentUploadState } from "../hooks/useCaseSubmissionFlow";

interface CaseSubmissionOverlaysProps {
  submissionState: CaseSubmissionState;
  attachmentUpload?: AttachmentUploadState;
  onRetryAttachments?: () => void;
  onContinueWithoutAttachments?: () => void;
}

export function CaseSubmissionOverlays({
  submissionState,
  attachmentUpload = { phase: "idle" },
  onRetryAttachments,
  onContinueWithoutAttachments,
}: CaseSubmissionOverlaysProps) {
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
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm px-4">
          <img
            src="/images/success-orbit.gif?v=20260610"
            alt="Case submitted successfully!"
            className="w-[300px] h-[300px] max-w-full"
          />
          <p className="mt-4 text-lg font-semibold text-gray-700">Case submitted successfully!</p>

          {attachmentUpload.phase === "uploading" && (
            <div data-testid="case-submit-attachments-progress" className="mt-4 w-full max-w-sm text-center">
              <p className="text-sm text-gray-700">
                Uploading attachments {Math.min(attachmentUpload.completed + 1, attachmentUpload.total)} of{" "}
                {attachmentUpload.total}... Please keep this page open.
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-200">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{
                    width: `${attachmentUpload.total ? (attachmentUpload.completed / attachmentUpload.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {attachmentUpload.phase === "failed" && (
            <div
              role="alert"
              data-testid="case-submit-attachments-failed"
              className="mt-4 w-full max-w-md rounded-lg border border-red-300 bg-red-50 p-4 text-left"
            >
              <p className="text-sm font-semibold text-red-800">
                {attachmentUpload.failed.length} of {attachmentUpload.total} attachment(s) were not uploaded
              </p>
              <ul className="mt-2 max-h-32 overflow-auto text-xs text-red-700">
                {attachmentUpload.failed.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="break-words">
                    {f.name}: {f.error}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-red-700">
                The slip was created. If you leave now, these files are not saved and must be attached again on the slip.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="case-submit-attachments-retry"
                  onClick={onRetryAttachments}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  Retry upload
                </button>
                <button
                  type="button"
                  data-testid="case-submit-attachments-continue"
                  onClick={onContinueWithoutAttachments}
                  className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Continue without them
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
