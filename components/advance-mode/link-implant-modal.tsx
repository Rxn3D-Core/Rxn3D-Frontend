"use client"

import { useState, useEffect } from "react"
import { X, Search, Package, Square, Image as ImageIcon, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "react-i18next"
import { useToast } from "@/hooks/use-toast"
import { useImplants, useImplant, Implant } from "@/lib/api/advance-mode-query"

// Helper function to get auth token
const getAuthToken = () => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('token') || ''
}

interface ImplantLibrary {
    id: number
    name: string
    brand: string
    system: string
    platform: string
    size: string
    price: string | number
    isSelected: boolean
}

interface Product {
    id: number
    name: string
    category: string
    imageStatus: "none" | "some" | "all"
    isSelected: boolean
}

interface LinkImplantModalProps {
    isOpen: boolean
    onClose: () => void
    context?: "global" | "lab"
    implantId?: number | null
    onApply?: (selectedImplants: number[], selectedProducts: number[]) => void
}

export function LinkImplantModal({ isOpen, onClose, context = "global", implantId, onApply }: LinkImplantModalProps) {
    const { t } = useTranslation()
    const { toast } = useToast()

    const [selectedImplants, setSelectedImplants] = useState<number[]>([])
    const [selectedProducts, setSelectedProducts] = useState<number[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState<"individual" | "category">("individual")

    // Data states
    const [products, setProducts] = useState<Product[]>([])
    const [isLoadingProducts, setIsLoadingProducts] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [productsError, setProductsError] = useState<string | null>(null)

    // Category selection state
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])

    // Fetch implants - if implantId is provided, fetch that specific implant, otherwise fetch all
    const { data: implantsData, isLoading: isLoadingImplants } = useImplants(
        implantId ? undefined : { per_page: 100, status: "Active" }
    )
    const { data: singleImplantData } = useImplant(implantId || 0)

    // Get the implant to display
    const displayImplant: Implant | null = implantId && singleImplantData?.data 
        ? singleImplantData.data 
        : null

    const implantLibraries: ImplantLibrary[] = displayImplant
        ? [{
            id: displayImplant.id,
            name: `${displayImplant.brand_name} - ${displayImplant.system_name}`,
            brand: displayImplant.brand_name,
            system: displayImplant.system_name,
            platform: displayImplant.platforms?.length ? `${displayImplant.platforms.length} platforms` : "-",
            size: "-",
            price: displayImplant.price || "--",
            isSelected: true,
        }]
        : (implantsData?.data || []).map((implant: Implant) => ({
            id: implant.id,
            name: `${implant.brand_name} - ${implant.system_name}`,
            brand: implant.brand_name,
            system: implant.system_name,
            platform: implant.platforms?.length ? `${implant.platforms.length} platforms` : "-",
            size: "-",
            price: implant.price || "--",
            isSelected: selectedImplants.includes(implant.id),
        }))

    // Get unique categories from products
    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))

    // Fetch products from API
    useEffect(() => {
        const fetchProducts = async () => {
            if (!isOpen) return

            setIsLoadingProducts(true)
            setProductsError(null)

            try {
                const role = typeof window !== "undefined" ? localStorage.getItem("role") : null

                let labId: string | null = null
                let customerId: string | null = null

                if (role === "superadmin") {
                    customerId = typeof window !== "undefined" ? localStorage.getItem("customerId") : null
                    labId = customerId || "0"
                } else {
                    labId = role === "office_admin" || role === "doctor"
                        ? (typeof window !== "undefined" ? localStorage.getItem("selectedLabId") : null)
                        : (typeof window !== "undefined" ? localStorage.getItem("customerId") : null)

                    if (!labId) {
                        throw new Error("Lab ID not found")
                    }
                }

                const token = getAuthToken()
                if (!token) {
                    throw new Error("Authentication token not found")
                }

                // Fetch first page to get pagination info
                const baseUrl = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products`)
                baseUrl.searchParams.append('order_by', 'name')
                baseUrl.searchParams.append('sort_by', 'asc')
                baseUrl.searchParams.append('per_page', '100') // Use a high per_page to minimize requests

                if (role === "superadmin") {
                    if (customerId) {
                        baseUrl.searchParams.append('customer_id', customerId)
                    }
                } else {
                    if (labId) {
                        baseUrl.searchParams.append('customer_id', labId)
                    }
                }

                const firstResponse = await fetch(baseUrl.toString(), {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (firstResponse.status === 401) {
                    window.location.href = '/login'
                    throw new Error('Unauthorized - Redirecting to login')
                }

                if (!firstResponse.ok) {
                    throw new Error(`Failed to fetch products: ${firstResponse.status}`)
                }

                const firstJson = await firstResponse.json()
                // Handle different response structures
                const responseData = firstJson.data || firstJson
                const lastPage = responseData.last_page || 1
                let allProductsData: any[] = Array.isArray(responseData.data) 
                    ? [...responseData.data] 
                    : Array.isArray(responseData) 
                        ? [...responseData] 
                        : []

                // Fetch remaining pages if there are more
                if (lastPage > 1) {
                    const remainingPages: any[] = []
                    for (let page = 2; page <= lastPage; page++) {
                        const pageUrl = new URL(baseUrl.toString())
                        pageUrl.searchParams.set('page', page.toString())
                        
                        const pageResponse = await fetch(pageUrl.toString(), {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                        })

                        if (pageResponse.status === 401) {
                            window.location.href = '/login'
                            throw new Error('Unauthorized - Redirecting to login')
                        }

                        if (!pageResponse.ok) {
                            throw new Error(`Failed to fetch products page ${page}: ${pageResponse.status}`)
                        }

                        const pageJson = await pageResponse.json()
                        const pageResponseData = pageJson.data || pageJson
                        const pageData = Array.isArray(pageResponseData.data) 
                            ? pageResponseData.data 
                            : Array.isArray(pageResponseData) 
                                ? pageResponseData 
                                : []
                        remainingPages.push(...pageData)
                    }
                    allProductsData = [...allProductsData, ...remainingPages]
                }

                const transformedProducts: Product[] = allProductsData.map((item: any) => {
                    let imageStatus: "none" | "some" | "all" = "none"
                    if (item.stages && item.stages.length > 0) {
                        // Determine image status based on actual image configuration
                        const hasAllImages = item.stages.every((stage: any) => stage.image_url)
                        const hasSomeImages = item.stages.some((stage: any) => stage.image_url)

                        if (hasAllImages) imageStatus = "all"
                        else if (hasSomeImages) imageStatus = "some"
                        else imageStatus = "none"
                    }

                    return {
                        id: item.id,
                        name: item.name,
                        category: item.subcategory_name || item.category_name || "Uncategorized",
                        imageStatus,
                        isSelected: false,
                    }
                })

                setProducts(transformedProducts)
            } catch (error: any) {
                console.error("Error fetching products:", error)
                setProductsError(error.message || "Failed to load products")
            } finally {
                setIsLoadingProducts(false)
            }
        }

        fetchProducts()
    }, [isOpen])

    // Reset selections when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedImplants([])
            setSelectedProducts([])
            setSearchQuery("")
            setActiveTab("individual")
            setSelectedCategories([])
        } else if (implantId) {
            // If a specific implant is provided, auto-select it
            setSelectedImplants([implantId])
        }
    }, [isOpen, implantId])

    // Filter products based on search query
    const filteredProducts = products.filter(product => {
        if (!searchQuery.trim()) {
            return true
        }

        const searchLower = searchQuery.toLowerCase().trim()
        const matchesName = product.name.toLowerCase().includes(searchLower)
        const matchesCategory = product.category?.toLowerCase().includes(searchLower) || false

        return matchesName || matchesCategory
    })

    const handleImplantSelect = (implantId: number, checked: boolean) => {
        if (checked) {
            setSelectedImplants([...selectedImplants, implantId])
        } else {
            setSelectedImplants(selectedImplants.filter(id => id !== implantId))
        }
    }

    const handleProductSelect = (productId: number, checked: boolean) => {
        if (checked) {
            setSelectedProducts([...selectedProducts, productId])
        } else {
            setSelectedProducts(selectedProducts.filter(id => id !== productId))
        }
    }

    const handleSelectAllImplants = () => {
        if (selectedImplants.length === implantLibraries.length) {
            setSelectedImplants([])
        } else {
            setSelectedImplants(implantLibraries.map(implant => implant.id))
        }
    }

    const handleSelectAllProducts = () => {
        if (selectedProducts.length === filteredProducts.length) {
            setSelectedProducts([])
        } else {
            setSelectedProducts(filteredProducts.map(product => product.id))
        }
    }

    const handleCategorySelect = (category: string, checked: boolean) => {
        if (checked) {
            setSelectedCategories([...selectedCategories, category])
            const categoryProducts = products.filter(p => p.category === category).map(p => p.id)
            const newSelection = Array.from(new Set([...selectedProducts, ...categoryProducts]))
            setSelectedProducts(newSelection)
        } else {
            setSelectedCategories(selectedCategories.filter(c => c !== category))
            const categoryProducts = products.filter(p => p.category === category).map(p => p.id)
            setSelectedProducts(selectedProducts.filter(id => !categoryProducts.includes(id)))
        }
    }

    const handleSelectAllCategories = () => {
        if (selectedCategories.length === categories.length) {
            setSelectedCategories([])
            setSelectedProducts([])
        } else {
            setSelectedCategories([...categories])
            setSelectedProducts(products.map(p => p.id))
        }
    }

    const getImageStatusIcon = (status: string) => {
        switch (status) {
            case "all":
                return <div className="w-3 h-3 bg-green-500 rounded-full" />
            case "some":
                return <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            case "none":
            default:
                return <div className="w-3 h-3 bg-gray-400 rounded-full" />
        }
    }

    const handleApply = async () => {
        const implantsToLink = implantId ? [implantId] : selectedImplants

        if (implantsToLink.length === 0) {
            toast({
                title: "Selection Required",
                description: "Please select at least one implant.",
                variant: "destructive",
            })
            return
        }

        if (selectedProducts.length === 0) {
            toast({
                title: "Selection Required",
                description: "Please select at least one product.",
                variant: "destructive",
            })
            return
        }

        if (onApply) {
            onApply(implantsToLink, selectedProducts)
            onClose()
        } else {
            toast({
                title: "Error",
                description: "Link handler not provided",
                variant: "destructive",
            })
        }
    }

    const handleClose = () => {
        if (selectedImplants.length > 0 || selectedProducts.length > 0) {
            // Ask for confirmation if there are unsaved changes
            if (window.confirm("You have unsaved changes. Are you sure you want to close?")) {
                onClose()
            }
        } else {
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold">
                            Link Implant library
                        </DialogTitle>
                        <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </DialogHeader>

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel - Link Implant library */}
                    <div className="w-1/2 border-r border-gray-200 flex flex-col">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <Square className="h-6 w-6 text-[#1162a8]" />
                                <h3 className="font-semibold text-gray-900">Link Implant library</h3>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoadingImplants ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-[#1162a8] mx-auto mb-2" />
                                        <p className="text-sm text-gray-600">Loading implant libraries...</p>
                                    </div>
                                </div>
                            ) : implantLibraries.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <p className="text-sm text-gray-600">No implants available</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {implantLibraries.map((implant) => (
                                        <div key={implant.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                {!implantId && (
                                                    <Checkbox
                                                        checked={selectedImplants.includes(implant.id)}
                                                        onCheckedChange={(checked) => handleImplantSelect(implant.id, !!checked)}
                                                        className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                                                    />
                                                )}
                                                <span className="font-medium text-gray-900">{implant.name}</span>
                                            </div>
                                            <Input
                                                type="text"
                                                value={implant.price === "--" ? "$--" : `$${implant.price}`}
                                                readOnly
                                                className="w-20 h-8 text-sm text-gray-600 border-gray-300"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                            {!implantId && (
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSelectAllImplants}
                                            className="text-gray-700 border-gray-300 hover:bg-gray-100"
                                        >
                                            {selectedImplants.length === implantLibraries.length ? "Clear all" : "Select all"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <p className="text-sm text-gray-600">
                                {implantId 
                                    ? "Selected implant" 
                                    : `${selectedImplants.length} implant${selectedImplants.length !== 1 ? 's' : ''} selected`}
                            </p>
                        </div>
                    </div>

                    {/* Right Panel - Assign to These Products */}
                    <div className="w-1/2 flex flex-col">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <Package className="h-6 w-6 text-[#1162a8]" />
                                <h3 className="font-semibold text-gray-900">Assign to These Products</h3>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-4 py-3 border-b border-gray-200">
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setActiveTab("individual")}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "individual"
                                            ? "bg-[#1162a8] text-white"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                        }`}
                                >
                                    By Individual Products
                                </button>
                                <button
                                    onClick={() => setActiveTab("category")}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "category"
                                            ? "bg-[#1162a8] text-white"
                                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                        }`}
                                >
                                    By Category
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="px-4 py-3 border-b border-gray-200">
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    type="search"
                                    placeholder="Search Products..."
                                    className="pr-10 h-10 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Products List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoadingProducts ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-[#1162a8] mx-auto mb-2" />
                                        <p className="text-sm text-gray-600">Loading products...</p>
                                    </div>
                                </div>
                            ) : productsError ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <p className="text-sm text-red-600 mb-2">Error: {productsError}</p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => window.location.reload()}
                                            className="text-gray-700 border-gray-300 hover:bg-gray-100"
                                        >
                                            Retry
                                        </Button>
                                    </div>
                                </div>
                            ) : activeTab === "category" ? (
                                // Category View
                                categories.length === 0 ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center">
                                            <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                            <p className="text-sm text-gray-600">No categories available</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {categories
                                            .filter((category) => {
                                                if (!searchQuery.trim()) return true
                                                const searchLower = searchQuery.toLowerCase().trim()
                                                const categoryMatches = category.toLowerCase().includes(searchLower)
                                                const hasMatchingProducts = filteredProducts.some(p => p.category === category)
                                                return categoryMatches || hasMatchingProducts
                                            })
                                            .map((category) => {
                                                const categoryProducts = filteredProducts.filter(p => p.category === category)
                                                const selectedCount = categoryProducts.filter(p => selectedProducts.includes(p.id)).length
                                                const isAllSelected = selectedCount === categoryProducts.length && categoryProducts.length > 0

                                                return (
                                                    <div key={category} className="border border-gray-200 rounded-lg p-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <Checkbox
                                                                    checked={isAllSelected}
                                                                    onCheckedChange={(checked) => handleCategorySelect(category, !!checked)}
                                                                    className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                                                                />
                                                                <span className="font-medium text-gray-900">{category}</span>
                                                            </div>
                                                            <Badge variant="outline" className="text-xs">
                                                                {selectedCount}/{categoryProducts.length} selected
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                    </div>
                                )
                            ) : filteredProducts.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-600">
                                            {searchQuery
                                                ? "No products found matching your search"
                                                : "No products available"}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                // Individual Products View
                                <div className="space-y-3">
                                    {filteredProducts.map((product) => (
                                        <div key={product.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <Checkbox
                                                        checked={selectedProducts.includes(product.id)}
                                                        onCheckedChange={(checked) => handleProductSelect(product.id, !!checked)}
                                                        className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        {getImageStatusIcon(product.imageStatus)}
                                                        <ImageIcon className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                    <span className="font-medium text-gray-900">{product.name}</span>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    Removables
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions and Legend */}
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                            {activeTab === "category" ? (
                                // Category tab footer
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleSelectAllCategories}
                                                className="text-gray-700 border-gray-300 hover:bg-gray-100"
                                            >
                                                {selectedCategories.length === categories.length ? "Clear all" : "Select all"}
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected from {selectedCategories.length} categor{selectedCategories.length !== 1 ? 'ies' : 'y'}
                                    </p>
                                </div>
                            ) : (
                                // Individual products tab footer - Legend
                                <div className="flex items-center gap-6 text-xs text-gray-600">
                                    <span className="text-sm font-medium text-gray-700 mr-3">Legend:</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        <span>All Image Configured</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                                        <span>Some Image Configured</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                                        <span>No Image Configured</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
                    <div className="flex justify-between w-full">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleApply}
                            className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
                            disabled={(implantId ? false : selectedImplants.length === 0) || selectedProducts.length === 0 || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Applying...
                                </>
                            ) : (
                                <>
                                    <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9.58317 21.0833V6.70833C9.58317 6.45417 9.4822 6.21041 9.30248 6.03069C9.12276 5.85097 8.879 5.75 8.62484 5.75H3.83317C3.32484 5.75 2.83733 5.95193 2.47788 6.31138C2.11844 6.67082 1.9165 7.15834 1.9165 7.66667V19.1667C1.9165 19.675 2.11844 20.1625 2.47788 20.522C2.83733 20.8814 3.32484 21.0833 3.83317 21.0833H15.3332C15.8415 21.0833 16.329 20.8814 16.6885 20.522C17.0479 20.1625 17.2498 19.675 17.2498 19.1667V14.375C17.2498 14.1208 17.1489 13.8771 16.9691 13.6974C16.7894 13.5176 16.5457 13.4167 16.2915 13.4167H1.9165" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M20.1248 1.91699H14.3748C13.8456 1.91699 13.4165 2.34605 13.4165 2.87533V8.62533C13.4165 9.1546 13.8456 9.58366 14.3748 9.58366H20.1248C20.6541 9.58366 21.0832 9.1546 21.0832 8.62533V2.87533C21.0832 2.34605 20.6541 1.91699 20.1248 1.91699Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>

                                    Apply stages to selected products
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}









