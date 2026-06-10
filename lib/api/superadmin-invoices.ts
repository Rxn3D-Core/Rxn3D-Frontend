import { buildApiUrl } from "@/lib/api/client"

export interface SuperadminInvoice {
  id: number
  stripe_invoice_id: string | null
  customer_id: number | null
  customer: { id: number; name: string; email: string } | null
  amount_due: string | number | null
  amount_paid: string | number | null
  currency: string | null
  status: string | null
  hosted_invoice_url: string | null
  invoice_pdf: string | null
  invoice_created_at: string | null
  paid_at: string | null
  metadata: Record<string, unknown> | null
}

export interface SuperadminInvoicePagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
}

export interface ListSuperadminInvoicesOptions {
  page?: number
  per_page?: number
  status?: string
  search?: string
  from?: string
  to?: string
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return { "Content-Type": "application/json", Accept: "application/json" }
  }
  const token = localStorage.getItem("token") || localStorage.getItem("library_token")
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function apiFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "GET", headers: getAuthHeaders() })
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login"
    }
    throw new Error(`API request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function getSuperadminInvoice(id: number): Promise<SuperadminInvoice> {
  const url = buildApiUrl(`/billing-invoices/${id}`)
  const json = await apiFetch<{ success: boolean; data: SuperadminInvoice }>(url)
  return json.data
}

export async function listSuperadminInvoices(options: ListSuperadminInvoicesOptions = {}): Promise<{
  data: SuperadminInvoice[]
  pagination: SuperadminInvoicePagination | null
}> {
  const params = new URLSearchParams()
  if (options.page) params.set("page", String(options.page))
  if (options.per_page) params.set("per_page", String(options.per_page))
  if (options.status) params.set("status", options.status)
  if (options.search) params.set("search", options.search)
  if (options.from) params.set("from", options.from)
  if (options.to) params.set("to", options.to)

  const url = buildApiUrl(`/billing-invoices?${params.toString()}`)
  const json = await apiFetch<{ success: boolean; data: unknown }>(url)

  const raw = (json?.data ?? {}) as { data?: SuperadminInvoice[]; meta?: SuperadminInvoicePagination }
  const invoices: SuperadminInvoice[] = Array.isArray(raw) ? raw : (raw.data ?? [])
  const pagination = Array.isArray(raw) ? null : (raw.meta ?? null)

  return { data: invoices, pagination }
}
