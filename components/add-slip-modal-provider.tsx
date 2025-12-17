"use client"
import React, { createContext, useContext } from "react"
import { useRouter } from "next/navigation"

const AddSlipModalContext = createContext<{ openAddSlipModal: () => void }>({ openAddSlipModal: () => {} })

export function useAddSlipModal() {
  return useContext(AddSlipModalContext)
}

export function AddSlipModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const openAddSlipModal = () => {
    // Navigate to standalone Add Slip page instead of opening modal
    router.push('/add-slip')
  }

  return (
    <AddSlipModalContext.Provider value={{ openAddSlipModal }}>
      {children}
    </AddSlipModalContext.Provider>
  )
}
