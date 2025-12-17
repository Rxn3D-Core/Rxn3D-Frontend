"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface ToothInfo {
  number: number
  name: string
  type: string
  function: string
  location: string
  characteristics: string[]
  commonIssues: string[]
}

interface ProductBadgeInfo {
  abbreviation: string
  color: string // Tailwind color class, e.g., "bg-blue-600"
  hasAddOn: boolean // New property
}

interface InteractiveDentalChartProps {
  type: "maxillary" | "mandibular"
  selectedTeeth: number[]
  onToothToggle: (toothNumber: number) => void
  title: string
  productTeethMap: { [key: number]: ProductBadgeInfo[] } // New prop for product badges
  productButtons: {
    id: string
    name: string
    teeth: string
    color: string // Tailwind border color class, e.g., "border-blue-600"
    maxillaryTeeth?: string // New property for maxillary teeth
    mandibularTeeth?: string // New property for mandibular teeth
  }[] // New prop for buttons below chart
  visibleArch: string | null // New prop
  onProductButtonClick: (productId: string) => void // Add this prop
  openAccordionItem?: string // <-- Add this prop for selected product
  isCaseSubmitted?: boolean // <-- add prop
}
// Function to convert pixel positions to percentages
const VIEWBOX_WIDTH = 1500;
const VIEWBOX_HEIGHT_MAXILLARY = 822;

const maxillaryPositions = [
  // number: 1-16, in anatomical order (Right to Left)
  { number: 1,  imgX: 57,   imgY: 640, imgWidth: 192, imgHeight: 156 },
  { number: 2,  imgX: 115,  imgY: 500, imgWidth: 203, imgHeight: 188 },
  { number: 3,  imgX: 176,  imgY: 367, imgWidth: 220, imgHeight: 199 },
  { number: 4,  imgX: 266,  imgY: 285, imgWidth: 153, imgHeight: 149 },
  { number: 5,  imgX: 325,  imgY: 202, imgWidth: 149, imgHeight: 152 },
  { number: 6,  imgX: 403,  imgY: 123, imgWidth: 136, imgHeight: 178 },
  { number: 7,  imgX: 498,  imgY: 72,  imgWidth: 125, imgHeight: 189 },
  { number: 8,  imgX: 607,  imgY: 35,  imgWidth: 137, imgHeight: 200 }, // Not in SVG
  { number: 9,  imgX: 755,  imgY: 35,  imgWidth: 150, imgHeight: 210 },
  { number: 10, imgX: 889,  imgY: 72,  imgWidth: 125, imgHeight: 189 },
  { number: 11, imgX: 972,  imgY: 123, imgWidth: 137, imgHeight: 178 },
  { number: 12, imgX: 1040, imgY: 198, imgWidth: 149, imgHeight: 152 },
  { number: 13, imgX: 1095, imgY: 284, imgWidth: 154, imgHeight: 149 },
  { number: 14, imgX: 1115, imgY: 361, imgWidth: 221, imgHeight: 199 },
  { number: 15, imgX: 1194, imgY: 503, imgWidth: 203, imgHeight: 188 },
  { number: 16, imgX: 1262, imgY: 643, imgWidth: 192, imgHeight: 156 },
].map(pos => ({
  ...pos,
  imgX: (pos.imgX / VIEWBOX_WIDTH) * 100,
  imgY: (pos.imgY / VIEWBOX_HEIGHT_MAXILLARY) * 100,
  imgWidth: (pos.imgWidth / VIEWBOX_WIDTH) * 100,
  imgHeight: (pos.imgHeight / VIEWBOX_HEIGHT_MAXILLARY) * 100,
}));


const VIEWBOX_HEIGHT_MANDIBULAR = 790;

