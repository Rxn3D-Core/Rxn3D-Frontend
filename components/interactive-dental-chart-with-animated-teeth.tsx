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

const toothDatabase: { [key: number]: ToothInfo } = {
  // Maxillary teeth (1-16)
  1: {
    number: 1,
    name: "Right Third Molar",
    type: "Molar",
    function: "Grinding and chewing food",
    location: "Upper right back",
    characteristics: ["Wisdom tooth", "Last to erupt", "Often extracted"],
    commonIssues: ["Impaction", "Crowding", "Decay"],
  },
  2: {
    number: 2,
    name: "Right Second Molar",
    type: "Molar",
    function: "Primary grinding surface",
    location: "Upper right back",
    characteristics: ["Large chewing surface", "Multiple roots", "Essential for chewing"],
    commonIssues: ["Decay", "Fractures", "Root canal needs"],
  },
  3: {
    number: 3,
    name: "Right First Molar",
    type: "Molar",
    function: "Main chewing tooth",
    location: "Upper right back",
    characteristics: ["First permanent molar", "Largest chewing surface", "Key for bite"],
    commonIssues: ["Decay", "Wear", "Cracked cusps"],
  },
  4: {
    number: 4,
    name: "Right Second Premolar",
    type: "Premolar",
    function: "Crushing and grinding",
    location: "Upper right side",
    characteristics: ["Two cusps", "Transitional tooth", "Important for chewing"],
    commonIssues: ["Decay", "Wear", "Sensitivity"],
  },
  5: {
    number: 5,
    name: "Right First Premolar",
    type: "Premolar",
    function: "Crushing and tearing",
    location: "Upper right side",
    characteristics: ["Bicuspid", "Sharp cusps", "Bridge between canine and molars"],
    commonIssues: ["Decay", "Fractures", "Wear"],
  },
  6: {
    number: 6,
    name: "Right Canine",
    type: "Canine",
    function: "Tearing and holding food",
    location: "Upper right front",
    characteristics: ["Longest root", "Sharp point", "Corner tooth"],
    commonIssues: ["Wear", "Gum recession", "Sensitivity"],
  },
  7: {
    number: 7,
    name: "Right Lateral Incisor",
    type: "Incisor",
    function: "Cutting and shearing",
    location: "Upper right front",
    characteristics: ["Smaller than central", "Refined cutting edge", "Aesthetic importance"],
    commonIssues: ["Chips", "Discoloration", "Spacing"],
  },
  8: {
    number: 8,
    name: "Right Central Incisor",
    type: "Incisor",
    function: "Cutting and biting",
    location: "Upper right center",
    characteristics: ["Largest incisor", "Most visible", "Key for smile"],
    commonIssues: ["Chips", "Discoloration", "Trauma"],
  },
  9: {
    number: 9,
    name: "Left Central Incisor",
    type: "Incisor",
    function: "Cutting and biting",
    location: "Upper left center",
    characteristics: ["Largest incisor", "Most visible", "Key for smile"],
    commonIssues: ["Chips", "Discoloration", "Trauma"],
  },
  10: {
    number: 10,
    name: "Left Lateral Incisor",
    type: "Incisor",
    function: "Cutting and shearing",
    location: "Upper left front",
    characteristics: ["Smaller than central", "Refined cutting edge", "Aesthetic importance"],
    commonIssues: ["Chips", "Discoloration", "Spacing"],
  },
  11: {
    number: 11,
    name: "Left Canine",
    type: "Canine",
    function: "Tearing and holding food",
    location: "Upper left front",
    characteristics: ["Longest root", "Sharp point", "Corner tooth"],
    commonIssues: ["Wear", "Gum recession", "Sensitivity"],
  },
  12: {
    number: 12,
    name: "Left First Premolar",
    type: "Premolar",
    function: "Crushing and tearing",
    location: "Upper left side",
    characteristics: ["Bicuspid", "Sharp cusps", "Bridge between canine and molars"],
    commonIssues: ["Decay", "Fractures", "Wear"],
  },
  13: {
    number: 13,
    name: "Left Second Premolar",
    type: "Premolar",
    function: "Crushing and grinding",
    location: "Upper left side",
    characteristics: ["Two cusps", "Transitional tooth", "Important for chewing"],
    commonIssues: ["Decay", "Wear", "Sensitivity"],
  },
  14: {
    number: 14,
    name: "Left First Molar",
    type: "Molar",
    function: "Main chewing tooth",
    location: "Upper left back",
    characteristics: ["First permanent molar", "Largest chewing surface", "Key for bite"],
    commonIssues: ["Decay", "Wear", "Cracked cusps"],
  },
  15: {
    number: 15,
    name: "Left Second Molar",
    type: "Molar",
    function: "Primary grinding surface",
    location: "Upper left back",
    characteristics: ["Large chewing surface", "Multiple roots", "Essential for chewing"],
    commonIssues: ["Decay", "Fractures", "Root canal needs"],
  },
  16: {
    number: 16,
    name: "Left Third Molar",
    type: "Molar",
    function: "Grinding and chewing food",
    location: "Upper left back",
    characteristics: ["Wisdom tooth", "Last to erupt", "Often extracted"],
    commonIssues: ["Impaction", "Crowding", "Decay"],
  },
  // Mandibular teeth (17-32)
  17: {
    number: 17,
    name: "Left Third Molar",
    type: "Molar",
    function: "Grinding and chewing food",
    location: "Lower left back",
    characteristics: ["Wisdom tooth", "Last to erupt", "Often extracted"],
    commonIssues: ["Impaction", "Crowding", "Decay"],
  },
  18: {
    number: 18,
    name: "Left Second Molar",
    type: "Molar",
    function: "Primary grinding surface",
    location: "Lower left back",
    characteristics: ["Large chewing surface", "Multiple roots", "Essential for chewing"],
    commonIssues: ["Decay", "Fractures", "Root canal needs"],
  },
  19: {
    number: 19,
    name: "Left First Molar",
    type: "Molar",
    function: "Main chewing tooth",
    location: "Lower left back",
    characteristics: ["First permanent molar", "Largest chewing surface", "Key for bite"],
    commonIssues: ["Decay", "Wear", "Cracked cusps"],
  },
  20: {
    number: 20,
    name: "Left Second Premolar",
    type: "Premolar",
    function: "Crushing and grinding",
    location: "Lower left side",
    characteristics: ["Two cusps", "Transitional tooth", "Important for chewing"],
    commonIssues: ["Decay", "Wear", "Sensitivity"],
  },
  21: {
    number: 21,
    name: "Left First Premolar",
    type: "Premolar",
    function: "Crushing and tearing",
    location: "Lower left side",
    characteristics: ["Bicuspid", "Sharp cusps", "Bridge between canine and molars"],
    commonIssues: ["Decay", "Fractures", "Wear"],
  },
  22: {
    number: 22,
    name: "Left Canine",
    type: "Canine",
    function: "Tearing and holding food",
    location: "Lower left front",
    characteristics: ["Longest root", "Sharp point", "Corner tooth"],
    commonIssues: ["Wear", "Gum recession", "Sensitivity"],
  },
  23: {
    number: 23,
    name: "Left Lateral Incisor",
    type: "Incisor",
    function: "Cutting and shearing",
    location: "Lower left front",
    characteristics: ["Smaller than central", "Refined cutting edge", "Narrow crown"],
    commonIssues: ["Chips", "Crowding", "Wear"],
  },
  24: {
    number: 24,
    name: "Left Central Incisor",
    type: "Incisor",
    function: "Cutting and biting",
    location: "Lower left center",
    characteristics: ["Smallest incisor", "Narrow crown", "Important for speech"],
    commonIssues: ["Chips", "Crowding", "Wear"],
  },
  25: {
    number: 25,
    name: "Right Central Incisor",
    type: "Incisor",
    function: "Cutting and biting",
    location: "Lower right center",
    characteristics: ["Smallest incisor", "Narrow crown", "Important for speech"],
    commonIssues: ["Chips", "Crowding", "Wear"],
  },
  26: {
    number: 26,
    name: "Right Lateral Incisor",
    type: "Incisor",
    function: "Cutting and shearing",
    location: "Lower right front",
    characteristics: ["Smaller than central", "Refined cutting edge", "Narrow crown"],
    commonIssues: ["Chips", "Crowding", "Wear"],
  },
  27: {
    number: 27,
    name: "Right Canine",
    type: "Canine",
    function: "Tearing and holding food",
    location: "Lower right front",
    characteristics: ["Longest root", "Sharp point", "Corner tooth"],
    commonIssues: ["Wear", "Gum recession", "Sensitivity"],
  },
  28: {
    number: 28,
    name: "Right First Premolar",
    type: "Premolar",
    function: "Crushing and tearing",
    location: "Lower right side",
    characteristics: ["Bicuspid", "Sharp cusps", "Bridge between canine and molars"],
    commonIssues: ["Decay", "Fractures", "Wear"],
  },
  29: {
    number: 29,
    name: "Right Second Premolar",
    type: "Premolar",
    function: "Crushing and grinding",
    location: "Lower right side",
    characteristics: ["Two cusps", "Transitional tooth", "Important for chewing"],
    commonIssues: ["Decay", "Wear", "Sensitivity"],
  },
  30: {
    number: 30,
    name: "Right First Molar",
    type: "Molar",
    function: "Main chewing tooth",
    location: "Lower right back",
    characteristics: ["First permanent molar", "Largest chewing surface", "Key for bite"],
    commonIssues: ["Decay", "Wear", "Cracked cusps"],
  },
  31: {
    number: 31,
    name: "Right Second Molar",
    type: "Molar",
    function: "Primary grinding surface",
    location: "Lower right back",
    characteristics: ["Large chewing surface", "Multiple roots", "Essential for chewing"],
    commonIssues: ["Decay", "Fractures", "Root canal needs"],
  },
  32: {
    number: 32,
    name: "Right Third Molar",
    type: "Molar",
    function: "Grinding and chewing food",
    location: "Lower right back",
    characteristics: ["Wisdom tooth", "Last to erupt", "Often extracted"],
    commonIssues: ["Impaction", "Crowding", "Decay"],
  },
}

