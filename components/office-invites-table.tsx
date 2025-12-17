"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ActionModal } from "@/components/action-modal"

interface Office {
  id: number
  name: string
  connection: "Connected" | "Pending Confirmation"
  action: "Hold" | "Resend Link"
}

export function OfficeInvitesTable() {
  // Full data arrays
  const allLeftOffices: Office[] = [
    { id: 1, name: "4K Dental Implants", connection: "Connected", action: "Hold" },
    { id: 2, name: "Alexander Dental Group & Orthodontics", connection: "Connected", action: "Hold" },
    { id: 3, name: "Bliss Dental LV", connection: "Connected", action: "Hold" },
    { id: 4, name: "Boca Park Dental", connection: "Connected", action: "Hold" },
    { id: 5, name: "Boston Dental Group Anthem", connection: "Connected", action: "Hold" },
    { id: 6, name: "Canyon Pointe Dental Group & Orthodontics", connection: "Connected", action: "Hold" },
    { id: 7, name: "Celebrate Dental", connection: "Connected", action: "Hold" },
    { id: 8, name: "Centennial Modern Dentistry & Ortho", connection: "Connected", action: "Hold" },
    { id: 9, name: "Charleston Smiles Dentistry", connection: "Connected", action: "Hold" },
    { id: 10, name: "Craig Ranch Dental Group", connection: "Connected", action: "Hold" },
    { id: 11, name: "Crowne Dental", connection: "Connected", action: "Hold" },
    { id: 12, name: "DEE FOR DENTIST", connection: "Connected", action: "Hold" },
    { id: 13, name: "Deer Springs Modern Dentistry", connection: "Connected", action: "Hold" },
    { id: 14, name: "Dentist of Spring Valley", connection: "Connected", action: "Hold" },
    { id: 15, name: "Dentists of Henderson", connection: "Connected", action: "Hold" },
    { id: 16, name: "Dentists of Henderson", connection: "Connected", action: "Hold" },
    { id: 17, name: "Dentists of North Las Vegas", connection: "Connected", action: "Hold" },
    { id: 18, name: "Desert Hills Dental", connection: "Connected", action: "Hold" },
    { id: 19, name: "Eastern Dental", connection: "Connected", action: "Hold" },
    { id: 20, name: "Flamingo Smiles Dentistry", connection: "Connected", action: "Hold" },
    { id: 21, name: "Green Valley Dental", connection: "Connected", action: "Hold" },
    { id: 22, name: "Henderson Modern Dentistry", connection: "Connected", action: "Hold" },
    { id: 23, name: "Las Vegas Dental Group", connection: "Connected", action: "Hold" },
    { id: 24, name: "North Las Vegas Dental", connection: "Connected", action: "Hold" },
    { id: 25, name: "Paradise Dental", connection: "Connected", action: "Hold" },
  ]

  const allRightOffices: Office[] = [
    { id: 101, name: "Krupesh office", connection: "Connected", action: "Hold" },
    { id: 102, name: "Kruger Dental", connection: "Connected", action: "Hold" },
    { id: 103, name: "HMC Office Orders", connection: "Connected", action: "Hold" },
    { id: 104, name: "Sparks Media Solution Test Office", connection: "Connected", action: "Hold" },
    { id: 105, name: "TEST BELEN", connection: "Connected", action: "Hold" },
    { id: 106, name: "Smile Sketch Vegas", connection: "Connected", action: "Hold" },
    { id: 107, name: "Smile Sketch Vegas", connection: "Pending Confirmation", action: "Resend Link" },
    { id: 108, name: "Las Vegas Modern Dentistry", connection: "Pending Confirmation", action: "Resend Link" },
    { id: 109, name: "Hello test office", connection: "Connected", action: "Hold" },
    { id: 110, name: "Sedona Ranch Dental & Orthodontics", connection: "Connected", action: "Hold" },
    { id: 111, name: "Crowne Dental", connection: "Connected", action: "Hold" },
    { id: 112, name: "4M Dental Implants", connection: "Connected", action: "Hold" },
    { id: 113, name: "Green Valley Modern Dentistry", connection: "Pending Confirmation", action: "Resend Link" },
    { id: 114, name: "Green Valley Modern Dentistry", connection: "Connected", action: "Hold" },
    { id: 115, name: "Dr. Nikki", connection: "Pending Confirmation", action: "Resend Link" },
    { id: 116, name: "Krupesh", connection: "Connected", action: "Hold" },
    { id: 117, name: "Krupesh testing on 7th feb", connection: "Connected", action: "Hold" },
    { id: 118, name: "Summit Dental", connection: "Connected", action: "Hold" },
    { id: 119, name: "Sunrise Dental Care", connection: "Connected", action: "Hold" },
    { id: 120, name: "Valley View Dental", connection: "Connected", action: "Hold" },
    { id: 121, name: "Westside Dental Group", connection: "Connected", action: "Hold" },
    { id: 122, name: "Windmill Dental", connection: "Connected", action: "Hold" },
    { id: 123, name: "Desert Breeze Dental", connection: "Connected", action: "Hold" },
    { id: 124, name: "Rainbow Dental Care", connection: "Connected", action: "Hold" },
    { id: 125, name: "Spring Mountain Dental", connection: "Connected", action: "Hold" },
  ]

  // Pagination state
  const [leftCurrentPage, setLeftCurrentPage] = useState(1)
  const [rightCurrentPage, setRightCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  const [isLoading, setIsLoading] = useState(false)

  // Displayed data (paginated)
  const [leftOffices, setLeftOffices] = useState<Office[]>([])
  const [rightOffices, setRightOffices] = useState<Office[]>([])

  // State to track hovered row
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalActionType, setModalActionType] = useState<"hold" | "resend">("hold")
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null)

  // Calculate total pages
  const leftTotalPages = Math.ceil(allLeftOffices.length / itemsPerPage)
  const rightTotalPages = Math.ceil(allRightOffices.length / itemsPerPage)

  // Check if we're showing all records on the current page
  const isShowingAllLeftRecords = allLeftOffices.length <= itemsPerPage || leftCurrentPage === leftTotalPages

  const isShowingAllRightRecords = allRightOffices.length <= itemsPerPage || rightCurrentPage === rightTotalPages

  // Load data with simulated delay (lazy loading)
  const loadData = useCallback(
    (page: number, dataSource: Office[], setData: React.Dispatch<React.SetStateAction<Office[]>>) => {
      setIsLoading(true)

      // Simulate network delay
      setTimeout(() => {
        const startIndex = (page - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        const paginatedData = dataSource.slice(startIndex, endIndex)
        setData(paginatedData)
        setIsLoading(false)
      }, 300)
    },
    [itemsPerPage],
  )

  // Handle page changes
  const handleLeftPageChange = (page: number) => {
    if (page < 1 || page > leftTotalPages) return
    setLeftCurrentPage(page)
    loadData(page, allLeftOffices, setLeftOffices)
  }

  const handleRightPageChange = (page: number) => {
    if (page < 1 || page > rightTotalPages) return
    setRightCurrentPage(page)
    loadData(page, allRightOffices, setRightOffices)
  }

  // Handle action button clicks
  const handleActionClick = (office: Office) => {
    setSelectedOffice(office)
    setModalActionType(office.action === "Hold" ? "hold" : "resend")
    setIsModalOpen(true)
  }

  // Initial data load
  useEffect(() => {
    loadData(leftCurrentPage, allLeftOffices, setLeftOffices)
    loadData(rightCurrentPage, allRightOffices, setRightOffices)
  }, [loadData, leftCurrentPage, rightCurrentPage]) // Fixed dependencies

  // Pagination controls component
  const PaginationControls = ({
    currentPage,
    totalPages,
    onPageChange,
    isShowingAllRecords,
  }: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    isShowingAllRecords: boolean
  }) => (
    <div className="flex items-center justify-between px-2 py-2 border-t border-gray-200 bg-gray-50">
      <div className="flex-1 flex justify-between sm:hidden">
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(
                currentPage * itemsPerPage,
                currentPage === totalPages
                  ? (currentPage - 1) * itemsPerPage + (currentPage === 1 ? leftOffices.length : rightOffices.length)
                  : currentPage * itemsPerPage,
              )}
            </span>{" "}
            of <span className="font-medium">{currentPage === 1 ? allLeftOffices.length : allRightOffices.length}</span>{" "}
            results
          </p>
        </div>
        {!isShowingAllRecords && (
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <Button
                variant="outline"
                size="icon"
                className="rounded-l-md h-7 w-7 p-0"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">First</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 p-0"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum: number

                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <Button
                    key={i}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="icon"
                    className={cn("h-7 w-7 p-0", currentPage === pageNum ? "bg-blue-600 text-white" : "")}
                    onClick={() => onPageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}

              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 p-0"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-r-md h-7 w-7 p-0"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">Last</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover-lift transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="gradient-blue text-white">
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">
                    Office Name
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">
                    Connection
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className={cn("bg-white divide-y divide-gray-200", isLoading ? "opacity-60" : "")}>
                {isLoading && leftCurrentPage === 1
                  ? // Skeleton loading state
                    Array.from({ length: itemsPerPage }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="animate-pulse">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="h-6 bg-gray-200 rounded w-16"></div>
                        </td>
                      </tr>
                    ))
                  : leftOffices.map((office) => (
                      <tr
                        key={office.id}
                        className={cn(
                          "transition-all duration-150 ease-in-out",
                          hoveredRowId === office.id ? "bg-blue-50" : "hover:bg-gray-50",
                        )}
                        onMouseEnter={() => setHoveredRowId(office.id)}
                        onMouseLeave={() => setHoveredRowId(null)}
                      >
                        <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-blue-600 hover:text-blue-800">
                          <a href="#" className="hover:underline">
                            {office.name}
                          </a>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs">
                          {office.connection === "Connected" ? (
                            <div className="flex items-center">
                              <span>Connected</span>
                              <CheckCircle className="ml-1 h-4 w-4 text-green-500 animate-pulse-subtle" />
                            </div>
                          ) : (
                            <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 shadow-sm">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs">
                          {office.action === "Hold" ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="bg-red-500 hover:bg-red-600 text-white font-medium rounded shadow-sm h-7 px-2 text-xs transition-all duration-200"
                              onClick={() => handleActionClick(office)}
                            >
                              Hold
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-blue-500 text-blue-500 hover:bg-blue-50 font-medium rounded shadow-sm h-7 px-2 text-xs transition-all duration-200"
                              onClick={() => handleActionClick(office)}
                            >
                              Resend
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={leftCurrentPage}
            totalPages={leftTotalPages}
            onPageChange={handleLeftPageChange}
            isShowingAllRecords={isShowingAllLeftRecords}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover-lift transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="gradient-blue text-white">
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">
                    Office Name
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">
                    Connection
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className={cn("bg-white divide-y divide-gray-200", isLoading ? "opacity-60" : "")}>
                {isLoading && rightCurrentPage === 1
                  ? // Skeleton loading state
                    Array.from({ length: itemsPerPage }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="animate-pulse">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="h-6 bg-gray-200 rounded w-16"></div>
                        </td>
                      </tr>
                    ))
                  : rightOffices.map((office) => (
                      <tr
                        key={office.id}
                        className={cn(
                          "transition-all duration-150 ease-in-out",
                          hoveredRowId === office.id ? "bg-blue-50" : "hover:bg-gray-50",
                        )}
                        onMouseEnter={() => setHoveredRowId(office.id)}
                        onMouseLeave={() => setHoveredRowId(null)}
                      >
                        <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-blue-600 hover:text-blue-800">
                          <a href="#" className="hover:underline">
                            {office.name}
                          </a>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs">
                          {office.connection === "Connected" ? (
                            <div className="flex items-center">
                              <span>Connected</span>
                              <CheckCircle className="ml-1 h-4 w-4 text-green-500 animate-pulse-subtle" />
                            </div>
                          ) : (
                            <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200 shadow-sm">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs">
                          {office.action === "Hold" ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="bg-red-500 hover:bg-red-600 text-white font-medium rounded shadow-sm h-7 px-2 text-xs transition-all duration-200"
                              onClick={() => handleActionClick(office)}
                            >
                              Hold
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-blue-500 text-blue-500 hover:bg-blue-50 font-medium rounded shadow-sm h-7 px-2 text-xs transition-all duration-200"
                              onClick={() => handleActionClick(office)}
                            >
                              Resend
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={rightCurrentPage}
            totalPages={rightTotalPages}
            onPageChange={handleRightPageChange}
            isShowingAllRecords={isShowingAllRightRecords}
          />
        </div>
      </div>

      {/* Action Modal */}
      {selectedOffice && (
        <ActionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          actionType={modalActionType}
          officeName={selectedOffice.name}
        />
      )}
    </>
  )
}
