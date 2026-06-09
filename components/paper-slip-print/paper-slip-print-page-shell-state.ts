export interface PaperSlipPrintActionStateInput {
  fetchError: string | null;
  loading: boolean;
  slipCount: number;
}

export interface PaperSlipPrintActionState {
  showPrintButton: boolean;
}

export function buildPaperSlipPrintActionState({
  fetchError,
  loading,
  slipCount,
}: PaperSlipPrintActionStateInput): PaperSlipPrintActionState {
  return {
    showPrintButton: !fetchError && !loading && slipCount > 0,
  };
}
