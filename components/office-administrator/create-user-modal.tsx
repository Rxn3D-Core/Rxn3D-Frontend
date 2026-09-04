"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import SignatureCanvas from "react-signature-canvas"
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
import { Check, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  getCreateUserTitle,
  getRoleDisplayLabel,
  isDoctorRole,
  isOfficeAdminRole,
  requiresDoctorCredentials,
  resolveOfficeMixedRole,
} from "@/lib/user-role-labels"
import { roleSelectOptionsForCustomerType } from "@/lib/user-customer-roles"

// Form schema based on the API examples
const passwordStrengthSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")

const createUserSchema = z
  .object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().min(1, "Phone number is required"),
    work_number: z.string().optional(),
    customer_id: z.string().optional(),
    role: z.string().min(1, "Please select a role"),
    is_doctor: z.boolean().default(false),
    is_also_admin: z.boolean().default(false),
    status: z.string().default("Pending"),
    department_ids: z.array(z.number()).optional(),
    license_number: z.string().optional(),
    signature: z.any().optional(),
    avatar: z.any().optional(),
    password: passwordStrengthSchema,
    password_confirmation: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  })

type CreateUserFormValues = z.infer<typeof createUserSchema>

interface CustomerOption {
  value: string
  label: string
  type?: string
}

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  /** When set, role is fixed to this page context — no role picker. */
  lockedRole?: string
  /**
   * Superadmin All Users: require picking a customer to create into.
   * Not used on lab/office scoped create pages (they use the active customer).
   */
  requireCustomerSelection?: boolean
  customerOptions?: CustomerOption[]
}

interface Department {
  id: number
  name: string
}

interface Department {
  id: number
  name: string
}

