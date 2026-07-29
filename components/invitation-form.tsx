"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useInvitation } from "@/contexts/invitation-context"
import { EntityType } from "@/contexts/invitation-context"
import { useCreateUserInvitation } from "@/hooks/use-user-invitations"
import { useQueryClient } from "@tanstack/react-query"

interface InvitationFormProps {
  type: "Office" | "Lab" | "User" | "Practice" | "Doctor"
  onSuccess?: () => void
  onCancel?: () => void
  cancelLabel?: string
  actionsAlign?: "start" | "end"
}

// Role options based on customer type
const getRoleOptions = (customerType: "office" | "lab" | null) => {
  if (customerType === "office") {
    return [
      { value: "office_admin", label: "Office Admin" },
      { value: "office_user", label: "Office User" },
      { value: "doctor", label: "Doctor" },
      { value: "doctor_admin", label: "Doctor Admin" },
    ]
  } else if (customerType === "lab") {
    return [
      { value: "lab_admin", label: "Lab Admin" },
      { value: "lab_user", label: "Lab User" },
      // Driver pickup/delivery is handled by lab_user — no separate lab_driver role.
      // { value: "lab_driver", label: "Lab Driver" },
    ]
  }
  return []
}

export function InvitationForm({
  type,
  onSuccess,
  onCancel,
  cancelLabel = "Cancel",
  actionsAlign = "start",
}: InvitationFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  const { sendInvitation, error: invitationError, clearMessages } = useInvitation()
  const { mutate: createUserInvitation } = useCreateUserInvitation()
  const queryClient = useQueryClient()

  // Get customer type from selected location
  const selectedLocation = JSON.parse(localStorage.getItem("selectedLocation") || "null")
  const customerType = selectedLocation?.type || null
  const customerId = selectedLocation?.id || null
  const roleOptions = getRoleOptions(customerType)
  const namePlaceholder = type === "User" ? "Full Name *" : `${type} Name *`
  const nameRequiredLabel = type === "User" ? "Full Name" : `${type} Name`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!name.trim() || !email.trim()) {
      const message = `${nameRequiredLabel} and Email address are required.`
      setSubmitError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      const message = "Please enter a valid email address."
      setSubmitError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
      return
    }

    // For User type, validate role and use user invitation API
    if (type === "User") {
      if (!role) {
        toast({
          title: "Error",
          description: "Please select a role for the user.",
          variant: "destructive",
        })
        return
      }

      if (!customerId) {
        toast({
          title: "Error",
          description: "No customer selected. Please select a location first.",
          variant: "destructive",
        })
        return
      }

      try {
        setIsSubmitting(true)
        createUserInvitation(
          {
            customer_id: customerId,
            name: name.trim(),
            email: email.trim(),
            role: role,
          },
          {
            onSuccess: () => {
              setName("")
              setEmail("")
              setRole("")
              if (onSuccess) {
                onSuccess()
              }
            },
          }
        )
      } catch (error) {
        console.error(`Error sending ${type} invitation:`, error)
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // For other types, use the existing invitation flow
    try {
      setIsSubmitting(true)

      // Determine the entity type based on the invitation type
      const entityType: EntityType =
        type === "Office" ? "Office" :
        type === "Lab" ? "Lab" :
        type === "Doctor" ? "Doctor" :
        type === "Practice" ? "Office" : "Office"

      const invitedBy = user?.roles?.includes("superadmin") ? 0 : selectedLocation?.id

      const success = await sendInvitation({
        name,
        email,
        invited_by: invitedBy,
        type: entityType,
      })

      if (!success) {
        // Toast + invitation context `error` already carry the API message
        return
      }

      // Invalidate queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ["invitations"] })
      queryClient.invalidateQueries({ queryKey: ["connections"] })

      setName("")
      setEmail("")
      setSubmitError(null)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error(`Error sending ${type} invitation:`, error)
      const message = error?.message || "Failed to send invitation. Please try again."
      setSubmitError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const showRoleField = type === "User" && roleOptions.length > 0
  const displayError = submitError || invitationError

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder={namePlaceholder}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (submitError || invitationError) {
              setSubmitError(null)
              clearMessages()
            }
          }}
          required
          className="flex-1 min-w-0"
        />
        <Input
          placeholder="Email address *"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (submitError || invitationError) {
              setSubmitError(null)
              clearMessages()
            }
          }}
          required
          className="flex-1 min-w-0"
          aria-invalid={!!displayError}
        />
        {showRoleField && (
          <Select value={role} onValueChange={setRole} required>
            <SelectTrigger className="flex-1 min-w-0">
              <SelectValue placeholder="Select Role *" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {displayError && (
        <p className="text-sm text-red-600" role="alert">
          {displayError}
        </p>
      )}
      <div className={`flex gap-3 ${actionsAlign === "end" ? "justify-end" : "justify-start"}`}>
        <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
          {isSubmitting ? "Sending..." : "Send"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="min-w-[120px] bg-transparent">
            {cancelLabel}
          </Button>
        )}
      </div>
    </form>
  )
}
