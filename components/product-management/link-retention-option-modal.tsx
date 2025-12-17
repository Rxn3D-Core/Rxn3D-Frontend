"use client"

import { useState, useEffect } from "react"
import { X, Search, Loader2, ChevronLeft, ChevronRight, Link as LinkIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  getRetentionOptions,
} from "@/services/retention-options-api"
import {
  getRetentionsWithRetentionOptions,
  linkRetentionsWithRetentionOptions,
} from "@/services/retentions-api"

interface LinkRetentionOptionModalProps {
  isOpen: boolean
  onClose: () => void
  onApply?: (selectedRetentionTypes: number[], selectedRetentionOptions: number[]) => void
}

interface RetentionType {
  id: number
  name: string
  code: string
  status: string
  retention_options?: Array<{
    id: number
    name: string
    image_url: string | null
    status: "Active" | "Inactive"
    sequence: number
    link_id: number | null
    is_lab_specific: boolean
  }>
}

interface RetentionOption {
  id: number
  name: string
  code?: string
  status: string
  retention_id?: number
}

// Helper function to get customer ID
const getCustomerId = (user: any): number | null => {
  if (typeof window === "undefined") return null
  
  const storedCustomerId = localStorage.getItem("customerId")
  if (storedCustomerId) {
    return parseInt(storedCustomerId, 10)
  }

  if (user?.customers && user.customers.length > 0) {
    return user.customers[0].id
  }

  if (user?.customer_id) {
    return user.customer_id
  }

  if (user?.customer?.id) {
    return user.customer.id
  }

  return null
}

