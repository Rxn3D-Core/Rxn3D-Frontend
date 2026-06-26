"use client";

export default function PaperSlipPrintError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#f4f4f5] px-4 py-10">
      <div className="mx-auto max-w-[760px] rounded-[28px] border border-[#fecaca] bg-[#fff1f2] p-8 text-[#991b1b] shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <div className="text-[12px] font-semibold uppercase tracking-[0.22em] opacity-70">Paper Slip Print</div>
        <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.04em]">Unable to render the print page</h1>
        <p className="mt-3 text-[14px] leading-6 opacity-90">
          {error.message || "An unexpected error occurred while preparing the printable paper slip."}
        </p>
        <button
          className="mt-6 rounded-full border border-current px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em]"
          onClick={reset}
          type="button"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
