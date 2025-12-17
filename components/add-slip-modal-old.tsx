"use client"

import { useState, Fragment, useEffect } from "react"
import { X, Search, Calendar, Clock, Plus, Paperclip, Upload } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

interface AddSlipModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Lab {
  id: string
  name: string
  location: string
  logo: string
  isConnected?: boolean
}

const mockLabs: Lab[] = [
  {
    id: "1",
    name: "HMC Innovs LLC",
    location: "Las Vegas, Nevada",
    logo: "/images/hmcinnovs.png",
    isConnected: true,
  },
  {
    id: "2",
    name: "Kinetic LLC",
    location: "Las Vegas, Nevada",
    logo: "https://images.pexels.com/photos/5355918/pexels-photo-5355918.jpeg?auto=compress&w=60&h=60&fit=crop",
    isConnected: true,
  },
  {
    id: "3",
    name: "Highlands Dental Lab",
    location: "Las Vegas, Nevada",
    logo: "https://images.pexels.com/photos/5355919/pexels-photo-5355919.jpeg?auto=compress&w=60&h=60&fit=crop",
    isConnected: true,
  },
  {
    id: "4",
    name: "Leca Dental LLC",
    location: "Las Vegas, Nevada",
    logo: "https://images.pexels.com/photos/5355920/pexels-photo-5355920.jpeg?auto=compress&w=60&h=60&fit=crop",
    isConnected: true,
  },
  {
    id: "5",
    name: "Boris Digital Lab",
    location: "Las Vegas, Nevada",
    logo: "https://images.pexels.com/photos/5355921/pexels-photo-5355921.jpeg?auto=compress&w=60&h=60&fit=crop",
    isConnected: true,
  },
  {
    id: "6",
    name: "Leca Dental LLC",
    location: "Las Vegas, Nevada",
    logo: "https://images.pexels.com/photos/5355922/pexels-photo-5355922.jpeg?auto=compress&w=60&h=60&fit=crop",
    isConnected: true,
  },
  {
    id: "7",
    name: "HMC Innovs LLC",
    location: "Las Vegas, Nevada",
    logo: "https://images.pexels.com/photos/5355923/pexels-photo-5355923.jpeg?auto=compress&w=60&h=60&fit=crop",
    isConnected: true,
  },
  {
    id: "8",
    name: "Highlands Dental Lab",
    location: "Las Vegas, Nevada",
    logo: "https://images.pexels.com/photos/5355924/pexels-photo-5355924.jpeg?auto=compress&w=60&h=60&fit=crop",
    isConnected: true,
  },
  {
    id: "9",
    name: "Prime Dental Lab",
    location: "Los Angeles, California",
    logo: "https://images.pexels.com/photos/5355925/pexels-photo-5355925.jpeg?auto=compress&w=60&h=60&fit=crop",
    isConnected: true,
  },
  {
    id: "10",
    name: "Elite Dental Studio",
    location: "San Francisco, California",
    logo: "https://images.pexels.com/photos/5355694/pexels-photo-5355694.jpeg?auto=compress&w=60&h=60&fit=crop",
    isConnected: true,
  },
  {
    id: "11",
    name: "Apex Dental Lab",
    location: "New York, New York",
    logo: "https://images.pexels.com/photos/3845761/pexels-photo-3845761.jpeg?auto=compress&w=60&h=60&fit=crop",
    isConnected: true,
  },
  {
    id: "12",
    name: "Summit Dental Works",
    location: "Denver, Colorado",
    logo: "https://images.pexels.com/photos/3881445/pexels-photo-3881445.jpeg?auto=compress&w=60&h=60&fit=crop",
    isConnected: true,
  },
  {
    id: "13",
    name: "Pinnacle Dental Lab",
    location: "Seattle, Washington",
    logo: "https://images.pexels.com/photos/3845805/pexels-photo-3845805.jpeg?auto=compress&w=60&h=60&fit=crop",
    isConnected: true,
  },
]

const mockProducts = [
  {
    id: "p1",
    name: "Metal Frame Acrylic",
    category: "Removable Restoration",
    subCategory: "Partial Denture",
    stage: "Multi Stage",
    daysToFinish: 19,
    image: "https://images.unsplash.com/photo-1511485977113-f34e87f1e9a5?auto=format&fit=facearea&w=400&q=80",
  },
  {
    id: "p2",
    name: "Full Denture Acrylic",
    category: "Removable Restoration",
    subCategory: "Full Denture",
    stage: "Multi Stage",
    daysToFinish: 25,
    image: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=facearea&w=400&q=80",
  },
  {
    id: "p3",
    name: "All Porcelain Veneers",
    category: "Fixed Restoration",
    subCategory: "Veneers",
    stage: "Single Stage",
    daysToFinish: 25,
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=facearea&w=400&q=80",
  },
  {
    id: "p4",
    name: "Hawley retainer",
    category: "Removable Restoration",
    subCategory: "Retainers",
    stage: "Single Stage",
    daysToFinish: 7,
    image: "https://images.unsplash.com/photo-1520880867055-1e30d1cb001c?auto=format&fit=facearea&w=400&q=80",
  },
]

