"use client"

import { useState, useEffect } from "react"
import { Search, ArrowUp, ArrowDown, Info, Edit, TrashIcon, Copy, Plus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CreateToothStatusModal } from "@/components/product-management/create-tooth-status-modal"
import { CreateToothStatusGroupModal } from "@/components/product-management/create-tooth-status-group-modal"
import { DiscardChangesDialog } from "@/components/product-management/discard-changes-dialog"
import { useLanguage } from "@/contexts/language-context"
import { useExtractionsData, useExtractionForm, useDeleteExtraction, useExtraction } from "@/hooks/use-extractions"
import type { Extraction, ExtractionsFilters } from "@/lib/schemas"

interface ToothStatusGroup {
  id: number
  name: string
  tooth_statuses: Extraction[]
}

type SortDirection = "asc" | "desc" | null

type SortState = {
  column: keyof Extraction | null
  direction: SortDirection
}

export default function ToothMappingPage() {
  const { currentLanguage } = useLanguage()
  
  // API filters state
  const [filters, setFilters] = useState<ExtractionsFilters>({
    lang: currentLanguage || 'en',
    per_page: 10,
    page: 1,
    sort_by: 'sequence',
    sort_order: 'asc'
  })
  
  // Fetch extractions data using the API
  const { extractions, pagination, isLoading, error, refetch } = useExtractionsData(filters)
  
  // Form operations
  const { createExtraction, updateExtraction, isCreating, isUpdating } = useExtractionForm()
  
  // Delete operation
  const deleteMutation = useDeleteExtraction()

  const [toothStatusGroups, setToothStatusGroups] = useState<ToothStatusGroup[]>([
    {
      id: 1,
      name: "Fixed Restoration only",
      tooth_statuses: []
    },
    {
      id: 2,
      name: "Repairs only",
      tooth_statuses: []
    },
    {
      id: 3,
      name: "Removables",
      tooth_statuses: []
    },
    {
      id: 4,
      name: "3D dentures",
      tooth_statuses: []
    }
  ])

  const [searchQuery, setSearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<keyof Extraction | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [isCreateToothStatusModalOpen, setIsCreateToothStatusModalOpen] = useState(false)
  const [isCreateToothStatusGroupModalOpen, setIsCreateToothStatusGroupModalOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [editingToothStatus, setEditingToothStatus] = useState<Extraction | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const editingExtractionId = !isCopying && editingToothStatus ? editingToothStatus.id : null
  const {
    data: editingExtractionResponse,
    isFetching: isFetchingExtraction,
  } = useExtraction(editingExtractionId, filters.lang)
  const detailedExtraction = editingExtractionResponse?.data

  // Update filters when language changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      lang: currentLanguage || 'en',
      page: 1 // Reset to first page when language changes
    }))
  }, [currentLanguage])

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: searchQuery || undefined,
        page: 1, // Reset to first page when searching
      }))
    }, 500) // 500ms debounce
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle sorting
  const handleSort = (column: keyof Extraction) => {
    let newDirection: "asc" | "desc" = "asc"
    
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        newDirection = "desc"
      } else if (sortDirection === "desc") {
        setSortColumn(null)
        setSortDirection(null)
        setFilters(prev => ({
          ...prev,
          sort_by: 'sequence',
          sort_order: 'asc'
        }))
        return
      }
    }
    
    setSortColumn(column)
    setSortDirection(newDirection)
    setFilters(prev => ({
      ...prev,
      sort_by: column as "name" | "code" | "sequence" | "created_at",
      sort_order: newDirection
    }))
  }

  const renderSortIndicator = (column: keyof Extraction) => {
    if (sortColumn !== column) return null

    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4 inline" />
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(extractions.map((status) => status.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId])
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId))
    }
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  // Handle entries per page change
  const handleEntriesPerPageChange = (perPage: number) => {
    setFilters(prev => ({ ...prev, per_page: perPage, page: 1 }))
  }

  const handleOpenCreateToothStatusModal = () => {
    setEditingToothStatus(null)
    setIsCopying(false)
    setIsCreateToothStatusModalOpen(true)
  }

  const handleOpenCreateToothStatusGroupModal = () => {
    setIsCreateToothStatusGroupModalOpen(true)
  }

  function handleEdit(toothStatus: Extraction): void {
    setEditingToothStatus(toothStatus)
    setIsCopying(false)
    setIsCreateToothStatusModalOpen(true)
  }

  async function handleCopy(toothStatus: Extraction): Promise<void> {
    try {
      // Generate a unique code by appending timestamp to avoid conflicts
      const timestamp = Date.now().toString().slice(-6) // Last 6 digits of timestamp
      const uniqueCode = toothStatus.code 
        ? `${toothStatus.code}_COPY_${timestamp}` 
        : `EXT_${timestamp}`

      // Create copied tooth status with unique code and name
      // Remove id and other read-only fields to make it a new extraction
      const { id, created_at, updated_at, deleted_at, ...toothStatusWithoutId } = toothStatus
      
      const copiedToothStatus: Extraction = {
        ...toothStatusWithoutId,
        name: `${toothStatus.name} (Copy)`,
        code: uniqueCode,
      } as Extraction

      setEditingToothStatus(copiedToothStatus)
      setIsCopying(true)
      setIsCreateToothStatusModalOpen(true)
    } catch (error) {
      console.error("Error copying tooth status:", error)
    }
  }

  async function handleDelete(id: number): Promise<void> {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        // Remove from selected items if it was selected
        setSelectedItems(prev => prev.filter(itemId => itemId !== id))
        // Refetch data
        refetch()
      }
    })
  }

  async function handleBulkDelete(): Promise<void> {
    if (selectedItems.length > 0) {
      // Delete all selected items sequentially to avoid race conditions
      const itemsToDelete = [...selectedItems]
      setSelectedItems([])
      
      // Delete items one by one
      for (const id of itemsToDelete) {
        deleteMutation.mutate(id, {
          onSuccess: () => {
            // Refetch after each deletion
            refetch()
          }
        })
      }
    }
  }

  const isDetailLoading = !!editingExtractionId && (isFetchingExtraction || !detailedExtraction)
  const toothStatusForModal = editingToothStatus
    ? {
        id: isCopying
          ? undefined
          : detailedExtraction?.id ?? editingToothStatus.id,
        name: detailedExtraction?.name ?? editingToothStatus.name,
        code: detailedExtraction?.code ?? editingToothStatus.code,
        color: detailedExtraction?.color ?? editingToothStatus.color,
        sequence: detailedExtraction?.sequence ?? editingToothStatus.sequence,
        initial_loading: isDetailLoading,
        active:
          (detailedExtraction?.status ?? editingToothStatus.status) === 'Active',
        description:
          detailedExtraction?.description ?? editingToothStatus.description ?? null,
      }
    : null

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Tooth Mapping Management</h1>
            <p className="text-sm text-gray-500">Manage tooth statuses and groups for your products</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Show</span>
          <select
            value={filters.per_page}
            onChange={(e) => {
              const newEntriesPerPage = Number(e.target.value)
              handleEntriesPerPageChange(newEntriesPerPage)
            }}
            className="w-20 h-9 text-sm border border-gray-300 rounded-md px-2 focus:border-[#1162a8] focus:ring-[#1162a8]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-700">entries</span>
          
          {selectedItems.length > 0 && (
            <div className="ml-6 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedItems.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleBulkDelete}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            onClick={handleOpenCreateToothStatusModal}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tooth Status
          </Button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search tooth statuses..."
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table Section with Split View */}
      <div className="flex">
        {/* Left side - Tooth Statuses */}
        <div className="flex-grow border-r border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                  <TableHead className="w-12 pl-6">
                    <Checkbox
                      checked={selectedItems.length === extractions.length && extractions.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("name")}>
                    <div className="flex items-center">
                      Tooth Status
                      {sortColumn === "name" && renderSortIndicator("name")}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">Color</TableHead>
                  <TableHead className="font-semibold text-gray-900">Code</TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-center pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1162a8]"></div>
                        <span className="text-gray-500 text-sm">Loading tooth statuses...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : extractions.length > 0 ? (
                  extractions.map((status) => (
                    <TableRow key={status.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedItems.includes(status.id)}
                          onCheckedChange={(checked) => handleSelectItem(status.id, !!checked)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{status.name}</TableCell>
                      <TableCell>
                        <div 
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: status.color }}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{status.code}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          status.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {status.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center pr-6">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(status)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(status.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50"
                            onClick={() => handleCopy(status)}
                            title="Duplicate tooth status"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-gray-100 rounded-full">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-medium text-gray-900 mb-1">No tooth statuses found</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            {searchQuery 
                              ? "Try adjusting your search terms or filters"
                              : "Get started by creating your first extraction status"
                            }
                          </p>
                          {!searchQuery && (
                            <Button
                              className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                              onClick={handleOpenCreateToothStatusModal}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Your First Tooth Status
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
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.last_page > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={pagination.current_page <= 1}
                className="text-sm"
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    variant={page === pagination.current_page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={`text-sm ${page === pagination.current_page ? 'bg-[#1162a8] text-white' : ''}`}
                  >
                    {page}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={pagination.current_page >= pagination.last_page}
                className="text-sm"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      <CreateToothStatusModal
        isOpen={isCreateToothStatusModalOpen}
        onClose={() => {
          setIsCreateToothStatusModalOpen(false)
          setEditingToothStatus(null)
          setIsCopying(false)
        }}
        onChanges={(hasChanges) => setHasUnsavedChanges(hasChanges)}
        toothStatus={toothStatusForModal}
        mode={isCopying ? "create" : (editingToothStatus ? "edit" : "create")}
        isCopying={isCopying}
        onSuccess={refetch}
      />

      <CreateToothStatusGroupModal
        isOpen={isCreateToothStatusGroupModalOpen}
        onClose={() => {
          setIsCreateToothStatusGroupModalOpen(false)
        }}
        onChanges={(hasChanges) => setHasUnsavedChanges(hasChanges)}
      />
    </div>
  )
}
