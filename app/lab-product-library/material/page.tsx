"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, ChevronUp, ChevronDown, Copy, Info, TrashIcon, Edit, Plus, Package, Link } from "lucide-react"
import { CreateMaterialModal } from "@/components/product-management/create-material-modal"
import { CreateMaterialGroupModal } from "@/components/product-management/create-material-group-modal"
import { LinkProductsModal } from "@/components/product-management/link-products-modal"
import { useMaterials } from "@/contexts/product-materials-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
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

// Add a simple Delete Confirmation Modal
function DeleteMaterialModal({ isOpen, onClose, onConfirm, materialName }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, materialName?: string }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-2">Delete Material</h2>
        <p className="mb-4 text-gray-700">
          Are you sure you want to delete <span className="font-bold">{materialName}</span>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  )
}

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
    getMaterialDetail,
  } = useMaterials()

  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [isLinkProductsModalOpen, setIsLinkProductsModalOpen] = useState(false)
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<{ id: number | number[], name?: string } | null>(null)
  const { currentLanguage } = useLanguage()

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
      return null
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="w-4 h-4 text-gray-600" />
    }
    if (sortDirection === "desc") {
      return <ChevronDown className="w-4 h-4 text-gray-600" />
    }
    return null
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

  function handleEdit(material: any): void {
    setEditingMaterial(material)
    setShowCreateModal(true)
  }

  function handleDelete(materialId: number): void {
    const mat = materials.find((m) => m.id === materialId)
    setMaterialToDelete({ id: materialId, name: mat?.name })
    setDeleteModalOpen(true)
  }

  async function handleCopy(materialId: number): Promise<void> {
    try {
      console.log("🔄 Copying material with ID:", materialId)
      
      const materialDetail: any = await getMaterialDetail(materialId)
      if (!materialDetail) {
        console.error("❌ Failed to fetch material detail")
        return
      }

      console.log("📋 Original material detail:", materialDetail)
      console.log("💰 Original price from materialDetail.price:", materialDetail.price)
      console.log("💰 Original price from lab_material?.price:", materialDetail.lab_material?.price)

      // Generate a unique code by appending timestamp to avoid conflicts
      const timestamp = Date.now().toString().slice(-6) // Last 6 digits of timestamp
      const uniqueCode = materialDetail.code 
        ? `${materialDetail.code}_COPY_${timestamp}` 
        : `MAT_${timestamp}`

      // Remove id and other read-only/auto-generated fields to make it a new material
      const {
        id: _,
        created_at,
        updated_at,
        deleted_at,
        lab_material,
        ...materialWithoutId
      } = materialDetail

      // Get price from materialDetail or lab_material
      const price = materialDetail.price 
        ? (typeof materialDetail.price === "number" ? materialDetail.price : parseFloat(materialDetail.price))
        : (lab_material?.price ? parseFloat(lab_material.price) : 0)

      console.log("💰 Extracted price value:", price, "type:", typeof price)

      // Create duplicated material with unique code and name
      const duplicatedMaterial = {
        ...materialWithoutId,
        name: materialDetail.name ? `${materialDetail.name} (Copy)` : materialDetail.name,
        code: uniqueCode,
        price: price,
      }

      console.log("=========================================")
      console.log("📦 Duplicated Material Payload:")
      console.log("=========================================")
      console.log(JSON.stringify(duplicatedMaterial, null, 2))
      console.log("=========================================")
      console.log("Duplicated material object:", duplicatedMaterial)
      console.log("Duplicated material price:", duplicatedMaterial.price)
      console.log("Duplicated material price type:", typeof duplicatedMaterial.price)
      console.log("=========================================")

      setEditingMaterial(duplicatedMaterial)
      setShowCreateModal(true)
    } catch (error) {
      console.error("❌ Failed to duplicate material:", error)
    }
  }

  function handleConfirmDelete() {
    if (materialToDelete && typeof materialToDelete.id === "number") {
      deleteMaterial(materialToDelete.id)
    }
    setDeleteModalOpen(false)
    setMaterialToDelete(null)
  }

  function handleBulkDelete() {
    if (selectedItems.length > 0) {
      setMaterialToDelete({ id: [...selectedItems], name: `${selectedItems.length} materials` })
      setDeleteModalOpen(true)
    }
  }

  function handleDeleteModalClose() {
    setDeleteModalOpen(false)
    setMaterialToDelete(null)
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Materials Management</h1>
            <p className="text-sm text-gray-500">Manage your material inventory and configurations</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Show</span>
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
            onClick={() => setIsLinkProductsModalOpen(true)}
          >
            <Link className="h-4 w-4 mr-2" />
            Link Products
          </Button>

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

      {/* Table Section with Split View */}
      <div className="flex">
        {/* Left side - Materials */}
        <div className="flex-grow border-r border-gray-200">
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
                    <div className="flex items-center">
                      Material
                      {sortColumn === "name" && getSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">Additional Price</TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("code")}>
                    <div className="flex items-center">
                      Code
                      {sortColumn === "code" && getSortIcon("code")}
                    </div>
                  </TableHead>
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
                        <span className="text-gray-500 text-sm">Loading materials...</span>
                      </div>
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
                      <TableCell>
                        {(material as any).lab_material && (material as any).lab_material.price
                          ? `$${parseFloat((material as any).lab_material.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : typeof (material as any).price === "number" && (material as any).price > 0
                            ? `$${parseFloat((material as any).price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "-"}
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-800">
                          {material.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            material.status === "Active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }
                        >
                          {material.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center pr-6">
                        <div className="flex items-center justify-center gap-1">
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                                  onClick={() => handleCopy(material.id)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Duplicate material</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                          <h3 className="font-medium text-gray-900 mb-1">No materials found</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            {searchQuery 
                              ? "Try adjusting your search terms or filters"
                              : "Get started by creating your first material"
                            }
                          </p>
                          {!searchQuery && (
                            <Button
                              className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                              onClick={() => setShowCreateModal(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Your First Material
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

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {Math.min(pagination.total, 1 + (currentPage - 1) * pagination.per_page)} to{" "}
                {Math.min(pagination.total, currentPage * pagination.per_page)} of {pagination.total} entries
              </div>
              <div className="flex items-center space-x-1">
                <button
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50"
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
                        pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === pagination.last_page}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
     
      </div>

      <CreateMaterialModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditingMaterial(null)
          setIsCopying(false)
        }}
        material={editingMaterial}
        isCopying={isCopying}
      />
      <CreateMaterialGroupModal isOpen={showCreateGroupModal} onClose={() => setShowCreateGroupModal(false)} />
      <LinkProductsModal
        isOpen={isLinkProductsModalOpen}
        onClose={() => setIsLinkProductsModalOpen(false)}
        entityType="material"
        context="lab"
      />
      <DeleteMaterialModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={() => {
          if (materialToDelete?.id && Array.isArray(materialToDelete.id)) {
            bulkDeleteMaterials(materialToDelete.id)
          } else if (materialToDelete?.id) {
            handleConfirmDelete()
          }
          handleDeleteModalClose()
        }}
        materialName={materialToDelete?.name}
      />
    </div>
  )
}
