"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Settings2, Link as LinkIcon, Edit, Copy, Trash2, MoreVertical, ArrowUpDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "react-i18next"
import { CreateSubCategoryModal } from "@/components/advance-mode"
import { LoadingDots } from "@/components/ui/loading-dots"
import {
  useAdvanceSubcategories,
  useCreateAdvanceSubcategory,
  useUpdateAdvanceSubcategory,
  useDeleteAdvanceSubcategory,
  useUpdateSubcategoryStatus,
  useLinkSubcategoryProducts,
  useLinkSubcategoryCategories,
  useDuplicateAdvanceSubcategory,
  useAdvanceSubcategory,
} from "@/lib/api/advance-mode-query"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export default function SubCategoryPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc')
  const [orderBy, setOrderBy] = useState('name')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingSubcategory, setEditingSubcategory] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<number | null>(null)
  const [linkProductsDialogOpen, setLinkProductsDialogOpen] = useState(false)
  const [linkCategoriesDialogOpen, setLinkCategoriesDialogOpen] = useState(false)
  const [subcategoryToLink, setSubcategoryToLink] = useState<number | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [customerId, setCustomerId] = useState<number | undefined>(undefined)

  // Get role and customer_id from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('role')
      if (role === 'lab_admin') {
        const customerIdStr = localStorage.getItem('customerId')
        if (customerIdStr) {
          setCustomerId(parseInt(customerIdStr, 10))
        }
      }
    }
  }, [])

  // Fetch subcategories from API
  const { data, isLoading, isError, refetch } = useAdvanceSubcategories({
    page: currentPage,
    per_page: parseInt(entriesPerPage),
    q: searchQuery || undefined,
    order_by: orderBy,
    sort_by: sortBy,
    customer_id: customerId,
  })

  // Mutations
  const createMutation = useCreateAdvanceSubcategory()
  const updateMutation = useUpdateAdvanceSubcategory()
  const deleteMutation = useDeleteAdvanceSubcategory()
  const statusMutation = useUpdateSubcategoryStatus()
  const linkProductsMutation = useLinkSubcategoryProducts()
  const linkCategoriesMutation = useLinkSubcategoryCategories()
  const duplicateMutation = useDuplicateAdvanceSubcategory()

  // Fetch subcategory details for editing
  const { data: subcategoryDetail } = useAdvanceSubcategory(editingSubcategory?.id || 0)

  const handleSort = (field: string) => {
    if (orderBy === field) {
      setSortBy(sortBy === 'asc' ? 'desc' : 'asc')
    } else {
      setOrderBy(field)
      setSortBy('asc')
    }
  }

  const handleCreate = async (formData: any) => {
    try {
      await createMutation.mutateAsync(formData)
      toast({
        title: t("Success"),
        description: t("advanceMode.subCategory.created", "Subcategory created successfully"),
      })
      setIsCreateModalOpen(false)
      refetch()
    } catch (error: any) {
      toast({
        title: t("Error"),
        description: error.message || t("advanceMode.subCategory.createError", "Failed to create subcategory"),
        variant: "destructive",
      })
    }
  }

  const handleUpdate = async (formData: any) => {
    if (!editingSubcategory?.id) return
    try {
      await updateMutation.mutateAsync({ id: editingSubcategory.id, ...formData })
      toast({
        title: t("Success"),
        description: t("advanceMode.subCategory.updated", "Subcategory updated successfully"),
      })
      setIsEditModalOpen(false)
      setEditingSubcategory(null)
      refetch()
    } catch (error: any) {
      toast({
        title: t("Error"),
        description: error.message || t("advanceMode.subCategory.updateError", "Failed to update subcategory"),
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!subcategoryToDelete) return
    try {
      await deleteMutation.mutateAsync(subcategoryToDelete)
      toast({
        title: t("Success"),
        description: t("advanceMode.subCategory.deleted", "Subcategory deleted successfully"),
      })
      setDeleteDialogOpen(false)
      setSubcategoryToDelete(null)
      refetch()
    } catch (error: any) {
      toast({
        title: t("Error"),
        description: error.message || t("advanceMode.subCategory.deleteError", "Failed to delete subcategory"),
        variant: "destructive",
      })
    }
  }

  const handleStatusToggle = async (id: number, currentStatus: 'Active' | 'Inactive') => {
    try {
      await statusMutation.mutateAsync({
        id,
        status: currentStatus === 'Active' ? 'Inactive' : 'Active',
        customer_id: customerId,
      })
      toast({
        title: t("Success"),
        description: t("advanceMode.subCategory.statusUpdated", "Status updated successfully"),
      })
      refetch()
    } catch (error: any) {
      toast({
        title: t("Error"),
        description: error.message || t("advanceMode.subCategory.statusError", "Failed to update status"),
        variant: "destructive",
      })
    }
  }

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateMutation.mutateAsync(id)
      toast({
        title: t("Success"),
        description: t("advanceMode.subCategory.duplicated", "Subcategory duplicated successfully"),
      })
      refetch()
    } catch (error: any) {
      toast({
        title: t("Error"),
        description: error.message || t("advanceMode.subCategory.duplicateError", "Failed to duplicate subcategory"),
        variant: "destructive",
      })
    }
  }

  const handleLinkProducts = async () => {
    if (!subcategoryToLink || selectedProducts.length === 0) {
      toast({
        title: t("Error"),
        description: t("advanceMode.subCategory.selectProducts", "Please select at least one product"),
        variant: "destructive",
      })
      return
    }
    try {
      await linkProductsMutation.mutateAsync({
        id: subcategoryToLink,
        product_ids: selectedProducts,
      })
      toast({
        title: t("Success"),
        description: t("advanceMode.subCategory.productsLinked", "Products linked successfully"),
      })
      setLinkProductsDialogOpen(false)
      setSubcategoryToLink(null)
      setSelectedProducts([])
      refetch()
    } catch (error: any) {
      toast({
        title: t("Error"),
        description: error.message || t("advanceMode.subCategory.linkError", "Failed to link products"),
        variant: "destructive",
      })
    }
  }

  const handleLinkCategories = async () => {
    if (!subcategoryToLink || selectedCategories.length === 0) {
      toast({
        title: t("Error"),
        description: t("advanceMode.subCategory.selectCategories", "Please select at least one category"),
        variant: "destructive",
      })
      return
    }
    try {
      await linkCategoriesMutation.mutateAsync({
        id: subcategoryToLink,
        category_ids: selectedCategories,
      })
      toast({
        title: t("Success"),
        description: t("advanceMode.subCategory.categoriesLinked", "Categories linked successfully"),
      })
      setLinkCategoriesDialogOpen(false)
      setSubcategoryToLink(null)
      setSelectedCategories([])
      refetch()
    } catch (error: any) {
      toast({
        title: t("Error"),
        description: error.message || t("advanceMode.subCategory.linkError", "Failed to link categories"),
        variant: "destructive",
      })
    }
  }

  const subCategoryData = Array.isArray(data?.data) ? data.data : []
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
              {t("advanceMode.subCategory.title", "Sub Category")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("advanceMode.subCategory.description", "Manage sub categories for advance mode")}
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
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("advanceMode.subCategory.addSubcategory", "Add Subcategory")}
            </Button>

            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder={t("advanceMode.subCategory.searchSubCategory", "Search Sub Category")}
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
      <div className="relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 min-h-[400px]">
            <LoadingDots size="lg" />
          </div>
        )}

        {isError && (
          <div className="p-8 text-center">
            <p className="text-red-600 text-sm">
              {t("advanceMode.subCategory.error", "Failed to load subcategories. Please try again.")}
            </p>
          </div>
        )}

        {!isLoading && !isError && subCategoryData.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">
              {t("advanceMode.subCategory.noData", "No subcategories found.")}
            </p>
          </div>
        )}

        {!isLoading && !isError && subCategoryData.length > 0 && (
          <div className="overflow-x-auto">
            <Table className="w-full text-xs">
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                  <TableHead className="w-10 pl-4 py-2">
                    <Checkbox className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4" />
                  </TableHead>
                  <TableHead
                    className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      {t("Field Name")}
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors"
                    onClick={() => handleSort('code')}
                  >
                    <div className="flex items-center gap-1">
                      {t("Code")}
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                    <div className="flex items-center gap-1">
                      {t("Options")}
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                    <div className="flex items-center gap-1">
                      {t("Linked Category / Products")}
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      {t("Status")}
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subCategoryData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center">
                      <p className="text-gray-500 text-sm">
                        {t("advanceMode.subCategory.noData", "No subcategories found.")}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  subCategoryData.map((item) => (
                    <TableRow key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-4 py-2">
                        <Checkbox className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4" />
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <span className="text-xs font-medium">{item.name}</span>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-800 inline-block">
                          {item.code}
                        </code>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <span className="text-xs">{item.options?.length || 0} options</span>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          {item.products && item.products.length > 0 ? (
                            <>
                              {item.products.slice(0, 2).map((product: any, idx: number) => (
                                <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {product.name}
                                </span>
                              ))}
                              {item.products.length > 2 && (
                                <span className="text-xs text-gray-500">+{item.products.length - 2}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">No products linked</span>
                          )}
                          {item.category && (
                            <span className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-700">
                              {item.category.name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStatusToggle(item.id, item.status)}
                            disabled={statusMutation.isPending}
                            className={`w-10 h-5 rounded-full ${item.status === "Active" ? "bg-blue-600" : "bg-gray-300"} relative cursor-pointer transition-colors disabled:opacity-50`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${item.status === "Active" ? "right-0.5" : "left-0.5"}`}></div>
                          </button>
                          <span className="text-xs">{item.status}</span>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => {
                                setEditingSubcategory(item)
                                setIsEditModalOpen(true)
                              }}
                              className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5"
                              title={t("Edit")}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDuplicate(item.id)}
                              disabled={duplicateMutation.isPending}
                              className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5 disabled:opacity-50"
                              title={t("Copy")}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSubcategoryToDelete(item.id)
                                setDeleteDialogOpen(true)
                              }}
                              className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                              title={t("Delete")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSubcategoryToLink(item.id)
                                setLinkProductsDialogOpen(true)
                              }}
                              className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5"
                              title={t("advanceMode.subCategory.linkProduct", "Link Product")}
                            >
                              <LinkIcon className="h-3.5 w-3.5" />
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
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && subCategoryData.length > 0 && (
        <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {t("Showing")} {((currentPage - 1) * parseInt(entriesPerPage)) + 1} {t("to")} {Math.min(currentPage * parseInt(entriesPerPage), totalEntries)} {t("of")} {totalEntries} {t("entries")}
          </div>
          <div className="flex items-center space-x-1">
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              «
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
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
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Create Sub Category Modal */}
      <CreateSubCategoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreate}
      />

      {/* Edit Sub Category Modal */}
      <CreateSubCategoryModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingSubcategory(null)
        }}
        onSave={handleUpdate}
        editId={editingSubcategory?.id}
        editData={editingSubcategory}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("advanceMode.subCategory.confirmDelete", "Delete Subcategory")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("advanceMode.subCategory.deleteConfirmMessage", "Are you sure you want to delete this subcategory? This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("Deleting")}...
                </>
              ) : (
                t("Delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link Products Dialog */}
      <Dialog open={linkProductsDialogOpen} onOpenChange={setLinkProductsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("advanceMode.subCategory.linkProducts", "Link Products")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              {t("advanceMode.subCategory.selectProductsToLink", "Select products to link to this subcategory")}
            </p>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {/* Note: In a real implementation, you would fetch products from an API */}
              <p className="text-sm text-gray-500 italic">
                {t("advanceMode.subCategory.productSelectionNote", "Product selection interface would be implemented here")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkProductsDialogOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleLinkProducts}
              disabled={linkProductsMutation.isPending || selectedProducts.length === 0}
              className="bg-[#1162a8] hover:bg-[#0f5497]"
            >
              {linkProductsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("Linking")}...
                </>
              ) : (
                t("Link Products")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Categories Dialog */}
      <Dialog open={linkCategoriesDialogOpen} onOpenChange={setLinkCategoriesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("advanceMode.subCategory.linkCategories", "Link Categories")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              {t("advanceMode.subCategory.selectCategoriesToLink", "Select categories to link to this subcategory")}
            </p>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {/* Note: In a real implementation, you would fetch categories from an API */}
              <p className="text-sm text-gray-500 italic">
                {t("advanceMode.subCategory.categorySelectionNote", "Category selection interface would be implemented here")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkCategoriesDialogOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleLinkCategories}
              disabled={linkCategoriesMutation.isPending || selectedCategories.length === 0}
              className="bg-[#1162a8] hover:bg-[#0f5497]"
            >
              {linkCategoriesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("Linking")}...
                </>
              ) : (
                t("Link Categories")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
