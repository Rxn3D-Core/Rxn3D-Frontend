"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { X, Search, Plus, Minus } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/contexts/auth-context"
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
  const [selectedAddOns, setSelectedAddOns] = useState<
    { addon_id: number; qty: number; category: string; subcategory: string; name: string; price: number; tempId: string }[]
  >([])

  const { token } = useAuth()
  
  // Zustand store for add-ons management
  const {
    addAddOn,
    removeAddOn,
    setProductAddOns,
    productAddOns: storeProductAddOns
  } = useCaseDesignStore()

  // Reset selected add-ons when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAddOns([])
      setSearchTerm("")
    }
  }, [isOpen])

  // Debounced search term for React Query
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [searchTerm])

  // Fetch addons using React Query
  const productIdNum = useMemo(() => {
    const parsed = parseInt(productId, 10)
    return isNaN(parsed) ? null : parsed
  }, [productId])

  // Get the correct lab ID based on user role
  const effectiveLabId = useMemo(() => {
    const role = localStorage.getItem("role")
    return role === "office_admin" || role === "doctor"
      ? localStorage.getItem("selectedLabId") 
      : localStorage.getItem("customerId")
  }, [])

  const fetchAddons = useCallback(async () => {
    if (!productIdNum || !effectiveLabId) return []
    
    const url = new URL(`/v1/slip/lab/${effectiveLabId}/products/${productIdNum}/addons`, process.env.NEXT_PUBLIC_API_BASE_URL)
    if (debouncedSearchTerm.trim()) {
      url.searchParams.append("search", debouncedSearchTerm.trim())
    }
    
    const res = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    
    if (res.status === 401) {
      window.location.href = "/login"
      return []
    }
    
    const json = await res.json()
    return json.data || []
  }, [productIdNum, effectiveLabId, debouncedSearchTerm, token])

  const { data: addOnCategories = [], isLoading: loading } = useQuery<ApiCategory[]>({
    queryKey: ['product-addons', productIdNum, effectiveLabId, debouncedSearchTerm],
    queryFn: fetchAddons,
    enabled: isOpen && !!productIdNum && !!effectiveLabId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

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


  // Handle incrementing add-on quantity (adds or increments in selectedAddOns)
  const handleIncrementAddOn = (category: ApiCategory, subcategory: ApiSubcategory, addon: ApiAddon) => {
    setSelectedAddOns(prev => {
      const existingIndex = prev.findIndex(
        item => item.addon_id === addon.id && 
                item.category === category.name && 
                item.subcategory === subcategory.name
      )
      
      if (existingIndex >= 0) {
        // If exists, increment quantity (max 10)
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: Math.min(10, updated[existingIndex].qty + 1)
        }
        return updated
      } else {
        // If doesn't exist, add new item with qty 1
        return [
          ...prev,
          {
            addon_id: addon.id,
            qty: 1,
            category: category.name,
            subcategory: subcategory.name,
            name: addon.name,
            price: Number(typeof addon.price === "string" ? parseFloat(addon.price) : addon.price),
            tempId: `${addon.id}-${Date.now()}`
          }
        ]
      }
    })
  }

  // Handle decrementing add-on quantity (decrements or removes from selectedAddOns)
  const handleDecrementAddOn = (category: ApiCategory, subcategory: ApiSubcategory, addon: ApiAddon) => {
    setSelectedAddOns(prev => {
      const existingIndex = prev.findIndex(
        item => item.addon_id === addon.id && 
                item.category === category.name && 
                item.subcategory === subcategory.name
      )
      
      if (existingIndex >= 0) {
        const currentQty = prev[existingIndex].qty
        if (currentQty > 1) {
          // If qty > 1, decrement
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            qty: currentQty - 1
          }
          return updated
        } else {
          // If qty = 1, remove the item
          return prev.filter((_, index) => index !== existingIndex)
        }
      }
      return prev
    })
  }

  // Get current quantity for an add-on from selectedAddOns
  const getCurrentQty = (addonId: number, categoryName: string, subcategoryName: string): number => {
    const existing = selectedAddOns.find(
      item => item.addon_id === addonId && 
              item.category === categoryName && 
              item.subcategory === subcategoryName
    )
    return existing ? existing.qty : 0
  }

  const handleRemoveAddOn = (tempId: string) => {
    setSelectedAddOns(prev => prev.filter(item => item.tempId !== tempId))
  }

  const handleRemoveExistingAddOn = (index: number) => {
    removeAddOn(productId, arch, index)
  }

  const handleConfirmAddOns = () => {
    const newAddOns = selectedAddOns.map(({ tempId, ...rest }) => rest)

    // Build the combined list: existing store addons + newly selected
    const allAddOns = [
      ...existingAddOns.map(a => ({
        addon_id: a.addon_id,
        qty: a.qty,
        quantity: a.qty,
        category: a.category,
        subcategory: a.subcategory,
        addOn: a.name,
        name: a.name,
        label: a.name,
        price: a.price,
      })),
      ...newAddOns.map(a => ({
        addon_id: a.addon_id,
        qty: a.qty,
        quantity: a.qty,
        category: a.category,
        subcategory: a.subcategory,
        addOn: a.name,
        name: a.name,
        label: a.name,
        price: a.price,
      })),
    ]

    // Replace the entire arch's addons in the store (avoids duplication)
    const currentStoreAddOns = storeProductAddOns[productId] || { maxillary: [], mandibular: [] }
    setProductAddOns(productId, {
      ...currentStoreAddOns,
      [arch]: allAddOns,
    })

    // Call the callback with ALL addons so the field value reflects the full set
    onAddAddOns(allAddOns.map(a => ({
      addon_id: a.addon_id,
      qty: a.qty,
      category: a.category,
      subcategory: a.subcategory,
      name: a.name,
      price: typeof a.price === 'number' ? a.price : parseFloat(String(a.price) || '0'),
    })))
    setSelectedAddOns([])
    onClose()
  }

  const handleCancel = () => {
    setSelectedAddOns([])
    onClose()
  }

  // Filter categories/subcategories/addons by search term
  // Note: Search is now handled by the API, but we can still filter client-side if needed
  const filteredCategories = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return addOnCategories
    }
    // Client-side filtering as fallback (API should handle this, but keeping for safety)
    return addOnCategories
      .map(category => ({
        ...category,
        subcategories: category.subcategories
          .map(subcat => ({
            ...subcat,
            addons: subcat.addons.filter(addon =>
              addon.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
              addon.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
            )
          }))
          .filter(subcat => subcat.addons.length > 0)
      }))
      .filter(category => category.subcategories.length > 0)
  }, [addOnCategories, debouncedSearchTerm])

  // Calculate totals for all add-ons (existing + selected)
  const totalAddOns = useMemo(() => {
    const allAddOns = [...existingAddOns, ...selectedAddOns]
    const totalCount = allAddOns.reduce((sum, item) => sum + item.qty, 0)
    const totalPrice = allAddOns.reduce((sum, item) => sum + (item.qty * item.price), 0)
    return { totalCount, totalPrice }
  }, [existingAddOns, selectedAddOns])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl p-6 rounded-xl shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Add ons</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-6 flex-1 min-h-0 max-h-[70vh]">
          {/* Left Column - Selection */}
          <div className="flex flex-col min-h-0">
            <div className="relative mb-4 flex-shrink-0">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search Add ons"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 py-2 rounded-lg"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2 min-h-0">
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
                            <div className="grid grid-cols-3 gap-4 mb-2 text-sm font-medium text-gray-700">
                              <div>Add-on</div>
                              <div>Price</div>
                              <div>Qty</div>
                            </div>
                            {subcat.addons.map((addon) => {
                              const currentQty = getCurrentQty(addon.id, category.name, subcat.name)
                              return (
                                <div key={addon.id} className="grid grid-cols-3 gap-4 items-center mb-2">
                                  <div>{addon.name}</div>
                                  <div>
                                    {`$${Number(typeof addon.price === "string" ? parseFloat(addon.price) : addon.price).toFixed(2)}`}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleDecrementAddOn(category, subcat, addon)}
                                      disabled={currentQty === 0}
                                    >
                                      <Minus className="w-4 h-4" />
                                    </Button>
                                    <span className="min-w-[2rem] text-center font-medium">{currentQty}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleIncrementAddOn(category, subcat, addon)}
                                      disabled={currentQty >= 10}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
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
            </div>
          </div>

          {/* Right Column - Added Add-ons */}
          <div className="flex flex-col min-h-0">
            <div className="flex-shrink-0 mb-3">
              <h3 className="font-semibold text-base mb-2">Added Add-ons:</h3>
              {(existingAddOns.length > 0 || selectedAddOns.length > 0) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700">Total Items:</span>
                    <span className="font-semibold">{totalAddOns.totalCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="font-medium text-gray-700">Total Price:</span>
                    <span className="font-semibold text-[#1162a8]">${totalAddOns.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 min-h-0">
              {(existingAddOns.length > 0 || selectedAddOns.length > 0) ? (
                <div className="p-4 border rounded-lg bg-gray-50">
                  <ul className="space-y-2">
                    {/* Show existing add-ons (already configured) */}
                    {existingAddOns.map((item, idx) => (
                      <li key={`existing-${item.addon_id}-${idx}`} className="flex items-center justify-between text-sm p-2 bg-white rounded border">
                        <span className="flex-1">
                          {item.qty} x {item.name} ({item.category} / {item.subcategory}) - {`$${Number(item.price).toFixed(2)}`}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveExistingAddOn(idx)}>
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </li>
                    ))}
                    {/* Show add-ons selected in this session */}
                    {selectedAddOns.map((item) => (
                      <li key={item.tempId} className="flex items-center justify-between text-sm p-2 bg-white rounded border">
                        <span className="flex-1">
                          {item.qty} x {item.name} ({item.category} / {item.subcategory}) - {`$${Number(item.price).toFixed(2)}`}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAddOn(item.tempId)}>
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-4 border rounded-lg bg-gray-50 text-center text-gray-500 text-sm">
                  No add-ons added yet
                </div>
              )}
            </div>
          </div>
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
