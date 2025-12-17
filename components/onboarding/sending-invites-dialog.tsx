"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2 } from "lucide-react"

type Practice = {
  id: number
  name: string
}

type SendingInvitesDialogProps = {
  isOpen: boolean
  onComplete: () => void
  practices: Practice[]
}

export function SendingInvitesDialog({ isOpen, onComplete, practices }: SendingInvitesDialogProps) {
  const [progress, setProgress] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completed, setCompleted] = useState<number[]>([])

  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      if (currentIndex < practices.length) {
        setCompleted((prev) => [...prev, practices[currentIndex].id])
        setCurrentIndex((prev) => prev + 1)
        setProgress(((currentIndex + 1) / (practices.length + 1)) * 100)
      } else if (currentIndex === practices.length) {
        setProgress(100)
        setCurrentIndex((prev) => prev + 1)
      } else {
        setTimeout(onComplete, 500)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [isOpen, currentIndex, practices, onComplete])

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-center text-lg font-medium mb-4">Sending Invites</DialogTitle>

        <div className="text-center py-4">
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="space-y-3 text-left">
            {practices.map((practice, index) => (
              <div key={practice.id} className="flex items-center">
                <div className={`flex-1 ${index < currentIndex ? "text-gray-700" : "text-gray-400"}`}>
                  Sending invite to {practice.name}
                </div>
                {completed.includes(practice.id) && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              </div>
            ))}

            <div className={`flex items-center ${progress === 100 ? "text-gray-700" : "text-gray-400"}`}>
              <div className="flex-1">Preparing your dashboard</div>
              {progress === 100 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
