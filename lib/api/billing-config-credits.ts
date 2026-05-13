import { apiClient } from "@/lib/api/client"

export interface CreditBook {
  id: number
  name: string
  price: number | string
  slip_amount: number | string
  active: boolean
  stripe_price_id: string | null
  created_at?: string
  updated_at?: string
}

export interface CreditBookPayload {
  name: string
  price: number | string
  slip_amount: number | string
  active: boolean
}

export async function listCreditBooks(): Promise<CreditBook[]> {
  const response = await apiClient.get<CreditBook[]>("/billing-config/credit-books")
  return Array.isArray(response.data) ? response.data : []
}

export async function getCreditBook(id: number): Promise<CreditBook> {
  const response = await apiClient.get<CreditBook>(`/billing-config/credit-books/${id}`)
  return response.data
}

export async function createCreditBook(payload: CreditBookPayload): Promise<CreditBook> {
  const response = await apiClient.post<CreditBook>("/billing-config/credit-books", payload)
  return response.data
}

export async function updateCreditBook(id: number, payload: CreditBookPayload): Promise<CreditBook> {
  const response = await apiClient.put<CreditBook>(`/billing-config/credit-books/${id}`, payload)
  return response.data
}

export async function deleteCreditBook(id: number): Promise<void> {
  await apiClient.delete(`/billing-config/credit-books/${id}`)
}
