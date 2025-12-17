"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { X, Search, Plus, Minus } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import { useCaseDesignStore } from "@/stores/caseDesignStore"

// Accept labId, productId, and arch as props
interface AddOnsModalProps {
  isOpen: boolean
  onClose: () => void
  onAddAddOns: (addOns: { addon_id: number; qty: number; category: string; subcategory: string; name: string; price: number }[]) => void
  labId: number
  productId: string // Changed to string to match the store
  arch: "maxillary" | "mandibular" // Added arch parameter
}

type ApiAddon = {
  id: number
  name: string
  code: string
  sequence: number
  price: number
  status: string
}

type ApiSubcategory = {
  id: number
  name: string
  code: string
  sequence: number
  addons: ApiAddon[]
}

type ApiCategory = {
  id: number
  name: string
  code: string
  sequence: number
  subcategories: ApiSubcategory[]
}

export default function AddOnsModal({ isOpen, onClose, onAddAddOns, labId, productId, arch }: AddOnsModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [addOnCategories, setAddOnCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAddOns, setSelectedAddOns] = useState<
    { addon_id: number; qty: number; category: string; subcategory: string; name: string; price: number; tempId: string }[]
  >([])
  // Track current selection per subcategory and addon
  const [currentSelections, setCurrentSelections] = useState<{
    [subcategoryId: string]: { [addonId: number]: number }
  }>({})

  const { productAddons, fetchProductAddons, searchedProductAddons, searchProductAddons } = useSlipCreation()
  
  // Zustand store for add-ons management
  const { 
    getProductAddOns, 
    addAddOn, 
    removeAddOn,
    setProductAddOns,
    productAddOns: storeProductAddOns
  } = useCaseDesignStore()

  // Refs for debouncing and request cancellation
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hasLoadedRef = useRef<boolean>(false)

  // Get existing add-ons from Zustand store in real-time
  const existingAddOns = useMemo(() => {
    const storeAddOns = storeProductAddOns[productId]
    if (!storeAddOns || !storeAddOns[arch]) return []
    
    return storeAddOns[arch].map(addOn => ({
      addon_id: addOn.addon_id || 0,
      qty: addOn.qty || addOn.quantity || 1,
      category: addOn.category || '',
      subcategory: addOn.subcategory || '',
      name: addOn.addOn || addOn.name || addOn.label || '',
      price: typeof addOn.price === 'number' ? addOn.price : parseFloat(addOn.price || '0')
    }))
  }, [storeProductAddOns, productId, arch])

  // Single debounced function to handle all API calls
  const debouncedFetch = useCallback((searchTerm: string, isInitialLoad: boolean = false) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    // For initial load, don't debounce - load immediately
    const delay = isInitialLoad ? 0 : 500 // Increased debounce delay for search

    debounceTimeoutRef.current = setTimeout(async () => {
      if (!productId) return

      console.log(`🔍 Fetching addons for product ${productId}, search: "${searchTerm}", isInitial: ${isInitialLoad}`)
      setLoading(true)
      try {
        const productIdNum = parseInt(productId, 10)
        if (searchTerm.trim()) {
          await searchProductAddons(productIdNum, searchTerm)
        } else {
          await fetchProductAddons(productIdNum)
        }
      } catch (error) {
        // Only log error if it's not an abort error
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error fetching addons:', error)
        }
      } finally {
        setLoading(false)
      }
    }, delay)
  }, [productId, fetchProductAddons, searchProductAddons])

  // Handle search term changes with debouncing (only after initial load and only if search term changes)
  useEffect(() => {
    if (isOpen && productId && hasLoadedRef.current && searchTerm !== "") {
      debouncedFetch(searchTerm, false)
    }
    
    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [searchTerm, isOpen, productId, debouncedFetch])

  // Load initial data when modal opens (only if no data exists and not already loaded)
  useEffect(() => {
    if (isOpen && productId && !hasLoadedRef.current) {
      // Check if we already have data for this product
      const hasData = productAddons && productAddons.length > 0
      
      if (!hasData) {
        hasLoadedRef.current = true
        debouncedFetch("", true) // Initial load with empty search term
      } else {
        // Data already exists, just set the categories
        setAddOnCategories(productAddons)
        hasLoadedRef.current = true
      }
    }
  }, [isOpen, productId, productAddons, debouncedFetch])

  // Reset loaded flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasLoadedRef.current = false
    }
  }, [isOpen])

  // Update categories based on search results
  useEffect(() => {
    if (searchTerm && searchedProductAddons) {
      setAddOnCategories(searchedProductAddons)
    } else if (!searchTerm && productAddons) {
      setAddOnCategories(productAddons)
    }
  }, [searchTerm, productAddons, searchedProductAddons])


  // Allow multiple add-ons per subcategory
  const handleAddClick = (category: ApiCategory, subcategory: ApiSubcategory, addon: ApiAddon) => {
    const qty = currentSelections[subcategory.id]?.[addon.id]
    if (qty) {
      setSelectedAddOns(prev => [
        ...prev,
        {
          addon_id: addon.id,
          qty,
          category: category.name,
          subcategory: subcategory.name,
          name: addon.name,
          price: Number(typeof addon.price === "string" ? parseFloat(addon.price) : addon.price),
          tempId: `${addon.id}-${Date.now()}`
        }
      ])
      // Reset only this addon's qty selection
      setCurrentSelections(prev => ({
        ...prev,
        [subcategory.id]: {
          ...prev[subcategory.id],
          [addon.id]: 0
        }
      }))
    }
  }

  const handleRemoveAddOn = (tempId: string) => {
    setSelectedAddOns(prev => prev.filter(item => item.tempId !== tempId))
  }

  const handleRemoveExistingAddOn = (index: number) => {
    removeAddOn(productId, arch, index)
  }

  const handleConfirmAddOns = () => {
    const newAddOns = selectedAddOns.map(({ tempId, ...rest }) => rest)
    
    // Add each new add-on to the Zustand store
    newAddOns.forEach(addOn => {
      addAddOn(productId, arch, {
        addon_id: addOn.addon_id,
        qty: addOn.qty,
        quantity: addOn.qty,
        category: addOn.category,
        subcategory: addOn.subcategory,
        addOn: addOn.name,
        name: addOn.name,
        label: addOn.name,
        price: addOn.price
      })
    })
    
    // Also call the original callback for backward compatibility
    onAddAddOns(newAddOns)
    onClose()
  }

  const handleCancel = () => {
    setSelectedAddOns([])
    setCurrentSelections({})
    onClose()
  }

  // Filter categories/subcategories/addons by search term
  const filteredCategories = addOnCategories
    .map(category => ({
      ...category,
      subcategories: category.subcategories
        .map(subcat => ({
          ...subcat,
          addons: subcat.addons.filter(addon =>
            addon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            addon.code.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }))
        .filter(subcat => subcat.addons.length > 0)
    }))
    .filter(category => category.subcategories.length > 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-6 rounded-xl shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Add ons</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search Add ons"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-2 rounded-lg"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading add-ons...</div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {filteredCategories.map((category) => (
                <AccordionItem key={category.id} value={category.id.toString()} className="border rounded-lg mb-2">
                  <AccordionTrigger className="px-4 py-3 font-medium hover:no-underline">
                    {category.name}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {category.subcategories.map((subcat) => (
                      <div key={subcat.id} className="mb-6">
                        <div className="font-semibold mb-2">{subcat.name}</div>
                        <div className="grid grid-cols-4 gap-4 mb-2 text-sm font-medium text-gray-700">
                          <div>Add-on</div>
                          <div>Price</div>
                          <div>Qty</div>
                          <div></div>
                        </div>
                        {subcat.addons.map((addon) => {
                          const currentQty = currentSelections[subcat.id]?.[addon.id] || 0
                          return (
                            <div key={addon.id} className="grid grid-cols-4 gap-4 items-center mb-2">
                              <div>{addon.name}</div>
                              <div>
                                {`$${Number(typeof addon.price === "string" ? parseFloat(addon.price) : addon.price).toFixed(2)}`}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                  onClick={() =>
                                    setCurrentSelections(prev => ({
                                      ...prev,
                                      [subcat.id]: {
                                        ...prev[subcat.id],
                                        [addon.id]: Math.max(0, (prev[subcat.id]?.[addon.id] || 0) - 1)
                                      }
                                    }))
                                  }
                                  disabled={currentQty === 0}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="min-w-[2rem] text-center font-medium">{currentQty}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                  onClick={() =>
                                    setCurrentSelections(prev => ({
                                      ...prev,
                                      [subcat.id]: {
                                        ...prev[subcat.id],
                                        [addon.id]: Math.min(10, (prev[subcat.id]?.[addon.id] || 0) + 1)
                                      }
                                    }))
                                  }
                                  disabled={currentQty >= 10}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                className="bg-[#1162a8] hover:bg-[#0f5490] text-white"
                                onClick={() => handleAddClick(category, subcat, addon)}
                                disabled={currentQty === 0}
                              >
                                <Plus className="w-4 h-4 mr-1" /> Add
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          {(existingAddOns.length > 0 || selectedAddOns.length > 0) && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold text-base mb-3">Added Add-ons:</h3>
              <ul className="space-y-2">
                {/* Show existing add-ons (already configured) */}
                {existingAddOns.map((item, idx) => (
                  <li key={`existing-${item.addon_id}-${idx}`} className="flex items-center justify-between text-sm">
                    <span>
                      {item.qty} x {item.name} ({item.category} / {item.subcategory}) - {`$${Number(item.price).toFixed(2)}`}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveExistingAddOn(idx)}>
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </li>
                ))}
                {/* Show add-ons selected in this session */}
                {selectedAddOns.map((item) => (
                  <li key={item.tempId} className="flex items-center justify-between text-sm">
                    <span>
                      {item.qty} x {item.name} ({item.category} / {item.subcategory}) - {`$${Number(item.price).toFixed(2)}`}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveAddOn(item.tempId)}>
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button className="bg-[#1162a8] hover:bg-[#0f5490] text-white" onClick={handleConfirmAddOns}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
