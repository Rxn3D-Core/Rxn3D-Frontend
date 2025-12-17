"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, ChevronRight } from "lucide-react"

interface ServiceOption {
  id: string
  label: string
  isPrimary?: boolean
  specialOptions?: {
    id: string
    label: string
  }[]
}

const serviceOptions: ServiceOption[] = [
  {
    id: "orthodontic",
    label: "Orthodontic Appliances",
    isPrimary: true,
    specialOptions: [
      { id: "braces", label: "Braces" },
      { id: "aligners", label: "Clear Aligners" },
      { id: "retainers", label: "Retainers" },
      { id: "expanders", label: "Palatal Expanders" },
      { id: "functional", label: "Functional Appliances" },
    ],
  },
  { id: "fixed-prosthetics", label: "Fixed Prosthetics", isPrimary: true },
  {
    id: "removable-prosthetics",
    label: "Removable Prosthetics",
    isPrimary: true,
    specialOptions: [
      { id: "complete-dentures", label: "Complete Dentures" },
      { id: "partial-dentures", label: "Partial Dentures" },
      { id: "immediate-dentures", label: "Immediate Dentures" },
      { id: "overdentures", label: "Overdentures" },
      { id: "temporary", label: "Temporary Prosthetics" },
    ],
  },
  { id: "partial-dentures", label: "Partial Dentures", isPrimary: true },
  { id: "implant-prosthetics", label: "Implant Prosthetics" },
  { id: "occlusal-appliance", label: "Occlusal Appliance" },
  { id: "pediatric", label: "Pediatric Restorations" },
  { id: "bleaching", label: "Bleaching / Whitening" },
  { id: "repairs", label: "Repairs & Modifications" },
  { id: "diagnostic", label: "Diagnostic & Planning" },
  { id: "digital-dentistry", label: "Digital Dentistry" },
  {
    id: "digital-3d",
    label: "Digital Dentistry - 3D Printing",
    specialOptions: [
      { id: "models", label: "Models" },
      { id: "surgical-guides", label: "Surgical Guides" },
      { id: "provisions", label: "Provisions" },
      { id: "custom", label: "Custom" },
    ],
  },
  { id: "relines", label: "Relines & Rebases" },
  { id: "implant-support", label: "Implant Support Dentures" },
  { id: "custom-product", label: "Custom Product" },
]

export function ProductsAndServices() {
  const [selectedServices, setSelectedServices] = React.useState<string[]>([])
  const [specializedOptions, setSpecializedOptions] = React.useState<string[]>([])

  const handleServiceClick = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    )
  }

  const handleSpecializedOptionChange = (optionId: string) => {
    setSpecializedOptions((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Products and services</h2>
        <p className="text-gray-600 mb-8">What products and services do you offer?</p>

        <div className="flex flex-wrap gap-3 mb-8">
          {serviceOptions.map((service) => {
            if (service.specialOptions) {
              return (
                <Popover key={service.id}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={selectedServices.includes(service.id) ? "default" : "outline"}
                      className={cn(
                        "h-auto py-3 px-5 rounded-lg text-sm font-medium transition-all duration-200",
                        selectedServices.includes(service.id)
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                          : service.isPrimary
                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                            : "bg-white hover:bg-gray-50 border-gray-200",
                      )}
                      onClick={() => handleServiceClick(service.id)}
                    >
                      <span className="flex items-center">
                        {service.label} <ChevronDown className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4 shadow-lg rounded-lg border-gray-200">
                    <div className="space-y-4">
                      <div className="font-medium text-sm text-gray-700 mb-2">Select options:</div>
                      {service.specialOptions.map((option) => (
                        <div key={option.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={option.id}
                            checked={specializedOptions.includes(option.id)}
                            onCheckedChange={() => handleSpecializedOptionChange(option.id)}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <label
                            htmlFor={option.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )
            }

            return (
              <Button
                key={service.id}
                variant={selectedServices.includes(service.id) ? "default" : "outline"}
                className={cn(
                  "h-auto py-3 px-5 rounded-lg text-sm font-medium transition-all duration-200",
                  selectedServices.includes(service.id)
                    ? service.isPrimary
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                    : service.isPrimary
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                      : "bg-white hover:bg-gray-50 border-gray-200",
                )}
                onClick={() => handleServiceClick(service.id)}
              >
                <span className="flex items-center">
                  {selectedServices.includes(service.id) && !service.isPrimary && <Check className="mr-2 h-4 w-4" />}
                  {service.label}
                </span>
              </Button>
            )
          })}
        </div>

        <div className="flex justify-between mt-8 pt-6 border-t">
          <div className="space-x-3">
            <Button variant="outline" className="text-gray-600 border-gray-300 hover:bg-gray-50">
              Continue Later
            </Button>
            <Button variant="outline" className="text-gray-600 border-gray-300 hover:bg-gray-50">
              Previous
            </Button>
          </div>
          <Button className="bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600">
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
