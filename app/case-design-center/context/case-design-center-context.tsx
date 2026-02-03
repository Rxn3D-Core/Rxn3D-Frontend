"use client"

import React, { createContext, useContext } from "react"

/**
 * Case Design Center context: provides all state and handlers for the case design center page
 * so that section components (ProductCategorySection, MaxillarySection, MandibularSection, etc.)
 * can access them without prop drilling.
 *
 * The value is built by useCaseDesignCenter() and provided by CaseDesignCenterProvider.
 * Use useCaseDesignCenterContext() in child components to consume.
 */
export type CaseDesignCenterContextValue = {
  [key: string]: any
}

const CaseDesignCenterContext = createContext<CaseDesignCenterContextValue | null>(null)

export function useCaseDesignCenterContext(): CaseDesignCenterContextValue {
  const ctx = useContext(CaseDesignCenterContext)
  if (!ctx) throw new Error("useCaseDesignCenterContext must be used within CaseDesignCenterProvider")
  return ctx
}

export interface CaseDesignCenterProviderProps {
  value: CaseDesignCenterContextValue
  children: React.ReactNode
}

export function CaseDesignCenterProvider({ value, children }: CaseDesignCenterProviderProps) {
  return (
    <CaseDesignCenterContext.Provider value={value}>
      {children}
    </CaseDesignCenterContext.Provider>
  )
}
