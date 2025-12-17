"use client"

import { useState, useEffect } from "react"
import { Search, ArrowUp, ArrowDown, Info, Edit, TrashIcon, Copy, Package, Plus, Package2, Upload, Link } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useStages, type Stage } from "@/contexts/product-stages-context"
import { CreateStageModal } from "@/components/product-management/create-stage-modal"
import { CreateStageGroupModal } from "@/components/product-management/create-stage-group-modal"
import { LinkProductsModal } from "@/components/product-management/link-products-modal"
import { useLanguage } from "@/contexts/language-context"
import { useTranslation } from "react-i18next"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"

const mockStageGroups = [
  { id: 1, name: "Default Stage Group" },
  { id: 2, name: "Fixed Prosthetics Stages" },
  { id: 3, name: "Removable Prosthetics Stages" },
]

export default function StagesPage() {
  const {
    stages,
    isLoading,
    error,
    pagination,
    searchQuery: contextSearchQuery,
    setSearchQuery: setContextSearchQuery,
    sortColumn,
    sortDirection,
    setSort,
    selectedItems,
    setSelectedItems,
    statusFilter,
    setStatusFilter,
    fetchStages,
    deleteStage,
    bulkDeleteStages,
  } = useStages()

  const [isCreateStageModalOpen, setIsCreateStageModalOpen] = useState(false)
  const [isCreateStageGroupModalOpen, setIsCreateStageGroupModalOpen] = useState(false)
  const [isLinkProductsModalOpen, setIsLinkProductsModalOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(contextSearchQuery)
  const [entriesPerPage, setEntriesPerPage] = useState(pagination.per_page.toString())
  const [currentPage, setCurrentPage] = useState(pagination.current_page)
  const { currentLanguage } = useLanguage()
  const { t } = useTranslation()

  const [editingStage, setEditingStage] = useState<Stage | null>(null)
  const [isModalDirty, setIsModalDirty] = useState(false)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [isStageDeleteModalOpen, setIsStageDeleteModalOpen] = useState(false)
  const [stageDeleteTargetId, setStageDeleteTargetId] = useState<number | null>(null)
  const [isStageDeleting, setIsStageDeleting] = useState(false)

  useEffect(() => {
    fetchStages()
  }, [fetchStages, currentLanguage])

  useEffect(() => {
    setCurrentPage(pagination.current_page)
    setEntriesPerPage(pagination.per_page.toString())
  }, [pagination, currentLanguage])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== contextSearchQuery) {
        setContextSearchQuery(searchInput)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput, contextSearchQuery, setContextSearchQuery, currentLanguage])

  useEffect(() => {
    if (contextSearchQuery !== searchInput) {
      setSearchInput(contextSearchQuery)
    }
  }, [contextSearchQuery])

  useEffect(() => {
    if (Number(entriesPerPage) !== pagination.per_page || currentPage !== pagination.current_page) {
      fetchStages(currentPage, Number(entriesPerPage))
    }
  }, [currentPage, entriesPerPage, fetchStages, pagination.per_page, pagination.current_page, currentLanguage])

  const handleSort = (column: keyof Stage | string) => {
    let newDirection: "asc" | "desc" | null = "asc"
    if (sortColumn === column) {
      if (sortDirection === "asc") newDirection = "desc"
      else if (sortDirection === "desc") newDirection = null
    }
    setSort(newDirection === null ? null : column, newDirection)
  }

  const renderSortIndicator = (column: keyof Stage | string) => {
    if (sortColumn !== column || !sortDirection) return null
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4 inline" />
    )
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? stages.map((s) => s.id) : [])
  }

  const handleSelectItem = (itemId: number, checked: boolean) => {
    setSelectedItems(checked ? [...selectedItems, itemId] : selectedItems.filter((id) => id !== itemId))
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleEdit = (stage: Stage): void => {
    setEditingStage(stage)
    setIsCreateStageModalOpen(true)
  }

  const handleDelete = (id: number): void => {
    setStageDeleteTargetId(id)
    setIsStageDeleteModalOpen(true)
  }

  const handleDeleteGroup = (id: number) => {
    setDeleteTargetId(id)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    // await deleteStageGroup(deleteTargetId) // implement your delete logic here
    setIsDeleting(false)
    setIsDeleteModalOpen(false)
    setDeleteTargetId(null)
  }

  const confirmStageDelete = async () => {
    setIsStageDeleting(true)
    if (stageDeleteTargetId !== null) {
      await deleteStage(stageDeleteTargetId)
    }
    setIsStageDeleting(false)
    setIsStageDeleteModalOpen(false)
    setStageDeleteTargetId(null)
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
            <h1 className="text-xl font-semibold text-gray-900">{t("Stages Management")}</h1>
            <p className="text-sm text-gray-500">{t("Manage workflow stages and processing configurations")}</p>
          </div>
        </div>
      </div>

      {/* Enhanced Header Section */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{t("Show")}</span>
          <Select
            value={entriesPerPage}
            onValueChange={(val) => {
              setEntriesPerPage(val)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-20 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["10", "25", "50", "100"].map((val) => (
                <SelectItem key={val} value={val}>
                  {val}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-700">{t("entries")}</span>

          <div className="flex items-center ml-4">
            <span className="text-sm font-medium text-gray-700 mr-2">{t("Status")}</span>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <SelectValue placeholder={t("All Statuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Statuses")}</SelectItem>
                <SelectItem value="Active">{t("Active")}</SelectItem>
                <SelectItem value="Inactive">{t("Inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedItems.length > 0 && (
            <div className="ml-6 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedItems.length} {t("selected")}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                {t("Delete Selected")}
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="text-gray-700 border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("Import stages")}
          </Button>

          <Button
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            onClick={() => setIsLinkProductsModalOpen(true)}
          >
            <Link className="h-4 w-4 mr-2" />
            {t("Link Products")}
          </Button>

          <Button
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            onClick={() => setIsCreateStageModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("Add Stage")}
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder={t("Search stages...")}
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Error Display */}
      {error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      )}

      {/* Enhanced Table Section with Split View */}
      <div className="flex">
        <div className="flex-grow border-r border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                  <TableHead className="w-12 pl-6">
                    <Checkbox
                      checked={selectedItems.length === stages.length && stages.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("name")}>
                    <div className="flex items-center">
                      <span>{t("Name")}</span>
                      {renderSortIndicator("name")}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("code")}>
                    <div className="flex items-center">
                      <span>{t("Code")}</span>
                      {renderSortIndicator("code")}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("sequence")}>
                    <div className="flex items-center">
                      <span>{t("Seq.")}</span>
                      {renderSortIndicator("sequence")}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    {t("Process Days")}
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors">
                    <div className="flex items-center">
                      <span>{t("Status")}</span>
                      {renderSortIndicator("status")}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    {t("Common")}
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    {t("Releasing")}
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    {t("Add-ons")}
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 text-center pr-6">{t("Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && stages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1162a8]"></div>
                        <span className="text-gray-500 text-sm">{t("Loading stages...")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : stages.length > 0 ? (
                  stages.map((stage) => (
                    <TableRow 
                      key={stage.id} 
                      className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                        selectedItems.includes(stage.id) ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedItems.includes(stage.id)}
                          onCheckedChange={(checked) => handleSelectItem(stage.id, !!checked)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-semibold">{stage.name}</span>
                          {stage.description && (
                            <span className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                              {stage.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-800">
                          {stage.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {stage.sequence}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <span className="font-medium">{stage.days_to_process}</span>
                        <span className="text-xs text-gray-500 ml-1">{t("days")}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            stage.status === "Active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          {t(stage.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            stage.is_common === "Yes"
                              ? "bg-[#1162a8] text-white border-[#1162a8]"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          {t(stage.is_common)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            stage.is_releasing_stage === "Yes"
                              ? "bg-[#1162a8] text-white border-[#1162a8]"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          {t(stage.is_releasing_stage)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            stage.is_stage_with_addons === "Yes"
                              ? "bg-[#1162a8] text-white border-[#1162a8]"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          {t(stage.is_stage_with_addons)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center pr-6">
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" 
                            onClick={() => handleEdit(stage)}
                            title={t("Edit")}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                            title={t("Duplicate")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(stage.id)}
                            title={t("Delete")}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-gray-100 rounded-full">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-medium text-gray-900 mb-1">{t("No stages found")}</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            {contextSearchQuery 
                              ? t("Try adjusting your search or filters")
                              : t("Create a new stage to get started")
                            }
                          </p>
                          {!contextSearchQuery && (
                            <Button
                              className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                              onClick={() => setIsCreateStageModalOpen(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {t("Add Your First Stage")}
                            </Button>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Enhanced Pagination */}
          <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {t("Showing")} {Math.min(pagination.total, 1 + (currentPage - 1) * pagination.per_page)} {t("to")}{" "}
              {Math.min(pagination.total, currentPage * pagination.per_page)} {t("of")} {pagination.total} {t("entries")}
            </div>
            <div className="flex items-center space-x-1">
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                «
              </button>
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                let pageNum = i + 1
                if (pagination.last_page > 5) {
                  if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= pagination.last_page - 2) {
                    pageNum = pagination.last_page - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                }

                return (
                  <button
                    key={pageNum}
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${
                      pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.last_page}
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>
     
      <CreateStageModal
        isOpen={isCreateStageModalOpen}
        onClose={() => {
          setIsCreateStageModalOpen(false)
          setEditingStage(null)
          setIsModalDirty(false)
        }}
        onHasChangesChange={setIsModalDirty}
        stage={editingStage}
        mode={editingStage ? "edit" : "create"}
      />
      
      <CreateStageGroupModal
        isOpen={isCreateStageGroupModalOpen}
        onClose={() => setIsCreateStageGroupModalOpen(false)}
      />

      <LinkProductsModal
        isOpen={isLinkProductsModalOpen}
        onClose={() => setIsLinkProductsModalOpen(false)}
        context="global"
      />

      {/* Delete Confirmation Modal for stage group */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        itemName="stage group"
        isLoading={isDeleting}
      />

      {/* Delete Confirmation Modal for stage */}
      <DeleteConfirmationModal
        isOpen={isStageDeleteModalOpen}
        onClose={() => setIsStageDeleteModalOpen(false)}
        onConfirm={confirmStageDelete}
        itemName="stage"
        isLoading={isStageDeleting}
      />
    </div>
  )
}
