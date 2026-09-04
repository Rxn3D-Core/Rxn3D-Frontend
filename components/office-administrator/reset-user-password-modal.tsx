"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { adminResetUserPassword } from "@/lib/api/admin-reset-user-password"
import { getActiveCustomerId } from "@/lib/customer-scope"

/** Matches backend Password::min(8)->mixedCase()->numbers()->symbols() */
const passwordStrengthSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")

const resetPasswordSchema = z
  .object({
    password: passwordStrengthSchema,
    password_confirmation: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export interface ResetUserPasswordTarget {
  id: number
  name: string
  /** Optional override when resetting in a multi-customer context. */
  customerId?: number | string | null
}

interface ResetUserPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  user: ResetUserPasswordTarget | null
}

export function ResetUserPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: ResetUserPasswordModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      password_confirmation: "",
    },
    mode: "onChange",
  })

  useEffect(() => {
    if (isOpen) {
      form.reset({
        password: "",
        password_confirmation: "",
      })
    }
  }, [isOpen, user?.id, form])

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!user) return
    setIsSubmitting(true)
    try {
      await adminResetUserPassword({
        userId: user.id,
        password: data.password,
        password_confirmation: data.password_confirmation,
        customerId: user.customerId ?? getActiveCustomerId(),
      })
      toast({
        title: "Password Updated",
        description: `Password for ${user.name} has been set successfully.`,
      })
      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Password: {user.name}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password *</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      revealToggle
                      autoComplete="new-password"
                      data-1p-ignore
                      data-lpignore="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password_confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password *</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Re-enter new password"
                      revealToggle
                      autoComplete="new-password"
                      data-1p-ignore
                      data-lpignore="true"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                {isSubmitting ? "Saving..." : "Set Password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