const mandibularPositions = [
  // number: 17-32, in anatomical order (Left to Right)
  { number: 17, imgX: 30,    imgY: 555, imgWidth: 252, imgHeight: 200 },
  { number: 18, imgX: 95,    imgY: 400, imgWidth: 232, imgHeight: 194 },
  { number: 19, imgX: 165,   imgY: 290, imgWidth: 235, imgHeight: 191 },
  { number: 20, imgX: 265,   imgY: 225, imgWidth: 167, imgHeight: 159 },
  { number: 21, imgX: 342,   imgY: 153, imgWidth: 150, imgHeight: 177 },
  { number: 22, imgX: 435,   imgY: 93,  imgWidth: 135, imgHeight: 200 },
  { number: 23, imgX: 540,   imgY: 60,  imgWidth: 115, imgHeight: 186 },
  { number: 24, imgX: 647,   imgY: 40,  imgWidth: 111, imgHeight: 182 },
  { number: 25, imgX: 760,   imgY: 42,  imgWidth: 111, imgHeight: 182 },
  { number: 26, imgX: 865,   imgY: 54,  imgWidth: 115, imgHeight: 186 },
  { number: 27, imgX: 955,   imgY: 80,  imgWidth: 135, imgHeight: 200 },
  { number: 28, imgX: 1035,  imgY: 134, imgWidth: 150, imgHeight: 177 },
  { number: 29, imgX: 1098,  imgY: 205, imgWidth: 167, imgHeight: 159 },
  { number: 30, imgX: 1130,  imgY: 278, imgWidth: 234, imgHeight: 191 },
  { number: 31, imgX: 1210,  imgY: 395, imgWidth: 232, imgHeight: 194 },
  { number: 32, imgX: 1273,  imgY: 560, imgWidth: 232, imgHeight: 193 },
].map(pos => ({
  ...pos,
  imgX: (pos.imgX / VIEWBOX_WIDTH) * 100,
  imgY: (pos.imgY / VIEWBOX_HEIGHT_MANDIBULAR) * 100,
  imgWidth: (pos.imgWidth / VIEWBOX_WIDTH) * 100,
  imgHeight: (pos.imgHeight / VIEWBOX_HEIGHT_MANDIBULAR) * 100,
}));