const BASE_WIDTH = 750
const BASE_HEIGHT = 420

// Function to convert pixel positions to percentages
const convertToPercentages = (positions: any[]) => {
  return positions.map((pos) => ({
    ...pos,
    imgX: (pos.imgX / BASE_WIDTH) * 100,
    imgY: (pos.imgY / BASE_HEIGHT) * 100,
    imgWidth: (pos.imgWidth / BASE_WIDTH) * 100,
    imgHeight: (pos.imgHeight / BASE_HEIGHT) * 100,
    labelX: (pos.labelX / BASE_WIDTH) * 100,
    labelY: (pos.labelY / BASE_HEIGHT) * 100,
    badgeX: (pos.badgeX / BASE_WIDTH) * 100,
    badgeY: (pos.badgeY / BASE_HEIGHT) * 100,
  }))
}

// Tooth position coordinates arranged in natural dental arch formation
// Following the curve shown in the reference image, adjusted for larger teeth
const maxillaryPositions = convertToPercentages([
  // Right side teeth (1-8) - starting from back right, curving to center
  {
    number: 1,
    imgX: 50,
    imgY: 350,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 87.5,
    labelY: 187.5,
    badgeX: 87.5,
    badgeY: 135,
  },
  {
    number: 2,
    imgX: 54,
    imgY: 278,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 117.5,
    labelY: 157.5,
    badgeX: 117.5,
    badgeY: 105,
  },
  {
    number: 3,
    imgX: 65, //left or right
    imgY: 214, //up or down
    imgWidth: 75,
    imgHeight: 75,
    labelX: 157.5,
    labelY: 127.5,
    badgeX: 157.5,
    badgeY: 75,
  },
  {
    number: 4,
    imgX: 80,
    imgY: 150,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 197.5,
    labelY: 97.5,
    badgeX: 197.5,
    badgeY: 45,
  },
  {
    number: 5,
    imgX: 110,
    imgY: 90,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 237.5,
    labelY: 72.5,
    badgeX: 237.5,
    badgeY: 20,
  },
  {
    number: 6,
    imgX: 150,
    imgY: 40,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 277.5,
    labelY: 52.5,
    badgeX: 277.5,
    badgeY: 0,
  },
  {
    number: 7,
    imgX: 205,
    imgY: -10,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 317.5,
    labelY: 42.5,
    badgeX: 317.5,
    badgeY: -10,
  },
  {
    number: 8,
    imgX: 273,
    imgY: -33,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 357.5,
    labelY: 37.5,
    badgeX: 357.5,
    badgeY: -15,
  },

  // Left side teeth (9-16) - starting from center, curving to back left
  {
    number: 9,
    imgX: 349,
    imgY: -33,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 392.5,
    labelY: 37.5,
    badgeX: 392.5,
    badgeY: -15,
  },
  {
    number: 10,
    imgX: 415,
    imgY: -12,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 432.5,
    labelY: 42.5,
    badgeX: 432.5,
    badgeY: -10,
  },
  {
    number: 11,
    imgX: 460,
    imgY: 40,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 472.5,
    labelY: 52.5,
    badgeX: 472.5,
    badgeY: 0,
  },
  {
    number: 12,
    imgX: 495,
    imgY: 90,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 512.5,
    labelY: 72.5,
    badgeX: 512.5,
    badgeY: 20,
  },
  {
    number: 13,
    imgX: 510,
    imgY: 150,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 552.5,
    labelY: 97.5,
    badgeX: 552.5,
    badgeY: 45,
  },
  {
    number: 14,
    imgX: 523,
    imgY: 214,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 592.5,
    labelY: 127.5,
    badgeX: 592.5,
    badgeY: 75,
  },
  {
    number: 15,
    imgX: 537,
    imgY: 278,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 632.5,
    labelY: 157.5,
    badgeX: 632.5,
    badgeY: 105,
  },
  {
    number: 16,
    imgX: 537,
    imgY: 350,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 662.5,
    labelY: 187.5,
    badgeX: 662.5,
    badgeY: 135,
  },
])

