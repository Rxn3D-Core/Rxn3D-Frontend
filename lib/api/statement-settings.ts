import { apiClient } from "@/lib/api/client"
import {
  statementSettingsFromApi,
  statementSettingsToApi,
  type LabStatementSettings,
} from "@/lib/statement-settings"

/** `data` of GET/PUT /v1/slip-settings/statements (RXN-100). The lab is the caller's active profile. */
interface StatementSettingsApiData {
  lab_id: number
  is_default: boolean
  can_edit: boolean
  settings: unknown
}

export interface LabStatementSettingsResult {
  settings: LabStatementSettings
  /** True only for a lab admin of the active lab; everyone else sees the page read-only. */
  canEdit: boolean
}

function toResult(data: StatementSettingsApiData): LabStatementSettingsResult {
  return { settings: statementSettingsFromApi(data?.settings), canEdit: data?.can_edit === true }
}

/** GET /v1/slip-settings/statements */
export async function getStatementSettings(): Promise<LabStatementSettingsResult> {
  const response = await apiClient.get<StatementSettingsApiData>("/slip-settings/statements")
  return toResult(response.data)
}

/** PUT /v1/slip-settings/statements (lab admins only; the API answers 403 for anyone else). */
export async function saveStatementSettings(settings: LabStatementSettings): Promise<LabStatementSettingsResult> {
  const response = await apiClient.put<StatementSettingsApiData>(
    "/slip-settings/statements",
    statementSettingsToApi(settings),
  )
  return toResult(response.data)
}
