import { endOfDay, format, isValid, parseISO, startOfDay } from "date-fns";

export type BackendActionStatus = "follow_up" | "resolved" | null | undefined;

export type CallLogFormValues = {
  callType: "Incoming" | "Outgoing";
  callDate: string;
  callTime: string;
  callerName: string;
  callerPhone: string;
  callNotes: string;
};

export type CallLogAttachmentRecord = {
  id: number;
  file_name: string;
  original_name?: string | null;
  file_size: string | number | null;
  file_url?: string | null;
  file_path?: string | null;
};

export type CallLogAttachmentSummary = {
  id: number;
  name: string;
  size: string;
  url: string;
};

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

export type FlattenedCallLogFilters = {
  searchText?: string;
  showFollowUpOnly?: boolean;
  officeName?: string;
  userName?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
};

export function toCallLogActionStatus(actionStatus: BackendActionStatus) {
  return {
    followUp: actionStatus === "follow_up",
    resolved: actionStatus === "resolved",
    pending: actionStatus == null,
  };
}

export function toCallLogCreatePayload(values: CallLogFormValues) {
  return {
    call_type: values.callType === "Incoming" ? "incoming" : "outgoing",
    call_date_time: `${values.callDate} ${values.callTime}:00`,
    caller_name: values.callerName,
    caller_phone: values.callerPhone,
    call_notes: values.callNotes,
  };
}

export function toCallLogAttachmentSummary(
  attachments: CallLogAttachmentRecord[]
): CallLogAttachmentSummary[] {
  return attachments.flatMap((attachment) => {
    const id = Number(attachment?.id);
    const url = attachment?.file_url ?? attachment?.file_path ?? "";

    if (!Number.isFinite(id) || id <= 0 || !url) {
      return [];
    }

    return [{
      id,
      name: String(attachment?.original_name || attachment?.file_name || ""),
      size: String(attachment?.file_size ?? ""),
      url: String(url),
    }];
  });
}

export function formatCallLogTimestamp(timestamp: string) {
  const parsed = parseISO(timestamp);

  if (!isValid(parsed)) {
    return timestamp;
  }

  return format(parsed, "MM/dd/yy @ h:mm a");
}

export function filterFlattenedCallLogs(
  rows: FlattenedCallLogRow[],
  filters: FlattenedCallLogFilters,
) {
  const searchText = filters.searchText?.trim().toLowerCase() ?? "";
  const officeName = filters.officeName ?? "All";
  const userName = filters.userName ?? "All";

  return rows
    .filter((row) => {
      if (filters.showFollowUpOnly && !row.followUp) {
        return false;
      }

      if (searchText) {
        const haystack = [
          row.slipNumber,
          row.patientName,
          row.doctorName,
          row.note,
          row.callerName,
          row.loggedByName,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(searchText)) {
          return false;
        }
      }

      if (officeName !== "All" && row.officeName !== officeName) {
        return false;
      }

      if (userName !== "All" && row.loggedByName !== userName) {
        return false;
      }

      const parsedTimestamp = parseISO(row.timestamp);
      if (isValid(parsedTimestamp)) {
        if (filters.dateRange?.start) {
          const start = startOfDay(new Date(filters.dateRange.start));
          if (parsedTimestamp < start) {
            return false;
          }
        }

        if (filters.dateRange?.end) {
          const end = endOfDay(new Date(filters.dateRange.end));
          if (parsedTimestamp > end) {
            return false;
          }
        }
      }

      return true;
    })
    .sort((left, right) => {
      const leftTime = Date.parse(left.timestamp);
      const rightTime = Date.parse(right.timestamp);

      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
        return right.timestamp.localeCompare(left.timestamp);
      }

      return rightTime - leftTime;
    });
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