export default function InteractiveDentalChart({
  type,
  selectedTeeth,
  onToothToggle,
  title,
  productTeethMap,
  productButtons,
  visibleArch, // New prop
  onProductButtonClick = () => {}, // Add default no-op function
  openAccordionItem, // <-- Accept as prop
  isCaseSubmitted = false, // <-- add prop
}: InteractiveDentalChartProps) {
  const [selectedToothInfo, setSelectedToothInfo] = useState<ToothInfo | null>(null)
  const [showToothInfo, setShowToothInfo] = useState(false)
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null) // New state for hovered tooth

  const positions = type === "maxillary" ? maxillaryPositions : mandibularPositions
  const teethRange = type === "maxillary" ? [1, 16] : [17, 32]

  const handleToothClick = (toothNumber: number) => {
    if (!isCaseSubmitted) {
      onToothToggle(toothNumber)
    }
  }

  const getToothTypeColor = (type: string) => {
    switch (type) {
      case "Incisor":
        return "bg-blue-100 text-blue-800"
      case "Canine":
        return "bg-green-100 text-green-800"
      case "Premolar":
        return "bg-yellow-100 text-yellow-800"
      case "Molar":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="flex flex-col items-center pb-3">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="flex justify-center mb-8">
            <Badge variant="secondary">
              {selectedTeeth.filter((t) => t >= teethRange[0] && t <= teethRange[1]).length} Selected
            </Badge>
          </div>
          {/* Always show the chart for the selected type */}
          <div className="relative w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto">
            <div
              className="relative w-full flex justify-center items-center ml-6"
              style={{
                paddingTop: "56%", 
                maxWidth: "100%",
              }}
            >
              <div className="absolute inset-0 flex justify-center items-center">
                <div className="relative w-full h-full">
                  {positions.map((pos) => {
                    const isSelected = selectedTeeth.includes(pos.number)
                    const productBadges = productTeethMap[pos.number] || []
                    const toothImageSrc =
                      pos.number >= 1 && pos.number <= 16
                      ? `/images/teeth/up-${pos.number}.png`
                      : `/images/teeth/d-${pos.number}.png`
                    const hoverImageSrc = `/images/hover-tooth-${pos.number}.png`
                    const selectedImageSrc = `/images/selected-tooth-${pos.number}.png` // New selected image source

                    // Check if a selected image exists for this tooth
                    const hasSelectedImage = [
                      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
                      27, 28, 29, 30, 31, 32,
                    ].includes(pos.number)

                    // Determine which image to display
                    let currentImageToDisplay = toothImageSrc
                    if (isSelected && hasSelectedImage) {
                      currentImageToDisplay = selectedImageSrc
                    }

                    // Only render if the tooth number is within the current arch's range
                    if (pos.number < teethRange[0] || pos.number > teethRange[1]) {
                      return null
                    }

                    return (
                      <div
                        key={pos.number}
                        className="absolute"
                        style={{
                          left: `${pos.imgX}%`,
                          top: `${pos.imgY}%`,
                          width: `${pos.imgWidth}%`,
                          height: `${pos.imgHeight}%`,
                          cursor: isCaseSubmitted ? "not-allowed" : "pointer",
                        }}
                        onClick={() => handleToothClick(pos.number)}
                        onMouseEnter={() => setHoveredTooth(pos.number)} // Set hovered tooth
                        onMouseLeave={() => setHoveredTooth(null)} // Clear hovered tooth
                      >
                        {/* Render the appropriate tooth image */}
                        <Image
                          src={currentImageToDisplay || "/placeholder.svg"}
                          alt={`Tooth ${pos.number}`}
                          fill // Use fill to make it responsive within its parent
                          className="object-contain" // Maintain aspect ratio and fit within parent
                          priority
                        />

                        {/* Tooth number */}
                        <div
                          className={`absolute inset-0 flex items-center justify-center transition-all duration-200`}
                        >
                          <span
                            className={`text-xs font-medium select-none ${isSelected ? "text-white" : "text-gray-700"}`}
                          >
                            {pos.number}
                          </span>
                          {productBadges.some((badge) => badge.hasAddOn) && (
                            <div className="absolute top-0 right-0 -mt-2 -mr-2">
                              <Image
                                src="/images/red-plus.png"
                                alt="Add-on"
                                width={16}
                                height={16}
                                className="w-4 h-4"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            {/* Product Buttons and Selected teeth summary combined */}
            <div className="mt-4 space-y-2">
              {productButtons.map((product) => {
                const archTeeth =
                  type === "maxillary"
                    ? product.maxillaryTeeth || product.teeth
                    : product.mandibularTeeth || product.teeth
                const productTeethNumbers = archTeeth
                  .split(",")
                  .map((t) => parseInt(t.trim()))
                  .filter((t) => !isNaN(t))
                // Show the teeth for this product (not the currently selected teeth)
                const productTeethList = archTeeth
                  .split(",")
                  .map((t) => t.trim())
                  .filter((t) => t.length > 0)
                // Determine if this product is already selected (accordion open)
                const isSelected = openAccordionItem === product.id
                return (
                  <div key={product.id} className="w-full">
                    <button
                      type="button"
                      className={`w-full flex flex-col items-center border border-blue-600 text-gray-800 hover:bg-gray-50 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 transition
                        ${isSelected ? "opacity-60 pointer-events-none" : ""} text-xs`}
                      style={{ minHeight: "unset", height: "auto" }}
                      onClick={() => {
                        if (!isSelected) {
                          onProductButtonClick(product.id)
                        }
                      }}
                      disabled={isSelected}
                    >
                      <span className="font-semibold text-xs">{product.name}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {productTeethList.length > 0 ? (
                          productTeethList.map((tooth, idx, arr) => (
                            <span
                              className="text-xs font-semibold rounded px-2 py-0.5 pointer-events-none"
                              key={tooth}
                            >
                              {tooth}
                              {idx < arr.length - 1 && <span>,&nbsp;</span>}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">No teeth selected</span>
                        )}
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
            {/* Quick info */}
            <div className="mt-4 text-xs text-gray-500 text-center">
              Click on any tooth to select and view detailed information
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
