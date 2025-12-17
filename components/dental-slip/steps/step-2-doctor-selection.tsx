"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

interface Step2DoctorSelectionProps {
  officeDoctors: any[]
  officeDoctorsLoading: boolean
  selectedDoctor: string
  setAddSlipFormData: React.Dispatch<React.SetStateAction<any>>
  setSelectedDoctor: (doctor: string) => void
  setStep: (step: number) => void
  setShowAddDoctorModal: (show: boolean) => void
}

export const Step2DoctorSelection: React.FC<Step2DoctorSelectionProps> = ({
  officeDoctors,
  officeDoctorsLoading,
  selectedDoctor,
  setAddSlipFormData,
  setSelectedDoctor,
  setStep,
  setShowAddDoctorModal,
}) => {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 bg-white relative">
      {/* Loading Overlay */}
      {officeDoctorsLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[10000] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center">
            <img
              src="/images/ajax-loader.gif"
              alt="Loading..."
              className="h-24 w-24 mb-6"
            />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Doctors</h3>
            <p className="text-sm text-gray-500 text-center">Please wait while we load available doctors...</p>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {/* Doctor Selection Header */}
        <div className="mb-6">
          {/* Header with title */}
          <div className="flex items-center justify-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              Choose a Doctor
            </h3>
          </div>

          {/* Search Section */}
          <div className="flex items-center gap-4 mb-2">
            {/* Search bar in the middle - takes up most of the space */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search Doctors"
                className="pr-10 py-2 bg-white border border-gray-300 rounded-lg w-full"
              />
            </div>

            {/* Add Doctor button on the right */}
            <Button
              className="bg-[#1162a8] hover:bg-[#0f5490] text-white rounded-lg px-4 py-2 whitespace-nowrap"
              onClick={() => {
                setShowAddDoctorModal(true)
              }}
            >
              + Add Doctor
            </Button>
          </div>

          {/* Sort By and Doctor count row */}
          <div className="flex items-center justify-between mb-4">
            {/* Sort By on the left */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort By:</Label>
              <Select>
                <SelectTrigger className="w-36 bg-white border border-gray-300 rounded-lg">
                  <SelectValue placeholder="Name A-Z" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-az">Name A-Z</SelectItem>
                  <SelectItem value="name-za">Name Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Doctor count on the right */}
            <p className="text-sm text-gray-500">
              {officeDoctorsLoading ? "Loading..." : `${officeDoctors?.length || 0} doctors found`}
            </p>
          </div>
        </div>

        {/* Doctor Selection - Horizontal Layout */}
        {!officeDoctorsLoading && officeDoctors && officeDoctors.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-8 py-8">
            {officeDoctors.map((doctor) => {
              const doctorName = doctor.full_name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();
              const isSelected = selectedDoctor === String(doctor.id);

              return (
                <div
                  key={doctor.id}
                  className={`flex flex-col items-center cursor-pointer transition-all duration-200 ${isSelected ? 'scale-105' : 'hover:scale-105'
                    }`}
                  onClick={() => {
                    setAddSlipFormData((prev: any) => ({
                      ...prev,
                      doctor: doctorName,
                      doctor_id: String(doctor.id),
                    }));
                    setSelectedDoctor(String(doctor.id));
                    // Automatically proceed to next step (patient name input)
                    setStep(3);
                  }}
                >
                  {/* Profile Image */}
                  <div className="relative mb-3">
                    <div className={`w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center transition-all duration-200 ${isSelected ? 'border-4 border-blue-500' : 'border-2 border-gray-200'
                      }`}>
                      {doctor.profile_image ? (
                        <img
                          src={doctor.profile_image}
                          alt={doctorName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src="/images/doctor-image.png"
                          alt="Default Doctor"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Doctor Name */}
                  <h4 className={`text-sm font-medium text-center max-w-24 mb-2 ${isSelected ? 'text-blue-600 font-semibold' : 'text-gray-900'
                    }`}>
                    {doctorName}
                  </h4>

                  {/* Select Button */}
                  <button
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddSlipFormData((prev: any) => ({
                        ...prev,
                        doctor: doctorName,
                        doctor_id: String(doctor.id),
                      }));
                      setSelectedDoctor(String(doctor.id));
                      setStep(3);
                    }}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : !officeDoctorsLoading && (
          <div className="text-center py-8">
            <p className="text-gray-500">No doctors found for the selected lab/office.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Step2DoctorSelection
