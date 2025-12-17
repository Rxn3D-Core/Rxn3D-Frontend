"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface NewConnectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ConnectionFormData) => void
}

interface ConnectionFormData {
  connectionType: string
  email: string
  practiceName?: string
  firstName?: string
  lastName?: string
}

export function NewConnectionModal({ open, onOpenChange, onSubmit }: NewConnectionModalProps) {
  const [formData, setFormData] = useState<ConnectionFormData>({
    connectionType: "",
    email: "",
    practiceName: "",
    firstName: "",
    lastName: "",
  })

  const handleSubmit = () => {
    onSubmit(formData)
    setFormData({
      connectionType: "",
      email: "",
      practiceName: "",
      firstName: "",
      lastName: "",
    })
    onOpenChange(false)
  }

  const handleCancel = () => {
    setFormData({
      connectionType: "",
      email: "",
      practiceName: "",
      firstName: "",
      lastName: "",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>New Connection</DialogTitle>
          <Button variant="ghost" size="sm" className="p-1 h-8 w-8" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Select
              value={formData.connectionType}
              onValueChange={(value) => setFormData({ ...formData, connectionType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Connection Type *" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="practice">Practice</SelectItem>
                <SelectItem value="lab">Lab</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Input
              placeholder="Email Address *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {formData.connectionType === "practice" && (
            <div>
              <Input
                placeholder="Practice Name *"
                value={formData.practiceName}
                onChange={(e) => setFormData({ ...formData, practiceName: e.target.value })}
              />
            </div>
          )}

          {formData.connectionType === "user" && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="First Name *"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
              <Input
                placeholder="Last Name *"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel} className="bg-red-600 text-white hover:bg-red-700">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
