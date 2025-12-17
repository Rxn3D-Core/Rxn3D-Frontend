"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type React from "react"
import { useState, useEffect } from "react"

// Update the ProfileData interface to match the API structure
export interface BusinessHours {
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
}

export interface ProfileData {
  id: number
  name: string
  type: "office" | "lab"
  address: string
  city: string
  state: { id: number; name: string }
  postal_code: string
  contact_person?: string
  position?: string
  contact_number?: string
  email: string
  logo_url?: string
  business_hours?: BusinessHours
  notes?: string
  website?: string | null
  status?: number
  unique_code?: string
  country?: { id: number; name: string }
  departments?: any[]
  users?: any[]
  created_at?: string
  updated_at?: string
}

// Update the ProfileModalProps interface
interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  data: ProfileData | null
  isLoading: boolean
  onSave: (data: ProfileData) => Promise<void>
}

// Define day names for business hours
const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Update the ProfileModal component to match the new design
export function ProfileModal({ isOpen, onClose, data, isLoading, onSave }: ProfileModalProps) {
  const [profile, setProfile] = useState<ProfileData | null>(data)
  const [isSaving, setIsSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(data?.logo_url || null)

  // Update state when data changes
  useEffect(() => {
    if (data) {
      setProfile(data)
      setLogoPreview(data.logo_url || null)
    }
  }, [data])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    try {
      const updatedProfile = {
        ...profile,
        logo_url: logoPreview,
      }

      await onSave(updatedProfile)
      onClose()
    } catch (error) {
      console.error("Error saving profile:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Helper function to format business hours for display
  const getBusinessHourDisplay = (day: keyof BusinessHours) => {
    if (!profile?.business_hours) return "Not set"
    return profile.business_hours[day]
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[1100px] p-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="px-6 py-5 border-b bg-gray-50">
          <DialogTitle className="text-2xl font-bold text-gray-800">
            {profile?.type === "lab" ? "Lab Profile" : "Practice Profile"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-[150px] w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : profile ? (
          <div className="p-6 overflow-y-auto">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Logo Upload */}
              <div className="w-full md:w-72">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">Logo</h3>
                <label className="relative border-2 border-dashed border-gray-300 rounded-lg h-48 w-full flex flex-col items-center justify-center overflow-hidden bg-[#f8f9fb] cursor-pointer hover:border-blue-400 transition-colors group">
                  {logoPreview ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={logoPreview || "/placeholder.svg"} 
                        alt="Logo" 
                        className="object-contain w-full h-full p-2" 
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white px-3 py-1 rounded-md text-sm font-medium">Change</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full">
                      <div className="text-[#6b7280] mb-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                      </div>
                      <p className="text-sm text-[#6b7280] font-medium">Click or drag file to upload</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute top-0 left-0 w-full h-full opacity-0"
                    onChange={handleLogoChange}
                  />
                </label>
              </div>

              {/* Practice/Lab details */}
              <div className="flex-1">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-700">Details</h3>
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                      <h4 className="text-xl font-semibold text-gray-800 mb-4">
                        {profile.name}
                        <span className="text-sm font-normal ml-2 text-gray-500">
                          ({profile.type === "lab" ? "Laboratory" : "Medical Practice"})
                        </span>
                      </h4>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Address</p>
                          <p className="text-base">{profile.address}, {profile.city}, {profile.state?.name}, {profile.postal_code}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
                          <p className="text-base">{profile.email}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Contact Person</p>
                          <p className="text-base">{profile.contact_person || "Not specified"}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Position</p>
                          <p className="text-base">{profile.position || "Not specified"}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Contact Number</p>
                          <p className="text-base">{profile.contact_number || "Not specified"}</p>
                        </div>
                        
                        {profile.website && (
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Website</p>
                            <p className="text-base">{profile.website}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Hours and Notes */}
            <div className="mt-8 grid md:grid-cols-3 gap-6">
              {/* Business Hours */}
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 col-span-1">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Business Hours</h3>
              {profile.business_hours ? (
                <div className="space-y-3">
                {Object.entries(profile.business_hours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0">
                  <span className="font-medium capitalize text-gray-700">{dayNames[Number(day)]}</span>
                  <span className="text-gray-800">
                    {hours.is_open
                    ? `${new Date(hours.open_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(hours.close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : "Closed"}
                  </span>
                  </div>
                ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No business hours specified</p>
              )}
              </div>

              {/* Notes */}
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 md:col-span-2">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Notes</h3>
              <Textarea
                id="notes"
                className="min-h-[180px] resize-none border-gray-200 p-4 w-full bg-white focus:ring-blue-500 focus:border-blue-500"
                value={profile.notes || ""}
                onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
                placeholder="Add notes about this practice..."
              />
              <p className="text-sm text-gray-500 mt-2 italic">Notes are only visible to you.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">No profile data available</div>
        )}

        <div className="flex justify-end gap-4 p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-100">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || isSaving || !profile}
            className="px-6 py-2 hover:bg-[#0d4f8c] h-10 bg-[#1162a8] text-white"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
