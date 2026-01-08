"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Cake } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updateUserBirthday } from "@/services/user-profile-service"

interface BirthdayModalProps {
  isOpen: boolean
  onClose: () => void
  birthdayData: string | null
  userId?: number
  onBirthdayUpdated?: (newBirthday: string) => void
}

export function BirthdayModal({ isOpen, onClose, birthdayData, userId, onBirthdayUpdated }: BirthdayModalProps) {
  const [birthday, setBirthday] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (birthdayData) {
      // Convert birthday data to YYYY-MM-DD format for date input
      try {
        const date = new Date(birthdayData)
        const formattedDate = date.toISOString().split("T")[0]
        setBirthday(formattedDate)
      } catch {
        // If birthdayData is already in YYYY-MM-DD format
        setBirthday(birthdayData)
      }
    } else {
      setBirthday("")
    }
  }, [birthdayData, isOpen])

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No birthday set"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const handleSave = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found",
        variant: "destructive",
      })
      return
    }

    if (!birthday) {
      toast({
        title: "Error",
        description: "Please select a birthday",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      await updateUserBirthday(userId, birthday)
      toast({
        title: "Success",
        description: "Birthday updated successfully",
      })
      // Notify parent component of the update
      if (onBirthdayUpdated) {
        onBirthdayUpdated(birthday)
      }
      onClose()
    } catch (error) {
      console.error("Failed to update birthday:", error)
      toast({
        title: "Error",
        description: "Failed to update birthday. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset to original value
    if (birthdayData) {
      try {
        const date = new Date(birthdayData)
        const formattedDate = date.toISOString().split("T")[0]
        setBirthday(formattedDate)
      } catch {
        setBirthday(birthdayData)
      }
    } else {
      setBirthday("")
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b bg-gray-50">
          <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Cake className="w-6 h-6 text-[#1162a8]" />
            Birthday
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {/* Current Birthday Display */}
          <div className="mb-6 bg-gray-50 p-5 rounded-lg border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Current Birthday
            </h3>
            <p className="text-lg text-gray-800 font-medium">
              {formatDate(birthdayData)}
            </p>
          </div>

          {/* Birthday Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="birthday" className="text-base font-medium text-gray-700">
                Select Your Birthday
              </Label>
              <div className="relative">
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="pr-12 h-12 rounded-lg border-gray-300 text-base"
                  max={new Date().toISOString().split("T")[0]} // Prevent future dates
                />
                <Calendar className="w-5 h-5 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
              </div>
              <p className="text-sm text-gray-500">
                Choose your birthday. This information helps us celebrate with you!
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 p-4 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-100"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="px-6 py-2 bg-[#1162a8] hover:bg-[#0d4f8c] text-white"
            disabled={isSaving || !birthday}
          >
            {isSaving ? (
              <>
                <span className="mr-2">Saving...</span>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </>
            ) : (
              "Save Birthday"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

