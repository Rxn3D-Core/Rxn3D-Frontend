"use client"

import React, { createContext, useContext } from "react"
import type { SavedProduct, Product } from "./types"

/**
 * Context value for the saved product section (accordion + cards).
 * The page provides all state and handlers; SavedProductSectionContent consumes them by arch.
 */
export interface SavedProductSectionContextValue {
  // Chart / selection
  showMaxillaryChart: boolean
  showMandibularChart: boolean
  maxillaryTeeth: number[]
  mandibularTeeth: number[]
  selectedProductForMaxillary: Product | null
  selectedProductForMandibular: Product | null
  savedProducts: SavedProduct[]
  productDetails: any
  // Accordion
  openAccordionMaxillary: string | null
  openAccordionMandibular: string | null
  handleAccordionChangeMaxillary: (value: string | undefined) => void
  handleAccordionChangeMandibular: (value: string | undefined) => void
  // Shade / UI
  currentShadeField: string | null
  // Handlers
  setSavedProducts: React.Dispatch<React.SetStateAction<SavedProduct[]>>
  handleDeleteProduct: (productId: string) => void
  handleOpenImpressionModal: (product: SavedProduct, arch: "maxillary" | "mandibular") => void
  getImpressionCount: (productId: string, arch: "maxillary" | "mandibular", impressions: any[]) => number
  getImpressionDisplayText: (productId: string, arch: "maxillary" | "mandibular", impressions: any[]) => string
  getImpressionCountFromSaved: (impressions: any[]) => number
  getImpressionDisplayTextFromSaved: (impressions: any[]) => string
  handleOpenShadeModal: (fieldKey: string, arch: "maxillary" | "mandibular") => void
  handleFieldChange: (fieldKey: string, value: any, id: number | undefined, productId: string | undefined, arch: "maxillary" | "mandibular") => void
  handleSavedProductCardClick: (savedProduct: SavedProduct) => void
  // Field config / retention
  fieldConfigs: any[]
  maxillaryRetentionTypes: Record<number, Array<"Implant" | "Prep" | "Pontic">>
  mandibularRetentionTypes: Record<number, Array<"Implant" | "Prep" | "Pontic">>
  // Implants
  implants: any[]
  implantsLoading: boolean
  selectedImplantBrandPerProduct: Record<string, { maxillary?: number | null; mandibular?: number | null }>
  selectedImplantPlatformPerProduct: Record<string, { maxillary?: number | null; mandibular?: number | null }>
  setSelectedImplantBrandPerProduct: React.Dispatch<React.SetStateAction<Record<string, { maxillary?: number | null; mandibular?: number | null }>>>
  setSelectedImplantPlatformPerProduct: React.Dispatch<React.SetStateAction<Record<string, { maxillary?: number | null; mandibular?: number | null }>>>
  showImplantCardsForProduct: Record<string, { maxillary?: boolean; mandibular?: boolean }>
  setShowImplantCardsForProduct: React.Dispatch<React.SetStateAction<Record<string, { maxillary?: boolean; mandibular?: boolean }>>>
  clickedFieldTypeInAccordion: Record<string, { maxillary?: "brand" | "platform" | null; mandibular?: "brand" | "platform" | null }>
  setClickedFieldTypeInAccordion: React.Dispatch<React.SetStateAction<Record<string, { maxillary?: "brand" | "platform" | null; mandibular?: "brand" | "platform" | null }>>>
  // Stage dropdown
  openStageDropdown: Record<string, { maxillary?: boolean; mandibular?: boolean }>
  setOpenStageDropdown: React.Dispatch<React.SetStateAction<Record<string, { maxillary?: boolean; mandibular?: boolean }>>>
  handleStageSelect: (productId: string, arch: "maxillary" | "mandibular", stageName: string, stageId?: number) => void
  // Advance fields
  productAdvanceFields: Record<string, any[]>
  setProductAdvanceFields: React.Dispatch<React.SetStateAction<Record<string, any[]>>>
  showAdvanceFields: Record<string, boolean>
  // Modals
  setCurrentProductForModal: (p: SavedProduct | null) => void
  setCurrentArchForModal: (arch: "maxillary" | "mandibular") => void
  setShowAddOnsModal: (show: boolean) => void
  setShowAttachModal: (show: boolean) => void
  setShowRushModal: (show: boolean) => void
  getTotalAddOnsCount: number
  getAttachedFilesCount: () => number
  // Tooth extraction maps
  maxillaryToothExtractionMap?: Record<number, string>
  mandibularToothExtractionMap?: Record<number, string>
  // Helpers
  isAccordionFieldVisible: (fieldName: "stump_shade" | "tooth_shade" | "stage" | "notes" | "implant_details", savedProduct: SavedProduct, archType: "maxillary" | "mandibular") => boolean
  showValidationErrors: boolean
}

const SavedProductSectionContext = createContext<SavedProductSectionContextValue | null>(null)

export function useSavedProductSection(): SavedProductSectionContextValue {
  const ctx = useContext(SavedProductSectionContext)
  if (!ctx) throw new Error("useSavedProductSection must be used within SavedProductSectionProvider")
  return ctx
}

export interface SavedProductSectionProviderProps {
  value: SavedProductSectionContextValue
  children: React.ReactNode
}

export function SavedProductSectionProvider({ value, children }: SavedProductSectionProviderProps) {
  return (
    <SavedProductSectionContext.Provider value={value}>
      {children}
    </SavedProductSectionContext.Provider>
  )
}
