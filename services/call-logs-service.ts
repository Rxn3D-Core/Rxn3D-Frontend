import { ApiService } from "@/lib/api-service";

export type CallLogFilterParams = {
  call_type?: "incoming" | "outgoing";
  action_status?: "follow_up" | "resolved";
  caller_name?: string;
};

export type CallLogMutationPayload = {
  call_type: "incoming" | "outgoing";
  call_date_time: string;
  caller_name: string;
  caller_phone?: string;
  call_notes: string;
};

function toQueryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

export const CallLogsService = {
  listCaseCallLogs(caseId: number, filters: CallLogFilterParams = {}) {
    return ApiService.get(
      `/v1/slip/case/${caseId}/call-logs${toQueryString(filters)}`
    );
  },
  getCallLog(callLogId: number) {
    return ApiService.get(`/v1/slip/call-logs/call-log/${callLogId}`);
  },
  createCallLog(slipId: number, payload: CallLogMutationPayload) {
    return ApiService.post(`/v1/slip/call-logs/${slipId}/create`, payload);
  },
  updateCallLog(callLogId: number, payload: CallLogMutationPayload) {
    return ApiService.put(`/v1/slip/call-logs/call-log/${callLogId}`, payload);
  },
  deleteCallLog(callLogId: number) {
    return ApiService.delete(`/v1/slip/call-logs/call-log/${callLogId}`);
  },
  markCallLogFollowUp(callLogId: number) {
    return ApiService.patch(`/v1/slip/call-logs/call-log/${callLogId}/follow-up`);
  },
  markCallLogResolved(callLogId: number) {
    return ApiService.patch(`/v1/slip/call-logs/call-log/${callLogId}/resolved`);
  },
};
