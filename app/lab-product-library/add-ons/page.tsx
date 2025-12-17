"use client"

import { useState, useEffect } from "react"
import { Search, ArrowUp, ArrowDown, Edit, Trash2, Copy, TrashIcon, Plus, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AddAddOnModal } from "@/components/product-management/add-add-on-modal"
import { useAddOns } from "@/contexts/product-add-on-context"
import { useLanguage } from "@/contexts/language-context"
import { useTranslation } from "react-i18next"
import { getAuthToken } from "@/lib/auth-utils"
import { redirectToLogin } from "@/lib/auth-utils"

export default function AddOnsPage() {
  const {
    addOns,
    isLoadingAddOns,
    addOnError,
    addOnPagination,
    searchQuery,
    setSearchQuery,
    sortColumn,
    sortDirection,
    setSortColumn,
    setSortDirection,
    selectedItems,
    setSelectedItems,
    fetchAddOns,
    deleteAddOn,
  } = useAddOns()

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingAddOn, setEditingAddOn] = useState<any>(null)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  // Discard dialog states
  const [hasModalChanges, setHasModalChanges] = useState(false)

  // Pagination states
  const [entriesPerPage, setEntriesPerPage] = useState(addOnPagination?.per_page?.toString() || "10")
  const [currentPage, setCurrentPage] = useState(addOnPagination?.current_page || 1)

  const [searchInput, setSearchInput] = useState(searchQuery)
  const { currentLanguage } = useLanguage()
  const { t } = useTranslation()

  // Keep local pagination state in sync with context pagination
  useEffect(() => {
    if (addOnPagination) {
      setEntriesPerPage(addOnPagination.per_page.toString())
      setCurrentPage(addOnPagination.current_page)
    }
  }, [addOnPagination?.per_page, addOnPagination?.current_page])

  // Debounce search input and update searchQuery
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchInput])

  // Only fetch add-ons when relevant state changes
  useEffect(() => {
    fetchAddOns(currentPage, Number(entriesPerPage), searchQuery, sortColumn ?? undefined, sortDirection)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, entriesPerPage, searchQuery, sortColumn, sortDirection, currentLanguage])

  const handlePageChange = (page: number) => {
    if (addOnPagination && page >= 1 && page <= addOnPagination.last_page) {
      setCurrentPage(page)
    }
  }

  const handleSort = (column: string) => {
    const columnKey = column as keyof import("@/contexts/product-add-on-context").AddOn
    if (sortColumn === columnKey) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortColumn(null)
        setSortDirection("asc")
      } else {
        setSortDirection("asc")
      }
    } else {
      setSortColumn(columnKey)
      setSortDirection("asc")
    }
    setCurrentPage(1) 
  }

  const renderSortIndicator = (column: string) => {
    if (sortColumn !== column) return null

    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4 inline" />
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(addOns.map((addOn) => addOn.id))
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

  const handleEdit = async (addOn: any) => {
    setIsEditLoading(true)
    setEditingAddOn(null)
    setIsEditModalOpen(false)
    setIsCopying(false)
    
    try {
      const detail = await getAddOnDetail(addOn.id)
      const addOnDetail = detail && detail.data ? detail.data : detail
      setEditingAddOn(addOnDetail)
      setIsEditLoading(false)
      setIsEditModalOpen(true)
    } catch (error) {
      console.error("Failed to fetch add-on detail:", error)
      setIsEditLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    await deleteAddOn(id)
  }

  // Create a standalone getAddOnDetail function
  const getAddOnDetail = async (id: number) => {
    try {
      const token = getAuthToken()
      const customerId = localStorage.getItem("customerId")
      const url = customerId 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/library/addons/${id}?customer_id=${customerId}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/library/addons/${id}`
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        redirectToLogin()
        throw new Error("Unauthorized")
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Failed to fetch add-on detail:", error)
      throw error
    }
  }

  const handleDuplicate = async (id: number) => {
    setIsEditLoading(true)
    setEditingAddOn(null)
    setIsEditModalOpen(false)
    setIsCopying(true)
    
    try {
      const detail = await getAddOnDetail(id)
      const addOnDetail = detail && detail.data ? detail.data : detail
      
      // Generate a unique code by appending timestamp to avoid conflicts
      const timestamp = Date.now().toString().slice(-6) // Last 6 digits of timestamp
      const uniqueCode = addOnDetail.code 
        ? `${addOnDetail.code}_COPY_${timestamp}` 
        : `ADDON_${timestamp}`
      
      // Remove id and other read-only/auto-generated fields to make it a new add-on
      const {
        id: _,
        created_at,
        updated_at,
        deleted_at,
        category_name,
        subcategory_name,
        subcategory,
        ...addOnWithoutId
      } = addOnDetail
      
      // Create duplicated add-on with unique code and name
      const duplicatedAddOn = {
        ...addOnWithoutId,
        name: addOnDetail.name ? `${addOnDetail.name} (Copy)` : addOnDetail.name,
        code: uniqueCode,
      }
      
      setEditingAddOn(duplicatedAddOn)
      setIsEditLoading(false)
      setIsEditModalOpen(true)
    } catch (error) {
      console.error("Failed to duplicate add-on:", error)
      setIsEditLoading(false)
      setIsCopying(false)
    }
  }

  const renderLoadingSkeleton = () => (
    <>
      {[...Array(Number(entriesPerPage))].map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-4 w-4" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-48" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t("Add-ons Management")}</h1>
            <p className="text-sm text-gray-500">{t("Manage your add-on inventory and configurations")}</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{t("Show")}</span>
          <Select
            value={entriesPerPage}
            onValueChange={(value) => {
              setEntriesPerPage(value)
              setCurrentPage(1)
            }}
          >
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
          {/* <Button className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            Import add-ons
          </Button> */}
          <Button
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add add-ons
          </Button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder={t("Search add-ons...")}
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {addOnError && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{addOnError}</p>
        </div>
      )}

      {/* Table Section */}
      <div>
        {/* Add-ons Table */}
        <div className="flex-grow">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                  <TableHead className="w-12 pl-6">
                    <Checkbox
                      checked={selectedItems.length === addOns.length && addOns.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("subcategory_name")}>
                    <div className="flex items-center">
                      {t("Add-on Sub Category")}
                      {renderSortIndicator("subcategory_name")}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("name")}>
                    <div className="flex items-center">
                      {t("Add on")}
                      {renderSortIndicator("name")}
                    </div>
                  </TableHead>
                  {/* New Price Column */}
                  <TableHead className="font-semibold text-gray-900">
                    {t("Price")}
                  </TableHead>
                  <TableHead className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" onClick={() => handleSort("status")}>
                    <div className="flex items-center">
                      {t("Status")}
                      {renderSortIndicator("status")}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 text-center pr-6">
                    {t("Actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAddOns ? (
                  renderLoadingSkeleton()
                ) : addOns.length > 0 ? (
                  addOns.map((addOn) => (
                    <TableRow key={addOn.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedItems.includes(addOn.id)}
                          onCheckedChange={(checked) => handleSelectItem(addOn.id, !!checked)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                      </TableCell>
                      <TableCell className="text-gray-600">{addOn.subcategory_name}</TableCell>
                      <TableCell className="font-medium text-gray-900">{addOn.name}</TableCell>
                      {/* New Price Cell */}
                      <TableCell className="font-medium text-gray-900">
                        {(addOn as any).lab_addon?.price ?? addOn.price ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            addOn.status === "Active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          {t(addOn.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center pr-6">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" onClick={() => handleEdit(addOn)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(addOn.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                            onClick={() => handleDuplicate(addOn.id)}
                            title={t("Duplicate add-on")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-gray-100 rounded-full">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-medium text-gray-900 mb-1">{t("No add-ons found", "No add-ons found")}</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            {searchQuery 
                              ? t("Try adjusting your search terms or filters")
                              : t("Get started by creating your first add-on")
                            }
                          </p>
                          {!searchQuery && (
                            <Button
                              className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                              onClick={() => setIsCreateModalOpen(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {t("Add Your First Add-on", "Add Your First Add-on")}
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
          <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {t("Showing")} {Math.min(addOnPagination?.total ?? 0, 1 + (currentPage - 1) * (addOnPagination?.per_page ?? 10))} {t("to")}{" "}
              {Math.min(addOnPagination?.total ?? 0, currentPage * (addOnPagination?.per_page ?? 10))} {t("of")} {addOnPagination?.total ?? 0} {t("entries")}
            </div>
            <div className="flex items-center space-x-1">
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-200 text-gray-600 disabled:opacity-50"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoadingAddOns}
              >
                «
              </button>
              {Array.from({ length: Math.min(5, addOnPagination?.last_page ?? 1) }, (_, i) => {
                let pageNum = i + 1
                if ((addOnPagination?.last_page ?? 1) > 5) {
                  if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= (addOnPagination?.last_page ?? 1) - 2) {
                    pageNum = (addOnPagination?.last_page ?? 1) - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                }

                return (
                  <button
                    key={pageNum}
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={isLoadingAddOns}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-200 text-gray-600 disabled:opacity-50"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === (addOnPagination?.last_page ?? 1) || isLoadingAddOns}
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Add-on Modal */}
      <AddAddOnModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onHasChangesChange={setHasModalChanges}
      />

      {/* Edit Add-on Modal */}
      {editingAddOn && (
        <AddAddOnModal
          isOpen={isEditModalOpen && !isEditLoading}
          onClose={() => {
            setIsEditModalOpen(false)
            setIsCopying(false)
          }}
          onHasChangesChange={setHasModalChanges}
          addOn={editingAddOn}
          isEditing={!isCopying}
          isCopying={isCopying}
        />
      )}
    </div>
  )
}
