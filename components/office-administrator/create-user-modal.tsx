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
import { Check, Loader2, Upload, X } from "lucide-react"
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
import {
  isEmailAlreadyRegistered,
  type CreateUserPrefill,
} from "@/services/user-lookup-service"

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
  lockedRole?: string
  requireCustomerSelection?: boolean
  customerOptions?: CustomerOption[]
  /** Prefill from invite-search “Create new instead”. */
  initialPrefill?: CreateUserPrefill
}

interface Department {
  id: number
  name: string
}

const EMAIL_TAKEN_MSG =
  "This email is already registered. Invite them from search instead of creating a new account."

const PRIMARY_BTN =
  "bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)] hover:brightness-110 text-white"

export function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
  lockedRole,
  requireCustomerSelection = false,
  customerOptions = [],
  initialPrefill,
}: CreateUserModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [hasSignature, setHasSignature] = useState(false)
  const [signatureMessage, setSignatureMessage] = useState("")
  const signatureRef = useRef<SignatureCanvas>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailTaken, setEmailTaken] = useState(false)
  const roleIsLocked = Boolean(lockedRole)

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
  const watchedEmail = form.watch("email")

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
    if (lockedRole) {
      if (["lab_admin", "lab_user", "lab_driver"].includes(lockedRole)) {
        return roleSelectOptionsForCustomerType("lab")
      }
      if (["office_admin", "office_user", "doctor", "doctor_admin"].includes(lockedRole)) {
        return roleSelectOptionsForCustomerType("office")
      }
    }
    return []
  }, [requireCustomerSelection, effectiveCustomerType, lockedRole])

  const resolveCustomerIdForChecks = () => {
    if (requireCustomerSelection) return selectedCustomerId?.trim() || ""
    return typeof window !== "undefined" ? localStorage.getItem("customerId") || "" : ""
  }

  useEffect(() => {
    if (roleIsLocked || !selectedRole) return
    if (!availableRoles.some((role) => role.value === selectedRole)) {
      form.setValue("role", "", { shouldValidate: false, shouldDirty: false })
    }
  }, [availableRoles, selectedRole, form, roleIsLocked])

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

  // Debounced email uniqueness check
  useEffect(() => {
    if (!isOpen) return

    const email = (watchedEmail || "").trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const customerId = resolveCustomerIdForChecks()

    if (!email || !emailRegex.test(email) || !customerId) {
      setEmailTaken(false)
      setIsCheckingEmail(false)
      if (form.formState.errors.email?.message === EMAIL_TAKEN_MSG) {
        form.clearErrors("email")
      }
      return
    }

    let cancelled = false
    setIsCheckingEmail(true)
    const timeoutId = setTimeout(async () => {
      try {
        const taken = await isEmailAlreadyRegistered(email, customerId)
        if (cancelled) return
        setEmailTaken(taken)
        if (taken) {
          form.setError("email", { type: "manual", message: EMAIL_TAKEN_MSG })
        } else if (form.formState.errors.email?.message === EMAIL_TAKEN_MSG) {
          form.clearErrors("email")
        }
      } catch {
        if (!cancelled) setEmailTaken(false)
      } finally {
        if (!cancelled) setIsCheckingEmail(false)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedEmail, selectedCustomerId, isOpen, requireCustomerSelection])

  const getValidationState = (fieldName: keyof CreateUserFormValues): "default" | "valid" | "warning" | "error" => {
    if (fieldName === "email" && emailTaken) return "error"
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

  useEffect(() => {
    if (isOpen) {
      form.reset({
        first_name: initialPrefill?.first_name || "",
        last_name: initialPrefill?.last_name || "",
        email: initialPrefill?.email || "",
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
      setAvatarPreviewUrl(null)
      setSelectedDepartments([])
      setDepartments([])
      setEmailTaken(false)
      setIsCheckingEmail(false)
      if (isLabCustomer && !requireCustomerSelection) {
        void fetchDepartments()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, form, lockedRole, requireCustomerSelection, initialPrefill])

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

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(avatarFile)
    setAvatarPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  if (!authContext?.createUser) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-4 text-red-600">Error</h2>
          <p>Auth context is not available. Please refresh the page.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
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
      applySignatureFile(dataURLtoFile(signatureData, "signature.png"))
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

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image in JPG, JPEG, or PNG format.",
        variant: "destructive",
      })
      return
    }
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

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image in JPG, JPEG, or PNG format.",
        variant: "destructive",
      })
      return
    }
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

  const removeAvatarFile = () => {
    setAvatarFile(null)
    form.setValue("avatar", null)
  }

  const onSubmit = async (data: CreateUserFormValues) => {
    if (emailTaken) {
      form.setError("email", { type: "manual", message: EMAIL_TAKEN_MSG })
      toast({
        title: "Email already registered",
        description: "Use Invite from search to add this person.",
        variant: "destructive",
      })
      return
    }

    const customerId = requireCustomerSelection
      ? data.customer_id?.trim()
      : localStorage.getItem("customerId")

    if (!customerId) {
      toast({
        title: "Validation Error",
        description: requireCustomerSelection ? "Please select a customer" : "No active customer selected",
        variant: "destructive",
      })
      return
    }

    // Final email uniqueness check before create
    try {
      const taken = await isEmailAlreadyRegistered(data.email, customerId)
      if (taken) {
        setEmailTaken(true)
        form.setError("email", { type: "manual", message: EMAIL_TAKEN_MSG })
        toast({
          title: "Email already registered",
          description: "Use Invite from search to add this person.",
          variant: "destructive",
        })
        return
      }
    } catch {
      // Allow submit; backend unique constraint is the final guard
    }

    const baseRole = lockedRole || data.role
    const effectiveRole = resolveOfficeMixedRole({
      baseRole,
      isAlsoDoctor: isDoctorRole(baseRole) || Boolean(data.is_doctor),
      isAlsoAdmin: Boolean(data.is_also_admin),
    })
    const treatingAsDoctorOnSubmit =
      requiresDoctorCredentials(effectiveRole) || isDoctorRole(baseRole) || Boolean(data.is_doctor)

    if (treatingAsDoctorOnSubmit) {
      const hasLicense = data.license_number && data.license_number.trim() !== ""
      const hasSignature = signatureFile !== null
      if (!hasLicense || !hasSignature) {
        form.setError("license_number", {
          type: "manual",
          message: "License number and signature are required for doctors",
        })
        toast({
          title: "Validation Error",
          description: "License number and signature are required for doctors",
          variant: "destructive",
        })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("first_name", data.first_name)
      formData.append("last_name", data.last_name)
      formData.append("email", data.email)
      formData.append("phone", data.phone)
      formData.append("work_number", data.work_number || data.phone)
      formData.append("customer_id", customerId)
      formData.append("role", effectiveRole)
      formData.append("is_doctor", treatingAsDoctorOnSubmit ? "1" : "0")
      formData.append("status", "Pending")
      formData.append("password", data.password)
      formData.append("password_confirmation", data.password_confirmation)

      if (isLabCustomer && selectedDepartments.length > 0) {
        selectedDepartments.forEach((id) => {
          formData.append("department_ids[]", id.toString())
        })
      }

      if (treatingAsDoctorOnSubmit && data.license_number) {
        formData.append("license_number", data.license_number)
      }
      if (treatingAsDoctorOnSubmit && signatureFile) {
        formData.append("signature", signatureFile)
      }
      if (avatarFile) {
        formData.append("avatar", avatarFile)
      }

      await authContext.createUser(formData)

      toast({
        title: "Success",
        description: "User created successfully",
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldClass = "h-10 text-sm"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-xl max-h-[min(92dvh,720px)] p-0 gap-0 overflow-hidden rounded-2xl flex flex-col">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-[#f0f0f0] flex-shrink-0">
          <DialogTitle className="text-[15px] font-semibold tracking-tight">
            {getCreateUserTitle(lockedRole || selectedRole)}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col min-h-0 flex-1"
            autoComplete="off"
          >
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
              {requireCustomerSelection && (
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-[#6b7280]">Organization *</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={customerOptions}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select office or lab"
                          searchPlaceholder="Search…"
                          emptyMessage="No customers found"
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Profile + identity */}
              <div className="flex gap-3 items-start">
                <FormField
                  control={form.control}
                  name="avatar"
                  render={() => (
                    <FormItem className="m-0 shrink-0">
                      <FormControl>
                        <div className="relative">
                          {avatarPreviewUrl ? (
                            <div className="relative h-14 w-14">
                              <img
                                src={avatarPreviewUrl}
                                alt="Avatar preview"
                                className="h-14 w-14 rounded-full object-cover border border-[#e5e7eb]"
                              />
                              <button
                                type="button"
                                onClick={removeAvatarFile}
                                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                onChange={handleAvatarUpload}
                                className="hidden"
                                id="avatar-upload"
                              />
                              <label
                                htmlFor="avatar-upload"
                                className="h-14 w-14 rounded-full border border-dashed border-[#d1d5db] bg-[#fafafa] flex flex-col items-center justify-center cursor-pointer hover:border-[#9ca3af] transition-colors"
                              >
                                <Upload className="h-4 w-4 text-[#9ca3af]" />
                              </label>
                            </>
                          )}
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-w-0">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            label="First name *"
                            placeholder="First name"
                            validationState={getValidationState("first_name")}
                            errorMessage={form.formState.errors.first_name?.message as string}
                            className={fieldClass}
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
                            label="Last name *"
                            placeholder="Last name"
                            validationState={getValidationState("last_name")}
                            errorMessage={form.formState.errors.last_name?.message as string}
                            className={fieldClass}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="email"
                            label="Email *"
                            placeholder="name@example.com"
                            autoComplete="off"
                            data-1p-ignore
                            data-lpignore="true"
                            validationState={getValidationState("email")}
                            className={cn(fieldClass, "pr-9")}
                            {...field}
                          />
                          {isCheckingEmail && (
                            <Loader2 className="absolute right-3 bottom-3 h-3.5 w-3.5 animate-spin text-[#9ca3af]" />
                          )}
                        </div>
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
                          label="Phone *"
                          placeholder="Phone number"
                          validationState={getValidationState("phone")}
                          errorMessage={form.formState.errors.phone?.message as string}
                          className={fieldClass}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value.replace(/[^0-9+]/g, ""))
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
                          label="Work number"
                          placeholder="Optional"
                          validationState={getValidationState("work_number")}
                          className={fieldClass}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value.replace(/[^0-9+]/g, ""))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                {roleIsLocked ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-[#f3f4f6] px-2.5 py-1 text-xs font-medium text-[#374151]">
                      {getRoleDisplayLabel(lockedRole)}
                      {resolvedCreateRole === "doctor_admin" ? " · Admin" : ""}
                    </span>
                    {showAlsoDoctorCheckbox && (
                      <FormField
                        control={form.control}
                        name="is_doctor"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0 m-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs font-medium cursor-pointer">Also Doctor</FormLabel>
                          </FormItem>
                        )}
                      />
                    )}
                    {showAlsoAdminCheckbox && (
                      <FormField
                        control={form.control}
                        name="is_also_admin"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0 m-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="text-xs font-medium cursor-pointer">Also Admin</FormLabel>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-[#6b7280]">Role *</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className={cn(fieldClass, "border")}>
                                <SelectValue
                                  placeholder={
                                    requireCustomerSelection && !effectiveCustomerType
                                      ? "Select organization first"
                                      : "Select role"
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
                    <div className="flex flex-wrap gap-3 pt-5">
                      {showAlsoDoctorCheckbox && (
                        <FormField
                          control={form.control}
                          name="is_doctor"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0 m-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-xs font-medium cursor-pointer">Also Doctor</FormLabel>
                            </FormItem>
                          )}
                        />
                      )}
                      {showAlsoAdminCheckbox && (
                        <FormField
                          control={form.control}
                          name="is_also_admin"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0 m-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-xs font-medium cursor-pointer">Also Admin</FormLabel>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isLabCustomer && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#6b7280]">Departments</p>
                  {isLoadingDepartments ? (
                    <p className="text-xs text-[#9ca3af]">Loading…</p>
                  ) : departments.length === 0 ? (
                    <p className="text-xs text-[#9ca3af]">No departments available.</p>
                  ) : (
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {departments.map((department) => (
                        <label key={department.id} className="flex items-center gap-1.5 text-xs text-[#374151]">
                          <Checkbox
                            checked={selectedDepartments.includes(department.id)}
                            onCheckedChange={() => handleDepartmentToggle(department.id)}
                          />
                          {department.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Security */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="password"
                          label="Password *"
                          placeholder="Create password"
                          revealToggle
                          autoComplete="new-password"
                          data-1p-ignore
                          data-lpignore="true"
                          validationState={getValidationState("password")}
                          className={fieldClass}
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
                          label="Confirm *"
                          placeholder="Confirm password"
                          revealToggle
                          autoComplete="new-password"
                          data-1p-ignore
                          data-lpignore="true"
                          validationState={getValidationState("password_confirmation")}
                          className={fieldClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {treatingAsDoctor && (
                <div className="space-y-2.5 rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-3">
                  <p className="text-xs font-semibold text-[#374151]">Doctor credentials</p>
                  <FormField
                    control={form.control}
                    name="license_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            label="License number *"
                            placeholder="License number"
                            validationState={getValidationState("license_number")}
                            errorMessage={form.formState.errors.license_number?.message as string}
                            className={cn(fieldClass, "bg-white")}
                            {...field}
                            onChange={(e) => {
                              field.onChange(e)
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
                          <div className="space-y-1.5">
                            <div
                              className={cn(
                                "border rounded-lg overflow-hidden bg-white",
                                form.formState.errors.signature ? "border-red-500" : "border-[#e5e7eb]",
                              )}
                            >
                              <div className="px-2.5 py-1.5 border-b border-[#f0f0f0] flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium text-[#374151]">Signature *</span>
                                  {hasSignature && (
                                    <span className="text-[10px] text-green-600 flex items-center">
                                      <Check className="h-3 w-3 mr-0.5" />
                                      Saved
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={handleClearSignature}
                                  className="text-[11px] text-[#6b7280] hover:text-[#111827]"
                                >
                                  Clear
                                </button>
                              </div>
                              <div className="p-2 relative">
                                <SignatureCanvas
                                  ref={signatureRef}
                                  penColor="black"
                                  canvasProps={{
                                    className: "w-full border border-dashed border-[#e5e7eb] h-28 rounded",
                                    style: { width: "100%", height: "112px" },
                                  }}
                                  onEnd={handleSaveSignature}
                                />
                                {!hasSignature && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[#9ca3af] text-xs">
                                    Sign here
                                  </div>
                                )}
                                {signatureMessage && (
                                  <div
                                    className={cn(
                                      "absolute bottom-2 left-2 right-2 p-1 rounded text-[11px] text-center",
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
                            <label className="inline-flex items-center gap-1 text-[#1162a8] text-xs font-medium cursor-pointer hover:underline">
                              <Upload className="h-3 w-3" />
                              Upload signature
                              <input
                                type="file"
                                className="hidden"
                                accept="image/jpeg,image/jpg,image/png"
                                onChange={handleSignatureUpload}
                              />
                            </label>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="px-5 py-3 border-t border-[#f0f0f0] flex-shrink-0 gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="h-9">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || emailTaken || isCheckingEmail}
                className={cn("h-9 px-5", PRIMARY_BTN)}
              >
                {isSubmitting ? "Creating…" : getCreateUserTitle(lockedRole || selectedRole)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
