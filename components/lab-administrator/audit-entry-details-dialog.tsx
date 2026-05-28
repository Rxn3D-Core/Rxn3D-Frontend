"use client"

import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { TableDetailsSheet } from "@/components/ui/table-details-sheet"
import type { AuditEntry } from "@/lib/api-audit"

interface AuditEntryDetailsDialogProps {
  entry: AuditEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatTimestamp(value: string | null): string {
  if (!value) return "Unavailable"

  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <span className="text-sm text-slate-700">{value}</span>
    </div>
  )
}

export function AuditEntryDetailsDialog({ entry, open, onOpenChange }: AuditEntryDetailsDialogProps) {
  return (
    <TableDetailsSheet
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? `${entry.event_label} ${entry.auditable.type_label}` : "Audit Details"}
      description={entry ? `Activity record #${entry.id}` : "Review audit metadata and changed fields."}
    >
      {entry ? (
        <ScrollArea className="h-[calc(100vh-88px)]">
          <div className="space-y-6 px-6 py-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
                {entry.event_label}
              </Badge>
              <Badge variant="outline" className="border-slate-200 px-3 py-1 text-slate-600">
                {entry.auditable.type_label}
              </Badge>
              <span className="text-sm text-slate-500">{formatTimestamp(entry.created_at)}</span>
            </div>

            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2">
              <DetailRow label="User" value={entry.user.name || "System"} />
              <DetailRow label="Email" value={entry.user.email || "—"} />
              <DetailRow label="Target" value={entry.auditable.type_label} />
              <DetailRow label="Record ID" value={String(entry.auditable.id)} />
              <DetailRow label="IP Address" value={entry.ip_address || "—"} />
              <DetailRow label="Updated At" value={formatTimestamp(entry.updated_at)} />
            </div>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Changed Fields</h3>
                <p className="text-sm text-slate-500">A detailed view of the values captured for this audit record.</p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <span>Field</span>
                  <span>Previous</span>
                  <span>New</span>
                </div>
                {entry.changes.length > 0 ? (
                  entry.changes.map((change, index) => (
                    <div
                      key={`${change.field}-${index}`}
                      className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-slate-800">{change.field}</div>
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-500">{formatValue(change.old)}</pre>
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-800">{formatValue(change.new)}</pre>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-5 text-sm text-slate-500">No field-level differences were captured for this activity.</div>
                )}
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Technical Context</h3>
                <p className="text-sm text-slate-500">Request metadata stored alongside the activity log.</p>
              </div>
              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <DetailRow label="Request URL" value={entry.url || "—"} />
                <DetailRow label="User Agent" value={entry.user_agent || "—"} />
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Raw Payload</h3>
                <p className="text-sm text-slate-500">Useful when the summary above truncates nested values.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Old Values</div>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-100">
                    {JSON.stringify(entry.old_values ?? {}, null, 2)}
                  </pre>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">New Values</div>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-100">
                    {JSON.stringify(entry.new_values ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      ) : null}
    </TableDetailsSheet>
  )
}
