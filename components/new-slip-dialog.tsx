"use client"

import { useState } from "react"
import { Calendar, X, Check } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

interface NewSlipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewSlipDialog({ open, onOpenChange }: NewSlipDialogProps) {
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([])
  const [productLocation, setProductLocation] = useState<string>("upper")
  const [formData, setFormData] = useState({
    office: "",
    doctor: "",
    patient: "",
    pan: "",
    case: "",
    slip: "",
    location: "",
    status: "",
    pickupDate: "",
    deliveryDate: "",
    deliveryTime: "",
    productType: "",
    material: "",
    grade: "",
    stage: "",
    impressions: "",
    stageNotes: "",
    additionalNotes: "",
    termsAcknowledged: false,
  })

  const maxillaryTeeth = Array.from({ length: 16 }, (_, i) => i + 1)
  const mandibularTeeth = Array.from({ length: 16 }, (_, i) => i + 17)

  const toggleTooth = (toothNumber: number) => {
    setSelectedTeeth((prev) =>
      prev.includes(toothNumber) ? prev.filter((t) => t !== toothNumber) : [...prev, toothNumber],
    )
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = () => {
    // Process form submission
    onOpenChange(false)
  }

  const isFormValid = () => {
    return (
      formData.office &&
      formData.doctor &&
      formData.patient &&
      formData.location &&
      formData.status &&
      formData.pickupDate &&
      formData.deliveryDate &&
      formData.productType &&
      formData.material &&
      formData.grade &&
      formData.termsAcknowledged
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Add Slip</h2>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-8">
            {/* Patient Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Patient Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="office">
                    Office <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.office} onValueChange={(value) => handleInputChange("office", value)}>
                    <SelectTrigger id="office">
                      <SelectValue placeholder="Select office" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boca">Boca Park Dental</SelectItem>
                      <SelectItem value="other">Other Office</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor">
                    Doctor <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.doctor} onValueChange={(value) => handleInputChange("doctor", value)}>
                    <SelectTrigger id="doctor">
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="peter">Peter Badalamenti</SelectItem>
                      <SelectItem value="other">Other Doctor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient">
                  Patient <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patient"
                  placeholder="Enter patient name"
                  value={formData.patient}
                  onChange={(e) => handleInputChange("patient", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pan">Pan #</Label>
                  <Input
                    id="pan"
                    value={formData.pan}
                    onChange={(e) => handleInputChange("pan", e.target.value)}
                    placeholder="----"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="case">Case #</Label>
                  <Input
                    id="case"
                    value={formData.case}
                    onChange={(e) => handleInputChange("case", e.target.value)}
                    placeholder="Auto-generated"
                  />
                </div>
              </div>
            </div>

            {/* Case Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Case Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">
                    Location <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.location} onValueChange={(value) => handleInputChange("location", value)}>
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">
                    Case Status <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup">
                    Pick up Date <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="pickup"
                      type="date"
                      value={formData.pickupDate}
                      onChange={(e) => handleInputChange("pickupDate", e.target.value)}
                    />
                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery">
                    Delivery Date <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="delivery"
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => handleInputChange("deliveryDate", e.target.value)}
                    />
                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Delivery Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.deliveryTime}
                    onChange={(e) => handleInputChange("deliveryTime", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Teeth Selection Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Missing Teeth Selection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* MAXILLARY Section */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h5 className="text-center font-semibold mb-3 text-blue-700">MAXILLARY</h5>
                  <div className="relative mb-4">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/upper-teeth-pdf-VLOXTr43JTRt7pbqfhHj2dmpYR7Awm.png"
                      alt="Upper teeth diagram"
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 flex flex-wrap justify-center">
                      {maxillaryTeeth.map((tooth) => {
                        // Calculate position for each tooth button
                        // These values are approximate and may need adjustment
                        const positions = {
                          1: { top: "80%", left: "6%" },
                          2: { top: "70%", left: "10%" },
                          3: { top: "60%", left: "15%" },
                          4: { top: "50%", left: "20%" },
                          5: { top: "45%", left: "25%" },
                          6: { top: "40%", left: "30%" },
                          7: { top: "35%", left: "35%" },
                          8: { top: "35%", left: "42%" },
                          9: { top: "35%", left: "50%" },
                          10: { top: "35%", left: "58%" },
                          11: { top: "35%", left: "65%" },
                          12: { top: "40%", left: "70%" },
                          13: { top: "45%", left: "75%" },
                          14: { top: "50%", left: "80%" },
                          15: { top: "60%", left: "85%" },
                          16: { top: "70%", left: "90%" },
                        }

                        return (
                          <button
                            key={tooth}
                            type="button"
                            style={{
                              position: "absolute",
                              top: positions[tooth as keyof typeof positions]?.top || "50%",
                              left: positions[tooth as keyof typeof positions]?.left || "50%",
                              transform: "translate(-50%, -50%)",
                            }}
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center border transition-colors text-xs",
                              selectedTeeth.includes(tooth)
                                ? "bg-blue-600 text-white border-blue-700"
                                : "bg-white text-gray-900 border-gray-300 hover:bg-gray-100 opacity-70",
                            )}
                            onClick={() => toggleTooth(tooth)}
                          >
                            {tooth}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* MANDIBULAR Section */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h5 className="text-center font-semibold mb-3 text-blue-700">MANDIBULAR</h5>
                  <div className="relative mb-4">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/lowwer-teeth-pdf-D0SqNJ5q4MYeXFNZDSc4n45rhAc9fF.png"
                      alt="Lower teeth diagram"
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 flex flex-wrap justify-center">
                      {mandibularTeeth.map((tooth) => {
                        // Calculate position for each tooth button
                        // These values are approximate and may need adjustment
                        const positions = {
                          17: { top: "30%", left: "6%" },
                          18: { top: "25%", left: "10%" },
                          19: { top: "20%", left: "15%" },
                          20: { top: "15%", left: "20%" },
                          21: { top: "12%", left: "25%" },
                          22: { top: "10%", left: "30%" },
                          23: { top: "8%", left: "35%" },
                          24: { top: "8%", left: "42%" },
                          25: { top: "8%", left: "50%" },
                          26: { top: "8%", left: "58%" },
                          27: { top: "8%", left: "65%" },
                          28: { top: "10%", left: "70%" },
                          29: { top: "12%", left: "75%" },
                          30: { top: "15%", left: "80%" },
                          31: { top: "20%", left: "85%" },
                          32: { top: "25%", left: "90%" },
                        }

                        return (
                          <button
                            key={tooth}
                            type="button"
                            style={{
                              position: "absolute",
                              top: positions[tooth as keyof typeof positions]?.top || "50%",
                              left: positions[tooth as keyof typeof positions]?.left || "50%",
                              transform: "translate(-50%, -50%)",
                            }}
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center border transition-colors text-xs",
                              selectedTeeth.includes(tooth)
                                ? "bg-blue-600 text-white border-blue-700"
                                : "bg-white text-gray-900 border-gray-300 hover:bg-gray-100 opacity-70",
                            )}
                            onClick={() => toggleTooth(tooth)}
                          >
                            {tooth}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Teeth Legend */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600">Teeth To Replace</Button>
                <Button className="w-full bg-neutral-200 hover:bg-neutral-300 text-black">Teeth In Mouth</Button>
                <Button className="w-full bg-white border-2 hover:bg-gray-50 text-black">Missing Teeth</Button>
                <Button className="w-full bg-red-500 hover:bg-red-600">Will Extract On Delivery</Button>
              </div>
            </div>

            {/* Product Configuration Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Product Configuration</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    Product Location <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup value={productLocation} onValueChange={setProductLocation} className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="upper" id="upper" />
                      <Label htmlFor="upper" className="cursor-pointer">
                        Upper
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="lower" id="lower" />
                      <Label htmlFor="lower" className="cursor-pointer">
                        Lower
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3 border rounded-lg p-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-type">
                      Product Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.productType}
                      onValueChange={(value) => handleInputChange("productType", value)}
                    >
                      <SelectTrigger id="product-type">
                        <SelectValue placeholder="Select product type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="partial">Partial Dentures</SelectItem>
                        <SelectItem value="full">Full Dentures</SelectItem>
                        <SelectItem value="crown">Crown</SelectItem>
                        <SelectItem value="bridge">Bridge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="material">
                      Material <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.material} onValueChange={(value) => handleInputChange("material", value)}>
                      <SelectTrigger id="material">
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metal">Metal frame acrylic</SelectItem>
                        <SelectItem value="acrylic">Full acrylic</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                        <SelectItem value="other">Other material</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade">
                      Grade <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.grade} onValueChange={(value) => handleInputChange("grade", value)}>
                      <SelectTrigger id="grade">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economy">Economy</SelectItem>
                        <SelectItem value="mid">Mid Grade</SelectItem>
                        <SelectItem value="high">High Grade</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stage">Stage</Label>
                    <Select value={formData.stage} onValueChange={(value) => handleInputChange("stage", value)}>
                      <SelectTrigger id="stage">
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bite">Bite Block while metal is being made</SelectItem>
                        <SelectItem value="try-in">Try-in</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                        <SelectItem value="other">Other stage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="impressions">Impressions</Label>
                    <Select
                      value={formData.impressions}
                      onValueChange={(value) => handleInputChange("impressions", value)}
                    >
                      <SelectTrigger id="impressions">
                        <SelectValue placeholder="Select impression type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="heavy">1xHeavy body</SelectItem>
                        <SelectItem value="light">1xLight body</SelectItem>
                        <SelectItem value="both">Heavy & Light body</SelectItem>
                        <SelectItem value="digital">Digital Scan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Notes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stage-notes">Stage Notes</Label>
                  <textarea
                    id="stage-notes"
                    className="w-full h-24 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    placeholder="Enter stage notes..."
                    value={formData.stageNotes}
                    onChange={(e) => handleInputChange("stageNotes", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional-notes">Additional Instructions</Label>
                  <textarea
                    id="additional-notes"
                    className="w-full h-24 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    placeholder="Enter any additional instructions..."
                    value={formData.additionalNotes}
                    onChange={(e) => handleInputChange("additionalNotes", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={formData.termsAcknowledged}
              onCheckedChange={(checked) => handleInputChange("termsAcknowledged", checked === true)}
            />
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              By clicking this box you acknowledge all information is correct
            </label>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={!isFormValid()}>
              <Check className="h-4 w-4 mr-2" />
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
