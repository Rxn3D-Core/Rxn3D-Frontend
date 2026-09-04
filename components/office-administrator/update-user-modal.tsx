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
import { SearchableSelect } from "@/components/ui/searchable-select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useCustomer } from "@/contexts/customer-context"
import { USER_STATUSES, normalizeUserStatus, type UserStatus } from "@/lib/user-status"
import {
  getRoleDisplayLabel,
  isDoctorAdminRole,
  isDoctorRole,
  isOfficeAdminRole,
  requiresDoctorCredentials,
  resolveOfficeMixedRole,
} from "@/lib/user-role-labels"
import {
  extractUserCustomerRoleLinks,
  rolesForCustomerType,
  roleSelectOptionsForCustomerType,
  type UserCustomerRoleLink,
} from "@/lib/user-customer-roles"
import { fetchBackendRoles, type BackendRole } from "@/lib/api/role-permissions-api"
import { Check, Pencil, Plus, Trash2, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

const updateUserSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required"),
  work_number: z.string().optional(),
  status: z.string().min(1, "Please select a status"),
  role: z.string().optional(),
  department_ids: z.array(z.number()).optional(),
  is_doctor: z.boolean().default(false),
  is_also_admin: z.boolean().default(false),
  license_number: z.string().optional(),
  signature: z.any().optional(),
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
  customerRoles?: UserCustomerRoleLink[]
}

interface CustomerOption {
  value: string
  label: string
  type?: string
}

interface UpdateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: StaffUser | null
  /** Superadmin All Users: manage customer–role links in this modal. */
  manageCustomerLinks?: boolean
  customerOptions?: CustomerOption[]
}

const statusOptions = USER_STATUSES.map((status) => ({
  value: status,
  label: status,
}))

interface Department {
  id: number
  name: string
}