export function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
  lockedRole,
  requireCustomerSelection = false,
  customerOptions = [],
}: CreateUserModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [hasSignature, setHasSignature] = useState(false)
  const [signatureMessage, setSignatureMessage] = useState("")
  const signatureRef = useRef<SignatureCanvas>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)
  const roleIsLocked = Boolean(lockedRole)

  // Get auth context
  const authContext = useAuth()

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(
      requireCustomerSelection
        ? createUserSchema.superRefine((data, ctx) => {
            if (!data.customer_id?.trim()) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please select a customer",
                path: ["customer_id"],
              })
            }
          })
        : createUserSchema,
    ),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      work_number: "",
      customer_id: "",
      role: lockedRole || "",
      is_doctor: isDoctorRole(lockedRole) || requiresDoctorCredentials(lockedRole),
      is_also_admin: false,
      status: "pending",
      department_ids: [],
      license_number: "",
      signature: null,
      avatar: null,
      password: "",
      password_confirmation: "",
    },
    mode: "onChange",
    reValidateMode: "onChange",
  })

  const licenseNumber = form.watch("license_number")
  const isDoctor = form.watch("is_doctor")
  const isAlsoAdmin = form.watch("is_also_admin")
  const selectedRole = form.watch("role")
  const selectedCustomerId = form.watch("customer_id")

  const localCustomerType = typeof window !== "undefined" ? localStorage.getItem("customerType")?.toLowerCase() : null
  const selectedCustomer = customerOptions.find((option) => option.value === selectedCustomerId)
  const effectiveCustomerType = requireCustomerSelection
    ? (selectedCustomer?.type || "").toLowerCase() || null
    : localCustomerType
  const isLabCustomer = effectiveCustomerType === "lab"
  const isOfficeCustomer = effectiveCustomerType === "office"

  const effectiveBaseRole = lockedRole || selectedRole
  const resolvedCreateRole = resolveOfficeMixedRole({
    baseRole: effectiveBaseRole,
    isAlsoDoctor: isDoctorRole(effectiveBaseRole) || Boolean(isDoctor),
    isAlsoAdmin: Boolean(isAlsoAdmin),
  })
  const treatingAsDoctor =
    requiresDoctorCredentials(resolvedCreateRole) ||
    isDoctorRole(effectiveBaseRole) ||
    Boolean(isDoctor)
  const showAlsoDoctorCheckbox =
    isOfficeCustomer && (isOfficeAdminRole(effectiveBaseRole) || (!roleIsLocked && selectedRole === "office_admin"))
  const showAlsoAdminCheckbox =
    isOfficeCustomer && (isDoctorRole(effectiveBaseRole) || (!roleIsLocked && selectedRole === "doctor"))

  const availableRoles = useMemo(() => {
    if (requireCustomerSelection && !effectiveCustomerType) {
      return []
    }
    if (effectiveCustomerType === "lab" || effectiveCustomerType === "office") {
      return roleSelectOptionsForCustomerType(effectiveCustomerType)
    }
    // Locked role pages still need a coherent list if type is briefly missing
    if (lockedRole) {
      if (["lab_admin", "lab_user"].includes(lockedRole)) {
        return roleSelectOptionsForCustomerType("lab")
      }
      if (["office_admin", "office_user", "doctor", "doctor_admin"].includes(lockedRole)) {
        return roleSelectOptionsForCustomerType("office")
      }
    }
    return []
  }, [requireCustomerSelection, effectiveCustomerType, lockedRole])
  // Drop a lab role that is no longer selectable in an office context (only when role is choosable)
  useEffect(() => {
    if (roleIsLocked || !selectedRole) return
    if (!availableRoles.some((role) => role.value === selectedRole)) {
      form.setValue("role", "", { shouldValidate: false, shouldDirty: false })
    }
  }, [availableRoles, selectedRole, form, roleIsLocked])

  // Clear doctor field errors when both are filled or when not a doctor — never auto-error on open
  useEffect(() => {
    if (!treatingAsDoctor) {
      form.clearErrors("license_number")
      form.clearErrors("signature")
      return
    }
    const hasLicense = licenseNumber && licenseNumber.trim() !== ""
    const hasSignature = signatureFile !== null
    if (hasLicense && hasSignature) {
      form.clearErrors("license_number")
      form.clearErrors("signature")
    }
  }, [licenseNumber, signatureFile, treatingAsDoctor, form])

  /** Show valid/error borders only after the field has been changed by the user. */
  const getValidationState = (fieldName: keyof CreateUserFormValues): "default" | "valid" | "warning" | "error" => {
    const isDirty = Boolean(form.formState.dirtyFields[fieldName])
    const hasError = Boolean(form.formState.errors[fieldName])
    if (!isDirty && !hasError) return "default"
    if (hasError) return "error"

    const value = form.getValues(fieldName)
    const hasValue = value !== undefined && value !== null && value !== "" && String(value).trim() !== ""
    if (!hasValue) return "default"

    if (fieldName === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(String(value)) ? "valid" : "warning"
    }

    return "valid"
  }

  const fetchDepartments = async (customerIdOverride?: string) => {
    setIsLoadingDepartments(true)
    try {
      const customerId =
        customerIdOverride ||
        (requireCustomerSelection ? selectedCustomerId : null) ||
        localStorage.getItem("customerId")
      const token = localStorage.getItem("token")
      if (!customerId) {
        setDepartments([])
        return
      }
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/departments?customer_id=${customerId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error("Failed to fetch departments")
      }

      const result = await response.json()
      setDepartments(result.data || [])
    } catch {
      setDepartments([])
      toast({
        title: "Department Load Failed",
        description: "Could not load departments for this customer.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingDepartments(false)
    }
  }

  // Reset form when modal opens/closes; seed locked role from page context
  useEffect(() => {
    if (isOpen) {
      form.reset({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        work_number: "",
        customer_id: "",
        role: lockedRole || "",
        is_doctor: isDoctorRole(lockedRole),
        is_also_admin: false,
        status: "pending",
        department_ids: [],
        license_number: "",
        signature: null,
        avatar: null,
        password: "",
        password_confirmation: "",
      })
      setSignatureFile(null)
      setHasSignature(false)
      setSignatureMessage("")
      signatureRef.current?.clear()
      setAvatarFile(null)
      setSelectedDepartments([])
      setDepartments([])
      if (isLabCustomer && !requireCustomerSelection) {
        void fetchDepartments()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, form, lockedRole, requireCustomerSelection])

  // When superadmin picks a customer, load departments for lab customers and clear incompatible role
  useEffect(() => {
    if (!requireCustomerSelection || !isOpen) return
    setSelectedDepartments([])
    if (isLabCustomer && selectedCustomerId) {
      void fetchDepartments(selectedCustomerId)
    } else {
      setDepartments([])
    }
    if (!roleIsLocked && selectedRole && !availableRoles.some((role) => role.value === selectedRole)) {
      form.setValue("role", "", { shouldValidate: false, shouldDirty: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requireCustomerSelection, selectedCustomerId, isLabCustomer, isOpen])

  useEffect(() => {
    form.setValue("department_ids", selectedDepartments, { shouldValidate: false, shouldDirty: false })
  }, [selectedDepartments, form])

  // Keep is_doctor true for doctor role; do not clear the “also Doctor” checkbox when role is locked
  useEffect(() => {
    if (isDoctorRole(selectedRole) || isDoctorRole(lockedRole)) {
      form.setValue("is_doctor", true, { shouldValidate: false })
      return
    }
    if (!roleIsLocked && !isOfficeAdminRole(selectedRole)) {
      form.setValue("is_doctor", false, { shouldValidate: false })
      form.setValue("is_also_admin", false, { shouldValidate: false })
    }
  }, [selectedRole, form, roleIsLocked, lockedRole])

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

  const handleDepartmentToggle = (departmentId: number) => {
    setSelectedDepartments((prev) =>
      prev.includes(departmentId) ? prev.filter((id) => id !== departmentId) : [...prev, departmentId],
    )
  }


  const dataURLtoFile = (dataURL: string, filename: string): File => {
    const arr = dataURL.split(",")
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    const u8arr = new Uint8Array(bstr.length)

    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i)
    }

    return new File([u8arr], filename, { type: mime })
  }

  const showSignatureMessage = (message: string) => {
    setSignatureMessage(message)
    setTimeout(() => setSignatureMessage(""), 2000)
  }

  const applySignatureFile = (file: File) => {
    setSignatureFile(file)
    setHasSignature(true)
    form.setValue("signature", file, { shouldValidate: true })
    if (form.watch("license_number")?.trim()) {
      form.clearErrors("license_number")
      form.clearErrors("signature")
    }
  }

  const handleSaveSignature = () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      showSignatureMessage("Please draw your signature before saving")
      return
    }

    try {
      const quality = signatureRef.current.toDataURL().length > 1024 ? 0.5 : 1
      const signatureData = signatureRef.current.toDataURL("image/png", quality)
      const file = dataURLtoFile(signatureData, "signature.png")
      applySignatureFile(file)
      showSignatureMessage("Signature saved")
    } catch {
      showSignatureMessage("Error saving signature")
    }
  }

  const handleClearSignature = () => {
    signatureRef.current?.clear()
    setSignatureFile(null)
    setHasSignature(false)
    form.setValue("signature", null)
    showSignatureMessage("Signature cleared")
  }

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

      signatureRef.current?.clear()
      applySignatureFile(file)
      showSignatureMessage("Signature uploaded")
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

  // Remove avatar file
  const removeAvatarFile = () => {
    setAvatarFile(null)
    form.setValue("avatar", null)
  }


  const onSubmit = async (data: CreateUserFormValues) => {
    const baseRole = lockedRole || data.role
    const effectiveRole = resolveOfficeMixedRole({
      baseRole,
      isAlsoDoctor: isDoctorRole(baseRole) || Boolean(data.is_doctor),
      isAlsoAdmin: Boolean(data.is_also_admin),
    })
    const treatingAsDoctorOnSubmit =
      requiresDoctorCredentials(effectiveRole) || isDoctorRole(baseRole) || Boolean(data.is_doctor)

    // Validate doctor fields before submission
    if (treatingAsDoctorOnSubmit) {
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
      const customerId = requireCustomerSelection
        ? data.customer_id?.trim()
        : localStorage.getItem("customerId")

      if (!customerId) {
        toast({
          title: "Validation Error",
          description: requireCustomerSelection
            ? "Please select a customer"
            : "No active customer selected",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Create FormData for multipart form submission
      const formData = new FormData()

      // Add basic user data
      formData.append('first_name', data.first_name)
      formData.append('last_name', data.last_name)
      formData.append('email', data.email)
      formData.append('phone', data.phone)
      formData.append('work_number', data.work_number || data.phone)
      formData.append('customer_id', customerId)
      formData.append('role', effectiveRole)
      formData.append('is_doctor', treatingAsDoctorOnSubmit ? "1" : "0")
      formData.append('status', "Pending")
      formData.append('password', data.password)
      formData.append('password_confirmation', data.password_confirmation)
      
      // Add department_ids only for lab customers
      if (isLabCustomer && selectedDepartments.length > 0) {
        selectedDepartments.forEach((id) => {
          formData.append('department_ids[]', id.toString())
        })
      }
      
      // Add doctor-specific fields
      if (treatingAsDoctorOnSubmit && data.license_number) {
        formData.append('license_number', data.license_number)
      }
      
      // Add signature file if it exists
      if (treatingAsDoctorOnSubmit && signatureFile) {
        formData.append('signature', signatureFile)
      }
      
      // Add avatar file if it exists
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }

      const createResult = await authContext.createUser(formData)

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
          <DialogTitle className="text-xl font-semibold">
            {getCreateUserTitle(lockedRole || selectedRole)}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 flex flex-col max-h-[calc(90vh-120px)]"
            autoComplete="off"
          >
            <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-4">
            {requireCustomerSelection && (
              <div className="space-y-2 pb-3 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-900">Customer *</h3>
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <SearchableSelect
                          options={customerOptions}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select a customer"
                          searchPlaceholder="Search customers…"
                          emptyMessage="No customers found"
                          className="h-12"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
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
                              validationState={getValidationState("first_name")}
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
                              validationState={getValidationState("last_name")}
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
                            autoComplete="off"
                            data-1p-ignore
                            data-lpignore="true"
                            validationState={getValidationState("email")}
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
                            validationState={getValidationState("phone")}
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
                            validationState={getValidationState("work_number")}
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

            {/* Account Security */}
            <div className="space-y-3 pb-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-900">Account Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="password"
                          label="Password *"
                          placeholder="Enter password"
                          revealToggle
                          autoComplete="new-password"
                          data-1p-ignore
                          data-lpignore="true"
                          validationState={getValidationState("password")}
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
                  name="password_confirmation"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="password"
                          label="Confirm Password *"
                          placeholder="Re-enter password"
                          revealToggle
                          autoComplete="new-password"
                          data-1p-ignore
                          data-lpignore="true"
                          validationState={getValidationState("password_confirmation")}
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

            {/* Role Section — hidden picker when page locks the role */}
            <div className="space-y-3 pb-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-900">
                {roleIsLocked ? "User Type" : "Role"}
              </h3>
              {roleIsLocked ? (
                <div className="space-y-3">
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                    Creating as <span className="font-medium">{getRoleDisplayLabel(lockedRole)}</span>
                    {resolvedCreateRole === "doctor_admin" && (
                      <span className="ml-2 text-xs text-[#1162a8]">(+ mixed Doctor Admin)</span>
                    )}
                  </div>
                  {showAlsoDoctorCheckbox && (
                    <FormField
                      control={form.control}
                      name="is_doctor"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border border-gray-200 p-2.5 bg-gray-50">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="leading-none">
                            <FormLabel className="text-xs font-medium cursor-pointer">
                              User is also a Doctor
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}
                  {showAlsoAdminCheckbox && (
                    <FormField
                      control={form.control}
                      name="is_also_admin"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border border-gray-200 p-2.5 bg-gray-50">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="leading-none">
                            <FormLabel className="text-xs font-medium cursor-pointer">
                              User is also an Admin
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className={cn(
                              "h-12 border-2 text-sm",
                              form.formState.dirtyFields.role && !field.value
                                ? "border-[#CF0202]"
                                : form.formState.dirtyFields.role && field.value
                                  ? "border-[#119933]"
                                  : "border-gray-200"
                            )}>
                              <SelectValue
                                placeholder={
                                  requireCustomerSelection && !effectiveCustomerType
                                    ? "Select a customer first"
                                    : "Select a role"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRoles.map((role) => (
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

                  {showAlsoDoctorCheckbox && (
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
                              User is also a Doctor
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}
                  {showAlsoAdminCheckbox && (
                    <FormField
                      control={form.control}
                      name="is_also_admin"
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
                              User is also an Admin
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
            </div>

            {isLabCustomer && (
              <div className="space-y-3 pb-3 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-900">Departments</h3>
                {isLoadingDepartments ? (
                  <div className="text-xs text-gray-500">Loading departments...</div>
                ) : departments.length === 0 ? (
                  <div className="text-xs text-gray-500">No departments available for this lab customer.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {departments.map((department) => (
                      <label key={department.id} className="flex items-center space-x-2 text-sm">
                        <Checkbox
                          checked={selectedDepartments.includes(department.id)}
                          onCheckedChange={() => handleDepartmentToggle(department.id)}
                        />
                        <span>{department.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {form.formState.errors.department_ids && (
                  <p className="text-xs text-red-500">{form.formState.errors.department_ids.message as string}</p>
                )}
              </div>
            )}

            {/* Doctor-Specific Fields */}
            {treatingAsDoctor && (
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
                            validationState={getValidationState("license_number")}
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
                    render={() => (
                      <FormItem>
                        <FormControl>
                          <div className="space-y-2">
                            <div
                              className={cn(
                                "border rounded-lg overflow-hidden",
                                form.formState.errors.signature
                                  ? "border-red-500"
                                  : "border-gray-200",
                              )}
                            >
                              <div className="p-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                <div className="flex items-center">
                                  <span className="text-xs font-medium text-gray-700">Signature *</span>
                                  {hasSignature && (
                                    <span className="ml-2 text-[10px] text-green-600 flex items-center">
                                      <Check className="h-3 w-3 mr-1" />
                                      Saved
                                    </span>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleClearSignature}
                                  className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900"
                                >
                                  Clear
                                </Button>
                              </div>
                              <div className="p-2 bg-white relative">
                                <SignatureCanvas
                                  ref={signatureRef}
                                  penColor="black"
                                  canvasProps={{
                                    className: "w-full border border-dashed border-gray-300 h-36",
                                    style: { width: "100%", height: "144px" },
                                  }}
                                  onEnd={handleSaveSignature}
                                />
                                {!hasSignature && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-sm">
                                    Sign here
                                  </div>
                                )}
                                {signatureMessage && (
                                  <div
                                    className={cn(
                                      "absolute bottom-2 left-2 right-2 p-1.5 rounded text-xs text-center",
                                      signatureMessage.includes("Error") || signatureMessage.includes("Please")
                                        ? "bg-red-100 text-red-700"
                                        : "bg-green-100 text-green-700",
                                    )}
                                  >
                                    {signatureMessage}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <label className="text-[#1162a8] px-2 py-1 rounded flex items-center cursor-pointer text-xs font-medium hover:text-[#0d5999]">
                                <Upload className="h-3.5 w-3.5 mr-1.5" />
                                Upload Signature
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/jpeg,image/jpg,image/png"
                                  onChange={handleSignatureUpload}
                                />
                              </label>
                            </div>
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
                {isSubmitting ? "Creating..." : getCreateUserTitle(lockedRole || selectedRole)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
