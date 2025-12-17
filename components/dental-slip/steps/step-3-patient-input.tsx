"use client"

import React, { useRef, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Step3PatientInputProps {
  addSlipFormData: any
  handlePatientChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isPatientNameInputFocused: boolean
  setIsPatientNameInputFocused: (focused: boolean) => void
  setStep: (step: number) => void
}

export const Step3PatientInput: React.FC<Step3PatientInputProps> = ({
  addSlipFormData,
  handlePatientChange,
  isPatientNameInputFocused,
  setIsPatientNameInputFocused,
  setStep,
}) => {
  const patientInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus patient name input when component mounts
  useEffect(() => {
    if (patientInputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        patientInputRef.current?.focus()
      }, 100)
    }
  }, [])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 bg-white">
      <div className="max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* Patient Name Input Field - With underline */}
          <div className="flex items-center">
            <label className="text-lg mr-6" htmlFor="patient-input">
              Enter patient name
            </label>
            <div className="flex-1 border-b border-gray-200">
              <TooltipProvider>
                <Tooltip open={isPatientNameInputFocused && addSlipFormData.patient.length > 0}>
                  <TooltipTrigger asChild>
                    <Input
                      ref={patientInputRef}
                      id="patient-input"
                      placeholder=""
                      value={addSlipFormData.patient}
                      onChange={handlePatientChange}
                      onFocus={() => setIsPatientNameInputFocused(true)}
                      onBlur={() => setIsPatientNameInputFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && addSlipFormData.patient.trim()) {
                          setStep(4)
                        }
                      }}
                      className="text-lg py-2 px-0 bg-transparent border-none outline-none focus:ring-0 focus:border-none w-full"
                      style={{
                        boxShadow: "none",
                        border: "none",
                        outline: "none",
                        background: "transparent"
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    className="bg-orange-200 text-orange-900 border-orange-300 rounded-full px-4 py-2 shadow-lg"
                    arrowWidth={20}
                    arrowHeight={10}
                    arrowClassName="fill-orange-200"
                  >
                    <p className="text-sm font-medium">Hit enter button after you are finished entering patient name</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Step3PatientInput
