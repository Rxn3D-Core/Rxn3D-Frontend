"use client"

import { useState } from "react"
import { Search, Plus, Settings2, Link as LinkIcon, Edit, Copy, Trash2, MoreVertical, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useTranslation } from "react-i18next"
import { useToast } from "@/hooks/use-toast"
import { AddFieldModal, LinkProductModal } from "@/components/advance-mode"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { 
  useAdvanceFields, 
  useCreateAdvanceField,
  useUpdateAdvanceField,
  useDeleteAdvanceField,
  useUpdateFieldStatus,
  useDuplicateAdvanceField,
  useAdvanceField,
  AdvanceField
} from "@/lib/api/advance-mode-query"
import { LoadingDots } from "@/components/ui/loading-dots"

export default function FieldsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc')
  const [orderBy, setOrderBy] = useState('name')
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false)
  const [editingField, setEditingField] = useState<AdvanceField | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; field: AdvanceField | null }>({ isOpen: false, field: null })
  const [linkProductModal, setLinkProductModal] = useState<{ isOpen: boolean; field: AdvanceField | null }>({ isOpen: false, field: null })

  // Fetch fields from API
  const { data, isLoading, isError, error, refetch } = useAdvanceFields({
    page: currentPage,
    per_page: parseInt(entriesPerPage),
    q: searchQuery || undefined,
    order_by: orderBy,
    sort_by: sortBy,
  })

  // Mutations
  const createFieldMutation = useCreateAdvanceField()
  const updateFieldMutation = useUpdateAdvanceField()
  const deleteFieldMutation = useDeleteAdvanceField()
  const updateStatusMutation = useUpdateFieldStatus()
  const duplicateFieldMutation = useDuplicateAdvanceField()

  const handleSort = (field: string) => {
    if (orderBy === field) {
      setSortBy(sortBy === 'asc' ? 'desc' : 'asc')
    } else {
      setOrderBy(field)
      setSortBy('asc')
    }
  }

  // Extract fields data - handle both direct array and paginated response
  // The API returns PaginatedResponse which has: { data: T[], total, last_page, ... }
  // But the response might be wrapped in { status, message, data: { data: [...], ... } }
  const fieldsData = (() => {
    if (!data) return []
    
    // If data.data exists and is an array, use it (standard paginated response)
    if (data.data && Array.isArray(data.data)) {
      return data.data
    }
    
    // If data itself is an array, use it directly
    if (Array.isArray(data)) {
      return data
    }
    
    // If data has a status wrapper, check nested data
    if (data.status && data.data) {
      const innerData = data.data
      if (Array.isArray(innerData.data)) {
        return innerData.data
      }
      if (Array.isArray(innerData)) {
        return innerData
      }
    }
    
    return []
  })()
  
  const totalPages = data?.last_page || data?.pagination?.last_page || data?.data?.last_page || 1
  const totalEntries = data?.total || data?.pagination?.total || data?.data?.total || 0

  // Handle edit
  const handleEdit = (field: AdvanceField) => {
    setEditingField(field)
    setIsAddFieldModalOpen(true)
  }

  // Handle delete
  const handleDeleteClick = (field: AdvanceField) => {
    setDeleteConfirmation({ isOpen: true, field })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.field) return
    
    try {
      await deleteFieldMutation.mutateAsync(deleteConfirmation.field.id)
      toast({
        title: "Success",
        description: "Field deleted successfully",
      })
      setDeleteConfirmation({ isOpen: false, field: null })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete field",
        variant: "destructive",
      })
    }
  }

  // Handle copy/duplicate
  const handleCopy = async (field: AdvanceField) => {
    try {
      await duplicateFieldMutation.mutateAsync(field.id)
      toast({
        title: "Success",
        description: "Field duplicated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate field",
        variant: "destructive",
      })
    }
  }

  // Handle status toggle
  const handleStatusToggle = async (field: AdvanceField) => {
    const newStatus = field.status === 'Active' ? 'Inactive' : 'Active'
    try {
      const customerId = typeof window !== 'undefined' ? localStorage.getItem('customerId') : null
      await updateStatusMutation.mutateAsync({
        id: field.id,
        status: newStatus,
        customer_id: customerId ? parseInt(customerId, 10) : undefined,
      })
      toast({
        title: "Success",
        description: `Field status updated to ${newStatus}`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update field status",
        variant: "destructive",
      })
    }
  }

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
              {t("advanceMode.fields.title", "Fields")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("advanceMode.fields.description", "Manage fields for advance mode")}
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
              onClick={() => setIsAddFieldModalOpen(true)}
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("advanceMode.fields.addFields", "Add fields")}
            </Button>
            <Button
              onClick={() => setLinkProductModal({ isOpen: true, field: null })}
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              {t("advanceMode.fields.linkProduct", "Link Product")}
            </Button>

            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder={t("advanceMode.fields.searchFields", "Search Fields")}
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
              {t("advanceMode.fields.error", "Failed to load fields. Please try again.")}
            </p>
            {error && <p className="text-red-500 text-xs mt-2">{String(error)}</p>}
          </div>
        )}

        {!isLoading && !isError && fieldsData.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">
              {t("advanceMode.fields.noData", "No fields found.")}
            </p>
          </div>
        )}

        {!isLoading && !isError && fieldsData.length > 0 && (
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
                  <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                    <div className="flex items-center gap-1">
                      {t("Subcategory")}
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
                      {t("Type")}
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                    <div className="flex items-center gap-1">
                      {t("Pricing")}
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                    <div className="flex items-center gap-1">
                      {t("Price")}
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
                {fieldsData.map((item) => (
                  <TableRow key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="pl-4 py-2">
                      <Checkbox className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4" />
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{item.name}</span>
                        {item.is_system_default === 'Yes' && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                            <path d="M13.3332 8.66664C13.3332 12 10.9998 13.6666 8.2265 14.6333C8.08128 14.6825 7.92353 14.6802 7.77984 14.6266C4.99984 13.6666 2.6665 12 2.6665 8.66664V3.99997C2.6665 3.82316 2.73674 3.65359 2.86177 3.52857C2.98679 3.40355 3.15636 3.33331 3.33317 3.33331C4.6665 3.33331 6.33317 2.53331 7.49317 1.51997C7.63441 1.39931 7.81407 1.33301 7.99984 1.33301C8.1856 1.33301 8.36527 1.39931 8.5065 1.51997C9.67317 2.53997 11.3332 3.33331 12.6665 3.33331C12.8433 3.33331 13.0129 3.40355 13.1379 3.52857C13.2629 3.65359 13.3332 3.82316 13.3332 3.99997V8.66664Z" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 8.00033L7.33333 9.33366L10 6.66699" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-xs">{item.advance_subcategory?.name || item.subcategory?.name || '-'}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-800 inline-block">
                        {item.code || '-'}
                      </code>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-xs">{item.field_type || '-'}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-xs">{item.charge_scope || '-'}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-xs font-medium">{item.price ? `$${item.price}` : '-'}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Show category/subcategory names */}
                          {(item.category?.name || item.advance_subcategory?.name || item.subcategory?.name) && (
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {item.category?.name || item.advance_subcategory?.name || item.subcategory?.name}
                            </span>
                          )}
                          {/* Show product count with popover */}
                          {((item.product_ids && item.product_ids.length > 0) || (item.products && item.products.length > 0)) ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors cursor-pointer">
                                  {item.product_ids?.length || item.products?.length || 0} product{(item.product_ids?.length || item.products?.length || 0) !== 1 ? 's' : ''}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80" align="start">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm text-gray-900 mb-2">Linked Products</h4>
                                  <div className="max-h-60 overflow-y-auto space-y-1">
                                    {item.products && item.products.length > 0 ? (
                                      item.products.map((product: any, idx: number) => (
                                        <div key={product.id || idx} className="text-xs text-gray-700 py-1 border-b border-gray-100 last:border-0">
                                          {product.name || `Product #${product.id || idx + 1}`}
                                        </div>
                                      ))
                                    ) : item.product_ids && item.product_ids.length > 0 ? (
                                      <div className="text-xs text-gray-500 italic">
                                        Product names not available. {item.product_ids.length} product{item.product_ids.length !== 1 ? 's' : ''} linked.
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : null}
                          {/* Show if no links */}
                          {(!item.product_ids || item.product_ids.length === 0) && 
                           (!item.products || item.products.length === 0) && 
                           !item.category?.name && 
                           !item.advance_subcategory?.name && 
                           !item.subcategory?.name && (
                            <span className="text-xs text-gray-400">No links</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setLinkProductModal({ isOpen: true, field: item })
                          }}
                          className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5"
                          title="Link Products"
                        >
                          <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-10 h-5 rounded-full ${item.status === "Active" ? "bg-blue-600" : "bg-gray-300"} relative cursor-pointer`}
                          onClick={() => handleStatusToggle(item)}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${item.status === "Active" ? "right-0.5" : "left-0.5"}`}></div>
                        </div>
                        <span className="text-xs">{item.status}</span>
                        <div className="flex items-center gap-1 ml-2">
                          <button 
                            onClick={() => handleEdit(item)}
                            className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleCopy(item)}
                            className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5"
                            title="Duplicate"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(item)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button className="text-gray-400 hover:text-gray-600 transition-colors p-0.5">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && fieldsData.length > 0 && (
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

      {/* Add/Edit Field Modal */}
      <AddFieldModal
        isOpen={isAddFieldModalOpen}
        onClose={() => {
          setIsAddFieldModalOpen(false)
          setEditingField(null)
        }}
        field={editingField}
        isEditing={!!editingField}
        onSave={async (data) => {
          console.log("Parent onSave called with data:", data, "editingField:", editingField)
          try {
            // Transform modal data to API format
            const fieldTypeMap: Record<string, string> = {
              'dropdown': 'dropdown',
              'radio': 'radio',
              'checkbox': 'checkbox',
              'number': 'number',
              'shade_guide': 'shade_guide',
              'text': 'text',
              'file_upload': 'file_upload',
              'multiline_text': 'multiline_text',
              'implant_library': 'implant_library',
            }

            // Map options - handle both modal format (label, status boolean) and API format (name, status string)
            // The modal now sends API format directly, so we need to handle both
            const options = data.options?.map((option: any, index: number) => {
              // Check if option is already in API format (has 'name' and 'status' as string)
              const isApiFormat = option.name !== undefined && (option.status === 'Active' || option.status === 'Inactive')
              
              if (isApiFormat) {
                // Already in API format, use it directly (but ensure all required fields are present)
                return {
                  ...(option.id ? { id: option.id } : {}),
                  name: option.name || '', // Ensure name is always present
                  image: option.image || undefined,
                  status: option.status || 'Active',
                  is_default: option.is_default || 'No',
                  price: option.price !== undefined ? (typeof option.price === 'number' ? option.price : parseFloat(option.price)) : undefined,
                  sequence: option.sequence || index + 1,
                }
              } else {
                // Modal format - transform to API format
                return {
                  ...(editingField && option.originalId && !isNaN(option.originalId) && option.originalId > 0 ? { id: option.originalId } : {}),
                  name: option.label || '', // Ensure name is always present
                  image: option.image || undefined,
                  status: option.status ? 'Active' as const : 'Inactive' as const,
                  is_default: option.isDefault ? 'Yes' as const : 'No' as const,
                  price: option.price ? parseFloat(option.price) : undefined,
                  sequence: index + 1,
                }
              }
            }) || []

            // Prepare API payload
            const payload: any = {
              name: data.fieldName,
              description: data.description || undefined,
              field_type: fieldTypeMap[data.fieldType] || data.fieldType,
              is_required: data.requiredField ? 'Yes' as const : 'No' as const,
              is_system_default: data.isSystemDefault ? 'Yes' as const : 'No' as const,
              has_additional_pricing: data.pricing?.canAddAdditionalCharges ? 'Yes' as const : 'No' as const,
              options: options.length > 0 ? options : undefined,
            }

            // Add pricing fields if applicable
            if (data.pricing?.canAddAdditionalCharges) {
              const chargeTypeMap: Record<string, string> = {
                'once': 'once_per_field',
                'per-option': 'per_selected_option',
              }
              payload.charge_type = chargeTypeMap[data.pricing.chargeType] || data.pricing.chargeType

              if (data.pricing.chargeType === 'once') {
                payload.price = data.pricing.additionalCharge ? parseFloat(data.pricing.additionalCharge) : 0
                
                // Convert form format (per-case, per-unit) to API format (per_case, per_tooth, etc.)
                const formChargeScope = data.pricing.chargeScope || 'per-case'
                const apiChargeScope = formChargeScope === 'per-unit' ? 'per_tooth' : formChargeScope.replace('-', '_')
                
                // Always include charge_scope when charge_type is 'once_per_field' (backend requires it)
                payload.charge_scope = apiChargeScope
              }
            }

            // Map category and subcategory
            if (data.category) {
              const categoryId = typeof data.category === 'number' ? data.category : parseInt(data.category, 10)
              if (!isNaN(categoryId)) {
                payload.advance_category_id = categoryId
              }
            }
            if (data.subCategory) {
              const subCategoryId = typeof data.subCategory === 'number' ? data.subCategory : parseInt(data.subCategory, 10)
              if (!isNaN(subCategoryId)) {
                payload.advance_subcategory_id = subCategoryId
              }
            }

            // Add image if provided
            if (data.image) {
              payload.image = data.image
            }

            if (editingField) {
              // Update existing field
              await updateFieldMutation.mutateAsync({
                id: editingField.id,
                ...payload,
              })
              // Refetch fields list to show updated data
              await refetch()
              toast({
                title: "Success",
                description: "Field updated successfully",
              })
              setIsAddFieldModalOpen(false)
              setEditingField(null)
            } else {
              // Create new field
              await createFieldMutation.mutateAsync(payload)
              // Refetch fields list to show new field
              await refetch()
              toast({
                title: "Success",
                description: "Field created successfully",
              })
              setIsAddFieldModalOpen(false)
              setEditingField(null)
            }
          } catch (error: any) {
            console.error("Error saving field:", error)
            
            // Extract error message from API response
            let errorMessage = `Failed to ${editingField ? 'update' : 'create'} field`
            
            if (error?.response?.data) {
              const errorData = error.response.data
              // Handle validation errors (422)
              if (errorData.errors && typeof errorData.errors === 'object') {
                // Get first error message from validation errors
                const firstErrorKey = Object.keys(errorData.errors)[0]
                const firstError = errorData.errors[firstErrorKey]
                if (Array.isArray(firstError) && firstError.length > 0) {
                  errorMessage = firstError[0]
                } else if (typeof firstError === 'string') {
                  errorMessage = firstError
                }
              } else if (errorData.error_description) {
                errorMessage = errorData.error_description
              } else if (errorData.message) {
                errorMessage = errorData.message
              }
            } else if (error?.message) {
              errorMessage = error.message
            }
            
            toast({
              title: "Error",
              description: errorMessage,
              variant: "destructive",
            })
            // Don't close modal on error so user can fix the issue
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, field: null })}
        onConfirm={handleConfirmDelete}
        itemName={deleteConfirmation.field?.name}
        isLoading={deleteFieldMutation.isPending}
        isCustomNo={deleteConfirmation.field?.is_system_default === 'Yes'}
      />

      {/* Link Product Modal */}
      <LinkProductModal
        isOpen={linkProductModal.isOpen}
        onClose={() => setLinkProductModal({ isOpen: false, field: null })}
        fieldId={linkProductModal.field?.id || null}
        context="lab"
      />
    </div>
  )
}