export function UpdateUserModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  manageCustomerLinks = false,
  customerOptions = [],
}: UpdateUserModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)
  const [customerLinks, setCustomerLinks] = useState<UserCustomerRoleLink[]>([])
  const [isLoadingLinks, setIsLoadingLinks] = useState(false)
  const [backendRoles, setBackendRoles] = useState<BackendRole[]>([])
  const [linkCustomerId, setLinkCustomerId] = useState("")
  const [linkRoleId, setLinkRoleId] = useState("")
  const [isLinking, setIsLinking] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null)
  const [editRoleId, setEditRoleId] = useState("")
  const [isSavingRole, setIsSavingRole] = useState(false)
  const [removingCustomerId, setRemovingCustomerId] = useState<number | null>(null)
  const [profileRole, setProfileRole] = useState<string>("")
  const [existingSignatureUrl, setExistingSignatureUrl] = useState<string | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [hasSignature, setHasSignature] = useState(false)
  const [signatureMessage, setSignatureMessage] = useState("")
  const signatureRef = useRef<SignatureCanvas>(null)
  const customerType = typeof window !== "undefined" ? localStorage.getItem("customerType")?.toLowerCase() : null
  const isLabCustomer = customerType === "lab" && !manageCustomerLinks
  const isOfficeCustomer = customerType === "office" && !manageCustomerLinks

  const authContext = useAuth()
  const { assignCustomerRoleToUser, removeCustomerRoleFromUser } = useCustomer()
  const actorRole = (authContext.profileRole || "").toLowerCase()
  /** Only lab admins (including superadmin acting as lab admin) may change role on edit. */
  const canChangeUserRole =
    isLabCustomer && (actorRole === "lab_admin" || authContext.isActingAsLabAdmin)

  const form = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      work_number: "",
      status: "Active",
      role: "",
      department_ids: [],
      is_doctor: false,
      is_also_admin: false,
      license_number: "",
      signature: null,
    },
    mode: "onChange",
    reValidateMode: "onChange",
  })

  const isDoctor = form.watch("is_doctor")
  const isAlsoAdmin = form.watch("is_also_admin")
  const selectedEditRole = form.watch("role")
  const labRoleOptions = useMemo(() => roleSelectOptionsForCustomerType("lab"), [])

  const effectiveUpdateRole = useMemo(() => {
    if (!isOfficeCustomer || !profileRole) return profileRole
    return resolveOfficeMixedRole({
      baseRole: profileRole,
      isAlsoDoctor: Boolean(isDoctor),
      isAlsoAdmin: Boolean(isAlsoAdmin),
    })
  }, [isOfficeCustomer, profileRole, isDoctor, isAlsoAdmin])

  const treatingAsDoctor = requiresDoctorCredentials(effectiveUpdateRole)
  const showAlsoDoctorCheckbox =
    isOfficeCustomer && (isOfficeAdminRole(profileRole) || isDoctorAdminRole(profileRole))
  const showAlsoAdminCheckbox =
    isOfficeCustomer && (isDoctorRole(profileRole) || isDoctorAdminRole(profileRole))

  const linkedCustomerIds = useMemo(
    () => new Set(customerLinks.map((link) => String(link.customerId))),
    [customerLinks],
  )

  const availableCustomersToLink = useMemo(
    () => customerOptions.filter((option) => !linkedCustomerIds.has(option.value)),
    [customerOptions, linkedCustomerIds],
  )

  const selectedLinkCustomer = customerOptions.find((option) => option.value === linkCustomerId)
  const linkRoleChoices = useMemo(() => {
    const allowed = new Set(rolesForCustomerType(selectedLinkCustomer?.type))
    return backendRoles.filter((role) => allowed.has(role.name))
  }, [backendRoles, selectedLinkCustomer?.type])

  const refreshCustomerLinks = async (userId: number) => {
    setIsLoadingLinks(true)
    try {
      const result = await authContext.fetchUserById(userId)
      const detail = result?.data || result
      setCustomerLinks(extractUserCustomerRoleLinks(detail))
    } catch {
      setCustomerLinks(user?.customerRoles || [])
    } finally {
      setIsLoadingLinks(false)
    }
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
    setHasSignature(Boolean(existingSignatureUrl))
    form.setValue("signature", null)
    showSignatureMessage(existingSignatureUrl ? "New signature cleared (existing kept)" : "Signature cleared")
  }

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      showSignatureMessage("Please upload a JPG or PNG image")
      return
    }
    applySignatureFile(file)
    showSignatureMessage("Signature uploaded")
  }

  useEffect(() => {
    if (user && isOpen) {
      const [firstName, ...lastNameParts] = user.name.split(" ")
      const lastName = lastNameParts.join(" ")

      form.reset({
        first_name: firstName || "",
        last_name: lastName || "",
        phone: user.phone || "",
        work_number: user.phone || "",
        status: normalizeUserStatus(user.status),
        role: user.role || "",
        department_ids: [],
        is_doctor: requiresDoctorCredentials(user.role) || isDoctorRole(user.role),
        is_also_admin: isOfficeAdminRole(user.role) || isDoctorAdminRole(user.role),
        license_number: "",
        signature: null,
      })

      setProfileRole(user.role || "")
      setSelectedDepartments([])
      setLinkCustomerId("")
      setLinkRoleId("")
      setEditingCustomerId(null)
      setEditRoleId("")
      setSignatureFile(null)
      setHasSignature(false)
      setExistingSignatureUrl(null)
      signatureRef.current?.clear()

      if (isLabCustomer) {
        fetchDepartments()
        void (async () => {
          try {
            const result = await authContext.fetchUserById(user.id)
            const detail = result?.data || result
            const customerId = Number(localStorage.getItem("customerId") || 0)
            const scoped =
              detail?.customers?.find((c: { id: number }) => Number(c.id) === customerId) ||
              detail?.customers?.[0]
            const roleName = scoped?.role?.name || detail?.role?.name || user.role || ""
            setProfileRole(roleName)
            form.setValue("role", roleName, { shouldDirty: false })
          } catch {
            // keep listing role fallback
          }
        })()
      }

      if (isOfficeCustomer) {
        void (async () => {
          try {
            const result = await authContext.fetchUserById(user.id)
            const detail = result?.data || result
            const customerId = Number(localStorage.getItem("customerId") || 0)
            const scoped =
              detail?.customers?.find((c: { id: number }) => Number(c.id) === customerId) ||
              detail?.customers?.[0]
            const roleName = scoped?.role?.name || detail?.role?.name || user.role || ""
            setProfileRole(roleName)
            setExistingSignatureUrl(detail?.signature_url || null)
            setHasSignature(Boolean(detail?.signature_url))
            form.setValue("license_number", detail?.license_number || "", { shouldDirty: false })
            form.setValue("role", roleName, { shouldDirty: false })
            form.setValue("is_doctor", requiresDoctorCredentials(roleName) || isDoctorRole(roleName), {
              shouldDirty: false,
            })
            form.setValue(
              "is_also_admin",
              isOfficeAdminRole(roleName) || isDoctorAdminRole(roleName),
              { shouldDirty: false },
            )
          } catch {
            // keep listing role fallback
          }
        })()
      }

      if (manageCustomerLinks) {
        setCustomerLinks(user.customerRoles || [])
        void refreshCustomerLinks(user.id)
        void fetchBackendRoles()
          .then(setBackendRoles)
          .catch(() => setBackendRoles([]))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOpen, isLabCustomer, isOfficeCustomer, manageCustomerLinks])

  useEffect(() => {
    form.setValue("department_ids", selectedDepartments, { shouldValidate: false, shouldDirty: false })
  }, [selectedDepartments, form])

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

  const handleDepartmentToggle = (departmentId: number) => {
    setSelectedDepartments((prev) =>
      prev.includes(departmentId)
        ? prev.filter((id) => id !== departmentId)
        : [...prev, departmentId],
    )
  }

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
    } catch (error: unknown) {
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

  const roleOptionsForLink = (link: UserCustomerRoleLink) => {
    const allowed = new Set(rolesForCustomerType(link.customerType))
    return backendRoles.filter((role) => allowed.has(role.name))
  }

  const handleLinkCustomer = async () => {
    if (!user || !linkCustomerId || !linkRoleId) {
      toast({
        title: "Missing fields",
        description: "Select a customer and role to link.",
        variant: "destructive",
      })
      return
    }
    setIsLinking(true)
    try {
      const result = await assignCustomerRoleToUser({
        customer_id: Number(linkCustomerId),
        user_id: user.id,
        role_id: Number(linkRoleId),
      })
      if (!result) return
      toast({ title: "Linked", description: "User linked to customer successfully." })
      setLinkCustomerId("")
      setLinkRoleId("")
      await refreshCustomerLinks(user.id)
    } finally {
      setIsLinking(false)
    }
  }

  const handleSaveRoleEdit = async (customerId: number) => {
    if (!user || !editRoleId) return
    setIsSavingRole(true)
    try {
      const result = await assignCustomerRoleToUser({
        customer_id: customerId,
        user_id: user.id,
        role_id: Number(editRoleId),
      })
      if (!result) return
      toast({ title: "Role updated", description: "Customer role updated successfully." })
      setEditingCustomerId(null)
      setEditRoleId("")
      await refreshCustomerLinks(user.id)
    } finally {
      setIsSavingRole(false)
    }
  }

  const handleRemoveLink = async (customerId: number) => {
    if (!user) return
    setRemovingCustomerId(customerId)
    try {
      const ok = await removeCustomerRoleFromUser(customerId, user.id)
      if (!ok) return
      toast({ title: "Unlinked", description: "User removed from customer." })
      await refreshCustomerLinks(user.id)
    } finally {
      setRemovingCustomerId(null)
    }
  }

  const onSubmit = async (data: UpdateUserFormValues) => {
    if (!user) return
    setIsSubmitting(true)
    try {
      if (isOfficeCustomer && treatingAsDoctor) {
        const hasLicense = Boolean(data.license_number?.trim())
        const hasSig = Boolean(signatureFile) || Boolean(existingSignatureUrl)
        if (!hasLicense || !hasSig) {
          toast({
            title: "Validation Error",
            description: "License number and signature are required for doctors",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
      }

      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        work_number: data.work_number || data.phone,
        status: normalizeUserStatus(data.status),
        ...(isLabCustomer ? { department_ids: selectedDepartments } : {}),
        ...(canChangeUserRole && data.role
          ? { role: data.role }
          : {}),
        ...(isOfficeCustomer
          ? {
              role: effectiveUpdateRole,
              is_doctor: treatingAsDoctor,
              license_number: treatingAsDoctor ? data.license_number : undefined,
              signature: treatingAsDoctor ? signatureFile : null,
            }
          : {}),
      }

      await authContext.updateUserDetails(user.id, payload)

      toast({
        title: "Success",
        description: "User updated successfully",
      })

      onSuccess()
      onClose()
    } catch (error: unknown) {
      console.error("Error updating user:", error)
      const message = error instanceof Error ? error.message : "Failed to update user. Please try again."
      toast({
        title: "Error",
        description: message,
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
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
                  <Select onValueChange={field.onChange} value={field.value}>
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

            {canChangeUserRole && (
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {labRoleOptions.map((role) => (
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
            )}

            {isLabCustomer && !canChangeUserRole && profileRole && (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                Role: <span className="font-medium">{getRoleDisplayLabel(profileRole || selectedEditRole)}</span>
              </div>
            )}

            {isOfficeCustomer && profileRole && (
              <div className="space-y-3 rounded-md border border-gray-200 p-3 bg-gray-50">
                <div className="text-sm text-gray-700">
                  Role: <span className="font-medium">{getRoleDisplayLabel(profileRole)}</span>
                  {effectiveUpdateRole !== profileRole && (
                    <span className="ml-2 text-xs text-[#1162a8]">
                      → will save as {getRoleDisplayLabel(effectiveUpdateRole)}
                    </span>
                  )}
                </div>
                {showAlsoDoctorCheckbox && (
                  <FormField
                    control={form.control}
                    name="is_doctor"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          User is also a Doctor
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                )}
                {showAlsoAdminCheckbox && (
                  <FormField
                    control={form.control}
                    name="is_also_admin"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          User is also an Admin
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {isOfficeCustomer && treatingAsDoctor && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold">Doctor Information</h4>
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
                <div className="space-y-2">
                  <div className={cn("border rounded-lg overflow-hidden", "border-gray-200")}>
                    <div className="p-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-xs font-medium text-gray-700">Signature *</span>
                        {hasSignature && (
                          <span className="ml-2 text-[10px] text-green-600 flex items-center">
                            <Check className="h-3 w-3 mr-1" />
                            {signatureFile ? "New signature saved" : "On file"}
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSignature}
                        className="h-7 px-2 text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="p-2 bg-white relative">
                      {existingSignatureUrl && !signatureFile && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={existingSignatureUrl}
                          alt="Existing signature"
                          className="mb-2 max-h-24 object-contain"
                        />
                      )}
                      <SignatureCanvas
                        ref={signatureRef}
                        penColor="black"
                        canvasProps={{
                          className: "w-full border border-dashed border-gray-300 h-36",
                          style: { width: "100%", height: "144px" },
                        }}
                        onEnd={handleSaveSignature}
                      />
                      {signatureMessage && (
                        <div className="absolute bottom-2 left-2 right-2 p-1.5 rounded text-xs text-center bg-green-100 text-green-700">
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
              </div>
            )}

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
              </div>
            )}

            {manageCustomerLinks && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Customer associations</h4>
                  {isLoadingLinks && (
                    <span className="text-xs text-gray-500">Refreshing…</span>
                  )}
                </div>

                {customerLinks.length === 0 ? (
                  <p className="text-sm text-gray-500">Not linked to any customers yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {customerLinks.map((link) => (
                      <li
                        key={link.customerId}
                        className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{link.customerName}</div>
                          <div className="text-xs text-gray-500 capitalize">
                            {link.customerType || "customer"}
                            {link.isPrimary ? " · primary" : ""}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {editingCustomerId === link.customerId ? (
                            <>
                              <Select value={editRoleId} onValueChange={setEditRoleId}>
                                <SelectTrigger className="h-9 w-[160px]">
                                  <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roleOptionsForLink(link).map((role) => (
                                    <SelectItem key={role.id} value={String(role.id)}>
                                      {getRoleDisplayLabel(role.name)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                size="sm"
                                disabled={isSavingRole || !editRoleId}
                                onClick={() => handleSaveRoleEdit(link.customerId)}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingCustomerId(null)
                                  setEditRoleId("")
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="text-sm text-gray-700">
                                {link.roleName ? getRoleDisplayLabel(link.roleName) : "No role"}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-green-700"
                                title="Edit role"
                                onClick={() => {
                                  setEditingCustomerId(link.customerId)
                                  setEditRoleId(link.roleId ? String(link.roleId) : "")
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-red-600"
                                title="Unlink customer"
                                disabled={removingCustomerId === link.customerId}
                                onClick={() => handleRemoveLink(link.customerId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="rounded-md border border-dashed border-gray-300 p-3 space-y-3">
                  <p className="text-xs font-medium text-gray-700">Link to another customer</p>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-2">
                    <SearchableSelect
                      options={availableCustomersToLink}
                      value={linkCustomerId}
                      onValueChange={(value) => {
                        setLinkCustomerId(value)
                        setLinkRoleId("")
                      }}
                      placeholder="Select customer"
                    />
                    <Select value={linkRoleId} onValueChange={setLinkRoleId} disabled={!linkCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {linkRoleChoices.map((role) => (
                          <SelectItem key={role.id} value={String(role.id)}>
                            {getRoleDisplayLabel(role.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      disabled={isLinking || !linkCustomerId || !linkRoleId}
                      onClick={handleLinkCustomer}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Link
                    </Button>
                  </div>
                </div>
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
