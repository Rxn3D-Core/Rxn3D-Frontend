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

// Helper function to get auth token
const getAuthToken = () => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('token') || ''
}

interface AbutmentLibrary {
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

interface LinkAbutmentModalProps {
    isOpen: boolean
    onClose: () => void
    context?: "global" | "lab"
    onApply?: (selectedAbutments: number[], selectedProducts: number[]) => void
}

export function LinkAbutmentModal({ isOpen, onClose, context = "global", onApply }: LinkAbutmentModalProps) {
    const { t } = useTranslation()
    const { toast } = useToast()

    const [selectedAbutments, setSelectedAbutments] = useState<number[]>([])
    const [selectedProducts, setSelectedProducts] = useState<number[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState<"individual" | "category">("individual")

    // Data states
    const [abutmentLibraries, setAbutmentLibraries] = useState<AbutmentLibrary[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [isLoadingAbutments, setIsLoadingAbutments] = useState(false)
    const [isLoadingProducts, setIsLoadingProducts] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [productsError, setProductsError] = useState<string | null>(null)

    // Category selection state
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])

    // Get unique categories from products
    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))

    // Fetch abutment libraries
    useEffect(() => {
        const fetchAbutments = async () => {
            if (!isOpen) return

            setIsLoadingAbutments(true)
            try {
                // Mock data for now - replace with actual API call
                const mockAbutments: AbutmentLibrary[] = [
                    { id: 1, name: "Abutment Library", brand: "Other", system: "-", platform: "-", size: "-", price: "--", isSelected: false },
                ]
                setAbutmentLibraries(mockAbutments)
            } catch (error: any) {
                console.error("Error fetching abutments:", error)
            } finally {
                setIsLoadingAbutments(false)
            }
        }

        fetchAbutments()
    }, [isOpen])

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

                const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products`)
                url.searchParams.append('per_page', '25')
                url.searchParams.append('order_by', 'name')
                url.searchParams.append('sort_by', 'asc')

                if (role === "superadmin") {
                    if (customerId) {
                        url.searchParams.append('customer_id', customerId)
                    }
                } else {
                    if (labId) {
                        url.searchParams.append('customer_id', labId)
                    }
                }

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (response.status === 401) {
                    window.location.href = '/login'
                    throw new Error('Unauthorized - Redirecting to login')
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch products: ${response.status}`)
                }

                const json = await response.json()
                const productsData = json.data?.data || json.data || []

                const transformedProducts: Product[] = productsData.map((item: any) => {
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
            setSelectedAbutments([])
            setSelectedProducts([])
            setSearchQuery("")
            setActiveTab("individual")
            setSelectedCategories([])
        }
    }, [isOpen])

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

    const handleAbutmentSelect = (abutmentId: number, checked: boolean) => {
        if (checked) {
            setSelectedAbutments([...selectedAbutments, abutmentId])
        } else {
            setSelectedAbutments(selectedAbutments.filter(id => id !== abutmentId))
        }
    }

    const handleProductSelect = (productId: number, checked: boolean) => {
        if (checked) {
            setSelectedProducts([...selectedProducts, productId])
        } else {
            setSelectedProducts(selectedProducts.filter(id => id !== productId))
        }
    }

    const handleSelectAllAbutments = () => {
        if (selectedAbutments.length === abutmentLibraries.length) {
            setSelectedAbutments([])
        } else {
            setSelectedAbutments(abutmentLibraries.map(abutment => abutment.id))
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
        if (onApply) {
            onApply(selectedAbutments, selectedProducts)
            onClose()
            return
        }

        if (selectedAbutments.length === 0 || selectedProducts.length === 0) {
            toast({
                title: "Selection Required",
                description: "Please select at least one abutment library and one product.",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)

        try {
            // TODO: Implement API call to link abutments to products
            // For now, just show success message
            toast({
                title: "Success",
                description: "Abutment libraries linked to products successfully!",
            })
            onClose()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to link abutments to products",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        if (selectedAbutments.length > 0 || selectedProducts.length > 0) {
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
                            Link Abutment library
                        </DialogTitle>
                        <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </DialogHeader>

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel - Link Abutment library */}
                    <div className="w-1/2 border-r border-gray-200 flex flex-col">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <Square className="h-6 w-6 text-[#1162a8]" />
                                <h3 className="font-semibold text-gray-900">Link Abutment library</h3>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoadingAbutments ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-[#1162a8] mx-auto mb-2" />
                                        <p className="text-sm text-gray-600">Loading abutment libraries...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {abutmentLibraries.map((abutment) => (
                                        <div key={abutment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={selectedAbutments.includes(abutment.id)}
                                                    onCheckedChange={(checked) => handleAbutmentSelect(abutment.id, !!checked)}
                                                    className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8]"
                                                />
                                                <span className="font-medium text-gray-900">{abutment.name}</span>
                                            </div>
                                            <Input
                                                type="text"
                                                value={abutment.price === "--" ? "$--" : `$${abutment.price}`}
                                                readOnly
                                                className="w-20 h-8 text-sm text-gray-600 border-gray-300"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSelectAllAbutments}
                                        className="text-gray-700 border-gray-300 hover:bg-gray-100"
                                    >
                                        {selectedAbutments.length === abutmentLibraries.length ? "Clear all" : "Select all"}
                                    </Button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600">
                                {selectedAbutments.length} stage{selectedAbutments.length !== 1 ? 's' : ''} selected
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
                            disabled={selectedAbutments.length === 0 || selectedProducts.length === 0 || isSubmitting}
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
























