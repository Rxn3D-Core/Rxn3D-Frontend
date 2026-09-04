"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronLeft, Upload, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import {
  getCreateUserTitle,
  getRoleDisplayLabel,
  isDoctorRole,
} from "@/lib/user-role-labels"

/** Matches backend Password::min(8)->mixedCase()->numbers()->symbols() */
const passwordStrengthSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")

const baseUserFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(1, "Phone number is required"),
  work_number: z.string().optional(),
  role: z.string().min(1, "Please select a user type"),
  is_doctor: z.boolean().default(false),
  status: z.string().min(1, "Please select a status"),
  department_ids: z.array(z.number()).optional(),
  license_number: z.string().optional(),
  signature: z.any().optional(),
  avatar: z.any().optional(),
  password: z.string().optional(),
  password_confirmation: z.string().optional(),
})

const createUserFormSchema = baseUserFormSchema
  .extend({
    password: passwordStrengthSchema,
    password_confirmation: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  })

const editUserFormSchema = baseUserFormSchema

type UserFormValues = z.infer<typeof baseUserFormSchema>

interface AddUserFormProps {
  onCancel: () => void
  onSuccess: () => void
  /** When provided, the form runs in edit mode and updates this user. */
  user?: { id: number } | null
  /** When set (create mode), role is fixed to this page context — no role picker. */
  lockedRole?: string
}

interface Department {
  id: number
  name: string
}

// A role can arrive as a plain string ("lab_admin") or an object ({ name: "lab_admin" })
const extractRoleName = (role: any): string | undefined =>
  typeof role === "string" ? role : role?.name

// Resolve a user's role for the selected customer from any of the shapes the API returns
const resolveUserRole = (apiUser: any, customerId: number): string | undefined => {
  const customerUsers = Array.isArray(apiUser?.customer_users) ? apiUser.customer_users : []
  const scoped = customerId
    ? customerUsers.filter((cu: any) => Number(cu?.customer_id || cu?.customer?.id) === customerId)
    : customerUsers
  const source = scoped.length > 0 ? scoped : customerUsers
  const fromCustomerUsers = source.map((cu: any) => extractRoleName(cu?.role)).find(Boolean)
  return fromCustomerUsers || extractRoleName(apiUser?.roles?.[0]) || extractRoleName(apiUser?.role)
}

// Resolve the user's department ids for the selected customer
const resolveUserDepartmentIds = (apiUser: any, customerId: number): number[] => {
  const customerUsers = Array.isArray(apiUser?.customer_users) ? apiUser.customer_users : []
  const scoped = customerId
    ? customerUsers.filter((cu: any) => Number(cu?.customer_id || cu?.customer?.id) === customerId)
    : customerUsers
  const source = scoped.length > 0 ? scoped : customerUsers
  const ids = source.flatMap((cu: any) =>
    Array.isArray(cu?.departments) ? cu.departments.map((d: any) => d?.department?.id ?? d?.id) : [],
  )
  return Array.from(new Set(ids.filter((id: any) => typeof id === "number")))
}

// Role options scoped to the customer type (values must match the API role enum)
const getRoleOptions = (customerType: string | null) => {
  if (customerType === "office") {
    return [
      { value: "office_admin", label: "Office Admin" },
      { value: "office_user", label: "Office User" },
      { value: "doctor", label: "Doctor" },
    ]
  }
  // Default to lab roles. Driver pickup/delivery uses lab_user — no separate lab_driver role.
  return [
    { value: "lab_admin", label: "Lab Admin" },
    { value: "lab_user", label: "Lab User" },
  ]
}

const statusOptions = ["Pending", "Active", "Inactive", "Suspended", "Archived"]

