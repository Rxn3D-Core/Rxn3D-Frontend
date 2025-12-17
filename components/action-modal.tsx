"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PaperclipIcon, AlertCircleIcon, SendIcon } from "lucide-react"

interface ActionModalProps {
  isOpen: boolean
  onClose: () => void
  actionType: "hold" | "resend"
  officeName: string
}

export function ActionModal({ isOpen, onClose, actionType, officeName }: ActionModalProps) {
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Reset form and close modal
    setDescription("")
    setFile(null)
    setIsSubmitting(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className={actionType === "hold" ? "text-red-600" : "text-blue-600"}>
            {actionType === "hold" ? (
              <div className="flex items-center">
                <AlertCircleIcon className="h-5 w-5 mr-2" />
                Hold Connection
              </div>
            ) : (
              <div className="flex items-center">
                <SendIcon className="h-5 w-5 mr-2" />
                Resend Link
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            {actionType === "hold"
              ? `You are about to hold the connection with ${officeName}.`
              : `You are about to resend the connection link to ${officeName}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder={
                actionType === "hold"
                  ? "Explain why you're holding this connection..."
                  : "Add a message to send with the link..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="attachment">Attachment (optional)</Label>
            <div className="flex items-center gap-2">
              <Input id="attachment" type="file" className="hidden" onChange={handleFileChange} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start text-sm text-gray-500"
                onClick={() => document.getElementById("attachment")?.click()}
              >
                <PaperclipIcon className="h-4 w-4 mr-2" />
                {file ? file.name : "Click to attach a file"}
              </Button>
              {file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-2 text-red-500 hover:text-red-700"
                  onClick={() => setFile(null)}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={
              actionType === "hold"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }
          >
            {isSubmitting ? "Processing..." : actionType === "hold" ? "Confirm Hold" : "Send Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
