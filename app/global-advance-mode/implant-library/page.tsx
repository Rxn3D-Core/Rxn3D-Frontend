"use client"

import { useState } from "react"
import { Search, Plus, Settings2, Link as LinkIcon, Edit, Copy, Trash2, MoreVertical, ArrowUpDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "react-i18next"
import { AddImplantModal, LinkImplantModal } from "@/components/advance-mode"
import { useImplants, useUpdateImplantStatus, useDeleteImplant, useCreateImplant, useUpdateImplant, useDuplicateImplant, useLinkImplantProducts, useImplant } from "@/lib/api/advance-mode-query"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/lib/performance-utils"

export default function ImplantLibraryPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc')
  const [orderBy, setOrderBy] = useState('brand_name')
  const [isAddImplantModalOpen, setIsAddImplantModalOpen] = useState(false)
  const [isLinkImplantModalOpen, setIsLinkImplantModalOpen] = useState(false)
  const [editingImplantId, setEditingImplantId] = useState<number | null>(null)
  const [linkingImplantId, setLinkingImplantId] = useState<number | null>(null)

  // Debounce search query to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Fetch implants from API
  const { data, isLoading, isError, refetch: refetchImplants } = useImplants({
    page: currentPage,
    per_page: parseInt(entriesPerPage),
    q: debouncedSearchQuery || undefined,
    order_by: orderBy,
    sort_by: sortBy,
  })

  const updateStatusMutation = useUpdateImplantStatus()
  const deleteImplantMutation = useDeleteImplant()
  const createImplantMutation = useCreateImplant()
  const updateImplantMutation = useUpdateImplant()
  const duplicateImplantMutation = useDuplicateImplant()
  const linkProductsMutation = useLinkImplantProducts()
  const { data: editingImplantData } = useImplant(editingImplantId || 0)

  const handleStatusToggle = async (id: number, currentStatus: 'Active' | 'Inactive') => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active'
    updateStatusMutation.mutate(
      { id, status: newStatus },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: `Implant status updated to ${newStatus}`,
          })
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to update implant status",
            variant: "destructive",
          })
        },
      }
    )
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("advanceMode.implantLibrary.confirmDelete", "Are you sure you want to delete this implant?"))) {
      return
    }

    deleteImplantMutation.mutate(id, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Implant deleted successfully",
        })
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete implant",
          variant: "destructive",
        })
      },
    })
  }

  const handleEdit = (id: number) => {
    setEditingImplantId(id)
    setIsAddImplantModalOpen(true)
  }

  const handleCopy = (id: number) => {
    duplicateImplantMutation.mutate(id, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Implant duplicated successfully",
        })
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to duplicate implant",
          variant: "destructive",
        })
      },
    })
  }

  const handleLinkProducts = (id: number) => {
    setLinkingImplantId(id)
    setIsLinkImplantModalOpen(true)
  }

  const handleSort = (field: string) => {
    if (orderBy === field) {
      setSortBy(sortBy === 'asc' ? 'desc' : 'asc')
    } else {
      setOrderBy(field)
      setSortBy('asc')
    }
  }

  const implantData = data?.data || []
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
              {t("advanceMode.implantLibrary.title", "Implant Library")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("advanceMode.implantLibrary.description", "Manage implant systems and brands")}
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
              onClick={() => setIsAddImplantModalOpen(true)}
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("advanceMode.implantLibrary.addImplants", "Add Implants")}
            </Button>
            <Button
              onClick={() => setIsLinkImplantModalOpen(true)}
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              {t("advanceMode.implantLibrary.linkProduct", "Link Product")}
            </Button>

            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder={t("advanceMode.implantLibrary.searchFields", "Search Fields")}
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
            <Loader2 className="h-8 w-8 animate-spin text-[#1162a8]" />
          </div>
        )}

        {isError && (
          <div className="p-8 text-center">
            <p className="text-red-600 text-sm">
              {t("advanceMode.implantLibrary.error", "Failed to load implants. Please try again.")}
            </p>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <Table className="w-full text-xs">
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                  <TableHead className="w-10 pl-4 py-2">
                    <Checkbox className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4" />
                  </TableHead>
                  <TableHead
                    className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors"
                    onClick={() => handleSort('brand_name')}
                  >
                    <div className="flex items-center gap-1">
                      {t("Brand")}
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors"
                    onClick={() => handleSort('system_name')}
                  >
                    <div className="flex items-center gap-1">
                      {t("System")}
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                  <div className="flex items-center gap-1">
                    {t("Platform")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                  <div className="flex items-center gap-1">
                    {t("Size")}
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
                    {t("Status")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {implantData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      {t("advanceMode.implantLibrary.noData", "No Implant Found")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                implantData.map((item, index) => (
                <TableRow key={item.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${index === 0 ? "bg-blue-50/30" : ""}`}>
                  <TableCell className="pl-4 py-2">
                    <Checkbox className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4" />
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">{item.brand_name}</span>
                      {item.brand_name === 'Other' && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                          <path d="M13.3332 8.66664C13.3332 12 10.9998 13.6666 8.2265 14.6333C8.08128 14.6825 7.92353 14.6802 7.77984 14.6266C4.99984 13.6666 2.6665 12 2.6665 8.66664V3.99997C2.6665 3.82316 2.73674 3.65359 2.86177 3.52857C2.98679 3.40355 3.15636 3.33331 3.33317 3.33331C4.6665 3.33331 6.33317 2.53331 7.49317 1.51997C7.63441 1.39931 7.81407 1.33301 7.99984 1.33301C8.1856 1.33301 8.36527 1.39931 8.5065 1.51997C9.67317 2.53997 11.3332 3.33331 12.6665 3.33331C12.8433 3.33331 13.0129 3.40355 13.1379 3.52857C13.2629 3.65359 13.3332 3.82316 13.3332 3.99997V8.66664Z" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 8.00033L7.33333 9.33366L10 6.66699" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <span className="text-xs">{item.system_name || '-'}</span>
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <span className="text-xs">{item.platforms?.length || 0} platforms</span>
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <span className="text-xs">-</span>
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <span className="text-xs">{item.price ? `$${item.price}` : '-'}</span>
                  </TableCell>
                  <TableCell className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-10 h-5 rounded-full ${item.status === "Active" ? "bg-blue-600" : "bg-gray-300"} relative cursor-pointer`}
                        onClick={() => handleStatusToggle(item.id, item.status)}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${item.status === "Active" ? "right-0.5" : "left-0.5"}`}></div>
                      </div>
                      <span className="text-xs">{item.status}</span>
                      <div className="flex items-center gap-1 ml-2">
                        <button 
                          className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5"
                          onClick={() => handleEdit(item.id)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5"
                          onClick={() => handleCopy(item.id)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                          onClick={() => handleDelete(item.id)}
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && implantData.length > 0 && (
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

      {/* Add/Edit Implant Modal */}
      <AddImplantModal
        isOpen={isAddImplantModalOpen}
        onClose={() => {
          setIsAddImplantModalOpen(false)
          setEditingImplantId(null)
        }}
        implant={editingImplantId && editingImplantData?.data ? editingImplantData.data : null}
        isEditMode={!!editingImplantId}
        isSaving={createImplantMutation.isPending || updateImplantMutation.isPending}
        onSave={(data) => {
          if (editingImplantId) {
            // Update existing implant
            updateImplantMutation.mutate(
              { id: editingImplantId, ...data },
              {
                onSuccess: () => {
                  toast({
                    title: "Success",
                    description: "Implant updated successfully",
                  })
                  setIsAddImplantModalOpen(false)
                  setEditingImplantId(null)
                  // Refetch the implants list
                  refetchImplants()
                },
                onError: (error: any) => {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to update implant",
                    variant: "destructive",
                  })
                },
              }
            )
          } else {
            // Create new implant
            createImplantMutation.mutate(data, {
              onSuccess: () => {
                toast({
                  title: "Success",
                  description: "Implant created successfully",
                })
                setIsAddImplantModalOpen(false)
                // Refetch the implants list
                refetchImplants()
              },
              onError: (error: any) => {
                toast({
                  title: "Error",
                  description: error.message || "Failed to create implant",
                  variant: "destructive",
                })
              },
            })
          }
        }}
      />

      {/* Link Implant Modal */}
      <LinkImplantModal
        isOpen={isLinkImplantModalOpen}
        onClose={() => {
          setIsLinkImplantModalOpen(false)
          setLinkingImplantId(null)
        }}
        context="global"
        implantId={linkingImplantId}
        onApply={(selectedImplants, selectedProducts) => {
          const implantsToLink = linkingImplantId ? [linkingImplantId] : selectedImplants
          
          if (implantsToLink.length === 0) {
            toast({
              title: "Error",
              description: "Please select at least one implant",
              variant: "destructive",
            })
            return
          }

          if (selectedProducts.length === 0) {
            toast({
              title: "Error",
              description: "Please select at least one product",
              variant: "destructive",
            })
            return
          }

          // Link products to each selected implant
          const linkPromises = implantsToLink.map(implantId =>
            linkProductsMutation.mutateAsync(
              { id: implantId, product_ids: selectedProducts },
            )
          )

          Promise.all(linkPromises)
            .then(() => {
              toast({
                title: "Success",
                description: `Products linked to ${implantsToLink.length} implant(s) successfully`,
              })
              setIsLinkImplantModalOpen(false)
              setLinkingImplantId(null)
            })
            .catch((error: any) => {
              toast({
                title: "Error",
                description: error.message || "Failed to link products",
                variant: "destructive",
              })
            })
        }}
      />
    </div>
  )
}
