"use client"

import dynamic from 'next/dynamic'

// Loading component for steps
const StepLoading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
)

// Dynamic imports for step components
export const Step1LabSelection = dynamic(
  () => import('./steps/step-1-lab-selection').then(mod => ({ default: mod.Step1LabSelection })),
  {
    loading: StepLoading,
  }
)

export const Step2DoctorSelection = dynamic(
  () => import('./steps/step-2-doctor-selection').then(mod => ({ default: mod.Step2DoctorSelection })),
  {
    loading: StepLoading,
  }
)

export const Step3PatientInput = dynamic(
  () => import('./steps/step-3-patient-input').then(mod => ({ default: mod.Step3PatientInput })),
  {
    loading: StepLoading,
  }
)

export const Step4CategorySelection = dynamic(
  () => import('./steps/step-4-category-selection').then(mod => ({ default: mod.Step4CategorySelection })),
  {
    loading: StepLoading,
  }
)

// Export all dynamic step components
export const DynamicSteps = {
  Step1LabSelection,
  Step2DoctorSelection,
  Step3PatientInput,
  Step4CategorySelection,
}
