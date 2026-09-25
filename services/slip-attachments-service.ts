import { ApiService } from "@/lib/api-service";

export type SlipAttachmentType =
  | "global"
  | "impression"
  | "design"
  | "scan"
  | "photo"
  | "other";

export type SlipAttachmentUser = {
  id: number;
  name: string;
  email?: string;
};

export type SlipAttachmentRecord = {
  id: number;
  slip_id: number;
  file_name: string;
  file_path: string;
  is_s3_stored?: boolean;
  file_type: string;
  file_size: number;
  file_size_formatted?: string;
  mime_type: string;
  attachment_type: SlipAttachmentType | string;
  notes: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  download_url: string;
  is_image: boolean;
  is_pdf: boolean;
  is_stl: boolean;
  uploaded_by: SlipAttachmentUser | null;
  archived_by: SlipAttachmentUser | null;
};

export type SlipAttachmentsListParams = {
  attachment_type?: SlipAttachmentType | string;
  file_type?: string;
  archived?: boolean;
  per_page?: number;
};

export type CaseAttachmentsParams = {
  attachment_type?: SlipAttachmentType | string;
  include_archived?: boolean;
};

export type SlipAttachmentsApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
};

export type CaseAttachmentSlip = {
  id: number;
  slip_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  location?: { id: number; name: string };
  casepan?: { id: number; name: string; number: string };
  products?: Array<{
    id: number;
    product_name: string;
    stage_name: string;
    category_name: string;
    subcategory_name: string;
  }>;
  attachments: SlipAttachmentRecord[];
};

export type CaseAttachmentsData = {
  id: number;
  case_number: string;
  patient_name: string;
  case_status: string;
  created_at: string;
  updated_at: string;
  summary?: {
    case_attachment_count: number;
    slip_attachment_count: number;
    total_count: number;
  };
  lab?: { id: number; name: string };
  office?: { id: number; name: string };
  doctor?: { id: number; name: string };
  created_by?: { id: number; name: string };
  all_attachments?: SlipAttachmentRecord[];
  case_attachments?: SlipAttachmentRecord[];
  slips: CaseAttachmentSlip[];
};

export type SlipAttachmentUploadOptions = {
  attachment_type?: SlipAttachmentType | string;
  notes?: string;
};

export const SLIP_ATTACHMENT_MAX_BYTES = 500 * 1024 * 1024;

export const SLIP_ATTACHMENT_ALLOWED_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "pdf",
  "stl",
  "zip",
  "rar",
  "doc",
  "docx",
  "xls",
  "xlsx",
] as const;

function toQueryString(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

function authHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  const token = typeof window === "undefined" ? null : localStorage.getItem("token");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function apiUrl(endpoint: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return `${baseUrl}${endpoint}`;
}

async function uploadFormData<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<T> {
  if (!onProgress) {
    const response = await fetch(apiUrl(endpoint), {
      method: "POST",
      headers: authHeaders(),
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

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(endpoint));
    const token = typeof window === "undefined" ? null : localStorage.getItem("token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onloadstart = () => onProgress(0);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => {
      if (xhr.status === 401) {
        if (typeof window !== "undefined") window.location.href = "/login";
        reject(new Error("Unauthorized - Redirecting to login"));
        return;
      }
      let body: { message?: string } = {};
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        body = {};
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(body.message || `HTTP error! status: ${xhr.status}`));
        return;
      }
      resolve(body as T);
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });
}

export function validateSlipAttachmentFile(file: File): string | null {
  if (file.size > SLIP_ATTACHMENT_MAX_BYTES) {
    return "The file size must not exceed 500MB.";
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (
    ext &&
    !SLIP_ATTACHMENT_ALLOWED_EXTENSIONS.includes(
      ext as (typeof SLIP_ATTACHMENT_ALLOWED_EXTENSIONS)[number]
    )
  ) {
    return `File type not allowed. Allowed types: ${SLIP_ATTACHMENT_ALLOWED_EXTENSIONS.join(", ")}.`;
  }
  return null;
}

export function mapSlipAttachmentToLocalItem(a: SlipAttachmentRecord) {
  const fileName = (a.file_name || a.download_url?.split("/").pop() || "remote-file").toLowerCase();
  let type: "stl" | "image" | "3dobject" | "other" = "other";
  if (a.is_stl || fileName.endsWith(".stl")) type = "stl";
  else if (fileName.endsWith(".3dobject")) type = "3dobject";
  else if (a.is_image) type = "image";

  const fileLike = {
    name: a.file_name || a.download_url?.split("/").pop() || "remote-file",
    size: Number(a.file_size) || 0,
    lastModified: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
  };

  return {
    file: fileLike,
    url: a.download_url || a.file_path,
    type,
    archived: a.is_archived,
    remoteId: a.id,
    remoteMeta: a,
    attachmentType: a.attachment_type,
    notes: a.notes ?? "",
  };
}

export const SlipAttachmentsService = {
  getSlipAttachments(slipId: number, params: SlipAttachmentsListParams = {}) {
    return ApiService.get<SlipAttachmentsApiResponse<SlipAttachmentRecord[]>>(
      `/slip/attachments/${slipId}${toQueryString(params)}`
    );
  },

  uploadSlipAttachment(
    slipId: number,
    file: File,
    options: SlipAttachmentUploadOptions = {},
    onProgress?: (percent: number) => void
  ) {
    const validationError = validateSlipAttachmentFile(file);
    if (validationError) {
      return Promise.reject(new Error(validationError));
    }

    const formData = new FormData();
    formData.append("file", file);
    if (options.attachment_type) {
      formData.append("attachment_type", options.attachment_type);
    }
    if (options.notes) {
      formData.append("notes", options.notes);
    }

    return uploadFormData<SlipAttachmentsApiResponse<SlipAttachmentRecord>>(
      `/slip/attachments/${slipId}/upload`,
      formData,
      onProgress
    );
  },

  uploadPendingAttachment(
    labId: number,
    file: File,
    options: SlipAttachmentUploadOptions = {},
    onProgress?: (percent: number) => void
  ) {
    const validationError = validateSlipAttachmentFile(file);
    if (validationError) {
      return Promise.reject(new Error(validationError));
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("lab_id", String(labId));
    if (options.attachment_type) {
      formData.append("attachment_type", options.attachment_type);
    }
    if (options.notes) {
      formData.append("notes", options.notes);
    }

    return uploadFormData<SlipAttachmentsApiResponse<SlipAttachmentRecord>>(
      `/slip/attachments/pending`,
      formData,
      onProgress
    );
  },

  deletePendingAttachment(attachmentId: number) {
    return ApiService.delete<SlipAttachmentsApiResponse<null>>(
      `/slip/attachments/pending/${attachmentId}`
    );
  },

  getCaseAttachments(caseId: number, params: CaseAttachmentsParams = {}) {
    return ApiService.get<SlipAttachmentsApiResponse<CaseAttachmentsData>>(
      `/slip/case/${caseId}/attachments${toQueryString(params)}`
    );
  },

  getAttachment(attachmentId: number) {
    return ApiService.get<SlipAttachmentsApiResponse<SlipAttachmentRecord>>(
      `/slip/attachments/attachment/${attachmentId}`
    );
  },

  deleteAttachment(attachmentId: number) {
    return ApiService.delete<SlipAttachmentsApiResponse<null>>(
      `/slip/attachments/attachment/${attachmentId}`
    );
  },

  toggleArchiveAttachment(attachmentId: number) {
    return ApiService.patch<SlipAttachmentsApiResponse<SlipAttachmentRecord>>(
      `/slip/attachments/attachment/${attachmentId}/archive`
    );
  },
};
