import { buildApiUrl } from "@/lib/api/client";
import type { SlipCreationMultipartFile } from "@/services/slip-creation-service";
import type { EditSlipPayload } from "@/components/case-design-center/utils/editSlipSubmissionPayload";

export type EditSlipResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
};

function getJsonAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getMultipartAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function appendFormDataValue(formData: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (value instanceof File) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === "object" && item !== null && !(item instanceof File)) {
        Object.entries(item).forEach(([childKey, childValue]) => {
          appendFormDataValue(formData, `${key}[${index}][${childKey}]`, childValue);
        });
      } else {
        appendFormDataValue(formData, `${key}[${index}]`, item);
      }
    });
    return;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) => {
      appendFormDataValue(formData, `${key}[${childKey}]`, childValue);
    });
    return;
  }
  formData.append(key, String(value));
}

export function buildEditSlipFormData(
  payload: EditSlipPayload,
  multipartFiles: SlipCreationMultipartFile[] = []
): FormData {
  const formData = new FormData();

  if (payload.location_id != null) {
    appendFormDataValue(formData, "location_id", payload.location_id);
  }
  if (payload.status) {
    appendFormDataValue(formData, "status", payload.status);
  }
  if (payload.casepan_id != null) {
    appendFormDataValue(formData, "casepan_id", payload.casepan_id);
  }
  if (payload.casepan_number) {
    appendFormDataValue(formData, "casepan_number", payload.casepan_number);
  }

  payload.products?.forEach((product, productIndex) => {
    Object.entries(product).forEach(([key, value]) => {
      appendFormDataValue(formData, `products[${productIndex}][${key}]`, value);
    });
  });

  payload.notes?.forEach((note, noteIndex) => {
    Object.entries(note).forEach(([key, value]) => {
      appendFormDataValue(formData, `notes[${noteIndex}][${key}]`, value);
    });
  });

  for (const { formKey, file } of multipartFiles) {
    formData.append(formKey, file);
  }

  return formData;
}

async function parseEditSlipResponse(res: Response): Promise<EditSlipResponse> {
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const json = (await res.json().catch(() => ({
    success: false,
    message: "Invalid response",
  }))) as EditSlipResponse & { error?: string; errors?: Record<string, string[]> };

  if (!res.ok) {
    const firstFieldError = json.errors
      ? Object.values(json.errors).flat()[0]
      : undefined;
    throw new Error(
      json.message || firstFieldError || json.error || `Request failed (${res.status})`
    );
  }

  return json;
}

export async function putEditSlip(
  slipId: number,
  payload: EditSlipPayload,
  multipartFiles: SlipCreationMultipartFile[] = []
): Promise<EditSlipResponse> {
  const url = buildApiUrl(`/slip/${slipId}/edit`);
  const hasFiles = multipartFiles.length > 0;

  const res = await fetch(url, {
    method: "PUT",
    headers: hasFiles ? getMultipartAuthHeaders() : getJsonAuthHeaders(),
    body: hasFiles
      ? buildEditSlipFormData(payload, multipartFiles)
      : JSON.stringify(payload),
  });

  const json = await parseEditSlipResponse(res);
  if (!json.success) {
    throw new Error(json.message || "Could not update slip.");
  }
  return json;
}
