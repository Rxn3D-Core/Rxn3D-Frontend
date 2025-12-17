"use client"

import { X, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ProfileData {
  type: "practice" | "lab" | "user"
  name: string
  address: string
  contactPerson: string
  position: string
  contactNumber: string
  emailAddress: string
  businessHours?: {
    [key: string]: string
  }
  notes?: string
  mainLab?: string
}

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ProfileData | null
}

export function ProfileModal({ open, onOpenChange, profile }: ProfileModalProps) {
  if (!profile) return null

  const getTitle = () => {
    switch (profile.type) {
      case "practice":
        return "Practice Profile"
      case "lab":
        return "Dental Lab"
      case "user":
        return "User Profile"
      default:
        return "Profile"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{getTitle()}</DialogTitle>
          <Button variant="ghost" size="sm" className="p-1 h-8 w-8" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 border-2 border-gray-200 rounded flex items-center justify-center mb-4 bg-gray-50">
              <div className="text-center text-gray-400">
                <Upload className="h-8 w-8 mx-auto mb-2" />
                <span className="text-xs">Click or drag file to upload</span>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {profile.type === "practice" ? "Practice name:" : profile.type === "lab" ? "Lab name:" : "User Name:"}
                </label>
                <p className="text-sm">{profile.name}</p>
              </div>
              {profile.mainLab && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Main Lab:</label>
                  <p className="text-sm">{profile.mainLab}</p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Address:</label>
              <p className="text-sm">{profile.address}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Contact person:</label>
                <p className="text-sm">{profile.contactPerson}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Position:</label>
                <p className="text-sm">{profile.position}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Contact number:</label>
                <p className="text-sm">{profile.contactNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email Address:</label>
                <p className="text-sm">{profile.emailAddress}</p>
              </div>
            </div>

            {profile.businessHours && (
              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">Business Hours:</label>
                <div className="space-y-1">
                  {Object.entries(profile.businessHours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span>{day}:</span>
                      <span>{hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.notes && (
              <div>
                <label className="text-sm font-medium text-gray-600">Note:</label>
                <p className="text-sm">{profile.notes}</p>
              </div>
            )}

            <p className="text-xs text-gray-400 italic">Notes are only visible to you.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
