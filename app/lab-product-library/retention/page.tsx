"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, ChevronUp, ChevronDown, Edit, TrashIcon, Copy, Plus, Package, Link as LinkIcon, MoreVertical, ArrowUpDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreateRetentionModal } from "@/components/product-management/create-retention-modal"
import { DeleteRetentionModal } from "@/components/product-management/delete-retention-modal"
import { LinkProductsModal } from "@/components/product-management/link-products-modal"
import { LinkRetentionOptionModal } from "@/components/product-management/link-retention-option-modal"
import { LoadingDots } from "@/components/ui/loading-dots"
import { useRetention } from "@/contexts/product-retention-context"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context"
import { useTranslation } from "react-i18next"
import { useToast } from "@/hooks/use-toast"

type SortField = "name" | "code" | "status" | "price"
type SortDirection = "asc" | "desc"

export default function RetentionPage() {
  const { isLoading, retentions, loading, pagination, fetchRetentions, deleteRetention } = useRetention()
  const [selectedRetentions, setSelectedRetentions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const [currentPage, setCurrentPage] = useState(1)
  const [editRetention, setEditRetention] = useState<any | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const [deleteRetentionId, setDeleteRetentionId] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isLinkProductsModalOpen, setIsLinkProductsModalOpen] = useState(false)
  const [showLinkRetentionOptionModal, setShowLinkRetentionOptionModal] = useState(false)
  const { currentLanguage } = useLanguage()
  const { user } = useAuth()
  const { t } = useTranslation()

  const isLabAdmin = user?.role === "lab_admin"

  useEffect(() => {
    fetchRetentions()
  }, [currentLanguage])

  useEffect(() => {
    fetchRetentions(currentPage, Number(entriesPerPage), searchTerm)
  }, [fetchRetentions, currentPage, entriesPerPage, searchTerm, sortField, sortDirection, currentLanguage])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    fetchRetentions(currentPage, Number(entriesPerPage), searchTerm)
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRetentions(retentions.map((r) => r.id.toString()))
    } else {
      setSelectedRetentions([])
    }
  }

  const handleSelectRetention = (retentionId: string, checked: boolean) => {
    if (checked) {
      setSelectedRetentions([...selectedRetentions, retentionId])
    } else {
      setSelectedRetentions(selectedRetentions.filter((id) => id !== retentionId))
    }
  }

  const isAllSelected = retentions.length > 0 && selectedRetentions.length === retentions.length
  const isIndeterminate = selectedRetentions.length > 0 && selectedRetentions.length < retentions.length

  const handleEntriesPerPageChange = (newEntriesPerPage: string) => {
    setEntriesPerPage(newEntriesPerPage)
    setCurrentPage(1)
  }

  const { updateRetention } = useRetention()
  const { toast } = useToast()

  const handleStatusToggle = async (id: number, currentStatus: 'Active' | 'Inactive') => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'
      const success = await updateRetention(id, { status: newStatus })
      
      if (success) {
        toast({
          title: "Success",
          description: `Retention status updated to ${newStatus}`,
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update retention status",
        variant: "destructive",
      })
    }
  }

  function handleEdit(retention: any): void {
    setEditRetention(retention)
    setIsCopying(false)
    setShowCreateModal(true)
  }

  function handleCopy(retention: any): void {
    setEditRetention(retention)
    setIsCopying(true)
    setShowCreateModal(true)
  }

  function handleDelete(retentionId: number): void {
    setDeleteRetentionId(retentionId)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (deleteRetentionId != null) {
      await deleteRetention(deleteRetentionId)
      setShowDeleteModal(false)
      setDeleteRetentionId(null)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t("Retention Management")}</h1>
            <p className="text-sm text-gray-500">{t("Manage your retention inventory and configurations")}</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{t("Show")}</span>
            <Select value={entriesPerPage} onValueChange={handleEntriesPerPageChange}>
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
              onClick={() => setShowCreateModal(true)}
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("Add Retention Type")}
            </Button>
            <Button
              onClick={() => setShowLinkRetentionOptionModal(true)}
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              {t("Link Retention Option")}
            </Button>

            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder={t("Search Retention Type")}
                className="pl-10 h-10 w-full sm:w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <LoadingDots size="lg" />
          </div>
        )}

        <div className="overflow-x-auto">
          <Table className="w-full text-xs">
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                <TableHead className="w-10 pl-4 py-2">
                  <Checkbox className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4" />
                </TableHead>
                <TableHead
                  className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    {t("Retention type")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                <TableHead
                  className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors"
                  onClick={() => handleSort("code")}
                >
                  <div className="flex items-center gap-1">
                    {t("Code")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                  <div className="flex items-center gap-1">
                    {t("Linked Retention option")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                {isLabAdmin && (
                  <TableHead
                    className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors"
                    onClick={() => handleSort("price")}
                  >
                    <div className="flex items-center gap-1">
                      {t("Price")}
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </TableHead>
                )}
                <TableHead
                  className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    {t("Status")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retentions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isLabAdmin ? 6 : 5} className="py-8 text-center">
                    <p className="text-gray-500 text-sm">
                      {t("No retentions found")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                retentions.map((retention, index) => (
                  <TableRow key={retention.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${index === 0 ? "bg-blue-50/30" : ""}`}>
                    <TableCell className="pl-4 py-2">
                      <Checkbox
                        checked={selectedRetentions.includes(retention.id.toString())}
                        onCheckedChange={(checked) => handleSelectRetention(retention.id.toString(), checked as boolean)}
                        className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4"
                      />
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{retention.name}</span>
                        {retention.is_custom === 'No' && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                            <path d="M13.3332 8.66664C13.3332 12 10.9998 13.6666 8.2265 14.6333C8.08128 14.6825 7.92353 14.6802 7.77984 14.6266C4.99984 13.6666 2.6665 12 2.6665 8.66664V3.99997C2.6665 3.82316 2.73674 3.65359 2.86177 3.52857C2.98679 3.40355 3.15636 3.33331 3.33317 3.33331C4.6665 3.33331 6.33317 2.53331 7.49317 1.51997C7.63441 1.39931 7.81407 1.33301 7.99984 1.33301C8.1856 1.33301 8.36527 1.39931 8.5065 1.51997C9.67317 2.53997 11.3332 3.33331 12.6665 3.33331C12.8433 3.33331 13.0129 3.40355 13.1379 3.52857C13.2629 3.65359 13.3332 3.82316 13.3332 3.99997V8.66664Z" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 8.00033L7.33333 9.33366L10 6.66699" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-800 inline-block">
                        {retention.code || "-"}
                      </code>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {retention.options && retention.options.length > 0 ? (
                          <>
                            {retention.options.slice(0, 2).map((option: any, idx: number) => (
                              <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {option.name || option}
                              </span>
                            ))}
                            {retention.options.length > 2 && (
                              <Button variant="ghost" className="h-5 px-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                +{retention.options.length - 2}
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">No options linked</span>
                        )}
                        <LinkIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      </div>
                    </TableCell>
                    {isLabAdmin && (
                      <TableCell className="py-2 px-2">
                        <span className="text-xs font-medium text-gray-900">
                          ${(retention.price || 0).toFixed(2)}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-10 h-5 rounded-full ${retention.status === "Active" ? "bg-blue-600" : "bg-gray-300"} relative cursor-pointer`}
                          onClick={() => handleStatusToggle(retention.id, retention.status)}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${retention.status === "Active" ? "right-0.5" : "left-0.5"}`}></div>
                        </div>
                        <span className="text-xs">{retention.status}</span>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5"
                            onClick={() => handleEdit(retention)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5"
                            onClick={() => handleCopy(retention)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                            onClick={() => handleDelete(retention.id)}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
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
        </div>
      </div>

      {/* Pagination */}
      {!loading && retentions.length > 0 && (
        <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {t("Showing")} {Math.min(pagination.total, 1 + (currentPage - 1) * pagination.per_page)} {t("to")}{" "}
            {Math.min(pagination.total, currentPage * pagination.per_page)} {t("of")} {pagination.total} {t("entries")}
          </div>
          <div className="flex items-center space-x-1">
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              «
            </button>
            {Array.from({ length: Math.min(pagination.last_page, 5) }, (_, i) => {
              let pageNum
              if (pagination.last_page <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= pagination.last_page - 2) {
                pageNum = pagination.last_page - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <button
                  key={i}
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${
                    currentPage === pageNum
                      ? "bg-[#1162a8] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage(p => Math.min(pagination.last_page, p + 1))}
              disabled={currentPage === pagination.last_page}
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <>
        <CreateRetentionModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setEditRetention(null)
            setIsCopying(false)
          }}
          retention={editRetention}
          isCopying={isCopying}
        />
        <DeleteRetentionModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
        />
        <LinkProductsModal
          isOpen={isLinkProductsModalOpen}
          onClose={() => setIsLinkProductsModalOpen(false)}
          entityType="retention"
          context="lab"
          onApply={() => {
            setIsLinkProductsModalOpen(false)
          }}
        />
        <LinkRetentionOptionModal
          isOpen={showLinkRetentionOptionModal}
          onClose={() => setShowLinkRetentionOptionModal(false)}
          onApply={(selectedRetentionTypes, selectedRetentionOptions) => {
            // Handle the linking logic here
            console.log("Linking retention types:", selectedRetentionTypes, "to options:", selectedRetentionOptions)
            setShowLinkRetentionOptionModal(false)
          }}
        />
      </>
    </div>
  )
}
