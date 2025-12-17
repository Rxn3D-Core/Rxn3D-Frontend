"use client"

import { useState, useEffect, useRef, Suspense, lazy, useMemo } from "react"
import { Plus, Link as LinkIcon, Clock, Printer, Copy, MoreVertical, Zap, Edit, Trash2, Check, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useTranslation } from "react-i18next"
import { useCaseTracking } from "@/contexts/case-tracking-context"
import { useAuth } from "@/contexts/auth-context"
import { useCasePanTrackingLabelStore } from "@/stores/case-pan-tracking-label-store"
import { CaseTrackingSkeleton } from "./case-tracking-skeleton"

// Lazy load modals for better performance
const AddCasePanTrackingModal = lazy(() => 
  import("./add-case-pan-tracking-modal").then(module => ({ default: module.AddCasePanTrackingModal }))
)
const DuplicateCasePanModal = lazy(() => 
  import("./duplicate-case-pan-modal").then(module => ({ default: module.DuplicateCasePanModal }))
)
const LinkProductModal = lazy(() => 
  import("./link-product-modal").then(module => ({ default: module.LinkProductModal }))
)
const HistoryModal = lazy(() => 
  import("./history-modal").then(module => ({ default: module.HistoryModal }))
)
const ReprintSlipsModal = lazy(() => 
  import("./reprint-slips-modal").then(module => ({ default: module.ReprintSlipsModal }))
)
const ChangeRushGroupModal = lazy(() => 
  import("./change-rush-group-modal").then(module => ({ default: module.ChangeRushGroupModal }))
)

