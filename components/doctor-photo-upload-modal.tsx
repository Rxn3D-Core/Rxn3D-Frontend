"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Camera, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { AVATAR_ACCEPT_ATTRIBUTE, uploadUserAvatar, validateAvatarFile } from "@/lib/api/user-avatar"
import { getInitials } from "@/utils/avatar-utils"

export interface DoctorPhotoTarget {
  id: number
  name: string
}

interface DoctorPhotoUploadModalProps {
  isOpen: boolean
  onClose: () => void
  doctor: DoctorPhotoTarget | null
  /** Office the doctor belongs to; required when uploading for another user. */
  customerId?: number | string | null
  /** Whether the target doctor is the signed-in user, used only for copy. */
  isSelf?: boolean
  onUploaded?: (image: string | null) => void
}

export function DoctorPhotoUploadModal({
  isOpen,
  onClose,
  doctor,
  customerId,
  isSelf = false,
  onUploaded,
}: DoctorPhotoUploadModalProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (isOpen) return

    setFile(null)
    setError(null)
    setIsUploading(false)
    setPreview((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current)
      }
      return null
    })
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const doctorName = doctor?.name?.trim() ?? ""

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    // Allow re-picking the same file after a failed attempt.
    event.target.value = ""
    if (!selected) return

    const validationError = validateAvatarFile(selected)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setFile(selected)
    setPreview((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current)
      }
      return URL.createObjectURL(selected)
    })
  }

  const handleSave = async () => {
    if (!doctor || !file) return

    setIsUploading(true)
    setError(null)

    try {
      const result = await uploadUserAvatar({
        userId: doctor.id,
        file,
        customerId: isSelf ? undefined : customerId,
      })

      toast({
        title: "Photo added",
        description: isSelf
          ? "Your photo has been saved."
          : `Photo saved for ${doctorName || "this doctor"}.`,
      })

      onUploaded?.(result.image)
      onClose()
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "Failed to upload photo."
      setError(message)
      toast({ title: "Upload failed", description: message, variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isUploading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isSelf ? "Add your photo" : "Add doctor photo"}</DialogTitle>
          <DialogDescription>
            {isSelf
              ? "Upload a photo so your profile is easy to recognize on slips."
              : `Upload a photo for ${doctorName || "this doctor"}. This is optional and will not change the slip.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-[#1162a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162a8] disabled:cursor-not-allowed"
            aria-label={preview ? "Choose a different photo" : "Choose a photo"}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Selected photo preview" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#1162a8]">
                <Camera className="h-7 w-7" />
                <span className="text-xl font-semibold">{getInitials(doctorName) || "?"}</span>
              </span>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={AVATAR_ACCEPT_ATTRIBUTE}
            onChange={handleFileChange}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {file ? "Choose a different photo" : "Choose photo"}
          </Button>

          <p className="text-xs text-gray-500">JPG or PNG, up to 5 MB.</p>

          {error && (
            <p role="alert" className="text-center text-xs text-red-600">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!file || isUploading}
            className="bg-[#1162a8] text-white hover:bg-[#0d4f88]"
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
