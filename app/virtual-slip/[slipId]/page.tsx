"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Breadcrumb } from "@/components/breadcrumb"
import ColorfulActionButtons from "@/components/colorful-action-buttons"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Calendar, Clock, Zap, Eye } from "lucide-react"
import InteractiveDentalChart3D from "@/components/interactive-dental-chart-3D"
import CaseDesignCenterSection from "@/components/case-design-center-section"
import dayjs from "dayjs"
import LoadingOverlay from "@/components/ui/loading-overlay"
import { useImpressionQuantitiesStore } from "@/stores/impression-quantities-store"

// LoadingDots component
function LoadingDots() {
  return (
    <div className="flex justify-center items-center space-x-1">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
    </div>
  )
}

export default function VirtualSlipPage() {
  const params = useParams()
  const router = useRouter()
  const slipId = params?.slipId as string
  const { virtualSlipDetails, fetchVirtualSlipDetails } = useSlipCreation()
  const [loading, setLoading] = useState(true)
  const { updateImpressionQuantity, clearImpressionQuantitiesForProduct } = useImpressionQuantitiesStore()

  // Convert slip details to form data format
  const [formData, setFormData] = useState({
    doctor: "",
    patient: "",
    panNumber: "",
    caseNumber: "",
    slipNumber: "",
    createdBy: "",
    location: "",
    caseStatus: "",
    pickupDate: "",
    deliveryDate: "",
    deliveryTime: "",
    lab: "",
    office: "",
    qrCode: "",
    contact: "",
    email: "",
  })

  const [products, setProducts] = useState<any[]>([])
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([])
  const [openAccordionItem, setOpenAccordionItem] = useState<string | undefined>(undefined)
  const [rushRequests, setRushRequests] = useState<{ [key: string]: any }>({})
  const [allNotes, setAllNotes] = useState<any[]>([])
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  // Debug selectedTeeth changes
  useEffect(() => {
  }, [selectedTeeth])

  // Test teeth parsing with sample data
  useEffect(() => {
    // Test with the sample data you provided
    const testProducts = [
      {
        id: 1,
        type: "Upper",
        teeth_selection: "7,8,9"
      },
      {
        id: 2,
        type: "Lower", 
        teeth_selection: "7,8,9"
      }
    ];
    const testTeeth = parseTeethSelection(testProducts);
    
    // Also test with the exact API response structure
    const apiResponseProducts = [
      {
        "id": 1,
        "type": "Upper",
        "status": "Draft",
        "teeth_selection": "7,8,9",
        "notes": "",
        "created_at": "2025-10-02T15:24:46.000000Z",
        "updated_at": "2025-10-02T15:24:46.000000Z"
      },
      {
        "id": 2,
        "type": "Lower",
        "status": "Draft", 
        "teeth_selection": "7,8,9",
        "notes": "",
        "created_at": "2025-10-02T15:24:46.000000Z",
        "updated_at": "2025-10-02T15:24:46.000000Z"
      }
    ];
    const apiTestTeeth = parseTeethSelection(apiResponseProducts);
  }, [])

  // Parse teeth selection from products
  const parseTeethSelection = (products: any[]) => {
    const allTeeth: number[] = []
    products.forEach(product => {
      if (product.teeth_selection) {
        const teeth = product.teeth_selection.split(',').map((t: string) => parseInt(t.trim())).filter((t: number) => !isNaN(t))
        allTeeth.push(...teeth)
      }
    })
    const uniqueTeeth = [...new Set(allTeeth)] // Remove duplicates
    return uniqueTeeth
  }

  // Auto-select teeth based on slip data
  const autoSelectTeethFromSlipData = (slipData: any) => {
    if (slipData?.products && Array.isArray(slipData.products)) {
      const teethFromProducts = parseTeethSelection(slipData.products)
      
      // If no teeth are found in the slip data, provide some default teeth based on product type
      if (teethFromProducts.length === 0) {
        const defaultTeeth: number[] = []
        
        slipData.products.forEach((product: any) => {
          if (product.type === "Upper") {
            // Default to some common upper teeth (7, 8, 9, 10)
            defaultTeeth.push(...[7, 8, 9, 10])
          } else if (product.type === "Lower") {
            // Default to some common lower teeth (23, 24, 25, 26)
            defaultTeeth.push(...[23, 24, 25, 26])
          }
        })
        
        // Remove duplicates and set the default teeth
        const uniqueDefaultTeeth = [...new Set(defaultTeeth)]
        setSelectedTeeth(uniqueDefaultTeeth)
      } else {
        setSelectedTeeth(teethFromProducts)
      }
    }
  }

  // Initialize impression quantities from converted products
  const initializeImpressionQuantities = (convertedProducts: any[]) => {
    convertedProducts.forEach((product) => {
      // Clear any existing impression quantities for this product to avoid stale data
      clearImpressionQuantitiesForProduct(product.id)

      // Initialize maxillary impressions
      if (product.maxillaryConfig?.impressions && Array.isArray(product.maxillaryConfig.impressions) && product.maxillaryConfig.impressions.length > 0) {
        product.maxillaryConfig.impressions.forEach((imp: any) => {
          const key = `${product.id}_maxillary_${imp.name}`
          const qty = imp.qty || imp.quantity || 1
          updateImpressionQuantity(key, qty)
        })
      }

      // Initialize mandibular impressions
      if (product.mandibularConfig?.impressions && Array.isArray(product.mandibularConfig.impressions) && product.mandibularConfig.impressions.length > 0) {
        product.mandibularConfig.impressions.forEach((imp: any) => {
          const key = `${product.id}_mandibular_${imp.name}`
          const qty = imp.qty || imp.quantity || 1
          updateImpressionQuantity(key, qty)
        })
      }
    })
  }

  // Process virtual slip data (used for both API and localStorage data)
  const processVirtualSlipData = (slipData: any) => {
    const case_data = slipData.case || {};
    const location = slipData.location || {};
    const delivery = slipData.delivery || {};
    
    setFormData({
      doctor: case_data.doctor?.name || "",
      patient: case_data.patient_name || "",
      panNumber: slipData.casepan?.number || "",
      caseNumber: case_data.case_number || "",
      slipNumber: slipData.slip_number || "",
      createdBy: case_data.created_by?.name || "",
      location: location.name || "",
      caseStatus: case_data.case_status || "",
      pickupDate: delivery.pickup_date || "",
      deliveryDate: delivery.delivery_date || "",
      deliveryTime: delivery.delivery_time || "",
      lab: case_data.lab?.name || "",
      office: case_data.office?.name || "",
      qrCode: slipData.qr_code || "",
      contact: case_data.office?.contact || "",
      email: case_data.office?.email || "",
      // Add nested delivery structure for CaseDesignCenterSection compatibility
      delivery: {
        delivery_date: delivery.delivery_date || "",
        delivery_time: delivery.delivery_time || "",
        pickup_date: delivery.pickup_date || ""
      }
    });

    // Map products
    if (slipData.products && Array.isArray(slipData.products)) {
      const convertedProducts = convertProductsToDesignFormat(slipData.products, delivery.delivery_date)
      setProducts(convertedProducts)

      // Initialize impression quantities from converted products
      initializeImpressionQuantities(convertedProducts)

      // Auto-select teeth based on slip data AFTER products are processed
      autoSelectTeethFromSlipData(slipData);

      // Automatically open the first product when data is loaded
      if (convertedProducts.length > 0) {
        setOpenAccordionItem(convertedProducts[0].id)
      }

      // Set rush requests if any
      const rushData: { [key: string]: any } = {}
      slipData.products.forEach((product: any, index: number) => {
        if (product.rush?.is_rush) {
          rushData[product.id.toString()] = {
            is_rush: true,
            requested_rush_date: product.rush.requested_rush_date
          }
        }
      })
      setRushRequests(rushData)
      
      // Set notes if available
      if (slipData.notes && Array.isArray(slipData.notes)) {
        setAllNotes(slipData.notes.map((note: any) => ({
          id: note.id.toString(),
          date: new Date(note.timestamp).toLocaleDateString(),
          time: new Date(note.timestamp).toLocaleTimeString(),
          author: note.created_by?.name || 'Unknown',
          content: note.note,
          attachments: note.attachments_count || 0,
          slipNumber: slipData.slip_number,
          stage: 'Try in with teeth', // Default stage
          deliveryDate: delivery.delivery_date ? dayjs(delivery.delivery_date).format("MM/DD/YYYY") : '',
          isRush: note.type === 'rush'
        })))
      }

      // Populate localStorage for CaseDesignCenterSection to read
      if (typeof window !== "undefined") {
        const cacheData = {
          products: convertedProducts,
          rushRequests: rushData,
          allNotes: slipData.notes || [],
          slipData: formData,
          isVirtualSlip: true
        }
        localStorage.setItem("caseDesignCache", JSON.stringify(cacheData))
      }
    } else {
      setProducts([]);
      setSelectedTeeth([]);
    }

    setIsDataLoaded(true);
    setLoading(false);
  }

  // Convert API products to case design format
  const convertProductsToDesignFormat = (apiProducts: any[], deliveryDate?: string) => {
    // Group products by product name, category, etc. to combine upper/lower of same product
    const productGroups: { [key: string]: any[] } = {}
    
    apiProducts.forEach((product) => {
      // Create a unique key for grouping products of the same type
      // Only group by product name and category to combine upper/lower arches
      const groupKey = `${product.product?.name || 'unknown'}_${product.category?.name || 'unknown'}`

      if (!productGroups[groupKey]) {
        productGroups[groupKey] = []
      }
      productGroups[groupKey].push(product)
    })

    return Object.entries(productGroups).map(([groupKey, products], index) => {
      // Combine all teeth from this group
      const allTeethNumbers: number[] = []
      const allTeethStrings: string[] = []

      products.forEach(product => {
        // Debug: Log impressions and addons for each product
        console.log(`📦 Product ${product.id} (${product.type}):`, {
          impressions: product.impressions,
          addons: product.addons
        });

        if (product.teeth_selection) {
          const teeth = product.teeth_selection.split(',').map((t: string) => parseInt(t.trim())).filter((t: number) => !isNaN(t))
          allTeethNumbers.push(...teeth)
          allTeethStrings.push(...product.teeth_selection.split(',').map((t: string) => t.trim()))
        }
      })

      // Remove duplicates
      const uniqueTeethNumbers = [...new Set(allTeethNumbers)]
      const uniqueTeethStrings = [...new Set(allTeethStrings)]

      // Find upper and lower products for config
      const upperProduct = products.find(p => (p.type || '').toLowerCase().includes('upper'))
      const lowerProduct = products.find(p => (p.type || '').toLowerCase().includes('lower'))
      const baseProduct = upperProduct || lowerProduct || products[0]

      // Determine arch type based on whether we have upper and/or lower products
      // This is more reliable than teeth numbers for submitted cases
      const hasUpperProduct = !!upperProduct
      const hasLowerProduct = !!lowerProduct

      // Calculate teeth-based arch detection - needed for maxillaryTeeth/mandibularTeeth fields
      const hasMaxillary = uniqueTeethNumbers.some((t: number) => t >= 1 && t <= 16)
      const hasMandibular = uniqueTeethNumbers.some((t: number) => t >= 17 && t <= 32)

      let type = ''
      if (hasUpperProduct && hasLowerProduct) {
        type = 'Maxillary, Mandibular'
      } else if (hasUpperProduct) {
        type = 'Maxillary'
      } else if (hasLowerProduct) {
        type = 'Mandibular'
      } else {
        // Fallback to teeth-based detection if no product type info
        if (hasMaxillary && hasMandibular) {
          type = 'Maxillary, Mandibular'
        } else if (hasMaxillary) {
          type = 'Maxillary'
        } else if (hasMandibular) {
          type = 'Mandibular'
        } else {
          type = 'Maxillary' // Default
        }
      }

      return {
        id: baseProduct.id.toString(),
        name: baseProduct.product?.name || baseProduct.category?.name || `Product ${index + 1}`,
        type: type,
        teeth: uniqueTeethStrings.join(', '),
        maxillaryTeeth: hasMaxillary ? uniqueTeethNumbers.filter((t: number) => t >= 1 && t <= 16).join(', ') : '',
        mandibularTeeth: hasMandibular ? uniqueTeethNumbers.filter((t: number) => t >= 17 && t <= 32).join(', ') : '',
        deliveryDate: deliveryDate ? dayjs(deliveryDate).format("MM/DD/YYYY") : '',
        image: "/images/product-default.png",
        abbreviation: baseProduct.category?.name?.substring(0, 3) || "MFA",
        color: "#ef4444",
        borderColor: "#dc2626",
        addOns: {
          maxillary: upperProduct?.addons?.map((addon: any) => ({
            category: addon.addon?.category?.name || 'Add-on',
            addOn: addon.addon?.name || 'Unknown',
            qty: addon.quantity || 1,
            addon_id: addon.addon_id || addon.id
          })) || [],
          mandibular: lowerProduct?.addons?.map((addon: any) => ({
            category: addon.addon?.category?.name || 'Add-on',
            addOn: addon.addon?.name || 'Unknown',
            qty: addon.quantity || 1,
            addon_id: addon.addon_id || addon.id
          })) || []
        },
        stageNotesContent: baseProduct.notes || '',
        maxillaryConfig: upperProduct ? {
          restoration: upperProduct.category?.name || '',
          productName: upperProduct.product?.name || '',
          grade: upperProduct.grade?.name || '',
          stage: upperProduct.stage?.name || '',
          teethShadeBrandId: upperProduct.teeth_shade_brand?.id,
          teethShadeBrandName: upperProduct.teeth_shade_brand?.name,
          teethShadeId: upperProduct.teeth_shade?.id,
          teethShadeName: upperProduct.teeth_shade?.name,
          gumShadeBrandId: upperProduct.gum_shade_brand?.id,
          gumShadeBrandName: upperProduct.gum_shade_brand?.name,
          gumShadeId: upperProduct.gum_shade?.id,
          gumShadeName: upperProduct.gum_shade?.name,
          teethShadePart1: upperProduct.teeth_shade_brand?.name || '',
          teethShadePart2: upperProduct.teeth_shade?.name || '',
          gumShadePart1: upperProduct.gum_shade_brand?.name || '',
          gumShadePart2: upperProduct.gum_shade?.name || '',
          impressions: upperProduct.impressions?.map((imp: any) => ({
            id: imp.impression_id || imp.id,
            name: imp.impression_name || imp.name || 'Unknown',
            qty: imp.quantity || imp.qty || 1
          })) || []
        } : {},
        mandibularConfig: lowerProduct ? {
          restoration: lowerProduct.category?.name || '',
          productName: lowerProduct.product?.name || '',
          grade: lowerProduct.grade?.name || '',
          stage: lowerProduct.stage?.name || '',
          teethShadeBrandId: lowerProduct.teeth_shade_brand?.id,
          teethShadeBrandName: lowerProduct.teeth_shade_brand?.name,
          teethShadeId: lowerProduct.teeth_shade?.id,
          teethShadeName: lowerProduct.teeth_shade?.name,
          gumShadeBrandId: lowerProduct.gum_shade_brand?.id,
          gumShadeBrandName: lowerProduct.gum_shade_brand?.name,
          gumShadeId: lowerProduct.gum_shade?.id,
          gumShadeName: lowerProduct.gum_shade?.name,
          teethShadePart1: lowerProduct.teeth_shade_brand?.name || '',
          teethShadePart2: lowerProduct.teeth_shade?.name || '',
          gumShadePart1: lowerProduct.gum_shade_brand?.name || '',
          gumShadePart2: lowerProduct.gum_shade?.name || '',
          impressions: lowerProduct.impressions?.map((imp: any) => ({
            id: imp.impression_id || imp.id,
            name: imp.impression_name || imp.name || 'Unknown',
            qty: imp.quantity || imp.qty || 1
          })) || []
        } : {},
        // Add all products data for proper aggregation
        allProductsData: products
      }
    }).map((convertedProduct, idx) => {
      // Debug: Log the converted product structure
      console.log(`✅ Converted Product ${idx}:`, {
        id: convertedProduct.id,
        name: convertedProduct.name,
        type: convertedProduct.type,
        maxillaryImpressions: convertedProduct.maxillaryConfig?.impressions,
        mandibularImpressions: convertedProduct.mandibularConfig?.impressions,
        maxillaryAddons: convertedProduct.addOns?.maxillary,
        mandibularAddons: convertedProduct.addOns?.mandibular
      });
      return convertedProduct;
    });
  }

  useEffect(() => {
    if (slipId) {
      // Store slipId in localStorage for action buttons to use
      if (typeof window !== "undefined") {
        localStorage.setItem("slipId", slipId.toString());
      }
      
      // First check if we have fresh data from case creation in localStorage
      const virtualSlipData = localStorage.getItem("virtualSlipData");
      if (virtualSlipData) {
        try {
          const parsedData = JSON.parse(virtualSlipData);
          // Find the slip that matches the current slipId
          const matchingSlip = parsedData.slips?.find((slip: any) => slip.id === Number(slipId));
          if (matchingSlip) {
            // Process the localStorage data directly
            processVirtualSlipData(matchingSlip);
            // Clean up localStorage after using the data
            localStorage.removeItem("virtualSlipData");
            return;
          }
        } catch (error) {
          // Clean up invalid data
          localStorage.removeItem("virtualSlipData");
        }
      }
      
      // Fallback to API fetch if no localStorage data or slip not found
      fetchVirtualSlipDetails(Number(slipId));
    }
  }, [slipId])

  useEffect(() => {
    if (virtualSlipDetails) {
      processVirtualSlipData(virtualSlipDetails);
    }
  }, [virtualSlipDetails]);

  // Cleanup localStorage when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("caseDesignCache")
      }
    }
  }, [])

  if (loading) {
    return (
      <LoadingOverlay
        isLoading={true}
        title="Loading slip..."
        message="Please wait while we load your slip data"
        zIndex={99999}
      />
    )
  }

  // Only show "Slip Not Found" if we're not loading AND data hasn't been loaded from localStorage AND no API data exists
  if (!loading && !isDataLoaded && !virtualSlipDetails) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Slip Not Found</h2>
          <p className="text-gray-600">The requested slip could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white">
      {/* Header Section - Matching the image design exactly */}
      <div className="bg-white border-b">
        {/* Breadcrumb Navigation */}
        <div className="px-6 pt-4">
          <Breadcrumb />
        </div>

        {/* Slip Header - 4 Column Grid Layout */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-x-8 gap-y-4 text-sm">
            {/* Row 1 */}
            {/* Column 1: Lab Logo and Name */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-500 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">HMC</span>
              </div>
              <div className="text-base font-semibold text-gray-900">
                {formData.lab || "HMC Innovs LLC"}
              </div>
            </div>

            {/* Column 2: Pan # */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Pan #:</span>
              <span className="text-gray-700">{formData.panNumber || "-----"}</span>
            </div>

            {/* Column 3: Created By */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Created By:</span>
              <span className="text-gray-700">{formData.createdBy || "Heide Cosa"}</span>
            </div>

            {/* Column 4: Pick up Date + RUSH Button */}
            <div className="flex items-center gap-4 justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">Pick up Date</span>
                <span className="text-gray-700">
                  {formData.pickupDate ? dayjs(formData.pickupDate).format("MM/DD/YYYY") : "01/10/2025"}
                </span>
                <Calendar className="h-5 w-5 text-gray-900" />
              </div>
              <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-semibold whitespace-nowrap transition-colors">
                <Zap className="h-4 w-4" fill="currentColor" />
                RUSH
              </button>
            </div>

            {/* Row 2 */}
            {/* Column 1: Doctor */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Doctor:</span>
              <span className="text-gray-700">{formData.doctor || "Cody Mugglestone"}</span>
            </div>

            {/* Column 2: Case # */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Case #</span>
              <span className="text-gray-700">{formData.caseNumber || "123456"}</span>
            </div>

            {/* Column 3: Location */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Location:</span>
              <span className="text-gray-700">{formData.location || "In Lab"}</span>
            </div>

            {/* Column 4: Delivery Date */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Delivery Date</span>
              <span className="text-gray-700">
                {formData.deliveryDate ? dayjs(formData.deliveryDate).format("MM/DD/YYYY") : "01/20/2025"}
              </span>
            </div>

            {/* Row 3 */}
            {/* Column 1: Patient */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Patient:</span>
              <span className="text-gray-700">{formData.patient || "Mary Gutierez"}</span>
            </div>

            {/* Column 2: Slip # */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Slip #:</span>
              <span className="text-gray-700">{formData.slipNumber || "665479"}</span>
            </div>

            {/* Column 3: Case Status */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Case Status:</span>
              <span className="text-gray-700">{formData.caseStatus || "In Process"}</span>
            </div>

            {/* Column 4: Delivery Time */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">Delivery Time</span>
              <span className="text-gray-700">
                {formData.deliveryTime && dayjs(formData.deliveryTime, ["HH:mm", "h:mm A"], true).isValid()
                  ? dayjs(formData.deliveryTime, ["HH:mm", "h:mm A"]).format("h:mm A")
                  : "4:00 PM"}
              </span>
              <Clock className="h-5 w-5 text-gray-900" />
            </div>
          </div>
        </div>
      </div>

      {/* Case Design Layout - Always show for submitted cases */}
      {isDataLoaded && products.length > 0 && (
        <div className="p-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 h-full">
            {/* Left: Maxillary Chart */}
            <div className="lg:col-span-3">
              <InteractiveDentalChart3D
                type="maxillary"
                selectedTeeth={selectedTeeth}
                onToothToggle={() => {}} // Read-only for virtual slip
                title="MAXILLARY"
                productTeethMap={{}}
                productButtons={products.filter(p => p.type.includes('Maxillary'))}
                visibleArch="upper"
                onProductButtonClick={(productId: string) => setOpenAccordionItem(productId)}
                openAccordionItem={openAccordionItem}
                isCaseSubmitted={true}
              />
            </div>

            {/* Center: Case Design Center */}
            <div className="lg:col-span-6">
              <CaseDesignCenterSection
                products={products}
                rushRequests={rushRequests}
                openAccordionItem={openAccordionItem}
                setOpenAccordionItem={setOpenAccordionItem}
                handleProductButtonClick={(id: string) => {
                  // For virtual slip, allow toggling - close if same item clicked
                  setOpenAccordionItem(openAccordionItem === id ? undefined : id)
                }}
                handleAddProductClick={() => {}} // Read-only
                handleDeleteProduct={() => {}} // Read-only
                handleProductDetailChange={() => {}} // Read-only
                handleUpdateStageNotes={() => {}} // Read-only
                handleOpenAddOnsModal={() => {}} // Read-only
                handleOpenMaxillaryAddOnsModal={() => {}} // Read-only
                handleOpenMandibularAddOnsModal={() => {}} // Read-only
                handleRushRequest={() => {}} // Read-only
                handleCancelRush={() => {}} // Read-only
                setShowAttachModal={() => {}} // Read-only
                showAttachModal={false}
                isCaseSubmitted={true}
                setShowStageNotesModal={() => {}} // Read-only
                allNotes={allNotes}
                setAllNotes={() => {}} // Read-only
                slipData={formData}
                productErrors={{}}
                handleAddAddOnsToProduct={() => {}} // Read-only
                handleUpdateDatesFromApi={() => {}} // Read-only
                hasSelectedTeeth={selectedTeeth.length > 0} // Pass the teeth selection state
                selectedMaxillaryTeeth={selectedTeeth.filter(t => t >= 1 && t <= 16)} // Maxillary teeth (1-16)
                selectedMandibularTeeth={selectedTeeth.filter(t => t >= 17 && t <= 32)} // Mandibular teeth (17-32)
              />
            </div>

            {/* Right: Mandibular Chart */}
            <div className="lg:col-span-3">
              <InteractiveDentalChart3D
                type="mandibular"
                selectedTeeth={selectedTeeth}
                onToothToggle={() => {}} // Read-only for virtual slip
                title="MANDIBULAR"
                productTeethMap={{}}
                productButtons={products.filter(p => p.type.includes('Mandibular'))}
                visibleArch="lower"
                onProductButtonClick={(productId: string) => setOpenAccordionItem(productId)}
                openAccordionItem={openAccordionItem}
                isCaseSubmitted={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <ColorfulActionButtons
        isCaseSubmitted={true} // Always submitted for virtual slip
        setShowSubmitWarningModal={() => {}} // No-op since it's read-only
        setShowPrintPreview={() => {}} // Can keep print functionality
        relatedSlipNumbers={[]}
        setShowPrintDriverTagsModal={() => {}}
        setShowPrintStatementModal={() => {}}
        setShowDriverHistoryModal={() => {}}
        setShowCallLogModal={() => {}}
        slipId={Number(slipId) || 0}
      />

    </div>
  )
}