export function LinkRetentionOptionModal({ isOpen, onClose, onApply }: LinkRetentionOptionModalProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRetentionTypes, setSelectedRetentionTypes] = useState<number[]>([])
  const [selectedRetentionOptions, setSelectedRetentionOptions] = useState<number[]>([])
  
  // Data states
  const [retentionTypes, setRetentionTypes] = useState<RetentionType[]>([])
  const [retentionOptions, setRetentionOptions] = useState<RetentionOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  
  // Pagination states
  const [retentionTypesPage, setRetentionTypesPage] = useState(1)
  const [retentionTypesPagination, setRetentionTypesPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 })
  const [retentionOptionsPage, setRetentionOptionsPage] = useState(1)
  const [retentionOptionsPagination, setRetentionOptionsPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 })

  // Fetch all data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAllData()
    } else {
      // Reset state when modal closes
      setSearchQuery("")
      setSelectedRetentionTypes([])
      setSelectedRetentionOptions([])
      setRetentionTypesPage(1)
      setRetentionOptionsPage(1)
    }
  }, [isOpen])

  const fetchAllData = async () => {
    setIsLoadingData(true)
    try {
      const customerId = getCustomerId(user)
      
      // Fetch all data in parallel
      await Promise.all([
        fetchRetentionTypes(customerId, 1),
        fetchRetentionOptions(customerId, 1),
      ])
    } catch (error: any) {
      toast({
        title: t("error") || "Error",
        description: error.message || t("Failed to fetch data", "Failed to fetch data"),
        variant: "destructive",
      })
    } finally {
      setIsLoadingData(false)
    }
  }

  const fetchRetentionTypes = async (customerId: number | null, page: number = 1) => {
    try {
      const response = await getRetentionsWithRetentionOptions({
        q: searchQuery || undefined,
        status: "Active",
        customer_id: customerId || undefined,
        per_page: 10,
        page,
      })

      if (response.status && response.data) {
        const retentionTypesList = response.data.data || []
        const pagination = response.data.pagination || { current_page: 1, last_page: 1, total: 0, per_page: 10 }
        setRetentionTypes(retentionTypesList)
        setRetentionTypesPagination(pagination)
      }
    } catch (error: any) {
      console.error("Error fetching retention types:", error)
      toast({
        title: t("error") || "Error",
        description: error.message || t("Failed to fetch retention types", "Failed to fetch retention types"),
        variant: "destructive",
      })
      setRetentionTypes([])
      setRetentionTypesPagination({ current_page: 1, last_page: 1, total: 0, per_page: 10 })
    }
  }

  const fetchRetentionOptions = async (customerId: number | null, page: number = 1) => {
    try {
      const response = await getRetentionOptions({
        q: searchQuery || undefined,
        status: "Active",
        customer_id: customerId || undefined,
        per_page: 10,
        page,
      })

      if (response.status && response.data) {
        const retentionOptionsList = response.data.data || []
        const pagination = response.data.pagination || { current_page: 1, last_page: 1, total: 0, per_page: 10 }
        setRetentionOptions(retentionOptionsList)
        setRetentionOptionsPagination(pagination)
      }
    } catch (error: any) {
      console.error("Error fetching retention options:", error)
      toast({
        title: t("error") || "Error",
        description: error.message || t("Failed to fetch retention options", "Failed to fetch retention options"),
        variant: "destructive",
      })
      setRetentionOptions([])
      setRetentionOptionsPagination({ current_page: 1, last_page: 1, total: 0, per_page: 10 })
    }
  }

  // Reset to page 1 when search query changes
  useEffect(() => {
    setRetentionTypesPage(1)
    setRetentionOptionsPage(1)
  }, [searchQuery])

  // Fetch data when page changes or search query changes
  useEffect(() => {
    if (!isOpen) return
    
    const customerId = getCustomerId(user)

    const debounceTimer = setTimeout(() => {
      fetchRetentionTypes(customerId, retentionTypesPage)
      fetchRetentionOptions(customerId, retentionOptionsPage)
    }, searchQuery ? 500 : 0)

    return () => clearTimeout(debounceTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retentionTypesPage, retentionOptionsPage, searchQuery, isOpen])

  const handleRetentionTypeToggle = (id: number) => {
    setSelectedRetentionTypes(prev =>
      prev.includes(id) ? prev.filter(typeId => typeId !== id) : [...prev, id]
    )
  }

  const handleRetentionOptionToggle = (id: number) => {
    setSelectedRetentionOptions(prev =>
      prev.includes(id) ? prev.filter(optionId => optionId !== id) : [...prev, id]
    )
  }

  const handleSelectAllRetentionTypes = () => {
    if (selectedRetentionTypes.length === retentionTypes.length) {
      setSelectedRetentionTypes([])
    } else {
      setSelectedRetentionTypes(retentionTypes.map(type => type.id))
    }
  }

  const handleClearAllRetentionTypes = () => {
    setSelectedRetentionTypes([])
  }

  const handleSelectAllRetentionOptions = () => {
    if (selectedRetentionOptions.length === retentionOptions.length) {
      setSelectedRetentionOptions([])
    } else {
      setSelectedRetentionOptions(retentionOptions.map(option => option.id))
    }
  }

  const handleClearAllRetentionOptions = () => {
    setSelectedRetentionOptions([])
  }

  const handleApply = async () => {
    if (selectedRetentionTypes.length === 0) {
      toast({
        title: t("error") || "Error",
        description: t("Please select at least one retention type", "Please select at least one retention type"),
        variant: "destructive",
      })
      return
    }

    if (selectedRetentionOptions.length === 0) {
      toast({
        title: t("error") || "Error",
        description: t("Please select at least one retention option", "Please select at least one retention option"),
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const customerId = getCustomerId(user)
      
      // Prepare payload for linking API
      const payload = {
        ...(customerId ? { customer_id: customerId } : {}),
        retentions: selectedRetentionTypes.map((retentionId, index) => ({
          id: retentionId,
          retention_options: selectedRetentionOptions.map((optionId, seqIndex) => ({
            retention_option_id: optionId,
            status: "Active" as const,
            sequence: seqIndex + 1,
          })),
        })),
      }

      // Call the linking API
      await linkRetentionsWithRetentionOptions(payload)

      // Call the onApply callback if provided
      if (onApply) {
        onApply(selectedRetentionTypes, selectedRetentionOptions)
      }
      
      toast({
        title: t("success") || "Success",
        description: t("Retention types linked successfully", "Retention types linked successfully"),
      })
      
      onClose()
    } catch (error: any) {
      toast({
        title: t("error") || "Error",
        description: error.message || t("Failed to link retention types", "Failed to link retention types"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] h-[80vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">{t("Link Retention type")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Panel - Retention Types */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="bg-[#1162a8] text-white p-2 rounded">
                  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="41.2246" height="41.2246" rx="6" fill="#1162A8"/>
                    <path d="M21 14L14 18V24L21 28L28 24V18L21 14Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 14V28" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 18L28 24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 24L28 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h5 className="font-semibold text-gray-900">{t("Link Retention type")}</h5>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-gray-200 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllRetentionTypes}
                className="flex-1"
              >
                {t("Select all")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllRetentionTypes}
                className="flex-1"
              >
                {t("Clear all")}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1162a8]" />
                </div>
              ) : (
                <div className="space-y-2">
                  {retentionTypes.length > 0 ? (
                    retentionTypes.map((retentionType) => (
                      <div
                        key={retentionType.id}
                        className={`flex items-center gap-3 p-3 rounded border border-gray-200 cursor-pointer hover:bg-gray-50 ${
                          selectedRetentionTypes.includes(retentionType.id) ? "bg-blue-50 border-blue-200" : ""
                        }`}
                        onClick={() => handleRetentionTypeToggle(retentionType.id)}
                      >
                        <Checkbox
                          checked={selectedRetentionTypes.includes(retentionType.id)}
                          onCheckedChange={() => handleRetentionTypeToggle(retentionType.id)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">{retentionType.name}</p>
                          {retentionType.code && (
                            <p className="text-xs text-gray-500">{retentionType.code}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>{t("No retention types found", "No retention types found")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                {selectedRetentionTypes.length > 0
                  ? `${selectedRetentionTypes.length} ${t("retention type selected", "retention type selected")}`
                  : t("No retention type selected", "No retention type selected")}
              </p>
            </div>
          </div>

          {/* Right Panel - Retention Options */}
          <div className="w-1/2 flex flex-col">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="bg-[#1162a8] text-white p-2 rounded">
                  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="41.2246" height="41.2246" rx="6" fill="#1162A8"/>
                    <path d="M14 21H28M21 14V28" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h5 className="font-semibold text-gray-900">{t("Assign to these retention option")}</h5>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder={t("Search retention option", "Search retention option")}
                  className="pl-10 h-10 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Retention Options List */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1162a8]" />
                </div>
              ) : (
                <div className="space-y-2">
                  {retentionOptions.length > 0 ? (
                    retentionOptions.map((option) => (
                      <div
                        key={option.id}
                        className={`flex items-center gap-3 p-3 rounded border border-gray-200 cursor-pointer hover:bg-gray-50 ${
                          selectedRetentionOptions.includes(option.id) ? "bg-blue-50 border-blue-200" : ""
                        }`}
                        onClick={() => handleRetentionOptionToggle(option.id)}
                      >
                        <Checkbox
                          checked={selectedRetentionOptions.includes(option.id)}
                          onCheckedChange={() => handleRetentionOptionToggle(option.id)}
                          className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">{option.name}</p>
                          {option.code && (
                            <p className="text-xs text-gray-500">{option.code}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>{t("No retention options found", "No retention options found")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            {t("Cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedRetentionTypes.length === 0 || selectedRetentionOptions.length === 0 || isLoading}
            className="bg-[#1162a8] hover:bg-[#0f5490]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("Linking...", "Linking...")}
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4 mr-2" />
                {t("Link retention type", "Link retention type")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

