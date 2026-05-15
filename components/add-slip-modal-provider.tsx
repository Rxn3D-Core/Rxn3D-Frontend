"use client"
import React, { createContext, useContext } from "react"
import { useRouter } from "next/navigation"
import { useClearCaseDesignCenterStateMutation } from "@/hooks/use-case-design-center-state"
import { clearSlipCreationStorage } from "@/utils/slip-creation-storage"

const AddSlipModalContext = createContext<{ openAddSlipModal: () => void }>({ openAddSlipModal: () => {} })

export function useAddSlipModal() {
  return useContext(AddSlipModalContext)
}

export function AddSlipModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const clearCaseDesignCenterStateMutation = useClearCaseDesignCenterStateMutation()

  const openAddSlipModal = () => {
    clearSlipCreationStorage()
    clearCaseDesignCenterStateMutation.mutate()
    router.replace("/case-design-center")
  }

  return (
    <AddSlipModalContext.Provider value={{ openAddSlipModal }}>
      {children}
    </AddSlipModalContext.Provider>
  )
}
