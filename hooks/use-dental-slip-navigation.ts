"use client"

import { useState, useCallback } from 'react'

export const useDentalSlipNavigation = (initialStep: number = 1) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(initialStep)

  const handleContinueModal = useCallback((
    selectedLab: string,
    selectedDoctorId: string,
    addSlipFormData: any,
    productCategory: string,
    selectedSubCategory: string,
    selectedProductInModal: string,
    selectedStages: string[],
    setShowArchModal: (show: boolean) => void
  ) => {
    if (step === 1) {

      // Validation would go here
      setStep(2) // Go to doctor selection
    }
    else if (step === 2) {
      setStep(3) // Go to patient name input
    }
    else if (step === 3) {
      setStep(4) // Go to product categories selection
    }
    else if (step === 4) {
      setStep(5) // Go to subcategory selection after category is selected
    }
    else if (step === 5) {
      setStep(6) // Go to product selection after subcategory is selected
    }
    else if (step === 6 && selectedProductInModal) {
      setStep(7) // Go to stage selection after product is selected
    }
    else if (step === 7 && selectedStages.length > 0) {
      if (selectedProductInModal) {
        setShowArchModal(true) // Show arch modal after stage is selected
      } else {
        console.error("Cannot show arch modal: no product selected")
      }
    }
  }, [step])

  const handleBackModal = useCallback(() => {
    if (step === 7) setStep(6)
    else if (step === 6) setStep(5)
    else if (step === 5) setStep(4)
    else if (step === 4) setStep(3)
    else if (step === 3) setStep(2)
    else if (step === 2) setStep(1)
  }, [step])

  return {
    step,
    setStep,
    handleContinueModal,
    handleBackModal,
  }
}
