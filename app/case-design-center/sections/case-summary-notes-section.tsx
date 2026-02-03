"use client"

import React from "react"
import { ChevronDown } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import type { SavedProduct } from "./types"

export interface CaseSummaryNotesSectionProps {
  showCaseSummaryNotes: boolean
  isCaseSummaryExpanded: boolean
  setIsCaseSummaryExpanded: (value: boolean) => void
  getCaseSummaryMaxillaryContent: () => string
  getCaseSummaryMandibularContent: () => string
  setCaseSummaryFromParts: (maxillaryContent: string, mandibularContent: string) => void
  maxillaryImplantDetails: string
  previousNotesRef: React.MutableRefObject<string>
  parseCaseNotes: (notes: string) => Promise<void>
  savedProducts: SavedProduct[]
  generateCaseNotes: () => string
}

export function CaseSummaryNotesSection({
  showCaseSummaryNotes,
  isCaseSummaryExpanded,
  setIsCaseSummaryExpanded,
  getCaseSummaryMaxillaryContent,
  getCaseSummaryMandibularContent,
  setCaseSummaryFromParts,
  maxillaryImplantDetails,
  previousNotesRef,
  parseCaseNotes,
  savedProducts,
  generateCaseNotes,
}: CaseSummaryNotesSectionProps) {
  if (!showCaseSummaryNotes) return null

  return (
    <div
      className="relative bg-white border border-[#7F7F7F] rounded-[7.7px] w-full mx-auto"
      style={{
        marginBottom: "80px",
        marginTop: "10px",
        zIndex: 10,
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
        onClick={() => setIsCaseSummaryExpanded(!isCaseSummaryExpanded)}
      >
        <span className="text-[14px] leading-[14px] text-[#7F7F7F] font-[Arial]">
          Case summary notes
        </span>
        <ChevronDown
          className={`w-5 h-5 text-[#7F7F7F] transition-transform duration-200 ${isCaseSummaryExpanded ? "rotate-180" : ""}`}
        />
      </div>

      {isCaseSummaryExpanded && (
        <div
          style={{
            padding: "0px 15px 15px 15px",
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-[12px] leading-[14px] text-[#7F7F7F] font-[Verdana] font-medium">
              Maxillary
            </label>
            <Textarea
              value={getCaseSummaryMaxillaryContent()}
              onChange={(e) => {
                setCaseSummaryFromParts(e.target.value, getCaseSummaryMandibularContent())
              }}
              onBlur={async () => {
                const notes = [
                  "MAXILLARY",
                  getCaseSummaryMaxillaryContent(),
                  "",
                  "MANDIBULAR",
                  getCaseSummaryMandibularContent(),
                ]
                  .filter(Boolean)
                  .join("\n\n")
                const hasChanged = notes !== previousNotesRef.current
                const hasValidSections =
                  notes.toUpperCase().includes("MAXILLARY") || notes.toUpperCase().includes("MANDIBULAR")
                const isSubstantial =
                  notes.length >= 100 || notes.includes("Fabricate") || notes.includes("fabricate")
                if (
                  hasChanged &&
                  hasValidSections &&
                  (savedProducts.length === 0 || isSubstantial)
                ) {
                  await parseCaseNotes(notes)
                }
                previousNotesRef.current = notes
              }}
              onFocus={() => {
                previousNotesRef.current = maxillaryImplantDetails
              }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault()
                  parseCaseNotes(maxillaryImplantDetails)
                }
              }}
              className="w-full border border-[#E5E5E5] rounded-[7.7px] outline-none resize-none tracking-[-0.02em] text-black bg-white p-2 focus:ring-1 focus:ring-[#7F7F7F] text-[12px] sm:text-[14px] leading-[15px] sm:leading-[17px] font-[Verdana]"
              style={{ minHeight: "90px" }}
              placeholder="Enter maxillary case notes (e.g. Fabricate... for teeth...)"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] leading-[14px] text-[#7F7F7F] font-[Verdana] font-medium">
              Mandibular
            </label>
            <Textarea
              value={getCaseSummaryMandibularContent()}
              onChange={(e) => {
                setCaseSummaryFromParts(getCaseSummaryMaxillaryContent(), e.target.value)
              }}
              onBlur={async () => {
                const notes = [
                  "MAXILLARY",
                  getCaseSummaryMaxillaryContent(),
                  "",
                  "MANDIBULAR",
                  getCaseSummaryMandibularContent(),
                ]
                  .filter(Boolean)
                  .join("\n\n")
                const hasChanged = notes !== previousNotesRef.current
                const hasValidSections =
                  notes.toUpperCase().includes("MAXILLARY") || notes.toUpperCase().includes("MANDIBULAR")
                const isSubstantial =
                  notes.length >= 100 || notes.includes("Fabricate") || notes.includes("fabricate")
                if (
                  hasChanged &&
                  hasValidSections &&
                  (savedProducts.length === 0 || isSubstantial)
                ) {
                  await parseCaseNotes(notes)
                }
                previousNotesRef.current = notes
              }}
              onFocus={() => {
                previousNotesRef.current = maxillaryImplantDetails
              }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault()
                  parseCaseNotes(maxillaryImplantDetails)
                }
              }}
              className="w-full border border-[#E5E5E5] rounded-[7.7px] outline-none resize-none tracking-[-0.02em] text-black bg-white p-2 focus:ring-1 focus:ring-[#7F7F7F] text-[12px] sm:text-[14px] leading-[15px] sm:leading-[17px] font-[Verdana]"
              style={{ minHeight: "90px" }}
              placeholder="Enter mandibular case notes (e.g. Fabricate... for teeth...)"
            />
          </div>

          <p className="text-[10px] sm:text-xs text-gray-500 pt-0">
            {generateCaseNotes().length > 0 && !maxillaryImplantDetails
              ? "Case notes are automatically generated from your products. Edit each section to customize; changes will update your product selections."
              : maxillaryImplantDetails
                ? "Editing case notes will update your products, categories, subcategories, and teeth selections based on the content."
                : "Enter case notes in each section to populate products and teeth. Or add products first to generate notes automatically."}
          </p>
        </div>
      )}
    </div>
  )
}
