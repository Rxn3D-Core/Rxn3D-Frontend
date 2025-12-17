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
import { Upload, X } from "lucide-react"

// Form schema based on the API examples
const createUserSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(1, "Phone number is required"),
  work_number: z.string().optional(),
  role: z.string().min(1, "Please select a role"),
  is_doctor: z.boolean().default(false),
  status: z.string().default("Pending"),
  department_ids: z.array(z.number()).optional(),
  license_number: z.string().optional(),
  signature: z.any().optional(),
}).refine((data) => {
  if (data.is_doctor) {
    return data.license_number && data.license_number.trim() !== "" && data.signature
  }
  return true
}, {
  message: "License number and signature are required for doctors",
  path: ["license_number"]
})

type CreateUserFormValues = z.infer<typeof createUserSchema>

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Mock data - in a real app, these would come from API calls
const roles = [
  { value: "lab_user", label: "Lab User" },
  { value: "office_admin", label: "Office Admin" },
  { value: "doctor", label: "Doctor" },
  { value: "technician", label: "Technician" },
]


export function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)

  // Get auth context
  const authContext = useAuth()

  // Check if auth context is properly initialized
  if (!authContext?.createUser) {
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

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      work_number: "",
      role: "",
      is_doctor: false,
      status: "pending",
      department_ids: [],
      license_number: "",
      signature: null,
    },
    mode: "onChange",
  })

  const isDoctor = form.watch("is_doctor")
  const selectedRole = form.watch("role")

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      form.reset()
      setSignatureFile(null)
    }
  }, [isOpen, form])

  // Auto-set is_doctor when role is doctor
  useEffect(() => {
    if (selectedRole === "doctor") {
      form.setValue("is_doctor", true)
    }
  }, [selectedRole, form])


  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type (only JPG, JPEG, PNG as per backend requirements)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image in JPG, JPEG, or PNG format.",
          variant: "destructive",
        })
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB.",
          variant: "destructive",
        })
        return
      }
      
      setSignatureFile(file)
      form.setValue("signature", file)
    }
  }

  // Remove uploaded file
  const removeFile = () => {
    setSignatureFile(null)
    form.setValue("signature", null)
  }


  const onSubmit = async (data: CreateUserFormValues) => {
    setIsSubmitting(true)
    try {
      const customerId = localStorage.getItem("customerId")
      
      // Create FormData for multipart form submission
      const formData = new FormData()
      
      // Add basic user data
      formData.append('first_name', data.first_name)
      formData.append('last_name', data.last_name)
      formData.append('email', data.email)
      formData.append('phone', data.phone)
      formData.append('work_number', data.work_number || data.phone)
      formData.append('customer_id', customerId || "1")
      formData.append('role', data.role)
      formData.append('is_doctor', data.is_doctor ? "1" : "0")
      formData.append('status', "Pending")
      
      // Add department_ids if they exist
      if (data.department_ids && data.department_ids.length > 0) {
        data.department_ids.forEach((id) => {
          formData.append('department_ids[]', id.toString())
        })
      }
      
      // Add doctor-specific fields
      if (data.is_doctor && data.license_number) {
        formData.append('license_number', data.license_number)
      }
      
      // Add signature file if it exists
      if (data.is_doctor && signatureFile) {
        formData.append('signature', signatureFile)
      }

      await authContext.createUser(formData)

      toast({
        title: "Success",
        description: "User created successfully",
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Error creating user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
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

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole !== "doctor" && (
              <FormField
                control={form.control}
                name="is_doctor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Is Doctor</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {isDoctor && (
              <>
                <FormField
                  control={form.control}
                  name="license_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter license number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="signature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signature *</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          {signatureFile ? (
                            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                              <div className="flex items-center space-x-2">
                                <Upload className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-700">{signatureFile.name}</span>
                                <span className="text-xs text-gray-500">
                                  ({(signatureFile.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={removeFile}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="signature-upload"
                              />
                              <label
                                htmlFor="signature-upload"
                                className="cursor-pointer flex flex-col items-center space-y-2"
                              >
                                <Upload className="h-8 w-8 text-gray-400" />
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium text-blue-600 hover:text-blue-500">
                                    Click to upload
                                  </span>{" "}
                                  or drag and drop
                                </div>
                                <div className="text-xs text-gray-500">
                                  JPG, JPEG, PNG up to 5MB
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}


            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
