"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { PermissionAssignmentPanel } from "@/components/permission/permission-assignment-panel"
import { adminResetUserPassword } from "@/lib/api/admin-reset-user-password"
import { persistUserDirectPermissions } from "@/lib/api/user-permissions-api"
import { getActiveCustomerId } from "@/lib/customer-scope"
import { normalizeRoleSlug } from "@/lib/role-utils"
import { USER_STATUSES, normalizeUserStatus, type UserStatus } from "@/lib/user-status"

/** Matches backend Password::min(8)->mixedCase()->numbers()->symbols() */
const passwordStrengthSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")

// Form schema based on the API examples
const updateUserSchema = z
  .object({
    first_name: z.string().min(2, "First name must be at least 2 characters"),
    last_name: z.string().min(2, "Last name must be at least 2 characters"),
    phone: z.string().min(10, "Please enter a valid phone number"),
    work_number: z.string().optional(),
    status: z.string().min(1, "Please select a status"),
    department_ids: z.array(z.number()).optional(),
    password: z.string().optional(),
    password_confirmation: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const password = (data.password ?? "").trim()
    const confirmation = (data.password_confirmation ?? "").trim()
    if (!password && !confirmation) return

    const strength = passwordStrengthSchema.safeParse(password)
    if (!strength.success) {
      strength.error.issues.forEach((issue) => {
        ctx.addIssue({ ...issue, path: ["password"] })
      })
    }
    if (!confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Confirm password is required",
        path: ["password_confirmation"],
      })
    } else if (password !== confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["password_confirmation"],
      })
    }
  })

type UpdateUserFormValues = z.infer<typeof updateUserSchema>

interface StaffUser {
  id: number
  name: string
  email: string
  phone: string
  userType: string
  joinDate: string
  status: UserStatus
  avatar?: string
  avatarColor?: string
  role?: string
  customerName?: string
}

interface UpdateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: StaffUser | null
}

const statusOptions = USER_STATUSES.map((status) => ({
  value: status,
  label: status,
}))

interface Department {
  id: number
  name: string
}

export function UpdateUserModal({ isOpen, onClose, onSuccess, user }: UpdateUserModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const customerType = typeof window !== "undefined" ? localStorage.getItem("customerType")?.toLowerCase() : null
  const isLabCustomer = customerType === "lab"
  const activeCustomerId = getActiveCustomerId()

  // Get auth context
  const authContext = useAuth()
  const canManagePermissions = authContext.hasAnyPermission?.(["manage_users", "edit_user"]) ?? false

  // Check if auth context is properly initialized
  if (!authContext?.updateUserDetails) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-4 text-red-600">Error</h2>
          <p>Auth context is not available. Please refresh the page.</p>
          <button 
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const form = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      work_number: "",
      status: "Active",
      department_ids: [],
      password: "",
      password_confirmation: "",
    },
  })

  // Populate form when user data is available
  useEffect(() => {
    if (user && isOpen) {
      const [firstName, ...lastNameParts] = user.name.split(" ")
      const lastName = lastNameParts.join(" ")
      
      form.reset({
        first_name: firstName || "",
        last_name: lastName || "",
        phone: user.phone || "",
        work_number: user.phone || "", // Default to phone if work_number not available
        status: normalizeUserStatus(user.status),
        department_ids: [],
        password: "",
        password_confirmation: "",
      })
      
      setSelectedDepartments([])
      setSelectedPermissions([])
      
      if (isLabCustomer) {
        fetchDepartments()
      }
    }
  }, [user, isOpen, form, isLabCustomer])

  // Update department_ids when selectedDepartments changes
  useEffect(() => {
    form.setValue("department_ids", selectedDepartments, { shouldValidate: true })
  }, [selectedDepartments, form])

  const handleDepartmentToggle = (departmentId: number) => {
    setSelectedDepartments(prev => 
      prev.includes(departmentId) 
        ? prev.filter(id => id !== departmentId)
        : [...prev, departmentId]
    )
  }

  // Fetch departments from API
  const fetchDepartments = async () => {
    setIsLoadingDepartments(true)
    try {
      const customerId = localStorage.getItem("customerId")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/departments?customer_id=${customerId || ""}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch departments")
      }

      const result = await response.json()
      setDepartments(result.data || result || [])
    } catch (error: any) {
      console.error("Error fetching departments:", error)
      toast({
        title: "Error",
        description: "Failed to load departments.",
        variant: "destructive",
      })
      setDepartments([])
    } finally {
      setIsLoadingDepartments(false)
    }
  }

  const onSubmit = async (data: UpdateUserFormValues) => {
    if (!user) return
    setIsSubmitting(true)
    try {
      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        work_number: data.work_number || data.phone,
        status: normalizeUserStatus(data.status),
        ...(isLabCustomer ? { department_ids: selectedDepartments } : {}),
      }

      await authContext.updateUserDetails(user.id, payload)

      const newPassword = (data.password ?? "").trim()
      if (newPassword) {
        await adminResetUserPassword({
          userId: user.id,
          password: newPassword,
          password_confirmation: (data.password_confirmation ?? "").trim(),
          customerId: activeCustomerId,
        })
      }

      if (canManagePermissions) {
        await persistUserDirectPermissions(user.id, selectedPermissions, activeCustomerId)
      }

      toast({
        title: "Success",
        description: newPassword
          ? "User updated and password reset successfully"
          : "User updated successfully",
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Error updating user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update User: {user.name}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="work_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter work number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Leave blank to keep current"
                        revealToggle
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
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Re-enter new password"
                        revealToggle
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isLabCustomer && (
              <div className="space-y-3">
                <FormLabel>Departments</FormLabel>
                {isLoadingDepartments ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="text-sm text-gray-500">Loading departments...</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {departments.map((department) => (
                      <div key={department.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dept-${department.id}`}
                          checked={selectedDepartments.includes(department.id)}
                          onCheckedChange={() => handleDepartmentToggle(department.id)}
                        />
                        <label
                          htmlFor={`dept-${department.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {department.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {form.formState.errors.department_ids && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.department_ids.message}
                  </p>
                )}
              </div>
            )}

            {canManagePermissions && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold">Permissions</h4>
                <PermissionAssignmentPanel
                  key={`${user.id}-${activeCustomerId ?? "none"}`}
                  userId={user.id}
                  customerId={activeCustomerId ?? undefined}
                  role={normalizeRoleSlug(user.role ?? user.userType)}
                  selected={selectedPermissions}
                  onChange={setSelectedPermissions}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
