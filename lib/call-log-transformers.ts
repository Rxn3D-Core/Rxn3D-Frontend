export type BackendActionStatus = "follow_up" | "resolved" | null | undefined;

export type FlattenedCallLogRow = {
  callLogId: number;
  slipId: number;
  slipNumber: string;
  caseId: number;
  timestamp: string;
  callType: "Incoming" | "Outgoing";
  callerName: string;
  callerPhone: string;
  note: string;
  loggedByName: string;
  actionByName: string;
  followUp: boolean;
  resolved: boolean;
  pending: boolean;
  hasAttachments: boolean;
  attachmentsCount: number;
  patientName: string;
  doctorName: string;
  officeName: string;
  locationName: string;
  productSummary: string;
};

export function toCallLogActionStatus(actionStatus: BackendActionStatus) {
  return {
    followUp: actionStatus === "follow_up",
    resolved: actionStatus === "resolved",
    pending: actionStatus == null,
  };
}

export function flattenCaseCallLogs(caseData: any): FlattenedCallLogRow[] {
  const slips = Array.isArray(caseData?.slips) ? caseData.slips : [];

  return slips.flatMap((slip: any) => {
    const slipId = Number(slip?.id);
    const callLogs = Array.isArray(slip?.call_logs) ? slip.call_logs : [];
    const productSummary = Array.isArray(slip?.products)
      ? slip.products
          .map((product: any) => product?.product_name)
          .filter(Boolean)
          .join(", ")
      : "";

    if (!Number.isFinite(slipId) || slipId <= 0) {
      return [];
    }

    return callLogs.flatMap((callLog: any) => {
      const callLogId = Number(callLog?.id);

      if (!Number.isFinite(callLogId) || callLogId <= 0) {
        return [];
      }

      const state = toCallLogActionStatus(callLog?.action_status ?? null);

      return [{
        callLogId,
        slipId,
        slipNumber: String(slip?.slip_number ?? ""),
        caseId: Number(caseData?.id ?? 0),
        timestamp: String(callLog?.call_date_time ?? ""),
        callType: callLog?.call_type === "incoming" ? "Incoming" : "Outgoing",
        callerName: String(callLog?.caller_name ?? ""),
        callerPhone: String(callLog?.caller_phone ?? ""),
        note: String(callLog?.call_notes ?? ""),
        loggedByName: String(callLog?.logged_by?.name ?? ""),
        actionByName: String(callLog?.action_by?.name ?? ""),
        followUp: state.followUp,
        resolved: state.resolved,
        pending: state.pending,
        hasAttachments: Boolean(callLog?.has_attachments ?? false),
        attachmentsCount: Number(callLog?.attachments_count ?? 0),
        patientName: String(caseData?.patient_name ?? ""),
        doctorName: String(caseData?.doctor?.name ?? ""),
        officeName: String(caseData?.office?.name ?? ""),
        locationName: String(slip?.location?.name ?? ""),
        productSummary,
      }];
    });
  });
}