const mandibularPositions = convertToPercentages([
  // Right side teeth (1-8) - starting from back right, curving to center
  {
    number: 17,
    imgX: 25,
    imgY: 355,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 87.5,
    labelY: 187.5,
    badgeX: 87.5,
    badgeY: 135,
  },
  {
    number: 18,
    imgX: 29,
    imgY: 288,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 117.5,
    labelY: 157.5,
    badgeX: 117.5,
    badgeY: 105,
  },
  {
    number: 19,
    imgX: 45,
    imgY: 210,
    imgWidth: 80,
    imgHeight: 80,
    labelX: 157.5,
    labelY: 127.5,
    badgeX: 157.5,
    badgeY: 75,
  },
  {
    number: 20,
    imgX: 80,
    imgY: 150,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 197.5,
    labelY: 97.5,
    badgeX: 197.5,
    badgeY: 45,
  },
  {
    number: 21,
    imgX: 110,
    imgY: 90,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 237.5,
    labelY: 72.5,
    badgeX: 237.5,
    badgeY: 20,
  },
  {
    number: 22,
    imgX: 150,
    imgY: 40,
    imgWidth: 75,
    imgHeight: 60,
    labelX: 277.5,
    labelY: 52.5,
    badgeX: 277.5,
    badgeY: 0,
  },
  {
    number: 23,
    imgX: 205,
    imgY: -10,
    imgWidth: 75,
    imgHeight: 60,
    labelX: 317.5,
    labelY: 42.5,
    badgeX: 317.5,
    badgeY: -10,
  },
  {
    number: 24,
    imgX: 273,
    imgY: -33,
    imgWidth: 75,
    imgHeight: 60,
    labelX: 357.5,
    labelY: 37.5,
    badgeX: 357.5,
    badgeY: -15,
  },

  {
    number: 25,
    imgX: 349,
    imgY: -33,
    imgWidth: 75,
    imgHeight: 60,
    labelX: 392.5,
    labelY: 37.5,
    badgeX: 392.5,
    badgeY: -15,
  },
  {
    number: 26,
    imgX: 415,
    imgY: -12,
    imgWidth: 75,
    imgHeight: 60,
    labelX: 432.5,
    labelY: 42.5,
    badgeX: 432.5,
    badgeY: -10,
  },
  {
    number: 27,
    imgX: 460,
    imgY: 40,
    imgWidth: 75,
    imgHeight: 60,
    labelX: 472.5,
    labelY: 52.5,
    badgeX: 472.5,
    badgeY: 0,
  },
  {
    number: 28,
    imgX: 495,
    imgY: 90,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 512.5,
    labelY: 72.5,
    badgeX: 512.5,
    badgeY: 20,
  },
  {
    number: 29,
    imgX: 525,
    imgY: 150,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 552.5,
    labelY: 97.5,
    badgeX: 552.5,
    badgeY: 45,
  },
  {
    number: 30,
    imgX: 550,
    imgY: 214,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 592.5,
    labelY: 127.5,
    badgeX: 592.5,
    badgeY: 75,
  },
  {
    number: 31,
    imgX: 570,
    imgY: 288,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 632.5,
    labelY: 157.5,
    badgeX: 632.5,
    badgeY: 105,
  },
  {
    number: 32,
    imgX: 575,
    imgY: 355,
    imgWidth: 75,
    imgHeight: 75,
    labelX: 662.5,
    labelY: 187.5,
    badgeX: 662.5,
    badgeY: 135,
  },
])

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

  if (
    (type === "maxillary" && visibleArch !== "upper" && visibleArch !== "both") ||
    (type === "mandibular" && visibleArch !== "lower" && visibleArch !== "both")
  ) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-col items-center pb-3">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="py-12 text-center text-gray-500">
            <p className="text-sm">
              {type === "maxillary"
                ? "Maxillary arch not selected for this product."
                : "Mandibular arch not selected for this product."}
            </p>
          </div>
        </CardContent>
      </Card>
    )
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
          {(type === "maxillary" && (visibleArch === "upper" || visibleArch === "both")) ||
            (type === "mandibular" && (visibleArch === "lower" || visibleArch === "both")) ? (
            <>
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
                        const toothImageSrc = `/images/tooth-${pos.number}.png`
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
                        } else if (!isSelected && hoveredTooth === pos.number) {
                          currentImageToDisplay = hoverImageSrc
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
            </>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <p className="text-sm">
                {type === "maxillary"
                  ? "Maxillary arch not selected for this case."
                  : "Mandibular arch not selected for this case."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
