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
import { cn } from "@/lib/utils"

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
  avatar: z.any().optional(),
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

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
      avatar: null,
    },
    mode: "onChange",
  })

  // Watch for changes to trigger validation
  const licenseNumber = form.watch("license_number")
  const isDoctor = form.watch("is_doctor")

  // Validate doctor fields and clear errors when both have values
  useEffect(() => {
    if (isDoctor) {
      const hasLicense = licenseNumber && licenseNumber.trim() !== ""
      const hasSignature = signatureFile !== null
      
      if (hasLicense && hasSignature) {
        // Both fields have values - clear all errors
        form.clearErrors("license_number")
        form.clearErrors("signature")
      } else if (!hasLicense && !hasSignature) {
        // Both are empty - set error
        if (!form.formState.errors.license_number) {
          form.setError("license_number", {
            type: "manual",
            message: "License number and signature are required for doctors"
          })
        }
      } else {
        // One has value - clear error but don't set new one (wait for both)
        form.clearErrors("license_number")
        form.clearErrors("signature")
      }
    } else {
      // Not a doctor - clear any doctor-related errors
      form.clearErrors("license_number")
      form.clearErrors("signature")
    }
  }, [licenseNumber, signatureFile, isDoctor, form])

  const selectedRole = form.watch("role")
  
  // Helper function to determine validation state
  const getValidationState = (fieldName: keyof CreateUserFormValues, isRequired: boolean = false): "default" | "valid" | "warning" | "error" => {
    const value = form.watch(fieldName)
    const hasValue = value !== undefined && value !== null && value !== "" && String(value).trim() !== ""
    const errors = form.formState.errors
    const valueStr = String(value || "")
    
    // Special handling for license_number - show green border with checkmark when it has a value
    if (fieldName === "license_number") {
      const hasLicense = hasValue
      
      // If license has a value, show green border with checkmark
      if (hasLicense) {
        return "valid"
      }
      // If there's an error, show it
      if (errors[fieldName]) {
        return "error"
      }
      // If required and empty, show error
      if (isRequired && !hasValue) {
        return "error"
      }
      return "default"
    }
    
    if (fieldName === "signature") {
      const hasLicense = licenseNumber && licenseNumber.trim() !== ""
      const hasSignature = signatureFile !== null
      
      // If both have values, no error
      if (hasLicense && hasSignature) {
        return "default"
      }
      // If signature has value but license doesn't, no error on signature field
      if (hasSignature) {
        return "default"
      }
      // If there's an error, show it
      if (errors[fieldName]) {
        return "error"
      }
      // If required and empty, show error
      if (isRequired && !hasSignature) {
        return "error"
      }
      return "default"
    }
    
    // If field has error, show error state
    if (errors[fieldName]) {
      return "error"
    }
    
    // Required fields: red if empty, orange if has value, green if valid (has value and no errors)
    if (isRequired) {
      if (!hasValue) {
        return "error" // Red: required but empty
      }
      // Check if field has minimum characters (5) for validation
      if (valueStr.length >= 5) {
        // Special validation for email
        if (fieldName === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (emailRegex.test(valueStr)) {
            return "valid" // Green: valid email
          }
          return "warning" // Orange: has value but invalid format
        }
        return "valid" // Green: has value and meets minimum length
      }
      return "warning" // Orange: has value but less than 5 characters
    }
    
    // Optional fields: orange if has value, default if empty
    if (hasValue) {
      return "warning" // Orange: has value
    }
    
    return "default"
  }

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      form.reset()
      setSignatureFile(null)
      setAvatarFile(null)
    }
  }, [isOpen, form])

  // Auto-set is_doctor when role is doctor
  useEffect(() => {
    if (selectedRole === "doctor") {
      form.setValue("is_doctor", true)
    }
  }, [selectedRole, form])


  // Handle signature file upload
  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      form.setValue("signature", file, { shouldValidate: true })
      // Clear validation error if license number also has value
      if (form.watch("license_number") && form.watch("license_number")?.trim() !== "") {
        form.clearErrors("license_number")
      }
    }
  }

  // Handle avatar file upload
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      
      setAvatarFile(file)
      form.setValue("avatar", file)
    }
  }

  // Remove signature file
  const removeSignatureFile = () => {
    setSignatureFile(null)
    form.setValue("signature", null)
  }

  // Remove avatar file
  const removeAvatarFile = () => {
    setAvatarFile(null)
    form.setValue("avatar", null)
  }


  const onSubmit = async (data: CreateUserFormValues) => {
    // Validate doctor fields before submission
    if (data.is_doctor) {
      const hasLicense = data.license_number && data.license_number.trim() !== ""
      const hasSignature = signatureFile !== null
      
      if (!hasLicense || !hasSignature) {
        form.setError("license_number", {
          type: "manual",
          message: "License number and signature are required for doctors"
        })
        toast({
          title: "Validation Error",
          description: "License number and signature are required for doctors",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }
    }

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
      
      // Add avatar file if it exists
      if (avatarFile) {
        formData.append('avatar', avatarFile)
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
      <DialogContent className="max-w-3xl max-h-[90vh] p-5 flex flex-col">
        <DialogHeader className="pb-3 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">Create New User</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex flex-col max-h-[calc(90vh-120px)]">
            <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-4">
            {/* Avatar Section */}
            <div className="flex items-start gap-4 pb-3 border-b border-gray-100">
              <FormField
                control={form.control}
                name="avatar"
                render={({ field }) => (
                  <FormItem className="m-0">
                    <FormLabel className="text-xs font-medium text-gray-700 mb-1.5 block">Profile Photo</FormLabel>
                    <FormControl>
                      <div className="w-32">
                        {avatarFile ? (
                          <div className="relative">
                            <img
                              src={URL.createObjectURL(avatarFile)}
                              alt="Avatar preview"
                              className="h-32 w-32 rounded-lg object-cover border border-gray-200"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeAvatarFile}
                              className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-all h-32 w-32 flex items-center justify-center bg-gray-50">
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png"
                              onChange={handleAvatarUpload}
                              className="hidden"
                              id="avatar-upload"
                            />
                            <label
                              htmlFor="avatar-upload"
                              className="cursor-pointer flex flex-col items-center space-y-2"
                            >
                              <Upload className="h-6 w-6 text-gray-400" />
                              <div className="text-xs text-gray-600 text-center font-medium">
                                Upload
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

              {/* Basic Information Section */}
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              label="First Name *"
                              placeholder="Enter first name" 
                              validationState={getValidationState("first_name", true)}
                              errorMessage={form.formState.errors.first_name?.message as string}
                              className="h-12"
                              {...field} 
                            />
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
                          <FormControl>
                            <Input 
                              label="Last Name *"
                              placeholder="Enter last name" 
                              validationState={getValidationState("last_name", true)}
                              errorMessage={form.formState.errors.last_name?.message as string}
                              className="h-12"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-3 pb-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-900">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          type="email"
                          label="Email Address *"
                          placeholder="Enter email address" 
                          validationState={getValidationState("email", true)}
                          errorMessage={form.formState.errors.email?.message as string}
                          className="h-12"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            label="Phone Number *"
                            placeholder="Enter phone number" 
                            validationState={getValidationState("phone", true)}
                            errorMessage={form.formState.errors.phone?.message as string}
                            className="h-12"
                            {...field}
                            onChange={(e) => {
                              // Only allow numbers and + sign
                              const value = e.target.value.replace(/[^0-9+]/g, '')
                              field.onChange(value)
                            }}
                          />
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
                        <FormControl>
                          <Input 
                            label="Work Number"
                            placeholder="Enter work number" 
                            validationState={getValidationState("work_number", false)}
                            className="h-12"
                            {...field}
                            onChange={(e) => {
                              // Only allow numbers and + sign
                              const value = e.target.value.replace(/[^0-9+]/g, '')
                              field.onChange(value)
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            </div>

            {/* Role & Permissions Section */}
            <div className="space-y-3 pb-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-900">Role & Permissions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className={cn(
                            "h-12 border-2 text-sm",
                            !field.value ? "border-[#CF0202]" : "border-[#119933]"
                          )}>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedRole !== "doctor" && (
                  <FormField
                    control={form.control}
                    name="is_doctor"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border border-gray-200 p-2.5 bg-gray-50 h-12">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="leading-none">
                          <FormLabel className="text-xs font-medium cursor-pointer">
                            Is Doctor
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Doctor-Specific Fields */}
            {isDoctor && (
              <div className="space-y-3 pb-3 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-900">Doctor Information</h3>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="license_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            label="License Number *"
                            placeholder="Enter license number" 
                            validationState={getValidationState("license_number", true)}
                            errorMessage={form.formState.errors.license_number?.message as string}
                            className="h-12"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e)
                              // Clear validation error if signature also has value
                              if (signatureFile && e.target.value.trim() !== "") {
                                form.clearErrors("license_number")
                              }
                            }}
                          />
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
                        <FormLabel className="text-xs font-medium text-gray-700">Signature *</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            {signatureFile ? (
                              <div className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex items-center space-x-2">
                                  <Upload className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <span className="text-xs font-medium text-gray-700">{signatureFile.name}</span>
                                    <span className="text-[10px] text-gray-500 ml-2">
                                      ({(signatureFile.size / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={removeSignatureFile}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-all bg-gray-50">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png"
                                  onChange={handleSignatureUpload}
                                  className="hidden"
                                  id="signature-upload"
                                />
                                <label
                                  htmlFor="signature-upload"
                                  className="cursor-pointer flex flex-col items-center space-y-1.5"
                                >
                                  <Upload className="h-6 w-6 text-gray-400" />
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium text-blue-600 hover:text-blue-500">
                                      Click to upload
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-gray-500">
                                    JPG, PNG up to 5MB
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
                </div>
              </div>
            )}
            </div>

            <DialogFooter className="pt-3 border-t border-gray-100 flex-shrink-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={isSubmitting}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6"
              >
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
