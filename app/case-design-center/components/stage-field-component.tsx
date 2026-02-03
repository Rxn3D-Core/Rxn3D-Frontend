"use client"

import React, { useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SavedProduct } from "../sections/types"

export interface StageFieldComponentProps {
  savedProduct: SavedProduct
  isMaxillary: boolean
  openStageDropdown: Record<string, { maxillary?: boolean; mandibular?: boolean }>
  setOpenStageDropdown: React.Dispatch<React.SetStateAction<Record<string, { maxillary?: boolean; mandibular?: boolean }>>>
  handleStageSelect: (productId: string, arch: "maxillary" | "mandibular", stageName: string, stageId?: number) => void
}

/**
 * Stage field with auto-open when value is "Not specified" or empty.
 */
export function StageFieldComponent({
  savedProduct,
  isMaxillary,
  openStageDropdown,
  setOpenStageDropdown,
  handleStageSelect,
}: StageFieldComponentProps) {
  const arch = isMaxillary ? "maxillary" : "mandibular"
  const stageValue = isMaxillary ? savedProduct.maxillaryStage : savedProduct.mandibularStage

  useEffect(() => {
    const isNotSpecified = !stageValue ||
      stageValue.trim() === "" ||
      stageValue.trim().toLowerCase() === "not specified" ||
      stageValue.trim().toLowerCase() === "finish"

    if (isNotSpecified) {
      const timer = setTimeout(() => {
        setOpenStageDropdown((prev) => ({
          ...prev,
          [savedProduct.id]: {
            ...prev[savedProduct.id],
            [arch]: true,
          },
        }))
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <div className="relative flex-1 min-w-[180px] max-w-[31%]" style={{ minHeight: "38px" }}>
      <Select
        open={openStageDropdown[savedProduct.id]?.[arch] || false}
        onOpenChange={(open) =>
          setOpenStageDropdown((prev) => ({
            ...prev,
            [savedProduct.id]: {
              ...prev[savedProduct.id],
              [arch]: open,
            },
          }))
        }
        value={stageValue || ""}
        onValueChange={(value) => {
          const productDetails = savedProduct.productDetails
          const stages = productDetails?.stages || []
          const selectedStage = stages.find((s: any) => s.name === value || s.id?.toString() === value)
          handleStageSelect(savedProduct.id, arch, value, selectedStage?.id)
        }}
      >
        <SelectTrigger
          style={{
            padding: "8px 12px 4px 12px",
            gap: "5px",
            width: "100%",
            height: "32px",
            position: "relative",
            marginTop: "5.27px",
            background: "#FFFFFF",
            border: "0.740384px solid #7F7F7F",
            borderRadius: "7.7px",
            boxSizing: "border-box",
            fontFamily: "Verdana",
            fontStyle: "normal",
            fontWeight: 400,
            fontSize: "13px",
            lineHeight: "20px",
            letterSpacing: "-0.02em",
            color: "#000000",
          }}
        >
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent className="z-[50] max-h-[300px] overflow-y-auto">
          {savedProduct.productDetails?.stages?.map((stage: any, idx: number) => (
            <SelectItem key={idx} value={stage.name || stage.id?.toString() || ""}>
              {stage.name || stage}
            </SelectItem>
          )) ?? []}
        </SelectContent>
      </Select>
      <label
        className="absolute bg-white"
        style={{
          padding: "0px",
          height: "14px",
          left: "8.9px",
          top: "0px",
          fontFamily: "Arial",
          fontStyle: "normal",
          fontWeight: 400,
          fontSize: "14px",
          lineHeight: "14px",
          color: "#7F7F7F",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        Stage
      </label>
    </div>
  )
}
