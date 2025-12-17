"use client"
import { useState, useEffect } from "react"
import { DentalSlipPageContent } from "@/dental-slip-page"

export default function GlobalDentalSlipClient() {
  const [showAddSlipModal, setShowAddSlipModal] = useState(false)
  const [slipData, setSlipData] = useState<any>(null)
  const [addSlipModalInitialStep, setAddSlipModalInitialStep] = useState<1 | 2 | 3>(1)

  useEffect(() => {
    const handler = () => setShowAddSlipModal(true)
    window.addEventListener("open-dental-slip", handler)
    return () => window.removeEventListener("open-dental-slip", handler)
  }, [])

  return (
    <DentalSlipPageContent
      slipData={slipData}
      setSlipData={setSlipData}
      showAddSlipModal={showAddSlipModal}
      setShowAddSlipModal={setShowAddSlipModal}
      addSlipModalInitialStep={addSlipModalInitialStep}
      setAddSlipModalInitialStep={setAddSlipModalInitialStep}
      visible={showAddSlipModal}
    />
  )
}
