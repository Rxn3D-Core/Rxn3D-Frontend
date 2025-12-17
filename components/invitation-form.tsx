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

interface InvitationFormProps {
  type: "Office" | "Lab" | "User" | "Practice" | "Doctor"
  onSuccess?: () => void
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
      { value: "lab_driver", label: "Lab Driver" },
    ]
  }
  return []
}

export function InvitationForm({ type, onSuccess }: InvitationFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const { sendInvitation } = useInvitation()
  const { mutate: createUserInvitation } = useCreateUserInvitation()

  // Get customer type from selected location
  const selectedLocation = JSON.parse(localStorage.getItem("selectedLocation") || "null")
  const customerType = selectedLocation?.type || null
  const customerId = selectedLocation?.id || null
  const roleOptions = getRoleOptions(customerType)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Error",
        description: `${type} Name and Email address are required.`,
        variant: "destructive",
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
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

      await sendInvitation({
        name,
        email,
        invited_by: invitedBy,
        type: entityType,
      })

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${name}`,
      })
      
      setName("")
      setEmail("")
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error(`Error sending ${type} invitation:`, error)
      toast({
        title: "Error",
        description: `Failed to send invitation. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const showRoleField = type === "User" && roleOptions.length > 0

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-3">
        <Input
          placeholder={`${type} Name *`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={showRoleField ? "flex-1" : "flex-1"}
        />
        <Input
          placeholder="Email address *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={showRoleField ? "flex-1" : "flex-1"}
        />
        {showRoleField && (
          <Select value={role} onValueChange={setRole} required>
            <SelectTrigger className="flex-1">
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
      <div className="flex justify-start">
        <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
          {isSubmitting ? "Sending..." : "Send"}
        </Button>
      </div>
    </form>
  )
}
