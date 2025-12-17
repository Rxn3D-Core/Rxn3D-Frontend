"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Edit, TrashIcon, Copy, Plus, Package, Link as LinkIcon, MoreVertical, ArrowUpDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingDots } from "@/components/ui/loading-dots"
import { useLanguage } from "@/contexts/language-context"
import { useTranslation } from "react-i18next"
import { CreateRetentionOptionModal } from "@/components/product-management/create-retention-option-modal"
import { LinkRetentionTypeModal } from "@/components/product-management/link-retention-type-modal"
import { LinkProductsModal } from "@/components/product-management/link-products-modal"

type SortField = "name" | "code" | "status"
type SortDirection = "asc" | "desc"

export default function RetentionOptionPage() {
  const [retentionOptions, setRetentionOptions] = useState<any[]>([])
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [entriesPerPage, setEntriesPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [editOption, setEditOption] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ total: 0, per_page: 20, last_page: 1, current_page: 1 })
  const [showLinkRetentionTypeModal, setShowLinkRetentionTypeModal] = useState(false)
  const [showLinkProductsModal, setShowLinkProductsModal] = useState(false)
  const { currentLanguage } = useLanguage()
  const { t } = useTranslation()

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchTerm(searchInput)
      setCurrentPage(1)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    // TODO: Fetch retention options from API
    // fetchRetentionOptions(currentPage, entriesPerPage, searchTerm, sortField, sortDirection)
  }, [currentPage, entriesPerPage, searchTerm, sortField, sortDirection, currentLanguage])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    setCurrentPage(1)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOptions(retentionOptions.map((r) => r.id.toString()))
    } else {
      setSelectedOptions([])
    }
  }

  const handleSelectOption = (optionId: string, checked: boolean) => {
    if (checked) {
      setSelectedOptions([...selectedOptions, optionId])
    } else {
      setSelectedOptions(selectedOptions.filter((id) => id !== optionId))
    }
  }

  const isAllSelected = retentionOptions.length > 0 && selectedOptions.length === retentionOptions.length

  const handleEntriesPerPageChange = (newEntriesPerPage: number) => {
    setEntriesPerPage(newEntriesPerPage)
    setCurrentPage(1)
  }

  const handleSearchClear = () => {
    setSearchInput("")
    setSearchTerm("")
    setCurrentPage(1)
  }

  const handleStatusToggle = async (id: number, currentStatus: 'Active' | 'Inactive') => {
    // TODO: Implement status toggle API call
    console.log('Toggle status for retention option:', id, currentStatus)
  }

  function handleEdit(option: any): void {
    setEditOption(option)
    setShowCreateModal(true)
  }

  function handleCopy(option: any): void {
    setEditOption(option)
    setShowCreateModal(true)
  }

  function handleDelete(optionId: number): void {
    // TODO: Implement delete
    console.log('Delete retention option:', optionId)
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
            <h1 className="text-xl font-semibold text-gray-900">{t("Retention Options")}</h1>
            <p className="text-sm text-gray-500">{t("Manage retention options and configurations")}</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{t("Show")}</span>
            <Select
              value={entriesPerPage.toString()}
              onValueChange={(value) => handleEntriesPerPageChange(Number(value))}
            >
              <SelectTrigger className="w-20 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
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
                setEditOption(null)
                setShowCreateModal(true)
              }}
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("Add Retention option")}
            </Button>
            <Button
              onClick={() => setShowLinkRetentionTypeModal(true)}
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              {t("Link Retention type")}
            </Button>
            <Button
              onClick={() => setShowLinkProductsModal(true)}
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              {t("Link Product")}
            </Button>

            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder={t("Search Retention Option")}
                className="pl-10 pr-10 h-10 w-full sm:w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  onClick={handleSearchClear}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
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
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4"
                  />
                </TableHead>
                <TableHead
                  className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    {t("Retention Option")}
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
              {retentionOptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <p className="text-gray-500 text-sm">
                      {t("No retention options found")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                retentionOptions.map((option, index) => (
                  <TableRow key={option.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${index === 0 ? "bg-blue-50/30" : ""}`}>
                    <TableCell className="pl-4 py-2">
                      <Checkbox
                        checked={selectedOptions.includes(option.id.toString())}
                        onCheckedChange={(checked) => handleSelectOption(option.id.toString(), checked as boolean)}
                        className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4"
                      />
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{option.name}</span>
                        {option.is_custom === 'No' && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                            <path d="M13.3332 8.66664C13.3332 12 10.9998 13.6666 8.2265 14.6333C8.08128 14.6825 7.92353 14.6802 7.77984 14.6266C4.99984 13.6666 2.6665 12 2.6665 8.66664V3.99997C2.6665 3.82316 2.73674 3.65359 2.86177 3.52857C2.98679 3.40355 3.15636 3.33331 3.33317 3.33331C4.6665 3.33331 6.33317 2.53331 7.49317 1.51997C7.63441 1.39931 7.81407 1.33301 7.99984 1.33301C8.1856 1.33301 8.36527 1.39931 8.5065 1.51997C9.67317 2.53997 11.3332 3.33331 12.6665 3.33331C12.8433 3.33331 13.0129 3.40355 13.1379 3.52857C13.2629 3.65359 13.3332 3.82316 13.3332 3.99997V8.66664Z" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 8.00033L7.33333 9.33366L10 6.66699" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-800 inline-block">
                        {option.code || "-"}
                      </code>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {option.retention_types && option.retention_types.length > 0 ? (
                          <>
                            {option.retention_types.slice(0, 2).map((type: any, idx: number) => (
                              <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {type.name || type}
                              </span>
                            ))}
                            {option.retention_types.length > 2 && (
                              <Button variant="ghost" className="h-5 px-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                +{option.retention_types.length - 2}
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">No types linked</span>
                        )}
                        <LinkIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-10 h-5 rounded-full ${option.status === "Active" ? "bg-blue-600" : "bg-gray-300"} relative cursor-pointer`}
                          onClick={() => handleStatusToggle(option.id, option.status)}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${option.status === "Active" ? "right-0.5" : "left-0.5"}`}></div>
                        </div>
                        <span className="text-xs">{option.status}</span>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5"
                            onClick={() => handleEdit(option)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5"
                            onClick={() => handleCopy(option)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                            onClick={() => handleDelete(option.id)}
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
      {!loading && retentionOptions.length > 0 && (
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
        <CreateRetentionOptionModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setEditOption(null)
          }}
          option={editOption}
        />
        <LinkRetentionTypeModal
          isOpen={showLinkRetentionTypeModal}
          onClose={() => setShowLinkRetentionTypeModal(false)}
          onApply={(selectedOptions, selectedTypes) => {
            console.log("Linking retention options:", selectedOptions, "to types:", selectedTypes)
            setShowLinkRetentionTypeModal(false)
          }}
        />
        <LinkProductsModal
          isOpen={showLinkProductsModal}
          onClose={() => setShowLinkProductsModal(false)}
          entityType="retention-option"
          context="global"
          onApply={() => {
            setShowLinkProductsModal(false)
          }}
        />
      </>
    </div>
  )
}

