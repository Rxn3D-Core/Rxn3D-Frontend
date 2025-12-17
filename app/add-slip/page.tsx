"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DentalSlipPage from "@/dental-slip-page"
import { useToast } from "@/hooks/use-toast"

/**
 * Standalone Add Slip Page
 *
 * Benefits over modal approach:
 * - Reduces initial load: 20-30 requests (vs 200+ with case-design + modal)
 * - Case-design loads ONLY after slip is created (when user needs it)
 * - Better UX: Focused slip creation without distractions
 * - Caching: Subsequent opens load from cache (0-5 requests)
 */
export default function AddSlipPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [slipData, setSlipData] = useState<any>(null)
  const [addSlipModalInitialStep, setAddSlipModalInitialStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1)

  // Clear any stale pendingSlip data on mount (e.g., if user refreshes during slip creation)
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem('pendingSlip')
    }
  }, [])

  /**
   * Handle slip completion (after arch selection)
   * Navigate to case-design for 3D editing
   */
  const handleSlipComplete = (completedSlipData: any) => {
    try {
      console.log("Slip completed:", completedSlipData)

      // Save to sessionStorage for case-design to access
      if (completedSlipData) {
        sessionStorage.setItem('pendingSlip', JSON.stringify(completedSlipData))
      }

      // Clear any draft
      localStorage.removeItem('slipDraft')

      // Navigate to case-design
      if (completedSlipData?.id) {
        // If slip has ID (already created), pass it via query
        router.push(`/case-design?slipId=${completedSlipData.id}`)
      } else {
        // For new slips, case-design will read from sessionStorage
        router.push('/case-design')
      }

      toast({
        title: "Slip Created",
        description: "Proceeding to case design...",
      })
    } catch (error) {
      console.error('Error completing slip:', error)
      toast({
        title: "Error",
        description: "Failed to navigate to case design. Please try again.",
        variant: "destructive",
      })
    }
  }

  /**
   * Handle cancellation
   * Return to dashboard
   */
  const handleCancel = () => {
    // Clear draft and any pending slip data
    localStorage.removeItem('slipDraft')
    if (typeof window !== "undefined") {
      sessionStorage.removeItem('pendingSlip')
    }

    // Navigate back
    router.back()
  }

  return (
    <div className="w-full h-full overflow-auto bg-background">
      <DentalSlipPage
        slipData={slipData}
        setSlipData={setSlipData}
        showAddSlipModal={true}
        setShowAddSlipModal={handleCancel} // Use cancel handler
        addSlipModalInitialStep={addSlipModalInitialStep}
        setAddSlipModalInitialStep={setAddSlipModalInitialStep}
        visible={true}
        hideBackButton={false}
        shouldRefetchLabProducts={false}
        hideSlipHeader={false}
        isModal={false} // This is a standalone page, not a modal
        onAddSlipComplete={handleSlipComplete} // Navigate after completion
      />
    </div>
  )
}
