"use client"

import { useState, useRef, useEffect } from "react"
import { Edit, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useCustomerLogoStore } from "@/stores/customer-logo-store"
import { TOP_BAR_RECOMMENDED_LOGO_SIZES } from "@/components/case-design-center/components/TopBar"
import { EditCustomerProfileModal } from "@/components/lab-office-management/edit-customer-profile-modal"

interface OverviewTabProps {
  officeData: {
    name: string
    type: string
    id: string
    number: string
    email: string
    address: string
    phone: string
    website: string
    contactName: string
    contactEmail: string
    contactNumber: string
    joiningDate: string
    position: string
    logo_url?: string
    unique_code?: string
    code?: string
    city?: string
    postal_code?: string
    stateName?: string
    stateId?: number | null
    countryName?: string
    countryId?: number | null
  }
  onLogoUpdate?: (logoUrl: string) => void
  onProfileUpdate?: () => void
}

export default function OverviewTab({ officeData, onLogoUpdate, onProfileUpdate }: OverviewTabProps) {
  const [logoUrl, setLogoUrl] = useState<string>(officeData.logo_url || "")
  const [isUploading, setIsUploading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { setCustomerLogo, setCurrentCustomerLogo } = useCustomerLogoStore()

  // Update logo URL when officeData changes
  useEffect(() => {
    if (officeData.logo_url) {
      setLogoUrl(officeData.logo_url)
    } else {
      setLogoUrl("")
    }
  }, [officeData.logo_url])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, JPEG, or SVG file.",
        variant: "destructive",
      })
      return
    }

    // Validate file size (1MB max)
    const maxSize = 1 * 1024 * 1024 // 1MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "File size must not exceed 1MB.",
        variant: "destructive",
      })
      return
    }

    // Upload the file
    await uploadLogo(file)
  }

  const uploadLogo = async (file: File) => {
    setIsUploading(true)
    try {
      const customerId = officeData.id
      const token = localStorage.getItem('token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ""

      if (!token) {
        throw new Error("Authentication token not found")
      }

      // Create FormData for multipart form submission
      const formData = new FormData()
      formData.append('logo', file)

      // Upload the logo
      const response = await fetch(`${apiBaseUrl}/customers/${customerId}/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
        },
        body: formData,
      })

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to upload logo: ${response.status}`)
      }

      const result = await response.json()
      const newLogoUrl = result.data?.logo_url || result.logo_url

      if (newLogoUrl) {
        setLogoUrl(newLogoUrl)
        
        // Update Zustand store and localStorage
        setCustomerLogo(customerId, newLogoUrl)
        setCurrentCustomerLogo(newLogoUrl)
        
        if (onLogoUpdate) {
          onLogoUpdate(newLogoUrl)
        }
        if (onProfileUpdate) {
          onProfileUpdate()
        }
        toast({
          title: "Success",
          description: "Logo uploaded successfully",
        })
      }
    } catch (error: any) {
      console.error("Error uploading logo:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="p-6">
      <Card className="">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Office Info
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit Office Info"
            >
              <Edit className="h-4 w-4" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-blue-200 flex items-center justify-center bg-blue-50 overflow-hidden">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${officeData.name} Logo`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Fallback: hide image and show initial if load fails
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.parentElement?.querySelector('.office-initial-fallback');
                      if (fallback) fallback.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <span
                  className={`office-initial-fallback text-blue-600 text-2xl font-bold ${logoUrl ? "hidden" : ""}`}
                  style={{ lineHeight: "4rem" }}
                >
                  {officeData.name?.[0]?.toUpperCase() || "O"}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpg,image/jpeg,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col gap-1">
                <Button 
                  size="sm" 
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading....
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Recommended: {TOP_BAR_RECOMMENDED_LOGO_SIZES.center.md.width} × {TOP_BAR_RECOMMENDED_LOGO_SIZES.center.md.height} px (displays in header center).
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Office Name:</label>
                <p className="font-medium text-sm">{officeData.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Office Type:</label>
                <p className="font-medium text-sm">{officeData.type}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Office ID:</label>
                <p className="font-medium text-sm">{officeData.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Office Number:</label>
                <p className="font-medium text-sm">{officeData.number}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Office email:</label>
                <p className="font-medium text-sm">{officeData.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Address:</label>
                <p className="font-medium text-sm">{officeData.address}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Phone:</label>
                <p className="font-medium text-sm">{officeData.phone}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Website:</label>
                <p className="font-medium text-blue-600 text-sm">{officeData.website}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Contact Name:</label>
                <p className="font-medium text-sm">{officeData.contactName}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Contact Email:</label>
                <p className="font-medium text-sm">{officeData.contactEmail}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Contact number:</label>
                <p className="font-medium text-sm">{officeData.contactNumber}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Joining Date:</label>
                <p className="font-medium text-sm">{officeData.joiningDate}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Position:</label>
                <p className="font-medium text-sm">{officeData.position}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Office Code:</label>
                <p className="font-medium text-sm">{officeData.code || "—"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditCustomerProfileModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        customerType="office"
        customer={{
          id: Number(officeData.id),
          name: officeData.name,
          email: officeData.email,
          website: officeData.website,
          address: officeData.address,
          city: officeData.city,
          postal_code: officeData.postal_code,
          stateName: officeData.stateName,
          stateId: officeData.stateId,
          countryName: officeData.countryName,
          countryId: officeData.countryId,
          code: officeData.code,
          logo_url: logoUrl || officeData.logo_url,
        }}
        onSuccess={(updated) => {
          if (updated.logo_url) {
            setLogoUrl(updated.logo_url)
            onLogoUpdate?.(updated.logo_url)
          }
          onProfileUpdate?.()
        }}
      />
    </div>
  )
}
