"use client"

import { useState, useCallback, useMemo } from 'react'

export interface AddSlipFormData {
  office: string
  office_id: string
  lab: string
  lab_id: string
  doctor: string
  doctor_id: string
  patient: string
  panNumber: string
  caseNumber: string
  slipNumber: string
  createdBy: string
  location: string
  caseStatus: string
  pickupDate: string
  deliveryDate: string
  deliveryTime: string
}

export const useDentalSlipForm = (isModal: boolean = false) => {
  const [addSlipFormData, setAddSlipFormData] = useState<AddSlipFormData>({
    office: "",
    office_id: "",
    lab: "",
    lab_id: "",
    doctor: "",
    doctor_id: "",
    patient: "",
    panNumber: "",
    caseNumber: "",
    slipNumber: "",
    createdBy: "",
    location: "",
    caseStatus: "Draft",
    pickupDate: "",
    deliveryDate: "",
    deliveryTime: "",
  })

  const [defaultLabId, setDefaultLabId] = useState<string | null>(() => {
    // For modal mode, start fresh without default lab
    if (isModal) {
      return null
    }
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      return localStorage.getItem("defaultLabId")
    }
    return null
  })

  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean>(() => {
    // For modal mode, always start with first time setup
    if (isModal) {
      return true
    }
    // First time setup if no default lab is set
    if (typeof window !== "undefined") {
      return !localStorage.getItem("defaultLabId")
    }
    return true
  })

  const resetAddSlipForm = useCallback(() => {
    setAddSlipFormData({
      office: "",
      office_id: "",
      lab: "",
      lab_id: "",
      doctor: "",
      doctor_id: "",
      patient: "",
      panNumber: "",
      caseNumber: "",
      slipNumber: "",
      createdBy: "",
      location: "",
      caseStatus: "Draft",
      pickupDate: "",
      deliveryDate: "",
      deliveryTime: "",
    })
    
    // Clear selected lab ID from localStorage when form is reset
    if (typeof window !== "undefined") {
      localStorage.removeItem("selectedLabId")
    }
    setDefaultLabId(null)
  }, [])

  const handlePatientChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAddSlipFormData((prev) => ({
      ...prev,
      patient: value,
      patient_name: value,
    }))
  }, [])

  const handleInlinePatientChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAddSlipFormData((prev) => ({
      ...prev,
      patient: value,
      patient_name: value,
    }))
  }, [])

  return {
    addSlipFormData,
    setAddSlipFormData,
    defaultLabId,
    setDefaultLabId,
    isFirstTimeSetup,
    setIsFirstTimeSetup,
    resetAddSlipForm,
    handlePatientChange,
    handleInlinePatientChange,
  }
}