export function AddSlipModal({ open, onOpenChange }: AddSlipModalProps) {
  const [selectedLab, setSelectedLab] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-az")
  const [formData, setFormData] = useState({
    lab: "",
    doctor: "",
    patient: "",
    panNumber: "",
    caseNumber: "123456",
    slipNumber: "123456",
    createdBy: "Heide Cosa",
    location: "Draft",
    caseStatus: "Draft",
    pickupDate: "01/08/2025",
    deliveryDate: "01/08/2025",
    deliveryTime: "4:00 PM",
  })
  const [defaultLabId, setDefaultLabId] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [productSearch, setProductSearch] = useState("")
  const [productSort, setProductSort] = useState("name-az")
  const [productCategory, setProductCategory] = useState("all")
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [showAdvanceFilter, setShowAdvanceFilter] = useState(false)
  const [showArchModal, setShowArchModal] = useState(false)
  const [selectedArch, setSelectedArch] = useState<string | null>(null)
  const [showAddOnsModal, setShowAddOnsModal] = useState(false)
  const [showAttachFilesModal, setShowAttachFilesModal] = useState(false)
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([])
  const [addOnsData, setAddOnsData] = useState({
    reinforcements: {
      category: "Custom Abutment",
      addOns: "Titanium",
      qty: "Titanium"
    },
    aestheticEnhancement: "",
    functionalModifications: "",
    miscellaneous: ""
  })
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [fileDescription, setFileDescription] = useState("")

  const resetForm = () => {
    setSelectedLab("")
    setSearchTerm("")
    setSortBy("name-az")
    setFormData({
      lab: "",
      doctor: "",
      patient: "",
      panNumber: "",
      caseNumber: "123456",
      slipNumber: "123456",
      createdBy: "Heide Cosa",
      location: "Draft",
      caseStatus: "Draft",
      pickupDate: "01/08/2025",
      deliveryDate: "01/08/2025",
      deliveryTime: "4:00 PM",
    })
    setDefaultLabId(null)
    setStep(1)
    setProductSearch("")
    setProductSort("name-az")
    setProductCategory("all")
    setSelectedProduct(null)
    setShowAdvanceFilter(false)
    setShowArchModal(false)
    setSelectedArch(null)
    setShowAddOnsModal(false)
    setShowAttachFilesModal(false)
    setSelectedTeeth([])
    setAddOnsData({
      reinforcements: {
        category: "Custom Abutment",
        addOns: "Titanium",
        qty: "Titanium"
      },
      aestheticEnhancement: "",
      functionalModifications: "",
      miscellaneous: ""
    })
    setAttachedFiles([])
    setFileDescription("")
  }

  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open])

  const advanceFilterOptions = {
    category: [
      "Fixed Restoration",
      "Removable Restoration",
      "Orthodontics",
    ],
    grades: [
      "Economy",
      "Standard",
      "Premium",
      "Ultra Premium",
    ],
    stages: [
      "Single Stage",
      "Multi Stage",
    ],
    subCategory: [
      "Single crowns", "Multi Unit Bridges", "Inlays/Onlays", "Veneers", "Implant Supported", "Retainers",
      "Space Maintainers", "Expansion Appliance", "Functional Appliance", "Clear Aligners", "Habit Appliance",
      "Orthodontic Splint", "Complete Dentures", "Partial Dentures", "Denture service", "Occlusal Guards (Night guards)",
      "Other Removable appliance"
    ]
  }

  const filteredLabs = mockLabs.filter((lab) => lab.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const sortedLabs = [...filteredLabs].sort((a, b) => {
    switch (sortBy) {
      case "name-az":
        return a.name.localeCompare(b.name)
      case "name-za":
        return b.name.localeCompare(a.name)
      case "location":
        return a.location.localeCompare(b.location)
      default:
        return 0
    }
  })

  const filteredProducts = mockProducts.filter(
    (p) =>
      (productCategory === "all" || p.category === productCategory) &&
      p.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (productSort) {
      case "name-az":
        return a.name.localeCompare(b.name)
      case "name-za":
        return b.name.localeCompare(a.name)
      default:
        return 0
    }
  })

  const handleLabSelect = (labId: string) => {
    setSelectedLab(labId)
    const lab = mockLabs.find((l) => l.id === labId)
    if (lab) {
      setFormData((prev) => ({ ...prev, lab: lab.name }))
    }
  }

  const handleContinue = () => {
    if (step === 1) setStep(2)
    else if (step === 2 && selectedProduct) setShowArchModal(true)
  }

  const handleBack = () => {
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
  }

  const handleArchContinue = () => {
    setShowArchModal(false)
    setStep(3)
  }

  const handleToothClick = (toothNumber: number) => {
    setSelectedTeeth(prev => 
      prev.includes(toothNumber) 
        ? prev.filter(t => t !== toothNumber)
        : [...prev, toothNumber]
    )
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAttachedFiles(prev => [...prev, ...files])
  }

  const handleSubmit = () => {
    // Form submitted:
      formData,
      selectedLab,
      selectedProduct,
      selectedArch,
      selectedTeeth,
      addOnsData,
      attachedFiles,
      fileDescription
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 overflow-hidden rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex flex-col justify-between p-6 border-b bg-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {step === 1 ? "Add Slip" : step === 2 ? "Choose a Dental Product" : "Add new slip - first product - case design details"}
              </h2>
              {step === 2 && (
                <div className="mt-1 text-sm text-gray-500 font-normal">
                  Select the dental product for this slip
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-1" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Step 1: Add Slip Form */}
        {step === 1 && (
          <>
            <div className="px-8 py-6 bg-gray-50 border-b">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="lab" className="text-sm font-medium">
                    Choose your lab
                  </Label>
                  <Select
                    value={formData.lab}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, lab: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lab" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockLabs.map((lab) => (
                        <SelectItem key={lab.id} value={lab.name}>
                          {lab.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doctor" className="text-sm font-medium">
                    Choose your doctor
                  </Label>
                  <Select
                    value={formData.doctor}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, doctor: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dr-smith">Dr. Smith</SelectItem>
                      <SelectItem value="dr-jones">Dr. Jones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patient" className="text-sm font-medium">
                    Patient name
                  </Label>
                  <Select
                    value={formData.patient}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, patient: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient1">John Doe</SelectItem>
                      <SelectItem value="patient2">Jane Smith</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pan" className="text-sm font-medium">
                    Pan #:
                  </Label>
                  <Input
                    id="pan"
                    value={formData.panNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, panNumber: e.target.value }))}
                    placeholder="-----"
                    className="text-center"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="case" className="text-sm font-medium">
                    Case #
                  </Label>
                  <Input
                    id="case"
                    value={formData.caseNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, caseNumber: e.target.value }))}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slip" className="text-sm font-medium">
                    Slip #:
                  </Label>
                  <Input
                    id="slip"
                    value={formData.slipNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slipNumber: e.target.value }))}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="createdBy" className="text-sm font-medium">
                    Created By
                  </Label>
                  <Select
                    value={formData.createdBy}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, createdBy: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Heide Cosa">Heide Cosa</SelectItem>
                      <SelectItem value="Other User">Other User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium">
                    Location
                  </Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, location: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caseStatus" className="text-sm font-medium">
                    Case Status
                  </Label>
                  <Select
                    value={formData.caseStatus}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, caseStatus: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickupDate" className="text-sm font-medium">
                    Pick up Date
                  </Label>
                  <div className="relative">
                    <Input
                      id="pickupDate"
                      value={formData.pickupDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, pickupDate: e.target.value }))}
                      className="pr-8"
                    />
                    <Calendar className="absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryDate" className="text-sm font-medium">
                    Delivery Date
                  </Label>
                  <div className="relative">
                    <Input
                      id="deliveryDate"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                      className="pr-8"
                    />
                    <Calendar className="absolute right-2 top-2.5 h-4 w-4 text-red-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryTime" className="text-sm font-medium">
                    Delivery Time
                  </Label>
                  <div className="relative">
                    <Input
                      id="deliveryTime"
                      value={formData.deliveryTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, deliveryTime: e.target.value }))}
                      className="pr-8"
                    />
                    <Clock className="absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-8 bg-white">
              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 text-center flex-1">Choose a Lab</h3>
                    <Button className="bg-[#1162a8] hover:bg-[#0f5490] text-white ml-auto rounded-lg px-5 py-2">
                      Add New lab
                    </Button>
                  </div>
                  <hr className="mb-6" />
                  <div className="flex flex-wrap items-center gap-4 mb-8">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        placeholder="Search Dental Lab"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-11 py-3 bg-gray-100 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700">Sort By:</Label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-36 bg-gray-100 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name-az">Name A-Z</SelectItem>
                          <SelectItem value="name-za">Name Z-A</SelectItem>
                          <SelectItem value="location">Location</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-sm text-gray-400 ml-auto">{filteredLabs.length} labs found</span>
                  </div>
                  <div
                    className={`relative ${
                      sortedLabs.length > 6
                        ? "max-h-[32vh] overflow-y-auto pr-2 custom-scrollbar"
                        : ""
                    }`}
                    style={{ minHeight: "0" }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {sortedLabs.map((lab, idx) => {
                        const dentalStockPhotos = [
                          "https://images.unsplash.com/photo-1511485977113-f34e87f1e9a5?auto=format&fit=facearea&w=128&q=80",
                          "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=facearea&w=128&q=80",
                          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=facearea&w=128&q=80",
                          "https://images.unsplash.com/photo-1520880867055-1e30d1cb001c?auto=format&fit=facearea&w=128&q=80",
                          "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=facearea&w=128&q=80",
                          "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=facearea&w=128&q=80",
                          "https://images.unsplash.com/photo-1514412076815-ae3d2b1eae33?auto=format&fit=facearea&w=128&q=80",
                          "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=facearea&w=128&q=80",
                        ]
                        const stockImg = dentalStockPhotos[idx % dentalStockPhotos.length]
                        return (
                          <div key={lab.id} className="relative group">
                            <Card
                              className={`cursor-pointer transition-all hover:shadow-lg rounded-xl border-2 h-full ${
                                selectedLab === lab.id ? "border-[#1162a8] bg-blue-50" : "border-gray-200"
                              }`}
                              onClick={() => handleLabSelect(lab.id)}
                            >
                              <CardContent className="p-6 text-center flex flex-col items-center">
                                <div className="mb-4">
                                  <img
                                    src={
                                      lab.logo && !lab.logo.startsWith("/placeholder.svg")
                                        ? lab.logo
                                        : stockImg
                                    }
                                    alt={lab.name}
                                    className="w-16 h-16 mx-auto rounded-lg object-cover border bg-gray-100"
                                  />
                                </div>
                                <h4 className="font-semibold text-base mb-1 text-gray-900">{lab.name}</h4>
                                <p className="text-xs text-gray-500">{lab.location}</p>
                                {lab.isConnected && (
                                  <div className="mt-3">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-medium">
                                      Connected
                                    </span>
                                  </div>
                                )}
                                <div className="mt-4 flex flex-col items-center w-full">
                                  <button
                                    className={`transition-all px-4 py-1 rounded-md text-xs font-medium border ${
                                      defaultLabId === lab.id
                                        ? "bg-green-100 text-green-700 border-green-200 cursor-default"
                                        : "bg-[#1162a8] text-white border-[#1162a8] hover:bg-[#0f5490] hover:border-[#0f5490] opacity-0 group-hover:opacity-100"
                                    }`}
                                    style={{ pointerEvents: defaultLabId === lab.id ? "none" : "auto" }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDefaultLabId(lab.id)
                                      handleLabSelect(lab.id)
                                    }}
                                    tabIndex={-1}
                                  >
                                    {defaultLabId === lab.id ? "Default" : "Set as Default"}
                                  </button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <style jsx global>{`
                    .custom-scrollbar {
                      scrollbar-width: thin;
                      scrollbar-color: #1162a8 #e5e7eb;
                    }
                    .custom-scrollbar::-webkit-scrollbar {
                      width: 8px;
                      background: #e5e7eb;
                      border-radius: 8px;
                      transition: opacity 0.2s;
                      opacity: 0;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                      background: #1162a8;
                      border-radius: 8px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                      background: #0f5490;
                    }
                    .custom-scrollbar:hover::-webkit-scrollbar,
                    .custom-scrollbar:focus::-webkit-scrollbar,
                    .custom-scrollbar:active::-webkit-scrollbar {
                      opacity: 1;
                    }
                  `}</style>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Choose a Dental Product */}
        {step === 2 && (
          <div className="flex-1 flex flex-col px-8 py-8 bg-white overflow-y-auto">
            {/* Form fields at the top, same as step 1 */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8 border">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="lab" className="text-sm font-medium">
                    Choose your lab
                  </Label>
                  <Select
                    value={formData.lab}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, lab: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lab" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockLabs.map((lab) => (
                        <SelectItem key={lab.id} value={lab.name}>
                          {lab.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor" className="text-sm font-medium">
                    Choose your doctor
                  </Label>
                  <Select
                    value={formData.doctor}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, doctor: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dr-smith">Dr. Smith</SelectItem>
                      <SelectItem value="dr-jones">Dr. Jones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient" className="text-sm font-medium">
                    Patient name
                  </Label>
                  <Select
                    value={formData.patient}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, patient: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient1">John Doe</SelectItem>
                      <SelectItem value="patient2">Jane Smith</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pan" className="text-sm font-medium">
                    Pan #:
                  </Label>
                  <Input
                    id="pan"
                    value={formData.panNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, panNumber: e.target.value }))}
                    placeholder="-----"
                    className="text-center"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="case" className="text-sm font-medium">
                    Case #
                  </Label>
                  <Input
                    id="case"
                    value={formData.caseNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, caseNumber: e.target.value }))}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slip" className="text-sm font-medium">
                    Slip #:
                  </Label>
                  <Input
                    id="slip"
                    value={formData.slipNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slipNumber: e.target.value }))}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="createdBy" className="text-sm font-medium">
                    Created By
                  </Label>
                  <Select
                    value={formData.createdBy}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, createdBy: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Heide Cosa">Heide Cosa</SelectItem>
                      <SelectItem value="Other User">Other User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium">
                    Location
                  </Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, location: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caseStatus" className="text-sm font-medium">
                    Case Status
                  </Label>
                  <Select
                    value={formData.caseStatus}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, caseStatus: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupDate" className="text-sm font-medium">
                    Pick up Date
                  </Label>
                  <div className="relative">
                    <Input
                      id="pickupDate"
                      value={formData.pickupDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, pickupDate: e.target.value }))}
                      className="pr-8"
                    />
                    <Calendar className="absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryDate" className="text-sm font-medium">
                    Delivery Date
                  </Label>
                  <div className="relative">
                    <Input
                      id="deliveryDate"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                      className="pr-8"
                    />
                    <Calendar className="absolute right-2 top-2.5 h-4 w-4 text-red-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryTime" className="text-sm font-medium">
                    Delivery Time
                  </Label>
                  <div className="relative">
                    <Input
                      id="deliveryTime"
                      value={formData.deliveryTime}
                      onChange={(e) => setFormData((prev) => ({ ...prev, deliveryTime: e.target.value }))}
                      className="pr-8"
                    />
                    <Clock className="absolute right-2 top-2.5 h-4 w-4 text-gray-500" />
                  </div>
                </div>
              </div>
            </div>
            {/* Product selection UI below */}
            <div>
              {/* Section label centered */}
              <div className="flex items-center justify-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 text-center">Choose a Dental Product</h3>
              </div>
              {/* Search, Sort, Category, Advance Filter */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search Product"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-11 py-3 bg-gray-100 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-gray-700">Sort By:</Label>
                  <Select value={productSort} onValueChange={setProductSort}>
                    <SelectTrigger className="w-36 bg-gray-100 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-az">Name A-Z</SelectItem>
                      <SelectItem value="name-za">Name Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Advance Filter button */}
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 px-3 py-2 ml-2"
                    onClick={() => setShowAdvanceFilter(true)}
                  >
                    <svg width="18" height="18" fill="none" viewBox="0 0 20 20">
                      <path d="M3 5h14M6 10h8M9 15h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span className="text-sm">Advance Filter</span>
                  </Button>
                </div>
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
              {/* Product grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {sortedProducts.map((product) => (
                  <Card
                    key={product.id}
                    className={`cursor-pointer transition-all hover:shadow-lg rounded-xl border-2 h-full ${
                      selectedProduct === product.id ? "border-[#1162a8] bg-blue-50" : "border-gray-200"
                    }`}
                    onClick={() => setSelectedProduct(product.id)}
                  >
                    <CardContent className="p-6 text-center flex flex-col items-center">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-32 h-32 mx-auto rounded-lg object-cover border bg-gray-100 mb-4"
                      />
                      <h4 className="font-semibold text-base mb-1 text-gray-900">{product.name}</h4>
                      <p className="text-xs text-gray-500 mb-1">Category: {product.category}</p>
                      <p className="text-xs text-gray-500 mb-2">Sub Category: {product.subCategory}</p>
                      <div className="flex gap-2 justify-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            product.stage === "Multi Stage"
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
            {/* Advance Filter Popup */}
            {showAdvanceFilter && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-400 max-w-4xl w-full mx-4 p-8 relative">
                  <div className="flex justify-between items-start mb-6">
                    <h4 className="text-lg font-semibold">Advance Filter</h4>
                    <button
                      className="text-gray-400 hover:text-gray-700"
                      onClick={() => setShowAdvanceFilter(false)}
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Category */}
                    <div>
                      <div className="font-semibold mb-2">Category</div>
                      {advanceFilterOptions.category.map(opt => (
                        <div key={opt} className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            className="mr-2 accent-[#1162a8] focus:ring-[#1162a8] w-4 h-4 rounded border-gray-300"
                            id={`cat-${opt}`}
                          />
                          <label htmlFor={`cat-${opt}`} className="text-sm">{opt}</label>
                        </div>
                      ))}
                    </div>
                    {/* Sub Category */}
                    <div className="md:col-span-2">
                      <div className="font-semibold mb-2">Sub Category</div>
                      <div className="grid grid-cols-2 gap-x-4">
                        {advanceFilterOptions.subCategory.map(opt => (
                          <div key={opt} className="flex items-center mb-2">
                            <input
                              type="checkbox"
                              className="mr-2 accent-[#1162a8] focus:ring-[#1162a8] w-4 h-4 rounded border-gray-300"
                              id={`subcat-${opt}`}
                            />
                            <label htmlFor={`subcat-${opt}`} className="text-sm">{opt}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Grades & Stages */}
                    <div>
                      <div className="font-semibold mb-2">Grades</div>
                      {advanceFilterOptions.grades.map(opt => (
                        <div key={opt} className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            className="mr-2 accent-[#1162a8] focus:ring-[#1162a8] w-4 h-4 rounded border-gray-300"
                            id={`grade-${opt}`}
                          />
                          <label htmlFor={`grade-${opt}`} className="text-sm">{opt}</label>
                        </div>
                      ))}
                      <div className="font-semibold mt-4 mb-2">Stages</div>
                      {advanceFilterOptions.stages.map(opt => (
                        <div key={opt} className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            className="mr-2 accent-[#1162a8] focus:ring-[#1162a8] w-4 h-4 rounded border-gray-300"
                            id={`stage-${opt}`}
                          />
                          <label htmlFor={`stage-${opt}`} className="text-sm">{opt}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 mt-8">
                    <Button variant="outline" onClick={() => {/* reset logic */}} className="px-6">
                      Reset Filter
                    </Button>
                    <Button className="bg-[#1162a8] hover:bg-[#0f5490] text-white px-6"
                      onClick={() => setShowAdvanceFilter(false)}
                    >
                      Apply Filter
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Case Design Details */}
        {step === 3 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Form fields at the top */}
            <div className="px-8 py-6 bg-gray-50 border-b">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {/* Same form fields as previous steps */}
                <div className="space-y-2">
                  <Label htmlFor="lab" className="text-sm font-medium">Choose your lab</Label>
                  <Select value={formData.lab} onValueChange={(value) => setFormData((prev) => ({ ...prev, lab: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select lab" /></SelectTrigger>
                    <SelectContent>
                      {mockLabs.map((lab) => (
                        <SelectItem key={lab.id} value={lab.name}>{lab.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* ...other form fields... */}
                <div className="space-y-2">
                  <Label htmlFor="doctor" className="text-sm font-medium">Choose your doctor</Label>
                  <Select value={formData.doctor} onValueChange={(value) => setFormData((prev) => ({ ...prev, doctor: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dr-smith">Dr. Smith</SelectItem>
                      <SelectItem value="dr-jones">Dr. Jones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient" className="text-sm font-medium">Patient name</Label>
                  <Select value={formData.patient} onValueChange={(value) => setFormData((prev) => ({ ...prev, patient: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient1">John Doe</SelectItem>
                      <SelectItem value="patient2">Jane Smith</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pan" className="text-sm font-medium">Pan #:</Label>
                  <Input id="pan" value={formData.panNumber} onChange={(e) => setFormData((prev) => ({ ...prev, panNumber: e.target.value }))} placeholder="-----" className="text-center" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="case" className="text-sm font-medium">Case #</Label>
                  <Input id="case" value={formData.caseNumber} onChange={(e) => setFormData((prev) => ({ ...prev, caseNumber: e.target.value }))} readOnly className="bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slip" className="text-sm font-medium">Slip #:</Label>
                  <Input id="slip" value={formData.slipNumber} onChange={(e) => setFormData((prev) => ({ ...prev, slipNumber: e.target.value }))} readOnly className="bg-gray-100" />
                </div>
              </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex">
                {/* Left sidebar - Maxillary */}
                <div className="w-64 bg-white border-r flex flex-col">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold text-center">MAXILLARY</h3>
                    <p className="text-sm text-gray-500 text-center">{selectedTeeth.filter(t => t <= 16).length} Selected</p>
                  </div>
                  <div className="flex-1 p-4 flex items-center justify-center">
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({length: 16}, (_, i) => i + 1).map((tooth) => (
                        <button
                          key={tooth}
                          onClick={() => handleToothClick(tooth)}
                          className={`w-8 h-8 rounded-full border-2 text-xs font-medium transition-all ${
                            selectedTeeth.includes(tooth)
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {tooth}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Center content */}
                <div className="flex-1 bg-gray-50 flex flex-col">
                  {/* Product info bar */}
                  <div className="bg-blue-100 p-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded border flex items-center justify-center">
                          <img src="/images/dental-icon.png" alt="Dental" className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Metal Frame Acrylic</h4>
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span>Maxillary</span>
                            <span>Mandibular</span>
                            <span>#4, #5, #6, #16, #17, #18</span>
                            <span>Try in with teeth</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowAddOnsModal(true)}
                          className="flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          Add ons
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowAttachFilesModal(true)}
                          className="flex items-center gap-1"
                        >
                          <Paperclip className="w-4 h-4" />
                          Attach Files
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Main design area */}
                  <div className="flex-1 p-8 flex flex-col items-center justify-center">
                    <div className="text-center">
                      <p className="text-gray-500 mb-4">
                        Click on teeth from the <strong>Maxillary</strong> (left) or <strong>Mandibular</strong> (right) <br />
                        charts to start building your case.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right sidebar - Mandibular */}
                <div className="w-64 bg-white border-l flex flex-col">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold text-center">MANDIBULAR</h3>
                    <p className="text-sm text-gray-500 text-center">{selectedTeeth.filter(t => t > 16).length} Selected</p>
                  </div>
                  <div className="flex-1 p-4 flex items-center justify-center">
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({length: 16}, (_, i) => i + 17).map((tooth) => (
                        <button
                          key={tooth}
                          onClick={() => handleToothClick(tooth)}
                          className={`w-8 h-8 rounded-full border-2 text-xs font-medium transition-all ${
                            selectedTeeth.includes(tooth)
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {tooth}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Ons Modal */}
        {showAddOnsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-400 max-w-2xl w-full mx-4 p-6 relative">
              <div className="flex justify-between items-start mb-6">
                <h4 className="text-lg font-semibold">Add ons</h4>
                <button onClick={() => setShowAddOnsModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Search and Add-ons */}
                <div className="flex gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search Add-ons" className="pl-10" />
                  </div>
                  <div className="text-sm text-gray-500 flex items-center">Add-ons</div>
                  <div className="text-sm text-gray-500 flex items-center">Qty</div>
                </div>

                {/* Reinforcements */}
                <div className="space-y-3">
                  <Label className="font-medium">Reinforcements</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <Select value={addOnsData.reinforcements.category} onValueChange={(value) => setAddOnsData(prev => ({ ...prev, reinforcements: { ...prev.reinforcements, category: value } }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Custom Abutment">Custom Abutment</SelectItem>
                        <SelectItem value="Standard Abutment">Standard Abutment</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={addOnsData.reinforcements.addOns} onValueChange={(value) => setAddOnsData(prev => ({ ...prev, reinforcements: { ...prev.reinforcements, addOns: value } }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add-ons" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Titanium">Titanium</SelectItem>
                        <SelectItem value="Zirconia">Zirconia</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={addOnsData.reinforcements.qty} onValueChange={(value) => setAddOnsData(prev => ({ ...prev, reinforcements: { ...prev.reinforcements, qty: value } }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Qty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Titanium">Titanium</SelectItem>
                        <SelectItem value="A1">A1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Add
                  </Button>
                </div>

                {/* Aesthetic Enhancement */}
                <div className="space-y-3">
                  <Label className="font-medium">Aesthetic Enhancement</Label>
                  <Select value={addOnsData.aestheticEnhancement} onValueChange={(value) => setAddOnsData(prev => ({ ...prev, aestheticEnhancement: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select enhancement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Functional Modifications */}
                <div className="space-y-3">
                  <Label className="font-medium">Functional Modifications</Label>
                  <Select value={addOnsData.functionalModifications} onValueChange={(value) => setAddOnsData(prev => ({ ...prev, functionalModifications: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select modification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Miscellaneous */}
                <div className="space-y-3">
                  <Label className="font-medium">Miscellaneous</Label>
                  <Select value={addOnsData.miscellaneous} onValueChange={(value) => setAddOnsData(prev => ({ ...prev, miscellaneous: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowAddOnsModal(false)}>
                  Cancel
                </Button>
                <Button className="bg-[#1162a8] hover:bg-[#0f5490] text-white" onClick={() => setShowAddOnsModal(false)}>
                  Attach Files
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Attach Files Modal */}
        {showAttachFilesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-400 max-w-2xl w-full mx-4 p-6 relative">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-lg font-semibold">Attach Files</h4>
                  <p className="text-sm text-gray-500 mt-1">Upload case files, scans, photos or documents related to this treatment.</p>
                </div>
                <button onClick={() => setShowAttachFilesModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* File upload area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Drag & drop files here or click to browse files</p>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" className="cursor-pointer">
                      Browse Files
                    </Button>
                  </label>
                </div>

                {/* File description */}
                <div className="space-y-2">
                  <Label htmlFor="file-description">Label or describe this attachment</Label>
                  <Input
                    id="file-description"
                    placeholder="Enter description..."
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                    className="bg-gray-50"
                  />
                </div>

                {/* Uploaded files list */}
                {attachedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Files</Label>
                    <div className="space-y-1">
                      {attachedFiles.map((file, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowAttachFilesModal(false)}>
                  Cancel
                </Button>
                <Button className="bg-[#1162a8] hover:bg-[#0f5490] text-white" onClick={() => setShowAttachFilesModal(false)}>
                  Attach Files
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Treatment Arch Selection Modal */}
        {showArchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl border-2 border-blue-400 max-w-md w-full mx-4 p-6 relative">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-lg font-semibold">Choose Treatment Arch</h4>
                  <p className="text-sm text-gray-500 mt-1">Select the arch for treatment</p>
                </div>
                <button onClick={() => setShowArchModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                {/* Upper Arch */}
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedArch === 'upper' || selectedArch === 'both' ? 'border-[#1162a8] bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedArch('upper')}
                >
                  <div className="flex items-center justify-center mb-2">
                    <img 
                      src={selectedArch === 'both' ? "/images/upper-arch-selected.svg" : "/images/upper-arch.png"} 
                      alt="Upper Arch" 
                      className="w-16 h-8 object-contain"
                    />
                  </div>
                  <p className="text-center text-sm font-medium">Upper Arch</p>
                </div>

                {/* Lower Arch */}
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedArch === 'lower' || selectedArch === 'both' ? 'border-[#1162a8] bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedArch('lower')}
                >
                  <div className="flex items-center justify-center mb-2">
                    <img 
                      src={selectedArch === 'both' ? "/images/lower-arch-selected.svg" : "/images/lower-arch.png"} 
                      alt="Lower Arch" 
                      className="w-16 h-8 object-contain"
                    />
                  </div>
                  <p className="text-center text-sm font-medium">Lower Arch</p>
                </div>

                {/* Both Arches */}
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedArch === 'both' ? 'border-[#1162a8] bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedArch('both')}
                >
                  <div className="flex items-center justify-center mb-2">
                    <div className="flex flex-col items-center space-y-1">
                      <img 
                        src="/images/upper-arch.png" 
                        alt="Upper Arch" 
                        className="w-16 h-6 object-contain"
                      />
                      <img 
                        src="/images/lower-arch.png" 
                        alt="Lower Arch" 
                        className="w-16 h-6 object-contain"
                      />
                    </div>
                  </div>
                  <p className="text-center text-sm font-medium">Both Arches</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowArchModal(false)}
                  className="px-3 py-2"
                >
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

        {/* Footer */}
        <div className="flex justify-end gap-4 p-6 border-t bg-gray-50 rounded-b-2xl">
          {(step === 2 || step === 3) && (
            <Button variant="outline" className="px-6 py-2 rounded-lg" onClick={handleBack}>
              Back
            </Button>
          )}
          <Button variant="outline" className="px-6 py-2 rounded-lg" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 1 && (
            <Button className="bg-[#1162a8] hover:bg-[#0f5490] text-white px-8 py-2 rounded-lg font-semibold" onClick={handleContinue} disabled={!selectedLab}>
              Continue
            </Button>
          )}
          {step === 2 && (
            <Button className="bg-[#1162a8] hover:bg-[#0f5490] text-white px-8 py-2 rounded-lg font-semibold" onClick={handleContinue} disabled={!selectedProduct}>
              Continue
            </Button>
          )}
          {step === 3 && (
            <Button className="bg-[#1162a8] hover:bg-[#0f5490] text-white px-8 py-2 rounded-lg font-semibold" onClick={handleSubmit}>
              Submit Case
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