export function CaseTrackingPage() {
  const { t } = useTranslation()
  const { 
    casePans, 
    fetchCasePans, 
    deleteCasePan, 
    updateCasePan,
    toggleRushGroup,
    toggleCasePanColorCode,
    currentRushGroup,
    isLoading
  } = useCaseTracking()
  const { user: authUser } = useAuth()

  const defaultLabel = t("caseTracking.casePanTrackingSystem", "Case Pan Tracking System")
  const { label: customLabel, setLabel: setCustomLabel } = useCasePanTrackingLabelStore()
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [editLabelValue, setEditLabelValue] = useState(customLabel)
  const labelInputRef = useRef<HTMLInputElement>(null)

  // Initialize label with translated default on first mount if using hardcoded default
  useEffect(() => {
    if (customLabel === "Case Pan Tracking System") {
      setCustomLabel(defaultLabel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Update editLabelValue when customLabel changes
  useEffect(() => {
    if (!isEditingLabel) {
      setEditLabelValue(customLabel)
    }
  }, [customLabel, isEditingLabel])

  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("") // For debounced search
  const [showEntries, setShowEntries] = useState("20")
  const [currentPage, setCurrentPage] = useState(1)
  const [enableColorCoding, setEnableColorCoding] = useState(true)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  
  // Get role from localStorage
  const getUserRole = (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("role")
  }
  
  const userRole = getUserRole()
  const isSuperAdmin = userRole === "superadmin"
  
  // Get customer ID helper
  const getCustomerId = (): number | null => {
    if (typeof window === "undefined") return null
    const storedCustomerId = localStorage.getItem("customerId")
    if (storedCustomerId) return parseInt(storedCustomerId, 10)
    if (authUser?.customers && authUser.customers.length > 0) return authUser.customers[0].id
    if (authUser?.customer_id) return authUser.customer_id
    if (authUser?.customer?.id) return authUser.customer.id
    return null
  }

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [isLinkProductModalOpen, setIsLinkProductModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false)
  const [isChangeRushModalOpen, setIsChangeRushModalOpen] = useState(false)
  const [selectedCasePan, setSelectedCasePan] = useState<any>(null)

  // Selected items for bulk actions
  const [selectedItems, setSelectedItems] = useState<number[]>([])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput)
        setCurrentPage(1) // Reset to first page when searching
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput, searchQuery])

  // Track if we've already fetched on mount to prevent duplicate calls
  const hasFetchedRef = useRef(false)
  
  useEffect(() => {
    if (!hasFetchedRef.current) {
      const customerId = getCustomerId()
      fetchCasePans(customerId || undefined)
      hasFetchedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus()
      labelInputRef.current.select()
    }
  }, [isEditingLabel])

  const handleStartEditLabel = () => {
    setEditLabelValue(customLabel)
    setIsEditingLabel(true)
  }

  const handleSaveLabel = () => {
    const trimmedValue = editLabelValue.trim()
    if (trimmedValue) {
      setCustomLabel(trimmedValue)
    } else {
      setEditLabelValue(customLabel)
    }
    setIsEditingLabel(false)
  }

  const handleCancelEditLabel = () => {
    setEditLabelValue(customLabel)
    setIsEditingLabel(false)
  }

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveLabel()
    } else if (e.key === "Escape") {
      handleCancelEditLabel()
    }
  }

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // New column, default to ascending
      setSortColumn(column)
      setSortDirection("asc")
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  // Filter and sort case pans based on search query and sort settings
  const filteredCasePans = useMemo(() => {
    let filtered = casePans.filter((pan) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        pan.name.toLowerCase().includes(query) ||
        pan.code.toLowerCase().includes(query)
      )
    })

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any
        let bValue: any

        switch (sortColumn) {
          case "name":
            aValue = a.name?.toLowerCase() || ""
            bValue = b.name?.toLowerCase() || ""
            break
          case "code":
            aValue = a.code?.toLowerCase() || ""
            bValue = b.code?.toLowerCase() || ""
            break
          case "quantity":
            aValue = a.quantity || 0
            bValue = b.quantity || 0
            break
          case "status":
            aValue = a.status || ""
            bValue = b.status || ""
            break
          case "availableCodes":
            aValue = a.availableCodes?.used || 0
            bValue = b.availableCodes?.used || 0
            break
          default:
            return 0
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [casePans, searchQuery, sortColumn, sortDirection])

  // Calculate pagination
  const entriesPerPage = parseInt(showEntries) || 20
  const totalPages = Math.ceil(filteredCasePans.length / entriesPerPage)
  const startIndex = (currentPage - 1) * entriesPerPage
  const endIndex = startIndex + entriesPerPage
  const displayedCasePans = filteredCasePans.slice(startIndex, endIndex)
  
  // Calculate display range
  const startEntry = filteredCasePans.length > 0 ? startIndex + 1 : 0
  const endEntry = Math.min(endIndex, filteredCasePans.length)

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Reset to page 1 when entries per page changes
  const handleEntriesPerPageChange = (value: string) => {
    setShowEntries(value)
    setCurrentPage(1)
  }

  const handleToggleSelect = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedItems.length === displayedCasePans.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(displayedCasePans.map((cp) => cp.id))
    }
  }

  const handleEdit = (casePan: any) => {
    setSelectedCasePan(casePan)
    setIsEditModalOpen(true)
  }

  const handleDuplicate = (casePan: any) => {
    setSelectedCasePan(casePan)
    setIsDuplicateModalOpen(true)
  }

  const handleLinkProduct = (casePan: any) => {
    setSelectedCasePan(casePan)
    setIsLinkProductModalOpen(true)
  }

  const handleHistory = (casePan: any) => {
    setSelectedCasePan(casePan)
    setIsHistoryModalOpen(true)
  }

  const handleReprint = (casePan: any) => {
    setSelectedCasePan(casePan)
    setIsReprintModalOpen(true)
  }

  const handleToggleRushGroup = async (casePan: any) => {
    const customerId = getCustomerId()
    if (!customerId) {
      alert(t("caseTracking.customerIdRequired", "Customer ID is required"))
      return
    }
    await toggleRushGroup(casePan.id, customerId)
  }

  const handleToggleColorCoding = async () => {
    const customerId = getCustomerId()
    if (!customerId) {
      alert(t("caseTracking.customerIdRequired", "Customer ID is required"))
      return
    }
    try {
      await toggleCasePanColorCode(customerId)
      // The toggle will update the state, but we need to refresh the list
      fetchCasePans(customerId)
    } catch (error) {
      // Error is already handled in the context
    }
  }

  const handleToggleStatus = async (casePan: any) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        alert(t("caseTracking.authenticationRequired", "Authentication required"))
        return
      }

      const customerId = getCustomerId()
      
      // Convert status to lowercase for API
      const newStatus = casePan.status === "Active" ? "inactive" : "active"
      
      // Build request body
      const requestBody: { status: string; customer_id?: number } = {
        status: newStatus
      }
      
      // Include customer_id if not superadmin (required for labs)
      if (!isSuperAdmin) {
        if (!customerId) {
          alert(t("caseTracking.customerIdRequired", "Customer ID is required"))
          return
        }
        requestBody.customer_id = customerId
      } else if (customerId) {
        // Super admin can optionally specify customer_id
        requestBody.customer_id = customerId
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"
      const response = await fetch(`${API_BASE_URL}/library/case-pans/${casePan.id}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.message || t("caseTracking.failedToUpdateStatus", "Failed to update status")
        alert(errorMsg)
        return
      }

      // Refresh the case pans list
      await fetchCasePans(customerId || undefined)
    } catch (error: any) {
      console.error("Error updating case pan status:", error)
      alert(error.message || t("caseTracking.failedToUpdateStatus", "Failed to update status"))
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm(t("caseTracking.confirmDelete", "Are you sure you want to delete this case pan?"))) {
      await deleteCasePan(id)
    }
  }

  const getAvailabilityBar = (used: number, total: number, overcapacity?: boolean, full?: boolean) => {
    const percentage = Math.min((used / total) * 100, 100)
    let colorClass = "bg-green-500"
    if (overcapacity) colorClass = "bg-red-500"
    else if (full) colorClass = "bg-red-500"
    else if (percentage > 70) colorClass = "bg-yellow-500"

    return (
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${colorClass} transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
          {used} / {total}
        </span>
      </div>
    )
  }

  // Render sort icon for a column
  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-gray-400" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1 text-gray-700" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1 text-gray-700" />
    )
  }

  return (
    <div className="flex-1 bg-gray-50 p-6">
      <div className="bg-white rounded-lg border">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isEditingLabel ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={labelInputRef}
                  value={editLabelValue}
                  onChange={(e) => setEditLabelValue(e.target.value)}
                  onKeyDown={handleLabelKeyDown}
                  onBlur={handleSaveLabel}
                  className="text-xl font-semibold h-9 w-auto min-w-[300px]"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={handleSaveLabel}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleCancelEditLabel}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-semibold">{customLabel}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={handleStartEditLabel}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {!isSuperAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-sm">{t("caseTracking.enableColorCoding", "Enable Color Coding")}</span>
              <Switch
                checked={enableColorCoding}
                onCheckedChange={(checked) => {
                  setEnableColorCoding(checked)
                  if (checked !== enableColorCoding) {
                    handleToggleColorCoding()
                  }
                }}
                className="data-[state=checked]:bg-[#1162a8]"
              />
            </div>
          )}
        </div>

        {/* Current Rush Group Banner */}
        {currentRushGroup && (
          <div className="px-6 py-3 border-b flex items-center">
            <div
              style={{
                boxSizing: "border-box",
                minWidth: "316px",
                height: "34px",
                background: "rgba(255, 213, 79, 0.125)",
                border: "0.769231px solid #FFD54F",
                borderRadius: "8px",
                position: "relative",
                display: "flex",
                alignItems: "center",
                paddingLeft: "32.75px",
                paddingRight: "12px",
              }}
            >
              <Zap
                style={{
                  width: "12px",
                  height: "12px",
                  position: "absolute",
                  left: "12.76px",
                  color: "#F57F17",
                  fill: "#F57F17",
                  stroke: "#F57F17",
                  strokeWidth: 1,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "Verdana",
                  fontStyle: "normal",
                  fontWeight: 400,
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "#F57F17",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
              {t("caseTracking.currentRushGroup", "Current Rush Group")}: {currentRushGroup}
            </span>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsAddModalOpen(true)} className="bg-[#1162a8] hover:bg-[#0f5490]">
              <Plus className="h-4 w-4 mr-2" />
              {t("caseTracking.addCasePan", "Add Case Pan")}
            </Button>
            <Button variant="outline" onClick={() => setIsLinkProductModalOpen(true)}>
              <LinkIcon className="h-4 w-4 mr-2" />
              {t("caseTracking.linkProduct", "Link Product")}
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">{t("caseTracking.searchProduct", "Search Product")}</span>
              <Input
                placeholder={t("caseTracking.search", "Search...")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">{t("caseTracking.show", "Show")}</span>
              <Select value={showEntries} onValueChange={handleEntriesPerPageChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm">{t("caseTracking.entries", "entries")}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <CaseTrackingSkeleton />
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <Checkbox
                      checked={selectedItems.length === displayedCasePans.length && displayedCasePans.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      {t("caseTracking.casePanNames", "Case Pan Names")}
                      {renderSortIcon("name")}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("code")}
                  >
                    <div className="flex items-center">
                      {t("caseTracking.code", "Code")}
                      {renderSortIcon("code")}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("quantity")}
                  >
                    <div className="flex items-center">
                      {t("caseTracking.quantity", "Quantity")}
                      {renderSortIcon("quantity")}
                    </div>
                  </th>
                  {enableColorCoding && (
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      {t("caseTracking.color", "Color")}
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    {t("caseTracking.linkedCategoryProducts", "Linked Category / Products")}
                  </th>
                  {!isSuperAdmin && (
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("availableCodes")}
                    >
                      <div className="flex items-center">
                        {t("caseTracking.availableCodes", "Available Codes")}
                        {renderSortIcon("availableCodes")}
                      </div>
                    </th>
                  )}
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center">
                      {t("caseTracking.status", "Status")}
                      {renderSortIcon("status")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    {t("caseTracking.actions", "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedCasePans.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? (enableColorCoding ? 8 : 7) : (enableColorCoding ? 9 : 8)} className="px-4 py-8 text-center text-gray-500">
                      {t("caseTracking.noCasePans", "No case pans found")}
                    </td>
                  </tr>
                ) : (
                  displayedCasePans.map((casePan, index) => (
                  <tr
                    key={casePan.id}
                    className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${
                      casePan.status !== "Active" ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedItems.includes(casePan.id)}
                        onCheckedChange={() => handleToggleSelect(casePan.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{casePan.name}</span>
                        {casePan.isRushGroup && (
                          <Zap className="h-4 w-4 text-yellow-600 fill-yellow-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono">
                        {casePan.code}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{casePan.quantity || 0}</td>
                    {enableColorCoding && (
                      <td className="px-4 py-3">
                        {casePan.color_code && (
                          <div
                            className="w-12 h-8 rounded border"
                            style={{ backgroundColor: casePan.color_code }}
                          />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {casePan.connected_items && casePan.connected_items.length > 0 ? (
                          <>
                            {casePan.connected_items.slice(0, 2).map((item, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {item.length > 15 ? `${item.substring(0, 15)}...` : item}
                              </Badge>
                            ))}
                            {casePan.connected_items.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{casePan.connected_items.length - 2}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">
                            {t("caseTracking.noLinkedItems", "No linked items")}
                          </span>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => handleLinkProduct(casePan)}
                        >
                          <LinkIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    {!isSuperAdmin && (
                      <td className="px-4 py-3">
                        {casePan.availableCodes?.overcapacity && (
                          <Badge className="bg-red-100 text-red-700 border-red-300 mb-1">
                            <span className="text-red-600">⚠</span> Overcapacity
                          </Badge>
                        )}
                        {getAvailabilityBar(
                          casePan.availableCodes?.used || 0,
                          casePan.availableCodes?.total || casePan.quantity || 0,
                          casePan.availableCodes?.overcapacity,
                          casePan.availableCodes?.full
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Switch
                        checked={casePan.status === "Active"}
                        onCheckedChange={() => handleToggleStatus(casePan)}
                        className="data-[state=checked]:bg-[#1162a8]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleHistory(casePan)}
                          title={t("caseTracking.history", "History")}
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleReprint(casePan)}
                          title={t("caseTracking.reprint", "Reprint")}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDuplicate(casePan)}
                          title={t("caseTracking.duplicate", "Duplicate")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(casePan)}>
                            <Edit className="h-4 w-4 mr-2" />
                              {t("caseTracking.editGroup", "Edit Group")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleRushGroup(casePan)}>
                            {casePan.isRushGroup ? (
                              <>
                                  <Zap className="h-4 w-4 mr-2" />
                                  {t("caseTracking.unsetAsRushGroup", "Unset as Rush Group")}
                              </>
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-2" />
                                {t("caseTracking.setAsRushGroup", "Set as Rush Group")}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(casePan.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                              {t("caseTracking.deleteGroup", "Delete Group")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && filteredCasePans.length > 0 && (
          <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 order-2 sm:order-1">
              {t("caseTracking.showing", "Showing")} {startEntry} {t("caseTracking.to", "to")} {endEntry} {t("caseTracking.of", "of")} {filteredCasePans.length} {t("caseTracking.entries", "entries")}
            </div>
            <div className="flex items-center space-x-1 order-1 sm:order-2">
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                «
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1
                if (totalPages > 5) {
                  if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                }
                return (
                  <button
                    key={pageNum}
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                      pageNum === currentPage 
                        ? "bg-[#1162a8] text-white" 
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals with Suspense for lazy loading */}
      <Suspense fallback={null}>
        <AddCasePanTrackingModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          mode="add"
        />
        <AddCasePanTrackingModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedCasePan(null)
          }}
          editData={selectedCasePan}
          mode="edit"
        />
        <DuplicateCasePanModal
          isOpen={isDuplicateModalOpen}
          onClose={() => {
            setIsDuplicateModalOpen(false)
            setSelectedCasePan(null)
          }}
          sourceData={selectedCasePan}
        />
        <LinkProductModal
          isOpen={isLinkProductModalOpen}
          onClose={() => {
            setIsLinkProductModalOpen(false)
            setSelectedCasePan(null)
          }}
          casePanId={selectedCasePan?.id}
          casePanName={selectedCasePan?.name}
        />
        <HistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false)
            setSelectedCasePan(null)
          }}
          casePanId={selectedCasePan?.id}
          casePanName={selectedCasePan?.name}
          prefix={selectedCasePan?.code}
        />
        <ReprintSlipsModal
          isOpen={isReprintModalOpen}
          onClose={() => {
            setIsReprintModalOpen(false)
            setSelectedCasePan(null)
          }}
          casePanId={selectedCasePan?.id}
          casePanName={selectedCasePan?.name}
          prefix={selectedCasePan?.code}
        />
        <ChangeRushGroupModal
          isOpen={isChangeRushModalOpen}
          onClose={() => {
            setIsChangeRushModalOpen(false)
            setSelectedCasePan(null)
          }}
          casePanId={selectedCasePan?.id}
          casePanName={selectedCasePan?.name}
          prefix={selectedCasePan?.code}
          onConfirm={async () => {
            const customerId = getCustomerId()
            if (customerId && selectedCasePan) {
              await toggleRushGroup(selectedCasePan.id, customerId)
            }
          }}
        />
      </Suspense>
    </div>
  )
}
