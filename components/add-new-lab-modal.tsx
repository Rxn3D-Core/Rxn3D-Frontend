"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, X, Star, Plus, Mail, Phone, MapPin, Loader2, AlertCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useLabModal } from "@/hooks/use-lab-modal"
import { inviteFormSchema } from "@/lib/validations/lab-modal"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

interface AddNewLabModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLabSelect?: (lab: any) => void
  onInviteLab?: (labName: string) => void
}

export function AddNewLabModal({ open, onOpenChange, onLabSelect, onInviteLab }: AddNewLabModalProps) {
  const {
    // State
    isOpen,
    searchTerm,
    sortBy,
    showDetails,
    selectedLabForConnection,
    isSendingRequest,
    requestSent,
    showInviteModal,
    inviteLabName,
    inviteEmail,
    showConnectionModal,
    isLoading,
    error,
    customToast,
    sortedLabs,

    // Actions
    setOpen,
    setSearchTerm,
    setSortBy,
    setShowDetails,
    setSelectedLabForConnection,
    setShowConnectionModal,
    setIsSendingRequest,
    setRequestSent,
    setShowInviteModal,
    setInviteLabName,
    setInviteEmail,
    showCustomToast,
    hideCustomToast,
    handleInviteSubmit,
    handleConnectionRequest,
    resetModal,
    resetInviteForm,
    retrySearch,
  } = useLabModal()

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      labName: "",
      email: ""
    }
  })

  // Watch form values
  const watchedLabName = watch("labName")
  const watchedEmail = watch("email")

  // Update store when form values change
  React.useEffect(() => {
    setInviteLabName(watchedLabName)
  }, [watchedLabName, setInviteLabName])

  React.useEffect(() => {
    setInviteEmail(watchedEmail)
  }, [watchedEmail, setInviteEmail])

  // Track previous isOpen state to detect when store closes the modal
  const prevIsOpenRef = React.useRef(isOpen)
  const isInitialMountRef = React.useRef(true)

  // Update store when prop changes
  React.useEffect(() => {
    setOpen(open)
    // On initial mount, sync the ref
    if (isInitialMountRef.current) {
      prevIsOpenRef.current = open
      isInitialMountRef.current = false
    }
  }, [open, setOpen])

  // Update parent when store changes (e.g. after successful submission)
  // Only close parent if store explicitly closed (was open, now closed)
  // Skip on initial mount to avoid closing immediately
  React.useEffect(() => {
    if (isInitialMountRef.current) {
      prevIsOpenRef.current = isOpen
      return
    }
    
    if (prevIsOpenRef.current && !isOpen && open) {
      onOpenChange(false)
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen, open, onOpenChange])

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      reset()
      resetModal()
    }
  }, [open, reset, resetModal])

  // Handler functions
  const handleLabSelect = (lab: any) => {
    if (onLabSelect) {
      onLabSelect(lab)
    }
    onOpenChange(false)
  }

  const handleInviteLab = () => {
    setValue("labName", searchTerm)
    setShowInviteModal(true)
  }

  const handleRequestConnection = (lab: any) => {
    setSelectedLabForConnection(lab)
    setShowConnectionModal(true)
  }

  const toggleDetails = (labId: string) => {
    setShowDetails(showDetails === labId ? null : labId)
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-[10001] bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="fixed left-1/2 top-1/2 z-[10002] w-full max-w-6xl max-h-[90vh] -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-600 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {typeof window !== "undefined" && (
                (() => {
                  const role = localStorage.getItem("role");
                  if (role === "lab_admin") {
                    return "Add new office";
                  }
                  // Default to "Add new lab" for office_admin, superadmin, or any other role
                  return "Add new lab";
                })()
              )}
            </h2>
            <button
              onClick={() => onOpenChange(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-col h-full">
          {/* Search Section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-4 mb-4">
              {/* Search dropdown */}
              <div className="relative flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={
                      typeof window !== "undefined"
                        ? (() => {
                            const role = window.localStorage.getItem("role");
                            if (role === "lab_admin") return "Search Dental Office";
                            if (role === "office_admin") return "Search Dental lab";
                            return "Search Dental Lab";
                          })()
                        : "Search Dental Lab"
                    }
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                    }}
                    className="pr-10 py-2 bg-white border border-gray-300 rounded-lg w-full"
                  />

                  {/* Dropdown content */}
                  {searchTerm && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                      {/* Invite option */}
                      <div
                        className="p-4 border-b border-gray-200 cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={handleInviteLab}
                      >
                        <div className="flex items-center gap-3">
                          <Plus className="w-5 h-5 text-blue-600" />
                          <span className="text-blue-800 font-medium">
                            Invite '{searchTerm}'
                          </span>
                        </div>
                      </div>

                      {/* Search results */}
                      {isLoading ? (
                        <div className="p-4 text-center">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                          <p className="text-sm text-gray-500">Searching labs...</p>
                        </div>
                      ) : error ? (
                        <div className="p-4 text-center">
                          <AlertCircle className="w-5 h-5 mx-auto mb-2 text-red-500" />
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      ) : sortedLabs.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto">
                          {sortedLabs.map((lab) => (
                            <div
                              key={lab.id}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => handleRequestConnection(lab)}
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={lab.logo}
                                  alt={lab.name}
                                  className="w-8 h-8 object-contain rounded"
                                  onError={(e) => {
                                    e.currentTarget.src = "/images/office-default.png"
                                  }}
                                />
                                <div>
                                  <p className="font-medium text-sm">{lab.name}</p>
                                  <p className="text-xs text-gray-500">{lab.location}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No labs found for '{searchTerm}'
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tooltip - removed for now as it's not in the store */}
                </div>
              </div>

              {/* New slip button */}
              {/* <Button className="bg-[#1162a8] hover:bg-[#0f5490] text-white rounded-lg px-4 py-2 whitespace-nowrap">
                + New slip
              </Button> */}
            </div>

            {/* Sort and count */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="name-az">Name A-Z</option>
                  <option value="name-za">Name Z-A</option>
                  <option value="location">Location</option>
                </select>
              </div>
              <p className="text-sm text-gray-500">{sortedLabs.length} labs found</p>
            </div>
          </div>

          {/* Labs Grid - Only show when no search term */}
          <div className="flex-1 overflow-y-auto p-6">
            {!searchTerm && (
              <>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                      <p className="text-gray-500">Loading labs...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
                      <p className="text-red-600 mb-2">{error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={retrySearch}
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : sortedLabs.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <p className="text-gray-500">No labs found</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sortedLabs.map((lab) => (
                      <Card key={lab.id} className="border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer" onClick={() => handleRequestConnection(lab)}>
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center">
                            {/* Logo */}
                            <div className="mb-3">
                              <img
                                src={lab.logo}
                                alt={lab.name}
                                className="w-16 h-16 object-contain rounded-lg"
                                onError={(e) => {
                                  e.currentTarget.src = "/images/office-default.png"
                                }}
                              />
                            </div>

                            {/* Lab Name */}
                            <h3 className="font-semibold text-base mb-1 text-gray-900">{lab.name}</h3>

                            {/* Location */}
                            <p className="text-sm text-gray-600">{lab.location}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Show message when searching */}
            {searchTerm && (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500 text-center">
                  Search results appear in the dropdown above
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Request Modal */}
      {showConnectionModal && selectedLabForConnection && (
        <>
          <div className="fixed inset-0 z-[10003] bg-black/50" onClick={() => setShowConnectionModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-[10004] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Connect to {selectedLabForConnection.name}
                </h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-6">
                Choose how you'd like to connect with this lab.
                You can send a request only, or send a request and submit the case at the same time.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConnectionModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleConnectionRequest(true)}
                  className="flex-1"
                >
                  Send Request and Submit
                </Button>
                <Button
                  onClick={() => handleConnectionRequest(false)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Send Request only
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sending Request Modal */}
      {isSendingRequest && (
        <>
          <div className="fixed inset-0 z-[10005] bg-black/50" />
          <div className="fixed left-1/2 top-1/2 z-[10006] w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Sending connection request
                </h2>
              </div>
            </div>

            <div className="p-6 text-center">
              <p className="text-gray-700 mb-4">
                Please wait while we send your connection request to the lab
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Request Sent Success Modal */}
      {requestSent && (
        <>
          <div className="fixed inset-0 z-[10007] bg-black/50" />
          <div className="fixed left-1/2 top-1/2 z-[10008] w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Sending connection request
                </h2>
              </div>
            </div>

            <div className="p-6 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="text-lg font-semibold text-gray-900">Request Sent!</p>
            </div>
          </div>
        </>
      )}

      {/* Invite New Lab Modal */}
      {showInviteModal && (
        <>
          <div className="fixed inset-0 z-[10009] bg-black/50" onClick={() => setShowInviteModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-[10010] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-600 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {typeof window !== "undefined" && (
                    (() => {
                      const role = localStorage.getItem("role");
                      if (role === "lab_admin") {
                        return "Invite New Office";
                      }
                      // Default to "Invite New Lab" for office_admin, superadmin, or any other role
                      return "Invite New Lab";
                    })()
                  )}
                </h2>
              </div>
            </div>

            <div className="p-8">
              <p className="text-gray-700 mb-8 text-base leading-relaxed">
                {typeof window !== "undefined" && (
                  (() => {
                    const role = localStorage.getItem("role");
                    if (role === "lab_admin") {
                      return "Invite a new office by entering their details below. You can send an invite only, or send an invite and submit the case at the same time.";
                    }
                    // Default text for office_admin, superadmin, or any other role
                    return "Invite a new lab by entering their details below. You can send an invite only, or send an invite and submit the case at the same time.";
                  })()
                )}
              </p>

              <form onSubmit={handleSubmit((data) => handleInviteSubmit(false))}>
                <div className="flex gap-6 mb-8">
                  <div className="flex-1">
                    <Input
                      {...register("labName")}
                      placeholder="Lab Name"
                      className="w-full py-3 px-4 text-base"
                    />
                    {errors.labName && (
                      <p className="text-red-500 text-sm mt-1">{errors.labName.message}</p>
                    )}
                  </div>

                  <div className="flex-1">
                    <Input
                      {...register("email")}
                      placeholder="Email Address *"
                      type="email"
                      className="w-full py-3 px-4 text-base"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>
              </form>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-3 text-base"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit((data) => handleInviteSubmit(true))()}
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-3 text-base"
                >
                  Send Invite and Submit
                </Button>
                <Button
                  onClick={() => handleSubmit((data) => handleInviteSubmit(false))()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 text-base"
                >
                  Send Invite only
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Custom Toast - appears in front of modal */}
      {customToast && (
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-top-2 duration-300">
          <div
            className={`${customToast.variant === "destructive"
                ? "border-red-500 bg-red-50 text-red-900"
                : "border-blue-500 bg-blue-50 text-blue-900"
              } shadow-lg rounded-lg border p-4 max-w-sm`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-1">
                <div className="font-semibold text-sm">{customToast.title}</div>
                <div className="text-sm mt-1 opacity-90">{customToast.description}</div>
              </div>
              <button
                onClick={hideCustomToast}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
