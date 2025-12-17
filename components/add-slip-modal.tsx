"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { X, Search, Calendar, Clock, Star, Zap, Filter } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useArchSelectionStore } from "@/stores/arch-selection-store"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DeliveryDateModal } from "./delivery-date-modal"
import AddSlipHeader from "./add-slip-header"
import { AddNewLabModal } from "./add-new-lab-modal"
import { useSlipCreation } from "@/contexts/slip-creation-context"

interface AddSlipFlowModalProps {
  isOpen: boolean
  onClose: () => void
  initialStep?: 1 | 2 // Allows starting at product selection for "Add Product" flow
  onAddSlipComplete: (data: {
    formData: any
    selectedLab: any
    selectedProduct: any
    selectedArch: string | null
  }) => void
  onCaseDetails?: (data: {
    formData: any
    selectedLab: any
    selectedProduct: any
    selectedArch: string | null
  }) => void // <-- Add this prop
}

interface ProductDetail {
  id: string
  name: string
  category: string
  subCategory: string
  stage: string
  daysToFinish: number
  image: string
  grade: string
  teethShade: string
  gumShade: string
  impression: string
  image_url?: string
  image_url_url?: string
}

const mockProducts: ProductDetail[] = [
  {
    id: "p1",
    name: "Metal Frame Acrylic",
    category: "Removable Restoration",
    subCategory: "Partial Denture",
    stage: "Multi Stage",
    daysToFinish: 19,
    image: "/placeholder.svg",
    grade: "Mid Grade",
    teethShade: "VITA A1",
    gumShade: "St. George - Light Vein",
    impression: "1x STL",
  },
  {
    id: "p2",
    name: "Full Denture Acrylic",
    category: "Removable Restoration",
    subCategory: "Full Denture",
    stage: "Multi Stage",
    daysToFinish: 25,
    image: "/placeholder.svg",
    grade: "Mid Grade",
    teethShade: "VITA A1",
    gumShade: "St. George - Light Vein",
    impression: "1x STL",
  },
  {
    id: "p3",
    name: "All Porcelain Veneers",
    category: "Fixed Restoration",
    subCategory: "Veneers",
    stage: "Single Stage",
    daysToFinish: 25,
    image: "/placeholder.svg",
    grade: "Premium",
    teethShade: "VITA A1",
    gumShade: "N/A",
    impression: "1x STL",
  },
  {
    id: "p4",
    name: "Hawley retainer",
    category: "Removable Restoration",
    subCategory: "Retainers",
    stage: "Single Stage",
    daysToFinish: 7,
    image: "/placeholder.svg",
    grade: "Economy",
    teethShade: "N/A",
    gumShade: "N/A",
    impression: "1x STL",
  },
]

const advanceFilterOptions = {
  category: ["Removable Restoration", "Fixed Restoration"],
  subCategory: ["Partial Denture", "Full Denture", "Veneers", "Retainers"],
  grades: ["Mid Grade", "Premium", "Economy"],
  stages: ["Multi Stage", "Single Stage"],
}

