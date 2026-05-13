"use client"

import { useMemo, useState } from "react"
import { Search, Plus, Settings2, Edit, Copy, Trash2, MoreVertical, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "react-i18next"
import { AddAbutmentModal } from "@/components/advance-mode"
import {
  useAbutments,
  useCreateAbutment,
  useUpdateAbutment,
  useUpdateAbutmentStatus,
  useDeleteAbutment,
  type Abutment,
} from "@/lib/api/advance-mode-query"
import { useToast } from "@/hooks/use-toast"
import { LoadingDots } from "@/components/ui/loading-dots"

export default function AbutmentLibraryPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc')
  const [orderBy, setOrderBy] = useState('type')
  const [isAddAbutmentModalOpen, setIsAddAbutmentModalOpen] = useState(false)
  const [editingAbutment, setEditingAbutment] = useState<Abutment | null>(null)

  const serverSortableFields = ["type", "code", "sequence", "created_at"]
  const isServerSortable = serverSortableFields.includes(orderBy)

  const { data, isLoading, isError } = useAbutments({
    page: currentPage,
    per_page: parseInt(entriesPerPage),
    q: searchQuery || undefined,
    order_by: isServerSortable ? orderBy : undefined,
    sort_by: isServerSortable ? sortBy : undefined,
  })

  const updateStatusMutation = useUpdateAbutmentStatus()
  const deleteAbutmentMutation = useDeleteAbutment()
  const createAbutmentMutation = useCreateAbutment()
  const updateAbutmentMutation = useUpdateAbutment()

  const handleStatusToggle = async (id: number, currentStatus: 'Active' | 'Inactive') => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'
    updateStatusMutation.mutate(
      { id, status: newStatus },
      {
        onSuccess: () => toast({ title: "Success", description: `Abutment status updated to ${newStatus}` }),
        onError: () => toast({ title: "Error", description: "Failed to update abutment status", variant: "destructive" }),
      }
    )
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("advanceMode.abutmentLibrary.confirmDelete", "Are you sure you want to delete this abutment?"))) {
      return
    }
    deleteAbutmentMutation.mutate(id, {
      onSuccess: () => toast({ title: "Success", description: "Abutment deleted successfully" }),
      onError: () => toast({ title: "Error", description: "Failed to delete abutment", variant: "destructive" }),
    })
  }

  const handleSort = (field: string) => {
    if (orderBy === field) {
      setSortBy(sortBy === 'asc' ? 'desc' : 'asc')
    } else {
      setOrderBy(field)
      setSortBy('asc')
    }
  }

  const abutmentData = data?.data || []
  const sortedAbutmentData = useMemo(() => {
    if (isServerSortable) return abutmentData

    const normalize = (value: unknown) => String(value ?? "").toLowerCase()
    const items = [...abutmentData]
    items.sort((a, b) => {
      let result = 0
      if (orderBy === "options") {
        const aCount = a.options?.length ?? a.platforms?.length ?? 0
        const bCount = b.options?.length ?? b.platforms?.length ?? 0
        result = aCount - bCount
      } else if (orderBy === "pricing") {
        result = normalize(a.charge_type).localeCompare(normalize(b.charge_type))
      } else if (orderBy === "price") {
        const aPrice = Number(a.price ?? 0)
        const bPrice = Number(b.price ?? 0)
        result = aPrice - bPrice
      } else if (orderBy === "status") {
        result = normalize(a.status).localeCompare(normalize(b.status))
      }
      return sortBy === "asc" ? result : -result
    })
    return items
  }, [abutmentData, isServerSortable, orderBy, sortBy])
  const totalPages = data?.last_page || 1
  const totalEntries = data?.total || 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Settings2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {t("advanceMode.abutmentLibrary.title", "Abutment Library")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("advanceMode.abutmentLibrary.description", "Manage abutment types and options")}
            </p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{t("Show")}</span>
            <Select value={entriesPerPage} onValueChange={(value) => {
              setEntriesPerPage(value)
              setCurrentPage(1)
            }}>
              <SelectTrigger className="w-20 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-700">{t("entries")}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <Button
              onClick={() => {
                setEditingAbutment(null)
                setIsAddAbutmentModalOpen(true)
              }}
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("advanceMode.abutmentLibrary.addAbutments", "Add Abutments")}
            </Button>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder={t("advanceMode.abutmentLibrary.searchFields", "Search Fields")}
                className="pl-10 h-10 w-full sm:w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <LoadingDots size="lg" />
          </div>
        )}
        {isError && (
          <div className="p-8 text-center">
            <p className="text-red-600 text-sm">
              {t("advanceMode.abutmentLibrary.error", "Failed to load abutments. Please try again.")}
            </p>
          </div>
        )}
        {!isLoading && !isError && <div className="overflow-x-auto">
          <Table className="w-full text-xs">
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                <TableHead className="w-10 pl-4 py-2">
                  <Checkbox className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4" />
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors" onClick={() => handleSort('type')}>
                  <div className="flex items-center gap-1">
                    {t("Type")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors" onClick={() => handleSort('code')}>
                  <div className="flex items-center gap-1">
                    {t("Code")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors" onClick={() => handleSort('options')}>
                  <div className="flex items-center gap-1">
                    {t("Options")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors" onClick={() => handleSort('pricing')}>
                  <div className="flex items-center gap-1">
                    {t("Pricing")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors" onClick={() => handleSort('price')}>
                  <div className="flex items-center gap-1">
                    {t("Price")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">
                    {t("Status")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {abutmentData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      {t("advanceMode.abutmentLibrary.noData", "No Abutment Found")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAbutmentData.map((item, index) => (
                  <TableRow key={item.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${index === 0 ? "bg-blue-50/30" : ""}`}>
                    <TableCell className="pl-4 py-2">
                      <Checkbox className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4" />
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{item.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-xs">{item.code || "-"}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-xs">{(item.options?.length ?? item.platforms?.length ?? 0)} options</span>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-xs">{item.charge_type === "per_option" ? "Per option" : "Once per abutment"}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-xs">{item.price}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-5 rounded-full ${item.status === "Active" ? "bg-blue-600" : "bg-gray-300"} relative cursor-pointer`} onClick={() => handleStatusToggle(item.id, item.status)}>
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${item.status === "Active" ? "right-0.5" : "left-0.5"}`}></div>
                        </div>
                        <span className="text-xs">{item.status}</span>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            type="button"
                            className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5"
                            onClick={() => {
                              setEditingAbutment(item)
                              setIsAddAbutmentModalOpen(true)
                            }}
                            aria-label={t("advanceMode.abutmentLibrary.editAbutment", "Edit abutment")}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button className="text-gray-400 hover:text-red-600 transition-colors p-0.5" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button className="text-gray-400 hover:text-gray-600 transition-colors p-0.5">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && abutmentData.length > 0 && <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {t("Showing")} {((currentPage - 1) * parseInt(entriesPerPage)) + 1} {t("to")} {Math.min(currentPage * parseInt(entriesPerPage), totalEntries)} {t("of")} {totalEntries} {t("entries")}
        </div>
        <div className="flex items-center space-x-1">
          <button className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
            «
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i
            return (
              <button key={i} className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${currentPage === pageNum ? "bg-[#1162a8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`} onClick={() => setCurrentPage(pageNum)}>
                {pageNum}
              </button>
            )
          })}
          <button className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
            »
          </button>
        </div>
      </div>}

      {/* Add Abutment Modal */}
      <AddAbutmentModal
        isOpen={isAddAbutmentModalOpen}
        initialAbutment={editingAbutment}
        onClose={() => {
          setIsAddAbutmentModalOpen(false)
          setEditingAbutment(null)
        }}
        onSave={async (data) => {
          const payload = { ...data } as Record<string, unknown> & { id?: number }
          const { id, ...body } = payload

          await new Promise<void>((resolve, reject) => {
            if (id != null) {
              updateAbutmentMutation.mutate(
                { id, ...(body as any) },
                {
                  onSuccess: () => {
                    toast({ title: "Success", description: "Abutment updated successfully" })
                    resolve()
                  },
                  onError: (error: any) => {
                    toast({
                      title: "Error",
                      description: error?.message || "Failed to update abutment",
                      variant: "destructive",
                    })
                    reject(error)
                  },
                },
              )
            } else {
              createAbutmentMutation.mutate(payload as any, {
                onSuccess: () => {
                  toast({ title: "Success", description: "Abutment created successfully" })
                  resolve()
                },
                onError: (error: any) => {
                  toast({
                    title: "Error",
                    description: error?.message || "Failed to create abutment",
                    variant: "destructive",
                  })
                  reject(error)
                },
              })
            }
          })
        }}
      />

    </div>
  )
}
