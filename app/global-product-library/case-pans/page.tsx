"use client"

import { useState, useEffect } from "react"
import { Search, ArrowUp, ArrowDown, Copy, Edit, TrashIcon, Package2, Plus, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddCasePanModal } from "@/components/product-management/add-case-pan-modal"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { useProductLibrary } from "@/contexts/product-case-pan-context"
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/language-context"

export default function CasePansPage() {
  const {
    casePans,
    isLoading,
    pagination,
    searchQuery,
    sortColumn,
    sortDirection,
    selectedItems,
    fetchCasePans,
    setSearchQuery,
    setSortColumn,
    setSortDirection,
    setSelectedItems,
    clearSelection,
    deleteCasePan,
    bulkDeleteCasePans,
  } = useProductLibrary()

  const [entriesPerPage, setEntriesPerPage] = useState("25")
  const [isAddCasePanModalOpen, setIsAddCasePanModalOpen] = useState(false)
  const [editingCasePan, setEditingCasePan] = useState<any>(null)
  const [isCopying, setIsCopying] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [casePanToDelete, setCasePanToDelete] = useState<any>(null)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const { currentLanguage } = useLanguage()
  const { t } = useTranslation();

  // Initial load effect
  useEffect(() => {
    fetchCasePans(1, Number.parseInt(entriesPerPage))
  }, []) // Only run once on mount

  // Search and pagination effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        setCurrentPage(1)
        fetchCasePans(1, Number.parseInt(entriesPerPage))
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, entriesPerPage, currentLanguage])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortColumn(null)
        setSortDirection(null)
      } else {
        setSortDirection("asc")
      }
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
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
      setSelectedItems(casePans.map((casePan) => casePan.id))
    } else {
      clearSelection()
    }
  }

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId])
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId))
    }
  }

  // Helper function to calculate brightness and determine if text should be white or black
  const getTextColor = (hexColor: string): string => {
    if (!hexColor || !hexColor.startsWith('#')) return '#000000'
    
    // Remove # if present
    const hex = hexColor.replace('#', '')
    
    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    
    // Calculate brightness using relative luminance formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    
    // Return white text for dark colors, black for light colors
    return brightness > 128 ? '#000000' : '#ffffff'
  }

  // Get background color from hex value
  const getBackgroundColor = (color: string): string => {
    if (!color || !color.startsWith('#')) return '#808080' // Default gray if invalid
    return color
  }

  function handleEdit(id: any): void {
    const casePan = casePans.find((cp) => cp.id === id)
    if (casePan) {
      setEditingCasePan(casePan)
      setIsCopying(false)
      setIsAddCasePanModalOpen(true)
    }
  }

  function handleCopy(id: any): void {
    const casePan = casePans.find((cp) => cp.id === id)
    if (casePan) {
      console.log("Copying case pan:", casePan)
      setEditingCasePan(casePan)
      setIsCopying(true)
      setIsAddCasePanModalOpen(true)
    }
  }

  function handleDelete(id: any): void {
    const casePan = casePans.find((cp) => cp.id === id)
    setCasePanToDelete(casePan)
    setDeleteModalOpen(true)
  }

  function confirmDelete() {
    if (casePanToDelete) {
      deleteCasePan(casePanToDelete.id)
      setDeleteModalOpen(false)
      setCasePanToDelete(null)
    }
  }

  function cancelDelete() {
    setDeleteModalOpen(false)
    setCasePanToDelete(null)
  }

  function handleBulkDelete(): void {
    if (selectedItems.length > 0) {
      setBulkDeleteModalOpen(true)
    }
  }

  function confirmBulkDelete() {
    if (selectedItems.length > 0) {
      bulkDeleteCasePans(selectedItems)
      setBulkDeleteModalOpen(false)
    }
  }

  function cancelBulkDelete() {
    setBulkDeleteModalOpen(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Package2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{t("Case Pans Management")}</h1>
            <p className="text-sm text-gray-500">{t("Manage your case pan inventory and configurations")}</p>
          </div>
        </div>
      </div>

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
                onClick={handleBulkDelete}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                {t("Delete Selected")}
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            onClick={() => setIsAddCasePanModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("Add Case Pan")}
          </Button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder={t("Search case pans...")}
              className="pl-10 h-10 w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50">
              <TableHead className="w-12 pl-6">
                <Checkbox
                  className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                  checked={selectedItems.length === casePans.length && casePans.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer font-semibold text-gray-900 hover:text-[#1162a8] transition-colors" 
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center">
                  {t("Case Pan Names")} 
                  {renderSortIndicator("name")}
                </div>
              </TableHead>
              <TableHead className="font-semibold text-gray-900">
                {t("Code")}
              </TableHead>
              <TableHead className="font-semibold text-gray-900">
                {t("Type")}
              </TableHead>
              <TableHead className="font-semibold text-gray-900">{t("Color")}</TableHead>
              <TableHead className="font-semibold text-gray-900">
                {t("Status")}
              </TableHead>
              <TableHead className="font-semibold text-gray-900 text-center pr-6">
                {t("Actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1162a8]"></div>
                    <span className="text-gray-500 text-sm">{t("Loading case pans...")}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : casePans.length > 0 ? (
              casePans.map((casePan) => (
                <TableRow 
                  key={casePan.id} 
                  className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                    selectedItems.includes(casePan.id) ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <TableCell className="pl-6">
                    <Checkbox
                      className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                      checked={selectedItems.includes(casePan.id)}
                      onCheckedChange={(checked) => handleSelectItem(casePan.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    <div className="flex flex-col">
                      <span className="font-semibold">{casePan.name}</span>
                      {casePan.description && (
                        <span className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                          {casePan.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-800">
                      {casePan.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {casePan.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{
                          backgroundColor: getBackgroundColor(casePan.color_code ?? ""),
                          color: getTextColor(casePan.color_code ?? "")
                        }}
                        title={casePan.color_code ?? ""}
                      />
                      <span className="text-xs text-gray-500 font-mono">{casePan.color_code}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        casePan.status === "Active"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }
                    >
                      {t(casePan.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center pr-6">
                    <div className="flex items-center justify-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-gray-600 hover:text-[#1162a8] hover:bg-blue-50" 
                        onClick={() => handleEdit(casePan.id)}
                        title={t("Edit")}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                        onClick={() => handleCopy(casePan.id)}
                        title={t("Duplicate")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(casePan.id)}
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
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-gray-100 rounded-full">
                      <Package2 className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-medium text-gray-900 mb-1">{t("No case pans found")}</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {searchQuery 
                          ? t("Try adjusting your search terms or filters")
                          : t("Get started by creating your first case pan")
                        }
                      </p>
                      {!searchQuery && (
                        <Button
                          className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                          onClick={() => setIsAddCasePanModalOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t("Add Your First Case Pan")}
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
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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

      <AddCasePanModal
        isOpen={isAddCasePanModalOpen}
        onClose={() => {
          setIsAddCasePanModalOpen(false)
          setEditingCasePan(null)
          setIsCopying(false)
        }}
        editCasePan={editingCasePan}
        isCopying={isCopying}
        onEditDone={() => {
          setIsAddCasePanModalOpen(false)
          setEditingCasePan(null)
          setIsCopying(false)
        }}
      />
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        itemName="case pan"
        isLoading={isLoading}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={bulkDeleteModalOpen}
        onClose={cancelBulkDelete}
        onConfirm={confirmBulkDelete}
        itemCount={selectedItems.length}
        isLoading={isLoading}
      />
    </div>
  )
}
