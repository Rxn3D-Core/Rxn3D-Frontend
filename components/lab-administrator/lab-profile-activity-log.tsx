"use client"

import { useState, useEffect, useCallback } from "react"
import { Eye, Filter, Search } from "lucide-react"
import { AuditEntryDetailsDialog } from "@/components/lab-administrator/audit-entry-details-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAudits, type AuditEntry, type AuditFilters } from "@/lib/api-audit"

interface ActivityLogTabProps {
  customerId?: number | null
  /** When true, omit IP / request / raw payload sections in the details sheet (office profile). */
  hideTechnicalDetails?: boolean
}

function formatChanges(entry: AuditEntry): string {
  if (entry.changes.length === 0) return entry.event_label
  return entry.changes
    .slice(0, 2)
    .map((c) => (c.old ? `"${c.old}" → "${c.new}"` : `Set to "${c.new}"`))
    .join(", ")
}

export default function ActivityLogTab({ customerId, hideTechnicalDetails = false }: ActivityLogTabProps) {
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [audits, setAudits] = useState<AuditEntry[]>([])
  const [totalEntries, setTotalEntries] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAudit, setSelectedAudit] = useState<AuditEntry | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchAudits = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const filters: AuditFilters = {
        per_page: Number(entriesPerPage),
        page: currentPage,
        sort_by: "desc",
        order_by: "created_at",
      }

      if (customerId) {
        filters.auditable_type = "Customer"
        filters.auditable_id = customerId
      }

      if (debouncedSearch) {
        filters.search = debouncedSearch
      }

      const result = await getAudits(filters)
      setAudits(result.data)
      setTotalEntries(result.meta.total)
      setTotalPages(result.meta.last_page)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load activity log")
    } finally {
      setIsLoading(false)
    }
  }, [customerId, currentPage, entriesPerPage, debouncedSearch])

  useEffect(() => {
    fetchAudits()
  }, [fetchAudits])

  // Reset page when search or page size changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, entriesPerPage])

  const from = totalEntries === 0 ? 0 : (currentPage - 1) * Number(entriesPerPage) + 1
  const to = Math.min(currentPage * Number(entriesPerPage), totalEntries)

  return (
    <div className="p-6">
      <AuditEntryDetailsDialog
        entry={selectedAudit}
        open={selectedAudit !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAudit(null)
          }
        }}
        hideTechnicalDetails={hideTechnicalDetails}
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Show</span>
          <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">entries</span>
          {!isLoading && (
            <span className="text-sm text-gray-600">
              Showing {from} to {to} of {totalEntries} entries
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              className="pl-10 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center space-x-1.5">
                    {[0, 200, 400].map((delay) => (
                      <div
                        key={delay}
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms`, animationDuration: "1.4s" }}
                      />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            ) : audits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No activity found
                </TableCell>
              </TableRow>
            ) : (
              audits.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.user.name}</TableCell>
                  <TableCell>{entry.event_label}</TableCell>
                  <TableCell>{entry.auditable.type_label}</TableCell>
                  <TableCell className="max-w-xs truncate">{formatChanges(entry)}</TableCell>
                  <TableCell>
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-full border border-transparent p-0 text-slate-500 transition hover:border-sky-100 hover:bg-sky-50 hover:text-sky-700"
                      onClick={() => setSelectedAudit(entry)}
                      aria-label={`View activity details for audit ${entry.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || isLoading}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || isLoading}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
