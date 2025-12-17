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

// Form schema based on the API examples
const updateUserSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  work_number: z.string().optional(),
  status: z.string().min(1, "Please select a status"),
  department_ids: z.array(z.number()).min(1, "Please select at least one department"),
})

type UpdateUserFormValues = z.infer<typeof updateUserSchema>

interface StaffUser {
  id: number
  name: string
  email: string
  phone: string
  userType: string
  joinDate: string
  status: "Active" | "Inactive" | "Suspended" | "Archived"
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

// Mock data - in a real app, these would come from API calls
const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "archived", label: "Archived" },
]

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

  // Get auth context
  const authContext = useAuth()

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
      status: "active",
      department_ids: [],
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
        status: user.status.toLowerCase() as "active" | "inactive" | "suspended" | "archived",
        department_ids: [1], // Default department - in real app, get from user data
      })
      
      // Set default departments - in real app, get from user data
      setSelectedDepartments([1])
      
      // Fetch departments
      fetchDepartments()
    }
  }, [user, isOpen, form])

  // Update department_ids when selectedDepartments changes
  useEffect(() => {
    form.setValue("department_ids", selectedDepartments)
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/departments?customer_id=${customerId || '6'}`, {
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
        description: "Failed to load departments. Using default list.",
        variant: "destructive",
      })
      // Fallback to default departments
      setDepartments([
        { id: 1, name: "General Dentistry" },
        { id: 2, name: "Orthodontics" },
        { id: 3, name: "Oral Surgery" },
        { id: 4, name: "Periodontics" },
      ])
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
        status: data.status,
        department_ids: data.department_ids,
      }

      await authContext.updateUserDetails(user.id, payload)

      toast({
        title: "Success",
        description: "User updated successfully",
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

            <div className="space-y-3">
              <FormLabel>Departments *</FormLabel>
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
