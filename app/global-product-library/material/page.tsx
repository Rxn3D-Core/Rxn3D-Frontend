"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, ChevronUp, ChevronDown, Copy, Info, TrashIcon, Edit, Plus, Package } from "lucide-react"
import { CreateMaterialModal } from "@/components/product-management/create-material-modal"
import { CreateMaterialGroupModal } from "@/components/product-management/create-material-group-modal"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { useMaterials } from "@/contexts/product-materials-context"
import { TooltipContent, Tooltip, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip"
import { useLanguage } from "@/contexts/language-context"
type SortDirection = "asc" | "desc" | null

interface MaterialGroup {
  id: string
  name: string
}

const mockMaterialGroups: MaterialGroup[] = [
  { id: "1", name: "All Complete denture" },
  { id: "2", name: "All Partial Denture" },
  { id: "3", name: "All Single Crowns" },
  { id: "4", name: "Repairs" },
]

export default function MaterialPage() {
  const {
    materials,
    isLoading,
    pagination,
    searchQuery,
    sortColumn,
    sortDirection,
    selectedItems,
    fetchMaterials,
    setSearchQuery,
    setSortColumn,
    setSortDirection,
    setSelectedItems,
    deleteMaterial,
    bulkDeleteMaterials,
  } = useMaterials()

  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const [currentPage, setCurrentPage] = useState(1)
  const { currentLanguage } = useLanguage()
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null)

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch materials on component mount and when dependencies change
  useEffect(() => {
    fetchMaterials(currentPage, Number.parseInt(entriesPerPage))
  }, [fetchMaterials, currentPage, entriesPerPage, searchQuery, sortColumn, sortDirection, currentLanguage])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : sortDirection === "desc" ? null : "asc")
      if (sortDirection === "desc") {
        setSortColumn(null)
      }
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="w-4 h-4 text-gray-600" />
    }
    if (sortDirection === "desc") {
      return <ChevronDown className="w-4 h-4 text-gray-600" />
    }
    return <ChevronUp className="w-4 h-4 text-gray-400" />
  }

  const handleSelectAllMaterials = (checked: boolean) => {
    if (checked) {
      setSelectedItems(materials.map((material) => material.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectAllGroups = (checked: boolean) => {
    if (checked) {
      setSelectedGroups(mockMaterialGroups.map((group) => group.id))
    } else {
      setSelectedGroups([])
    }
  }

  const handleMaterialSelect = (materialId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, materialId])
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== materialId))
    }
  }

  const handleGroupSelect = (groupId: string, checked: boolean) => {
    if (checked) {
      setSelectedGroups([...selectedGroups, groupId])
    } else {
      setSelectedGroups(selectedGroups.filter((id) => id !== groupId))
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleEntriesPerPageChange = (value: string) => {
    setEntriesPerPage(value)
    setCurrentPage(1)
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const totalPages = pagination.last_page
    const current = pagination.current_page
    const pages = []

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, 5)
      } else if (current >= totalPages - 2) {
        pages.push(totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(current - 2, current - 1, current, current + 1, current + 2)
      }
    }

    return pages
  }

  if (isLoading && materials.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1162a8] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading materials...</p>
        </div>
      </div>
    )
  }

  function handleEdit(material: any): void {
    setEditingMaterial(material)
    setShowCreateModal(true)
  }
  function handleDelete(materialId: number): void {
    setDeleteTargetId(materialId)
    setShowDeleteModal(true)
  }
  function handleBulkDelete(): void {
    setShowBulkDeleteModal(true)
  }
  async function confirmDelete() {
    if (deleteTargetId !== null) {
      setIsDeleting(true)
      await deleteMaterial(deleteTargetId)
      setIsDeleting(false)
      setShowDeleteModal(false)
      setDeleteTargetId(null)
    }
  }
  async function confirmBulkDelete() {
    if (selectedItems.length > 0) {
      setIsDeleting(true)
      await bulkDeleteMaterials(selectedItems)
      setIsDeleting(false)
      setShowBulkDeleteModal(false)
    }
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setEditingMaterial(null)
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
            <h1 className="text-xl font-semibold text-gray-900">Material Management</h1>
            <p className="text-sm text-gray-500">Manage material types and specifications</p>
          </div>
        </div>
      </div>

      {/* Enhanced Header Section */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Show</span>
          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(e.target.value)
              setCurrentPage(1)
            }}
            className="w-20 h-9 text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
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
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add material
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search materials..."
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Table Section */}
      <div className="flex">
        <div className="flex-grow border-r border-gray-200 flex flex-col">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                  <TableHead className="w-12 pl-6">
                    <Checkbox
                      checked={selectedItems.length === materials.length && materials.length > 0}
                      onCheckedChange={handleSelectAllMaterials}
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("name")}>
                    <span>Material</span>
                    {sortColumn === "name" && getSortIcon("name")}
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("code")}>
                    <span>Code</span>
                    {sortColumn === "code" && getSortIcon("code")}
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  <TableHead className="font-semibold text-gray-900">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1162a8] mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading materials...</p>
                    </TableCell>
                  </TableRow>
                ) : materials.length > 0 ? (
                  materials.map((material) => (
                    <TableRow key={material.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedItems.includes(material.id)}
                          onCheckedChange={(checked) => handleMaterialSelect(material.id, !!checked)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{material.name}</TableCell>
                      <TableCell className="text-gray-600">{material.code}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            material.status === "Active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {material.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(material)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(material.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-gray-100 rounded-full">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-medium text-gray-900 mb-1">No materials found</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Try adjusting your search or add a new material
                          </p>
                          <Button
                            className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                            onClick={() => setShowCreateModal(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Material
                          </Button>
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

      {/* Enhanced Pagination */}
      {pagination.total > 0 && (
        <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {Math.min(pagination.total, 1 + (currentPage - 1) * pagination.per_page)} to{" "}
            {Math.min(pagination.total, currentPage * pagination.per_page)} of {pagination.total} entries
          </div>
          <div className="flex items-center space-x-1">
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-200 text-gray-600 disabled:opacity-50"
              onClick={() => setCurrentPage(currentPage - 1)}
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
                    pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-200 text-gray-600 disabled:opacity-50"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === pagination.last_page}
            >
              »
            </button>
          </div>
        </div>
      )}

      <CreateMaterialModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        material={editingMaterial} // Pass the editing material for edit mode
      />
      <CreateMaterialGroupModal isOpen={showCreateGroupModal} onClose={() => setShowCreateGroupModal(false)} />

      {/* Delete Confirmation Modals */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteTargetId(null) }}
        onConfirm={confirmDelete}
        itemName="material"
        title="Delete Material"
        description="Are you sure you want to delete this material? This action cannot be undone."
        isLoading={isDeleting}
      />
      <DeleteConfirmationModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={confirmBulkDelete}
        itemName="materials"
        itemCount={selectedItems.length}
        title="Delete Selected Materials"
        description={`Are you sure you want to delete ${selectedItems.length} selected materials? This action cannot be undone.`}
        isLoading={isDeleting}
      />
    </div>
  )
}