export default function AddSlipFlowModal({
  isOpen,
  onClose,
  initialStep = 1,
  onAddSlipComplete,
  onCaseDetails,
}: AddSlipFlowModalProps) {
  const [selectedLab, setSelectedLab] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-az")
  const [addSlipFormData, setAddSlipFormData] = useState({
    office: "",
    office_id: "",
    lab: "",
    doctor: "",
    patient: "",
    panNumber: "",
    caseNumber: "123456", // Mocked
    slipNumber: "123456", // Mocked
    createdBy: "",
    location: "Draft",
    caseStatus: "Draft",
    pickupDate: "2025-01-08", // Mocked
    deliveryDate: "2025-01-08", // Mocked
    deliveryTime: "16:00", // Mocked
  })
  const [defaultLabId, setDefaultLabId] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(initialStep) // Internal step for the add slip flow
  const [productSearch, setProductSearch] = useState("")
  const [productSort, setProductSort] = useState("name-az")
  const [productCategory, setProductCategory] = useState("all")
  const [selectedProductInModal, setSelectedProductInModal] = useState<string | null>(null)
  const [showAdvanceFilter, setShowAdvanceFilter] = useState(false)
  const [advanceFilterState, setAdvanceFilterState] = useState({
    category: [] as string[],
    grades: [] as string[],
    stages: [] as string[],
    subCategory: [] as string[],
  })
  const [showArchModal, setShowArchModal] = useState(false)
  const [selectedArch, setSelectedArch] = useState<string | null>(null)
  const setGlobalArchType = useArchSelectionStore((s) => s.setArchType)
  const [showDeliveryDateModal, setShowDeliveryDateModal] = useState(false)
  const [showAddNewLabModal, setShowAddNewLabModal] = useState(false)

  const { connectedLabs, fetchConnectedLabs } = useSlipCreation()

  const router = useRouter()

  // Get selected lab object
  const selectedLabObj = useMemo(() => {
    if (!selectedLab || !connectedLabs) return null
    return connectedLabs.find((lab: any) => String(lab.lab.id) === selectedLab)?.lab || null
  }, [selectedLab, connectedLabs])

  const resetFormAndState = useCallback(() => {
    setSelectedLab("")
    setSearchTerm("")
    setSortBy("name-az")
    setAddSlipFormData({
      office: "",
      office_id: "",
      lab: "",
      doctor: "",
      patient: "",
      panNumber: "",
      caseNumber: "123456",
      slipNumber: "123456",
      createdBy: "Heide Cosa",
      location: "Draft",
      caseStatus: "Draft",
      pickupDate: "2025-01-08",
      deliveryDate: "2025-01-08",
      deliveryTime: "16:00",
    })
    setDefaultLabId(null)
    setStep(initialStep) // Reset to initial step set by parent
    setProductSearch("")
    setProductSort("name-az")
    setProductCategory("all")
    setSelectedProductInModal(null)
    setShowAdvanceFilter(false)
    setAdvanceFilterState({
      category: [],
      grades: [],
      stages: [],
      subCategory: [],
    })
    setShowArchModal(false)
    setSelectedArch(null)
    setShowDeliveryDateModal(false)
  }, [initialStep])

  useEffect(() => {
    if (isOpen) {
      fetchConnectedLabs()
      resetFormAndState()
    }
  }, [isOpen, fetchConnectedLabs, resetFormAndState])

  const filteredLabs = useMemo(() => {
    return (connectedLabs || []).filter((lab) =>
      lab.lab.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [searchTerm, connectedLabs])

  const sortedLabs = useMemo(() => {
    return [...filteredLabs].sort((a, b) => {
      switch (sortBy) {
        case "name-az":
          return a.lab.name.localeCompare(b.lab.name)
        case "name-za":
          return b.lab.name.localeCompare(a.lab.name)
        case "location":
          return a.lab.city.localeCompare(b.lab.city)
        default:
          return 0
      }
    })
  }, [filteredLabs, sortBy])

  const filteredProducts = useMemo(() => {
    return mockProducts.filter((p) => {
      const matchesCategory =
        advanceFilterState.category.length === 0 || advanceFilterState.category.includes(p.category)
      const matchesGrades = advanceFilterState.grades.length === 0 || advanceFilterState.grades.includes(p.grade)
      const matchesStages = advanceFilterState.stages.length === 0 || advanceFilterState.stages.includes(p.stage)
      const matchesSubCategory =
        advanceFilterState.subCategory.length === 0 || advanceFilterState.subCategory.includes(p.subCategory)

      const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase())
      const matchesProductCategory = productCategory === "all" || p.category === productCategory

      return (
        matchesCategory &&
        matchesGrades &&
        matchesStages &&
        matchesSubCategory &&
        matchesSearch &&
        matchesProductCategory
      )
    })
  }, [productSearch, productCategory, advanceFilterState])

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      switch (productSort) {
        case "name-az":
          return a.name.localeCompare(b.name)
        case "name-za":
          return b.name.localeCompare(a.name)
        default:
          return 0
      }
    })
  }, [filteredProducts, productSort])

  const handleLabSelect = (labId: string, setDefault?: boolean) => {
    setSelectedLab(labId)
    const lab = (connectedLabs || []).find((l) => String(l.lab.id) === labId)
    if (lab) {
      setAddSlipFormData((prev) => ({ ...prev, lab: lab.lab.name }))
    }
    if (setDefault) setDefaultLabId(labId)
  }

  const handleContinueModal = () => {
    if (step === 1) setStep(2)
    else if (step === 2 && selectedProductInModal) setShowArchModal(true)
  }

  const handleBackModal = () => {
    if (step === 2) setStep(1)
  }

  const handleArchContinue = () => {
    setShowArchModal(false)
    const selectedProductData = mockProducts.find((p) => p.id === selectedProductInModal)
    const data = {
      formData: addSlipFormData,
      selectedLab: (connectedLabs || []).find((l) => String(l.lab.id) === selectedLab),
      selectedProduct: selectedProductData,
      selectedArch,
    }
    onAddSlipComplete(data)
    onClose()
    if (typeof onCaseDetails === "function") {
      onCaseDetails(data) // Pass slipData to parent (case design page)
    }
  }

  const handleAdvanceFilterApply = () => {
    setShowAdvanceFilter(false)
  }

  const handleAdvanceFilterReset = () => {
    setAdvanceFilterState({
      category: [],
      grades: [],
      stages: [],
      subCategory: [],
    })
  }

  const handleSaveDeliveryDate = ({
    deliveryDate,
    deliveryTime,
    notes,
  }: {
    deliveryDate: string
    deliveryTime: string
    notes: string
  }) => {
    setAddSlipFormData((prev) => ({
      ...prev,
      deliveryDate,
      deliveryTime,
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-7xl h-full max-h-[95vh] sm:max-h-[90vh] p-0 rounded-none sm:rounded-2xl shadow-2xl flex flex-col">
        <DialogTitle className="sr-only">
          {step === 1 ? "Add Slip" : "Choose a Dental Product"}
        </DialogTitle>
        {/* Header */}
        <div className="flex flex-col justify-between p-4 sm:p-6 border-b bg-white flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {step === 1 ? "Add Slip" : "Choose a Dental Product"}
              </h2>
              {step === 2 && (
                <div className="mt-1 text-sm text-gray-500 font-normal">Select the dental product for this slip</div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-1" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Scrollable Content */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b">
          <AddSlipHeader
            formData={addSlipFormData}
            setFormData={setAddSlipFormData}
            selectedLabObj={selectedLabObj}
            selectedOfficeObj={null}
            doctorOptions={[]}
            officeOptions={[]}
            createdBy=""
            onOpenDeliveryDateModal={() => setShowDeliveryDateModal(true)}
            formErrors={{}}
            doctorDropdownOpen={false}
            setDoctorDropdownOpen={() => { }}
            isSubmitted={false}
            onContinue={() => { }}
            onOfficeSelect={() => { }}
            onRefreshOffices={() => { }}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 bg-white">
              <div className="space-y-6 sm:space-y-8">
                {/* Lab Selection */}
                <div>
                  {(() => {
                    let user: any = null
                    if (typeof window !== "undefined") {
                      try {
                        user = JSON.parse(localStorage.getItem("user") || "null")
                      } catch (e) {
                        user = null
                      }
                    }
                    const isLabAdmin = user?.roles?.includes("lab_admin")
                    const isOfficeAdmin = user?.roles?.includes("office_admin")
                    let chooseLabel = "Choose a Lab"
                    let addLabel = "Add New Lab"
                    if (isLabAdmin) {
                      chooseLabel = "Choose a Office"
                      addLabel = "Add New Office"
                    } else if (isOfficeAdmin) {
                      chooseLabel = "Choose a Lab"
                      addLabel = "Add New Lab"
                    }
                    return (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 text-center sm:text-left flex-1">
                          {chooseLabel}
                        </h3>
                        <Button
                          className="bg-[#1162a8] hover:bg-[#0f5490] text-white rounded-lg px-4 sm:px-5 py-2 w-full sm:w-auto"
                          onClick={() => setShowAddNewLabModal(true)}
                        >
                          {addLabel}
                        </Button>
                      </div>
                    )
                  })()}
                  <hr className="mb-6" />
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        placeholder="Search Dental Lab"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-11 py-3 bg-gray-100 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort By:</Label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full sm:w-36 bg-gray-100 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name-az">Name A-Z</SelectItem>
                          <SelectItem value="name-za">Name Z-A</SelectItem>
                          <SelectItem value="location">Location</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-sm text-gray-400 text-center sm:text-left sm:ml-auto">{filteredLabs.length} labs found</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {sortedLabs.map((lab) => (
                      <div key={lab.lab.id} className="relative group">
                        <Card
                          className={`cursor-pointer transition-all hover:shadow-lg rounded-xl border-2 h-full group-hover:border-blue-400 group-hover:ring-2 group-hover:ring-blue-100 ${selectedLab === String(lab.lab.id) ? "border-[#1162a8] bg-blue-50" : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/30"
                            }`}
                          onClick={() => handleLabSelect(String(lab.lab.id))}
                        >
                          <CardContent className="p-4 sm:p-6 text-center flex flex-col items-center">
                            <div className="mb-3 sm:mb-4">
                              <img
                                src={lab.lab.logo_url || "/placeholder.svg"}
                                alt={lab.lab.name}
                                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-lg object-cover border bg-gray-100"
                              />
                            </div>
                            <h4 className="font-semibold text-sm sm:text-base mb-1 text-gray-900">{lab.lab.name}</h4>
                            <p className="text-xs text-gray-500">{lab.lab.city}, {lab.lab.state}</p>
                            {lab.status === "Active" && (
                              <div className="mt-3">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-medium">
                                  Connected
                                </span>
                              </div>
                            )}
                            <div className="mt-4 flex flex-col items-center w-full">
                              {defaultLabId === String(lab.lab.id) ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-medium border border-green-200">
                                  Default
                                </span>
                              ) : (
                                <button
                                  className={`transition-all px-4 py-1 rounded-md text-xs font-medium border ${selectedLab === String(lab.lab.id)
                                    ? "bg-[#1162a8] text-white border-[#1162a8] hover:bg-[#0f5490] hover:border-[#0f5490]"
                                    : "bg-[#1162a8] text-white border-[#1162a8] hover:bg-[#0f5490] hover:border-[#0f5490] opacity-0 group-hover:opacity-100"
                                    }`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleLabSelect(String(lab.lab.id), true)
                                  }}
                                >
                                  Set as Default
                                </button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        {defaultLabId === String(lab.lab.id) && (
                          <div className="absolute top-2 right-2 z-10">
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 bg-white">
              {/* Product Selection */}
              <div>
                <div className="flex items-center justify-center mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 text-center">Choose a Dental Product</h3>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Search Product"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-11 py-3 bg-gray-100 rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort By:</Label>
                    <Select value={productSort} onValueChange={setProductSort}>
                      <SelectTrigger className="w-full sm:w-36 bg-gray-100 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name-az">Name A-Z</SelectItem>
                        <SelectItem value="name-za">Name Z-A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Popover open={showAdvanceFilter} onOpenChange={setShowAdvanceFilter}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 bg-transparent w-full sm:w-auto">
                        <Filter className="w-4 h-4" />
                        Advance Filter
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[90vw] max-w-[700px] p-4 sm:p-6" align="end">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-lg">Advance Filter</h4>
                        <Button variant="ghost" size="icon" onClick={() => setShowAdvanceFilter(false)}>
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-6">
                        {/* Category */}
                        <div>
                          <h5 className="font-medium text-sm mb-2">Category</h5>
                          <div className="space-y-2">
                            {advanceFilterOptions.category.map((option) => (
                              <div key={option} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`category-${option}`}
                                  checked={advanceFilterState.category.includes(option)}
                                  onCheckedChange={(checked) => {
                                    setAdvanceFilterState((prev) => ({
                                      ...prev,
                                      category: checked
                                        ? [...prev.category, option]
                                        : prev.category.filter((item) => item !== option),
                                    }))
                                  }}
                                />
                                <Label htmlFor={`category-${option}`} className="text-sm font-normal">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Sub Category */}
                        <div className="col-span-1 sm:col-span-2">
                          <h5 className="font-medium text-sm mb-2">Sub Category</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                            {advanceFilterOptions.subCategory.map((option) => (
                              <div key={option} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`subCategory-${option}`}
                                  checked={advanceFilterState.subCategory.includes(option)}
                                  onCheckedChange={(checked) => {
                                    setAdvanceFilterState((prev) => ({
                                      ...prev,
                                      subCategory: checked
                                        ? [...prev.subCategory, option]
                                        : prev.subCategory.filter((item) => item !== option),
                                    }))
                                  }}
                                />
                                <Label htmlFor={`subCategory-${option}`} className="text-sm font-normal">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Grades */}
                        <div>
                          <h5 className="font-medium text-sm mb-2">Grades</h5>
                          <div className="space-y-2">
                            {advanceFilterOptions.grades.map((option) => (
                              <div key={option} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`grade-${option}`}
                                  checked={advanceFilterState.grades.includes(option)}
                                  onCheckedChange={(checked) => {
                                    setAdvanceFilterState((prev) => ({
                                      ...prev,
                                      grades: checked
                                        ? [...prev.grades, option]
                                        : prev.grades.filter((item) => item !== option),
                                    }))
                                  }}
                                />
                                <Label htmlFor={`grade-${option}`} className="text-sm font-normal">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Stages */}
                        <div>
                          <h5 className="font-medium text-sm mb-2">Stages</h5>
                          <div className="space-y-2">
                            {advanceFilterOptions.stages.map((option) => (
                              <div key={option} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`stage-${option}`}
                                  checked={advanceFilterState.stages.includes(option)}
                                  onCheckedChange={(checked) => {
                                    setAdvanceFilterState((prev) => ({
                                      ...prev,
                                      stages: checked
                                        ? [...prev.stages, option]
                                        : prev.stages.filter((item) => item !== option),
                                    }))
                                  }}
                                />
                                <Label htmlFor={`stage-${option}`} className="text-sm font-normal">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" size="sm" onClick={handleAdvanceFilterReset}>
                          Reset Filter
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAdvanceFilterApply}
                          className="bg-[#1162a8] hover:bg-[#0f5490] text-white"
                        >
                          Apply Filter
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-700">Category</Label>
                    <Select value={productCategory} onValueChange={setProductCategory}>
                      <SelectTrigger className="w-44 bg-gray-100 rounded-lg">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Removable Restoration">Removable Restoration</SelectItem>
                        <SelectItem value="Fixed Restoration">Fixed Restoration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-sm text-gray-400 ml-auto">{filteredProducts.length} products found</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {sortedProducts.map((product) => (
                    <Card
                      key={product.id}
                      className={`cursor-pointer transition-all hover:shadow-lg rounded-xl border-2 h-full ${selectedProductInModal === product.id ? "border-[#1162a8] bg-blue-50" : "border-gray-200"
                        }`}
                      onClick={() => setSelectedProductInModal(product.id)}
                    >
                      <CardContent className="p-4 sm:p-6 text-center flex flex-col items-center">
                        <img
                          src={
                            (product.image_url && product.image_url !== "/placeholder.svg" && product.image_url !== null)
                              || (product.image_url_url && product.image_url_url !== "/placeholder.svg" && product.image_url_url !== null)
                              || (product.image && product.image !== "/placeholder.svg" && product.image !== null)
                              ? (product.image_url || product.image_url_url || product.image)
                              : "/images/product-default.png"
                          }
                          alt={product.name}
                          width={128}
                          height={128}
                          className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-lg object-cover border bg-gray-100 mb-3 sm:mb-4"
                          onError={(e) => {
                            // Fallback to default image if the image URL fails to load
                            const target = e.target as HTMLImageElement;
                            if (target.src !== window.location.origin + "/images/product-default.png") {
                              target.src = "/images/product-default.png";
                            }
                          }}
                        />
                        <h4 className="font-semibold text-sm sm:text-base mb-1 text-gray-900">{product.name}</h4>
                        <p className="text-xs text-gray-500 mb-1">Category: {product.category}</p>
                        <p className="text-xs text-gray-500 mb-2">Sub Category: {product.subCategory}</p>
                        <div className="flex gap-2 justify-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${product.stage === "Multi Stage"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                              }`}
                          >
                            {product.stage}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-200 text-gray-700 font-medium">
                            {product.daysToFinish} days to Finish
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Footer for lab/product selection */}
        {(step === 1 || step === 2) && (
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 p-4 sm:p-6 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
            {step === 2 && (
              <Button variant="outline" className="px-4 sm:px-6 py-2 rounded-lg bg-transparent w-full sm:w-auto" onClick={handleBackModal}>
                Back
              </Button>
            )}
            <Button
              variant="outline"
              className="px-4 sm:px-6 py-2 rounded-lg bg-transparent w-full sm:w-auto"
              onClick={onClose}
            >
              Cancel
            </Button>
            {step === 1 && (
              <Button
                className="bg-[#1162a8] hover:bg-[#0f5490] text-white px-6 sm:px-8 py-2 rounded-lg font-semibold w-full sm:w-auto"
                onClick={handleContinueModal}
                disabled={!selectedLab}
              >
                Continue
              </Button>
            )}
            {step === 2 && (
              <Button
                className="bg-[#1162a8] hover:bg-[#0f5490] text-white px-6 sm:px-8 py-2 rounded-lg font-semibold w-full sm:w-auto"
                onClick={handleContinueModal}
                disabled={!selectedProductInModal}
              >
                Continue
              </Button>
            )}
          </div>
        )}

        {/* Arch Modal (fixed position, outside main scrollable content) */}
        {showArchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-400 max-w-md w-full p-4 sm:p-6 relative">
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <div>
                  <h4 className="text-base sm:text-lg font-semibold">Choose Treatment Arch</h4>
                  <p className="text-sm text-gray-500 mt-1">Select the arch for treatment</p>
                </div>
                <button onClick={() => setShowArchModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${selectedArch === "upper" || selectedArch === "both" ? "border-[#1162a8] bg-blue-50" : "border-gray-200"
                    }`}
                  onClick={() => { setSelectedArch("upper"); setGlobalArchType('upper') }}
                >
                  <div className="flex items-center justify-center mb-2">
                    <img src={selectedArch === "both" ? "/images/upper-arch-selected.svg" : "/images/maxillary.png"} alt="Upper Arch" className="w-12 h-6 sm:w-16 sm:h-8 object-contain" />
                  </div>
                  <p className="text-center text-sm font-medium">Upper Arch</p>
                </div>
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${selectedArch === "lower" || selectedArch === "both" ? "border-[#1162a8] bg-blue-50" : "border-gray-200"
                    }`}
                  onClick={() => { setSelectedArch("lower"); setGlobalArchType('lower') }}
                >
                  <div className="flex items-center justify-center mb-2">
                    <img src={selectedArch === "both" ? "/images/lower-arch-selected.svg" : "/images/mandibular.png"} alt="Lower Arch" className="w-12 h-6 sm:w-16 sm:h-8 object-contain" />
                  </div>
                  <p className="text-center text-sm font-medium">Lower Arch</p>
                </div>
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${selectedArch === "both" ? "border-[#1162a8] bg-blue-50" : "border-gray-200"
                    }`}
                  onClick={() => { setSelectedArch("both"); setGlobalArchType('both') }}
                >
                  <div className="flex items-center justify-center mb-2">
                    <div className="flex flex-col items-center space-y-1">
                      <img src="/images/maxillary.png" alt="Upper Arch" className="w-12 h-4 sm:w-16 sm:h-6 object-contain" />
                      <img src="/images/mandibular.png" alt="Lower Arch" className="w-12 h-4 sm:w-16 sm:h-6 object-contain" />
                    </div>
                  </div>
                  <p className="text-center text-sm font-medium">Both Arches</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowArchModal(false)} className="px-3 py-2">
                  Change Product
                </Button>
                <Button
                  className="bg-[#1162a8] hover:bg-[#0f5490] text-white px-4 py-2"
                  onClick={handleArchContinue}
                  disabled={!selectedArch}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Date Modal (conditionally rendered) */}
        {showDeliveryDateModal && (
          <DeliveryDateModal
            open={showDeliveryDateModal}
            onOpenChange={setShowDeliveryDateModal}
            patientName={addSlipFormData.patient}
            caseStage="Try in with teeth"
            pickupDate={addSlipFormData.pickupDate}
            deliveryDate={addSlipFormData.deliveryDate}
            deliveryTime={addSlipFormData.deliveryTime}
            isRush={true}
            onSave={handleSaveDeliveryDate}
          />
        )}
        {/* Add New Lab Modal */}
        <AddNewLabModal
          open={showAddNewLabModal}
          onOpenChange={setShowAddNewLabModal}
        />
      </DialogContent>
    </Dialog>
  )
}