export function AddUserForm({ onCancel, onSuccess, user, lockedRole }: AddUserFormProps) {
  const { toast } = useToast()
  const {
    createUser,
    updateUserDetails,
    fetchUserById,
  } = useAuth()
  const isEditMode = !!user?.id
  const roleIsLocked = !isEditMode && Boolean(lockedRole)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)

  const customerType = typeof window !== "undefined" ? localStorage.getItem("customerType")?.toLowerCase() || null : null
  const isLabCustomer = customerType === "lab"
  const roleOptions = getRoleOptions(customerType)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(isEditMode ? editUserFormSchema : createUserFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      work_number: "",
      role: lockedRole || "",
      is_doctor: isDoctorRole(lockedRole),
      status: "Pending",
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

  const selectedRole = form.watch("role")
  const isDoctor = form.watch("is_doctor")

  // Keep locked role applied in create mode without triggering empty-field errors
  useEffect(() => {
    if (!roleIsLocked || !lockedRole) return
    form.setValue("role", lockedRole, { shouldValidate: false, shouldDirty: false })
    form.setValue("is_doctor", isDoctorRole(lockedRole), { shouldValidate: false, shouldDirty: false })
  }, [roleIsLocked, lockedRole, form])

  useEffect(() => {
    if (isLabCustomer) {
      fetchDepartments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLabCustomer])

  useEffect(() => {
    form.setValue("department_ids", selectedDepartments, { shouldValidate: false, shouldDirty: false })
  }, [selectedDepartments, form])

  useEffect(() => {
    if (isEditMode) return
    if (isDoctorRole(selectedRole)) {
      form.setValue("is_doctor", true, { shouldValidate: false })
    } else if (roleIsLocked) {
      form.setValue("is_doctor", false, { shouldValidate: false })
    }
  }, [selectedRole, form, isEditMode, roleIsLocked])

  useEffect(() => {
    if (!user?.id) return
    let active = true
    const loadUser = async () => {
      setIsLoadingUser(true)
      try {
        const customerId = Number(localStorage.getItem("customerId") || 0)
        const result = await fetchUserById(user.id, customerId ? String(customerId) : undefined)
        const detail = result?.data || result
        if (!active || !detail) return
        const role = resolveUserRole(detail, customerId) || ""
        const departmentIds = resolveUserDepartmentIds(detail, customerId)
        form.reset({
          first_name: detail.first_name || "",
          last_name: detail.last_name || "",
          email: detail.email || "",
          phone: detail.phone || "",
          work_number: detail.work_number || "",
          role,
          is_doctor: !!detail.is_doctor || role === "doctor",
          status: detail.status || "Active",
          department_ids: departmentIds,
          license_number: detail.license_number || "",
          signature: null,
          avatar: null,
          password: "",
          password_confirmation: "",
        })
        setSelectedDepartments(departmentIds)
      } catch {
        toast({
          title: "Error",
          description: "Failed to load user details. Please try again.",
          variant: "destructive",
        })
      } finally {
        if (active) setIsLoadingUser(false)
      }
    }
    loadUser()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const fetchDepartments = async () => {
    setIsLoadingDepartments(true)
    try {
      const customerId = localStorage.getItem("customerId")
      const token = localStorage.getItem("token")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/departments?customer_id=${customerId || ""}`,
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

  const handleDepartmentToggle = (departmentId: number) => {
    setSelectedDepartments((prev) =>
      prev.includes(departmentId) ? prev.filter((id) => id !== departmentId) : [...prev, departmentId],
    )
  }

  const validateImageFile = (file: File): boolean => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image in JPG, JPEG, or PNG format.",
        variant: "destructive",
      })
      return false
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB.",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && validateImageFile(file)) {
      setAvatarFile(file)
      form.setValue("avatar", file, { shouldDirty: true })
    }
  }

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && validateImageFile(file)) {
      setSignatureFile(file)
      form.setValue("signature", file, { shouldValidate: true, shouldDirty: true })
    }
  }

  /** Visual state only after the field has been changed (or has a resolver error). */
  const getValidationState = (fieldName: keyof UserFormValues): "default" | "valid" | "error" => {
    const isDirty = Boolean(form.formState.dirtyFields[fieldName])
    const hasError = Boolean(form.formState.errors[fieldName])
    if (!isDirty && !hasError) return "default"
    if (hasError) return "error"
    const value = form.getValues(fieldName)
    const hasValue = value !== undefined && value !== null && String(value).trim() !== ""
    return hasValue ? "valid" : "default"
  }

  const onSubmit = async (data: UserFormValues) => {
    if (isEditMode && user) {
      setIsSubmitting(true)
      try {
        const payload: {
          first_name: string
          last_name: string
          phone: string
          work_number?: string
          status: string
          department_ids?: number[]
        } = {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          work_number: data.work_number || data.phone,
          status: data.status,
        }
        if (isLabCustomer && selectedDepartments.length > 0) {
          payload.department_ids = selectedDepartments
        }

        await updateUserDetails(user.id, payload)

        toast({
          title: "User Updated",
          description: `${data.first_name} ${data.last_name} has been updated successfully.`,
        })

        onSuccess()
      } catch (error: any) {
        console.error("Error updating user:", error)
        toast({
          title: "Error",
          description: error?.message || "Failed to update user. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    const treatingAsDoctor = isDoctorRole(lockedRole || data.role) || data.is_doctor
    if (treatingAsDoctor) {
      const hasLicense = data.license_number && data.license_number.trim() !== ""
      if (!hasLicense || !signatureFile) {
        form.setError("license_number", {
          type: "manual",
          message: "License number and signature are required for doctors",
        })
        toast({
          title: "Validation Error",
          description: "License number and signature are required for doctors.",
          variant: "destructive",
        })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const customerId = localStorage.getItem("customerId")
      const formData = new FormData()

      formData.append("first_name", data.first_name)
      formData.append("last_name", data.last_name)
      formData.append("email", data.email)
      formData.append("phone", data.phone)
      formData.append("work_number", data.work_number || data.phone)
      if (customerId) formData.append("customer_id", customerId)
      formData.append("role", lockedRole || data.role)
      formData.append("is_doctor", (isDoctorRole(lockedRole || data.role) || data.is_doctor) ? "1" : "0")
      formData.append("status", data.status)
      formData.append("password", data.password || "")
      formData.append("password_confirmation", data.password_confirmation || "")

      if (isLabCustomer && selectedDepartments.length > 0) {
        selectedDepartments.forEach((id) => {
          formData.append("department_ids[]", id.toString())
        })
      }

      if (treatingAsDoctor && data.license_number) {
        formData.append("license_number", data.license_number)
      }
      if (treatingAsDoctor && signatureFile) {
        formData.append("signature", signatureFile)
      }
      if (avatarFile) {
        formData.append("avatar", avatarFile)
      }

      await createUser(formData)

      toast({
        title: "User Added",
        description: `${data.first_name} ${data.last_name} has been added successfully.`,
      })

      onSuccess()
    } catch (error: any) {
      console.error("Error creating user:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to create user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full bg-gray-50">
      <div className="px-6 py-4">
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 flex items-center text-sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to List
        </button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
          <div className="px-6 pb-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  {isEditMode
                    ? "Edit User"
                    : lockedRole
                      ? getCreateUserTitle(lockedRole).replace("Create ", "") + " Details"
                      : "User Details"}
                  <span className="text-gray-400">📋</span>
                </h3>

                {isLoadingUser && (
                  <div className="mb-4 text-sm text-gray-500">Loading user details...</div>
                )}

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    {avatarFile ? (
                      <div className="relative w-32 h-32">
                        <img
                          src={URL.createObjectURL(avatarFile)}
                          alt="Profile preview"
                          className="w-full h-full object-cover rounded-lg border border-gray-200"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAvatarFile(null)
                            form.setValue("avatar", null)
                          }}
                          className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        <label htmlFor="avatar-upload" className="cursor-pointer flex flex-col items-center gap-2">
                          <Upload className="h-6 w-6 text-gray-400" />
                          <span className="text-xs text-gray-500">Upload Photo</span>
                        </label>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            errorMessage={form.formState.errors.email?.message as string}
                            disabled={isEditMode}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!isEditMode && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                errorMessage={form.formState.errors.password?.message as string}
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
                                errorMessage={form.formState.errors.password_confirmation?.message as string}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.replace(/[^0-9+]/g, ""))}
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
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.replace(/[^0-9+]/g, ""))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roleIsLocked ? (
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700 h-14 flex items-center">
                        Creating as <span className="font-medium ml-1">{getRoleDisplayLabel(lockedRole)}</span>
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isEditMode}>
                              <FormControl>
                                <SelectTrigger className="h-14">
                                  <SelectValue placeholder="User Type *" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {roleOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-14">
                                <SelectValue placeholder="Status *" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {statusOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {!roleIsLocked && selectedRole !== "doctor" && customerType === "office" && (
                    <FormField
                      control={form.control}
                      name="is_doctor"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border border-gray-200 p-3 bg-gray-50">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-sm font-medium cursor-pointer">Is Doctor</FormLabel>
                        </FormItem>
                      )}
                    />
                  )}

                  {isLabCustomer && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900">Departments</h4>
                      {isLoadingDepartments ? (
                        <div className="text-sm text-gray-500">Loading departments...</div>
                      ) : departments.length === 0 ? (
                        <div className="text-sm text-gray-500">No departments available for this lab customer.</div>
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
                    </div>
                  )}

                  {(isDoctor || isDoctorRole(selectedRole) || isDoctorRole(lockedRole)) && !isEditMode && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900">Doctor Information</h4>
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
                      <div>
                        <FormLabel className="text-sm font-medium text-gray-700">Signature *</FormLabel>
                        {signatureFile ? (
                          <div className="mt-2 flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                            <div className="flex items-center space-x-2">
                              <Upload className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">{signatureFile.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSignatureFile(null)
                                form.setValue("signature", null)
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png"
                              onChange={handleSignatureUpload}
                              className="hidden"
                              id="signature-upload"
                            />
                            <label
                              htmlFor="signature-upload"
                              className="cursor-pointer flex flex-col items-center gap-1.5"
                            >
                              <Upload className="h-6 w-6 text-gray-400" />
                              <span className="text-sm font-medium text-blue-600">Click to upload</span>
                              <span className="text-xs text-gray-500">JPG, PNG up to 5MB</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-8">
                  <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[linear-gradient(256.66deg,#2AA6DE_0%,#82298D_50%,#C9539F_100%)]" disabled={isSubmitting || isLoadingUser}>
                    {isSubmitting
                      ? isEditMode
                        ? "Updating..."
                        : "Saving..."
                      : isEditMode
                        ? "Update User"
                        : lockedRole
                          ? getCreateUserTitle(lockedRole).replace("Create ", "Save ")
                          : "Save User"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  )
}
