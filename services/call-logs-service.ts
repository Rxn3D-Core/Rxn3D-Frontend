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

export type CallLogAttachmentUploadPayload = {
  files: File[];
  descriptions?: string[];
};

export type CallLogsApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type CallLogUserSummary = {
  id: number | null;
  name: string;
  email?: string;
};

export type CaseCallLogProduct = {
  id: number;
  product_name: string;
  stage_name: string;
  category_name: string;
  subcategory_name: string;
  retentions: Array<{
    id: number;
    name: string;
    code: string;
    teeth_number: number | null;
  }>;
  retention_options: Array<{
    id: number;
    retention_id: number | null;
    name: string;
    image_url: string | null;
    status: string | null;
    is_default: boolean | null;
    sequence: number | null;
    teeth_number: number | null;
  }>;
  material_id: number | null;
  material: {
    id: number;
    name: string;
    code: string;
  } | null;
};

export type CaseCallLogRecord = {
  id: number;
  call_type: "incoming" | "outgoing";
  call_date_time: string;
  caller_name: string;
  caller_phone: string;
  call_notes: string;
  action_status: "follow_up" | "resolved" | null;
  action_date: string | null;
  created_at: string;
  logged_by: CallLogUserSummary;
  action_by: CallLogUserSummary | null;
};

export type CaseCallLogSlip = {
  id: number;
  slip_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  location: {
    id: number | null;
    name: string;
  };
  casepan: {
    id: number | null;
    name: string;
    number: string;
  };
  products: CaseCallLogProduct[];
  call_logs: CaseCallLogRecord[];
};

export type CaseCallLogCase = {
  id: number;
  case_number: string;
  patient_name: string;
  case_status: string;
  created_at: string;
  updated_at: string;
  lab: {
    id: number;
    name: string;
  };
  office: {
    id: number;
    name: string;
  };
  doctor: {
    id: number | null;
    name: string;
  };
  created_by: {
    id: number | null;
    name: string;
  };
  slips: CaseCallLogSlip[];
};

export type CallLogDetail = {
  id: number;
  timestamp: {
    raw: string;
    formatted: string;
  };
  follow_up: {
    status: boolean | null;
    assigned_to?: {
      id: number;
      name: string;
    };
  };
  linked_slip?: {
    id: number;
    slip_number: string;
    casepan_number: string;
    patient_name: string | null;
  };
  call_type: "incoming" | "outgoing";
  user: {
    id: number;
    name: string;
  };
  caller: {
    name: string;
    phone: string;
  };
  notes: string;
  has_attachments: boolean;
  attachments_count: number;
  office?: {
    id: number;
    name: string;
    code: string;
  };
  is_archived: boolean;
  archived_at: string | null;
  archived_by?: {
    id: number;
    name: string;
  };
  action?: {
    status: "follow_up" | "resolved";
    date: string | null;
    by: {
      id: number;
      name: string;
    };
  };
  created_at: string;
  updated_at: string;
};

export type CallLogAttachmentUser = {
  id: number;
  name: string;
};

export type CallLogAttachmentRecord = {
  id: number;
  file_name: string;
  original_name: string | null;
  file_type: string | null;
  file_size: number | string | null;
  file_url: string | null;
  description: string | null;
  is_archived: boolean;
  archived_at: string | null;
  uploaded_by: CallLogAttachmentUser;
  archived_by?: CallLogAttachmentUser;
  created_at: string;
  updated_at: string;
};

export type CaseCallLogsResponse = CallLogsApiResponse<CaseCallLogCase>;
export type CallLogDetailResponse = CallLogsApiResponse<CallLogDetail>;
export type CallLogMutationResponse = CallLogDetailResponse;
export type CallLogDeleteResponse = {
  success: boolean;
  message: string;
};
export type CallLogAttachmentsResponse = CallLogsApiResponse<CallLogAttachmentRecord[]>;

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

async function uploadFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  const headers: HeadersInit = {};
  const token = typeof window === "undefined" ? null : localStorage.getItem("token");
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized - Redirecting to login");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const CallLogsService = {
  listCaseCallLogs(caseId: number, filters: CallLogFilterParams = {}) {
    return ApiService.get<CaseCallLogsResponse>(
      `/v1/slip/case/${caseId}/call-logs${toQueryString(filters)}`
    );
  },
  getCallLog(callLogId: number) {
    return ApiService.get<CallLogDetailResponse>(
      `/v1/slip/call-logs/call-log/${callLogId}`
    );
  },
  createCallLog(slipId: number, payload: CallLogMutationPayload) {
    return ApiService.post<CallLogMutationResponse>(
      `/v1/slip/call-logs/${slipId}/create`,
      payload
    );
  },
  updateCallLog(callLogId: number, payload: CallLogMutationPayload) {
    return ApiService.put<CallLogMutationResponse>(
      `/v1/slip/call-logs/call-log/${callLogId}`,
      payload
    );
  },
  deleteCallLog(callLogId: number) {
    return ApiService.delete<CallLogDeleteResponse>(
      `/v1/slip/call-logs/call-log/${callLogId}`
    );
  },
  markCallLogFollowUp(callLogId: number) {
    return ApiService.patch<CallLogMutationResponse>(
      `/v1/slip/call-logs/call-log/${callLogId}/follow-up`
    );
  },
  markCallLogResolved(callLogId: number) {
    return ApiService.patch<CallLogMutationResponse>(
      `/v1/slip/call-logs/call-log/${callLogId}/resolved`
    );
  },
  getCallLogAttachments(callLogId: number) {
    return ApiService.get<CallLogAttachmentsResponse>(
      `/v1/slip/call-logs/${callLogId}/attachments`
    );
  },
  uploadCallLogAttachments(
    callLogId: number,
    payload: CallLogAttachmentUploadPayload | File[]
  ) {
    const formData = new FormData();
    const files = Array.isArray(payload) ? payload : payload.files;
    const descriptions = Array.isArray(payload) ? [] : (payload.descriptions ?? []);

    files.forEach((file, index) => {
      formData.append("files[]", file);

      formData.append("descriptions[]", descriptions[index] ?? "");
    });

    return uploadFormData<CallLogAttachmentsResponse>(
      `/v1/slip/call-logs/${callLogId}/attachments`,
      formData
    );
  },
};
