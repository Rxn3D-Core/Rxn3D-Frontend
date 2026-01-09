import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import type { Doctor, Lab, PatientData, Product, SavedProduct } from "@/app/case-design-center/sections/types"
import { getCustomerIdForApi } from "@/utils/case-design-helpers"

interface UseCaseDesignDataReturn {
  selectedDoctor: Doctor | null
  selectedLab: Lab | null
  patientData: PatientData | null
  createdBy: string
  savedProducts: SavedProduct[]
  selectedProduct: Product | null
  productDetails: any | null
  setSelectedDoctor: (doctor: Doctor | null) => void
  setSelectedLab: (lab: Lab | null) => void
  setPatientData: (data: PatientData | null) => void
  setCreatedBy: (name: string) => void
  setSavedProducts: (products: SavedProduct[]) => void
  setSelectedProduct: (product: Product | null) => void
  setProductDetails: (details: any | null) => void
}

/**
 * Hook to manage case design data loading from localStorage and saving
 */
export function useCaseDesignData(
  fetchAllCategories: (lang: string, customerId?: number) => void
): UseCaseDesignDataReturn {
  const { toast } = useToast()
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null)
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [createdBy, setCreatedBy] = useState<string>("")
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productDetails, setProductDetails] = useState<any | null>(null)

  // Load data from localStorage on mount
  useEffect(() => {
    // Get selected doctor
    const storedDoctor = localStorage.getItem("selectedDoctor")
    if (storedDoctor) {
      try {
        const doctor = JSON.parse(storedDoctor)
        setSelectedDoctor(doctor)
      } catch (error) {
        console.error("Error parsing selected doctor:", error)
      }
    }

    // Get selected lab
    const storedLab = localStorage.getItem("selectedLab")
    if (storedLab) {
      try {
        const lab = JSON.parse(storedLab)
        setSelectedLab(lab)
      } catch (error) {
        console.error("Error parsing selected lab:", error)
      }
    }

    // Get patient data
    const storedPatientData = localStorage.getItem("patientData")
    if (storedPatientData) {
      try {
        const patient = JSON.parse(storedPatientData)
        setPatientData(patient)
      } catch (error) {
        console.error("Error parsing patient data:", error)
      }
    }

    // Get created by from localStorage (user info)
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCreatedBy(`${user.first_name || ""} ${user.last_name || ""}`.trim())
      } catch (error) {
        console.error("Error parsing user:", error)
      }
    }

    // Fetch categories
    // For office_admin, use selectedLab.id; for others, use customerId
    const customerIdNum = getCustomerIdForApi(null)
    fetchAllCategories("en", customerIdNum)

    // Load saved products from localStorage
    const storedProducts = localStorage.getItem("savedProducts")
    if (storedProducts) {
      try {
        const products = JSON.parse(storedProducts)
        setSavedProducts(products)
      } catch (error) {
        console.error("Error parsing saved products:", error)
      }
    }

    // Load selected product and its details from localStorage if available
    const storedProduct = localStorage.getItem("selectedProduct")
    if (storedProduct) {
      try {
        const product = JSON.parse(storedProduct)
        setSelectedProduct(product)

        // Try to load product details from localStorage
        const storedDetails = localStorage.getItem(`productDetails_${product.id}`)
        if (storedDetails) {
          try {
            const details = JSON.parse(storedDetails)
            setProductDetails(details)
          } catch (error) {
            console.error("Error parsing stored product details:", error)
          }
        }
      } catch (error) {
        console.error("Error parsing selected product:", error)
      }
    }
  }, [fetchAllCategories])

  // Save products to localStorage whenever savedProducts changes
  // Moved to event handler - this should be called explicitly when products change
  const saveProductsToStorage = (products: SavedProduct[]) => {
    if (products.length === 0) return

    try {
      // Optimize data before saving - remove large unnecessary fields from productDetails
      const optimizedProducts = products.map((sp) => {
        const { productDetails, ...rest } = sp
        // Only keep essential fields from productDetails if needed
        const optimizedDetails = productDetails ? {
          id: productDetails.id,
          // Add only essential fields you need to restore
          // Remove large nested objects, arrays, etc.
        } : null

        return {
          ...rest,
          // Store minimal product data - remove image_url if it's a large base64 string
          product: {
            ...sp.product,
            // Remove large image data if present
            image_url: sp.product.image_url?.startsWith('data:') ? undefined : sp.product.image_url
          },
          productDetails: optimizedDetails
        }
      })

      const dataToSave = JSON.stringify(optimizedProducts)

      // Check size before saving (localStorage limit is usually ~5-10MB)
      const sizeInMB = new Blob([dataToSave]).size / (1024 * 1024)
      if (sizeInMB > 4) {
        console.warn(`Data size (${sizeInMB.toFixed(2)}MB) is approaching localStorage limit. Consider removing old items.`)
      }

      localStorage.setItem("savedProducts", dataToSave)
    } catch (error: any) {
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.error("localStorage quota exceeded. Attempting to clear old data...")

        // Try to remove old items or other localStorage data
        try {
          // Remove old saved products (keep only last 10)
          if (products.length > 10) {
            const recentProducts = products.slice(-10)
            const optimizedRecent = recentProducts.map((sp) => {
              const { productDetails, ...rest } = sp
              return {
                ...rest,
                product: {
                  ...sp.product,
                  image_url: sp.product.image_url?.startsWith('data:') ? undefined : sp.product.image_url
                },
                productDetails: null // Remove productDetails to save space
              }
            })
            localStorage.setItem("savedProducts", JSON.stringify(optimizedRecent))
            toast({
              title: "Storage Limit",
              description: "Some older items were removed to save space. Only the 10 most recent products are saved.",
              variant: "default",
            })
          } else {
            // If still too large, remove productDetails entirely
            const minimalProducts = products.map((sp) => {
              const { productDetails, ...rest } = sp
              return {
                ...rest,
                product: {
                  id: sp.product.id,
                  name: sp.product.name,
                  price: sp.product.price,
                  estimated_days: sp.product.estimated_days,
                  // Remove image_url if it's large
                  image_url: sp.product.image_url?.startsWith('data:') ? undefined : sp.product.image_url
                },
                productDetails: null
              }
            })
            localStorage.setItem("savedProducts", JSON.stringify(minimalProducts))
            toast({
              title: "Storage Optimized",
              description: "Product details were removed to save space. Essential data is preserved.",
              variant: "default",
            })
          }
        } catch (retryError) {
          console.error("Failed to save even after optimization:", retryError)
          toast({
            title: "Storage Error",
            description: "Unable to save all products. Please reduce the number of items or clear browser storage.",
            variant: "destructive",
          })
        }
      } else {
        console.error("Error saving to localStorage:", error)
        toast({
          title: "Save Error",
          description: "Failed to save products. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  // Wrapper for setSavedProducts that also saves to localStorage
  const setSavedProductsWithSave = (products: SavedProduct[]) => {
    setSavedProducts(products)
    saveProductsToStorage(products)
  }

  return {
    selectedDoctor,
    selectedLab,
    patientData,
    createdBy,
    savedProducts,
    selectedProduct,
    productDetails,
    setSelectedDoctor,
    setSelectedLab,
    setPatientData,
    setCreatedBy,
    setSavedProducts: setSavedProductsWithSave,
    setSelectedProduct,
    setProductDetails,
  }
}
