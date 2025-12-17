"use client"

import { useState, useEffect } from "react"
import { X, Search, Package, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "react-i18next"
import { useCaseTracking } from "@/contexts/case-tracking-context"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface LinkProductModalProps {
  isOpen: boolean
  onClose: () => void
  casePanId?: number
  casePanName?: string
}

interface CasePan {
  id: number
  name: string
  code: string
  color_code: string
  status: string
}

interface Product {
  id: number
  name: string
  code: string
  subcategory?: {
    id: number
    name: string
    category?: {
      id: number
      name: string
    }
  }
}

interface Subcategory {
  id: number
  name: string
  code: string
  category?: {
    id: number
    name: string
  }
}

interface Stage {
  id: number
  name: string
  code: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api"

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

const getAuthToken = () => {
  const token = localStorage.getItem("token")
  if (!token) throw new Error("Authentication token not found.")
  return token
}

export function LinkProductModal({ isOpen, onClose, casePanId, casePanName }: LinkProductModalProps) {
  const { t } = useTranslation()
  const { getAssignments, setAssignments } = useCaseTracking()
  const { user } = useAuth()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCasePan, setSelectedCasePan] = useState<string>("")
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>([])
  const [selectedStages, setSelectedStages] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState("individual")
  
  // Data states
  const [casePans, setCasePans] = useState<CasePan[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  
  // Pagination states
  const [productsPage, setProductsPage] = useState(1)
  const [productsPagination, setProductsPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 })
  const [subcategoriesPage, setSubcategoriesPage] = useState(1)
  const [subcategoriesPagination, setSubcategoriesPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 })
  const [stagesPage, setStagesPage] = useState(1)
  const [stagesPagination, setStagesPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 })

  // Fetch all data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAllData()
    } else {
      // Reset state when modal closes
      setSearchQuery("")
      setSelectedCasePan("")
      setSelectedProducts([])
      setSelectedSubcategories([])
      setSelectedStages([])
      setActiveTab("individual")
      setProductsPage(1)
      setSubcategoriesPage(1)
      setStagesPage(1)
    }
  }, [isOpen])

  const fetchAllData = async () => {
    setIsLoadingData(true)
    try {
      const customerId = getCustomerId(user)
      if (!customerId) {
        toast({
          title: t("error") || "Error",
          description: t("caseTracking.customerIdRequired", "Customer ID is required"),
          variant: "destructive",
        })
        return
      }

      // Fetch all data in parallel
      await Promise.all([
        fetchCasePans(customerId),
        fetchProducts(customerId, 1),
        fetchSubcategories(customerId, 1),
        fetchStages(customerId, 1),
      ])
    } catch (error: any) {
      toast({
        title: t("error") || "Error",
        description: error.message || t("caseTracking.failedToFetchData", "Failed to fetch data"),
        variant: "destructive",
      })
    } finally {
      setIsLoadingData(false)
    }
  }

  const fetchCasePans = async (customerId: number) => {
    try {
      const assignmentsData = await getAssignments(customerId)
      const casePansList = assignmentsData.case_pans || []
      setCasePans(casePansList)
      
      // If casePanId is provided, select it
      if (casePanId) {
        setSelectedCasePan(casePanId.toString())
      }
    } catch (error: any) {
      console.error("Error fetching case pans:", error)
      setCasePans([])
    }
  }

  const fetchProducts = async (customerId: number, page: number = 1) => {
    try {
      const token = getAuthToken()
      const searchParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
      const response = await fetch(
        `${API_BASE_URL}/library/products?customer_id=${customerId}&status=Active&per_page=10&page=${page}${searchParam}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch products")
      }

      const data = await response.json()
      const productsList = data.data?.data || []
      const pagination = data.data?.pagination || { current_page: 1, last_page: 1, total: 0, per_page: 10 }
      setProducts(productsList)
      setProductsPagination(pagination)
    } catch (error: any) {
      console.error("Error fetching products:", error)
      setProducts([])
      setProductsPagination({ current_page: 1, last_page: 1, total: 0, per_page: 10 })
    }
  }

  const fetchSubcategories = async (customerId: number, page: number = 1) => {
    try {
      const token = getAuthToken()
      const searchParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
      const response = await fetch(
        `${API_BASE_URL}/library/subcategories?customer_id=${customerId}&status=Active&per_page=10&page=${page}${searchParam}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch subcategories")
      }

      const data = await response.json()
      const subcategoriesList = data.data?.data || []
      const pagination = data.data?.pagination || { current_page: 1, last_page: 1, total: 0, per_page: 10 }
      setSubcategories(subcategoriesList)
      setSubcategoriesPagination(pagination)
    } catch (error: any) {
      console.error("Error fetching subcategories:", error)
      setSubcategories([])
      setSubcategoriesPagination({ current_page: 1, last_page: 1, total: 0, per_page: 10 })
    }
  }

  const fetchStages = async (customerId: number, page: number = 1) => {
    try {
      const token = getAuthToken()
      const searchParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
      const response = await fetch(
        `${API_BASE_URL}/library/stages?customer_id=${customerId}&status=Active&per_page=10&page=${page}${searchParam}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch stages")
      }

      const data = await response.json()
      const stagesList = data.data?.data || []
      const pagination = data.data?.pagination || { current_page: 1, last_page: 1, total: 0, per_page: 10 }
      setStages(stagesList)
      setStagesPagination(pagination)
    } catch (error: any) {
      console.error("Error fetching stages:", error)
      setStages([])
      setStagesPagination({ current_page: 1, last_page: 1, total: 0, per_page: 10 })
    }
  }

  // Reset to page 1 when search query changes
  useEffect(() => {
    setProductsPage(1)
    setSubcategoriesPage(1)
    setStagesPage(1)
  }, [searchQuery])

  // Fetch data when page changes or search query changes
  useEffect(() => {
    if (!isOpen) return
    
    const customerId = getCustomerId(user)
    if (!customerId) return

    const debounceTimer = setTimeout(() => {
      if (activeTab === "individual") {
        fetchProducts(customerId, productsPage)
      } else if (activeTab === "category") {
        fetchSubcategories(customerId, subcategoriesPage)
      } else if (activeTab === "stages") {
        fetchStages(customerId, stagesPage)
      }
    }, searchQuery ? 500 : 0)

    return () => clearTimeout(debounceTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsPage, subcategoriesPage, stagesPage, searchQuery, activeTab, isOpen])

  // Reset to page 1 when switching tabs
  useEffect(() => {
    setProductsPage(1)
    setSubcategoriesPage(1)
    setStagesPage(1)
  }, [activeTab])

  const handleCasePanChange = (value: string) => {
    setSelectedCasePan(value)
  }

  const handleProductToggle = (id: number) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(prodId => prodId !== id) : [...prev, id]
    )
  }

  const handleSubcategoryToggle = (id: number) => {
    setSelectedSubcategories(prev =>
      prev.includes(id) ? prev.filter(subId => subId !== id) : [...prev, id]
    )
  }

  const handleStageToggle = (id: number) => {
    setSelectedStages(prev =>
      prev.includes(id) ? prev.filter(stageId => stageId !== id) : [...prev, id]
    )
  }

  const handleApply = async () => {
    const customerId = getCustomerId(user)
    if (!customerId) {
      toast({
        title: t("error") || "Error",
        description: t("caseTracking.customerIdRequired", "Customer ID is required"),
        variant: "destructive",
      })
      return
    }

    if (!selectedCasePan) {
      toast({
        title: t("error") || "Error",
        description: t("caseTracking.selectCasePan", "Please select a case pan"),
        variant: "destructive",
      })
      return
    }

    const hasSelections = selectedProducts.length > 0 || selectedSubcategories.length > 0 || selectedStages.length > 0
    if (!hasSelections) {
      toast({
        title: t("error") || "Error",
        description: t("caseTracking.selectItems", "Please select at least one item to assign"),
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const casePanIdNum = parseInt(selectedCasePan)
      const assignments: { subcategories?: number[], products?: number[], stages?: number[] } = {}
      
      if (selectedProducts.length > 0) {
        assignments.products = selectedProducts
      }
      if (selectedSubcategories.length > 0) {
        assignments.subcategories = selectedSubcategories
      }
      if (selectedStages.length > 0) {
        assignments.stages = selectedStages
      }

      await setAssignments(customerId, [casePanIdNum], assignments)
      
      toast({
        title: t("success") || "Success",
        description: t("caseTracking.assignmentsUpdated", "Assignments updated successfully"),
      })
      
      onClose()
    } catch (error: any) {
      toast({
        title: t("error") || "Error",
        description: error.message || t("caseTracking.failedToUpdateAssignments", "Failed to update assignments"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] h-[80vh] p-0 gap-0 flex flex-col">
        

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Panel - Case Pans */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="bg-[#1162a8] text-white p-2 rounded">
                <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="41.2246" height="41.2246" rx="6" fill="#1162A8"/>
                <path d="M18.9941 30.9121V15.9121C18.9941 15.6469 18.8888 15.3925 18.7012 15.205C18.5137 15.0175 18.2594 14.9121 17.9941 14.9121H12.9941C12.4637 14.9121 11.955 15.1228 11.5799 15.4979C11.2049 15.873 10.9941 16.3817 10.9941 16.9121V28.9121C10.9941 29.4425 11.2049 29.9512 11.5799 30.3263C11.955 30.7014 12.4637 30.9121 12.9941 30.9121H24.9941C25.5246 30.9121 26.0333 30.7014 26.4084 30.3263C26.7834 29.9512 26.9941 29.4425 26.9941 28.9121V23.9121C26.9941 23.6469 26.8888 23.3925 26.7012 23.205C26.5137 23.0175 26.2594 22.9121 25.9941 22.9121H10.9941" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M29.9941 10.9121H23.9941C23.4419 10.9121 22.9941 11.3598 22.9941 11.9121V17.9121C22.9941 18.4644 23.4419 18.9121 23.9941 18.9121H29.9941C30.5464 18.9121 30.9941 18.4644 30.9941 17.9121V11.9121C30.9941 11.3598 30.5464 10.9121 29.9941 10.9121Z" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                </div>
                <h5 className="font-semibold text-gray-900">{t("caseTracking.selectCasePansToAssign", "Select Case pans to assign")}</h5>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1162a8]" />
                </div>
              ) : (
                <RadioGroup value={selectedCasePan} onValueChange={handleCasePanChange}>
                  <div className="space-y-2">
                    {casePans.length > 0 ? (
                      casePans.map((casePan) => (
                        <div
                          key={casePan.id}
                          className={`flex items-center gap-3 p-3 rounded border border-gray-200 ${
                            casePan.status === "Inactive" ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"
                          }`}
                          onClick={() => casePan.status !== "Inactive" && handleCasePanChange(casePan.id.toString())}
                        >
                          <RadioGroupItem
                            value={casePan.id.toString()}
                            disabled={casePan.status === "Inactive"}
                            className="border-gray-300 data-[state=checked]:border-[#1162a8] data-[state=checked]:text-[#1162a8]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900">{casePan.name}</p>
                            {casePan.status === "Inactive" && (
                              <Badge variant="outline" className="text-xs mt-1">
                                <span className="text-yellow-600">⚠</span> Inactive
                              </Badge>
                            )}
                          </div>
                          <div
                            className="w-8 h-8 rounded flex-shrink-0"
                            style={{ backgroundColor: casePan.color_code || "#1162A8" }}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>{t("caseTracking.noCasePansFound", "No case pans found")}</p>
                      </div>
                    )}
                  </div>
                </RadioGroup>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                {selectedCasePan 
                  ? `${casePans.find(p => p.id.toString() === selectedCasePan)?.name || ""} ${t("caseTracking.selected", "selected")}`
                  : t("caseTracking.noCasePanSelected", "No case pan selected")}
              </p>
            </div>
          </div>

          {/* Right Panel - Products */}
          <div className="w-1/2 flex flex-col">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="bg-[#1162a8] text-white p-2 rounded">
                <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="41.2246" height="41.2246" rx="6" fill="#1162A8"/>
                  <path d="M20.9941 30.9121V21.9121" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M24.1642 11.122C24.4132 10.9828 24.6938 10.9097 24.9792 10.9097C25.2645 10.9097 25.5451 10.9828 25.7942 11.122L29.9942 13.482C30.2916 13.6502 30.5391 13.8944 30.7113 14.1896C30.8834 14.4847 30.9742 14.8203 30.9742 15.162C30.9742 15.5038 30.8834 15.8393 30.7113 16.1345C30.5391 16.4297 30.2916 16.6738 29.9942 16.842L17.8142 23.702C17.5644 23.8445 17.2817 23.9195 16.9942 23.9195C16.7066 23.9195 16.424 23.8445 16.1742 23.702L11.9942 21.342C11.6967 21.1738 11.4492 20.9297 11.2771 20.6345C11.1049 20.3393 11.0142 20.0038 11.0142 19.662C11.0142 19.3203 11.1049 18.9847 11.2771 18.6896C11.4492 18.3944 11.6967 18.1502 11.9942 17.982L24.1642 11.122Z" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M28.9941 21.9121V25.7821C28.9945 26.1596 28.8912 26.5299 28.6955 26.8526C28.4997 27.1753 28.2191 27.438 27.8841 27.6121L21.8841 30.6921C21.6092 30.835 21.304 30.9096 20.9941 30.9096C20.6843 30.9096 20.3791 30.835 20.1041 30.6921L14.1041 27.6121C13.7692 27.438 13.4886 27.1753 13.2928 26.8526C13.0971 26.5299 12.9938 26.1596 12.9941 25.7821V21.9121" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M29.9942 21.3424C30.2916 21.1742 30.5391 20.93 30.7113 20.6348C30.8834 20.3397 30.9742 20.0041 30.9742 19.6624C30.9742 19.3206 30.8834 18.985 30.7113 18.6899C30.5391 18.3947 30.2916 18.1506 29.9942 17.9824L17.8242 11.1124C17.576 10.9703 17.2951 10.8955 17.0092 10.8955C16.7232 10.8955 16.4423 10.9703 16.1942 11.1124L11.9942 13.4824C11.6967 13.6506 11.4492 13.8947 11.2771 14.1899C11.1049 14.485 11.0142 14.8206 11.0142 15.1624C11.0142 15.5041 11.1049 15.8397 11.2771 16.1348C11.4492 16.43 11.6967 16.6741 11.9942 16.8424L24.1742 23.7024C24.4221 23.8448 24.7032 23.9198 24.9892 23.9198C25.2752 23.9198 25.5562 23.8448 25.8042 23.7024L29.9942 21.3424Z" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>

                </div>
                <h5 className="font-semibold text-gray-900">{t("caseTracking.assignToTheseProducts", "Assign to These Products")}</h5>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("individual")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "individual"
                      ? "bg-[#1162a8] text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {t("caseTracking.byIndividualProducts", "By Individual Products")}
                </button>
                <button
                  onClick={() => setActiveTab("category")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "category"
                      ? "bg-[#1162a8] text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {t("caseTracking.byCategory", "By Category")}
                </button>
                <button
                  onClick={() => setActiveTab("stages")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "stages"
                      ? "bg-[#1162a8] text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {t("caseTracking.byStages", "By Stages")}
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder={
                    activeTab === "stages"
                      ? t("caseTracking.searchStages", "Search Stages...")
                      : activeTab === "category"
                      ? t("caseTracking.searchCategories", "Search Categories...")
                      : t("caseTracking.searchProducts", "Search Products...")
                  }
                  className="pl-10 h-10 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1162a8]" />
                </div>
              ) : (
                <>
                  {activeTab === "individual" && (
                    <>
                      {products.length > 0 ? (
                        products.map((product, index) => (
                          <div
                            key={product.id}
                            className={`flex items-center gap-3 p-3 rounded border border-gray-200 mb-2 cursor-pointer hover:bg-gray-50 ${
                              index % 2 === 0 ? "bg-blue-50" : "bg-white"
                            }`}
                            onClick={() => handleProductToggle(product.id)}
                          >
                            <Checkbox
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={() => handleProductToggle(product.id)}
                              className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">{product.name}</p>
                              {product.subcategory?.category && (
                                <p className="text-xs text-gray-500">{product.subcategory.category.name}</p>
                              )}
                            </div>
                            {product.subcategory && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {product.subcategory.name}
                              </Badge>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>{t("caseTracking.noProductsFound", "No products found")}</p>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === "category" && (
                    <>
                      {subcategories.length > 0 ? (
                        subcategories.map((subcategory) => (
                          <div
                            key={subcategory.id}
                            className="flex items-center gap-3 p-4 rounded border border-gray-200 mb-2 cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSubcategoryToggle(subcategory.id)}
                          >
                            <Checkbox
                              checked={selectedSubcategories.includes(subcategory.id)}
                              onCheckedChange={() => handleSubcategoryToggle(subcategory.id)}
                              className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{subcategory.name}</p>
                              {subcategory.category && (
                                <p className="text-sm text-gray-600">{subcategory.category.name}</p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>{t("caseTracking.noCategoriesFound", "No categories found")}</p>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === "stages" && (
                    <>
                      {stages.length > 0 ? (
                        stages.map((stage, index) => (
                          <div
                            key={stage.id}
                            className={`flex items-center gap-3 p-3 rounded border border-gray-200 mb-2 cursor-pointer hover:bg-gray-50 ${
                              index % 2 === 0 ? "bg-blue-50" : "bg-white"
                            }`}
                            onClick={() => handleStageToggle(stage.id)}
                          >
                            <Checkbox
                              checked={selectedStages.includes(stage.id)}
                              onCheckedChange={() => handleStageToggle(stage.id)}
                              className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">{stage.name}</p>
                              {stage.code && (
                                <p className="text-xs text-gray-500">{stage.code}</p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>{t("caseTracking.noStagesFound", "No stages found")}</p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Pagination Controls */}
            {activeTab === "individual" && productsPagination.last_page > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {t("caseTracking.page", "Page")} {productsPagination.current_page} {t("caseTracking.of", "of")} {productsPagination.last_page}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = productsPage - 1
                        if (newPage >= 1) {
                          setProductsPage(newPage)
                        }
                      }}
                      disabled={productsPage === 1 || isLoadingData}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = productsPage + 1
                        if (newPage <= productsPagination.last_page) {
                          setProductsPage(newPage)
                        }
                      }}
                      disabled={productsPage === productsPagination.last_page || isLoadingData}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "category" && subcategoriesPagination.last_page > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {t("caseTracking.page", "Page")} {subcategoriesPagination.current_page} {t("caseTracking.of", "of")} {subcategoriesPagination.last_page}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = subcategoriesPage - 1
                        if (newPage >= 1) {
                          setSubcategoriesPage(newPage)
                        }
                      }}
                      disabled={subcategoriesPage === 1 || isLoadingData}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = subcategoriesPage + 1
                        if (newPage <= subcategoriesPagination.last_page) {
                          setSubcategoriesPage(newPage)
                        }
                      }}
                      disabled={subcategoriesPage === subcategoriesPagination.last_page || isLoadingData}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "stages" && stagesPagination.last_page > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {t("caseTracking.page", "Page")} {stagesPagination.current_page} {t("caseTracking.of", "of")} {stagesPagination.last_page}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = stagesPage - 1
                        if (newPage >= 1) {
                          setStagesPage(newPage)
                        }
                      }}
                      disabled={stagesPage === 1 || isLoadingData}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = stagesPage + 1
                        if (newPage <= stagesPagination.last_page) {
                          setStagesPage(newPage)
                        }
                      }}
                      disabled={stagesPage === stagesPagination.last_page || isLoadingData}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            {t("caseTracking.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedCasePan || (selectedProducts.length === 0 && selectedSubcategories.length === 0 && selectedStages.length === 0) || isLoading}
            className="bg-[#1162a8] hover:bg-[#0f5490]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("caseTracking.applying", "Applying...")}
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                {t("caseTracking.applyCasePansToSelectedProducts", "Apply case pans to selected products")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
