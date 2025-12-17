"use client"

import { useState } from "react"
import { Search, Plus, Settings2, Link as LinkIcon, Edit, Copy, Trash2, MoreVertical, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "react-i18next"
import { AddAbutmentModal, LinkAbutmentModal } from "@/components/advance-mode"

export default function AbutmentLibraryPage() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const [isAddAbutmentModalOpen, setIsAddAbutmentModalOpen] = useState(false)
  const [isLinkAbutmentModalOpen, setIsLinkAbutmentModalOpen] = useState(false)

  // Mock data based on the implant library structure
  const abutmentData = [
    { id: 1, brand: "Other", system: "-", platform: "-", size: "-", price: "-", status: "Active", hasCheckmark: true },
    { id: 2, brand: "BioHorizon", system: "External", platform: "-", size: "-", price: "-", status: "Active", hasCheckmark: false },
    { id: 3, brand: "BioHorizon", system: "Internal", platform: "-", size: "-", price: "-", status: "Active", hasCheckmark: false },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Page Title */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1162a8] rounded-lg">
            <Settings2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {t("advanceMode.abutmentLibrary.title", "Abutment Library")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("advanceMode.abutmentLibrary.description", "Manage abutment systems and types")}
            </p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{t("Show")}</span>
            <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
              <SelectTrigger className="w-20 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-700">{t("entries")}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <Button
              onClick={() => setIsAddAbutmentModalOpen(true)}
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("advanceMode.abutmentLibrary.addAbutments", "Add Abutments")}
            </Button>
            <Button
              onClick={() => setIsLinkAbutmentModalOpen(true)}
              className="bg-[#1162a8] hover:bg-[#0f5497] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              {t("advanceMode.abutmentLibrary.linkProduct", "Link Product")}
            </Button>

            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder={t("advanceMode.abutmentLibrary.searchFields", "Search Fields")}
                className="pl-10 h-10 w-full sm:w-64 text-sm border-gray-300 focus:border-[#1162a8] focus:ring-[#1162a8]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="relative">
        <div className="overflow-x-auto">
          <Table className="w-full text-xs">
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                <TableHead className="w-10 pl-4 py-2">
                  <Checkbox className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4" />
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                  <div className="flex items-center gap-1">
                    {t("Brand")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                  <div className="flex items-center gap-1">
                    {t("System")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                  <div className="flex items-center gap-1">
                    {t("Platform")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                  <div className="flex items-center gap-1">
                    {t("Size")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                  <div className="flex items-center gap-1">
                    {t("Price")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-900 py-2 px-2 cursor-pointer hover:text-[#1162a8] transition-colors">
                  <div className="flex items-center gap-1">
                    {t("Status")}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {abutmentData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      {t("advanceMode.abutmentLibrary.noData", "No Abutment Found")}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                abutmentData.map((item) => (
                  <TableRow key={item.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${item.id === 1 ? "bg-blue-50/30" : ""}`}>
                    <TableCell className="pl-4 py-2">
                      <Checkbox className="border-gray-300 data-[state=checked]:bg-[#1162a8] data-[state=checked]:border-[#1162a8] h-4 w-4" />
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{item.brand}</span>
                        {item.hasCheckmark && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                            <path d="M13.3332 8.66664C13.3332 12 10.9998 13.6666 8.2265 14.6333C8.08128 14.6825 7.92353 14.6802 7.77984 14.6266C4.99984 13.6666 2.6665 12 2.6665 8.66664V3.99997C2.6665 3.82316 2.73674 3.65359 2.86177 3.52857C2.98679 3.40355 3.15636 3.33331 3.33317 3.33331C4.6665 3.33331 6.33317 2.53331 7.49317 1.51997C7.63441 1.39931 7.81407 1.33301 7.99984 1.33301C8.1856 1.33301 8.36527 1.39931 8.5065 1.51997C9.67317 2.53997 11.3332 3.33331 12.6665 3.33331C12.8433 3.33331 13.0129 3.40355 13.1379 3.52857C13.2629 3.65359 13.3332 3.82316 13.3332 3.99997V8.66664Z" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 8.00033L7.33333 9.33366L10 6.66699" stroke="#34C759" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-xs">{item.system}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-xs">{item.platform}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-xs">{item.size}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <span className="text-xs">{item.price}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-5 rounded-full ${item.status === "Active" ? "bg-blue-600" : "bg-gray-300"} relative cursor-pointer`}>
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${item.status === "Active" ? "right-0.5" : "left-0.5"}`}></div>
                        </div>
                        <span className="text-xs">{item.status}</span>
                        <div className="flex items-center gap-1 ml-2">
                          <button className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5">
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button className="text-gray-400 hover:text-[#1162a8] transition-colors p-0.5">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button className="text-gray-400 hover:text-red-600 transition-colors p-0.5">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button className="text-gray-400 hover:text-gray-600 transition-colors p-0.5">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          {t("Showing")} 1 {t("to")} 10 {t("of")} 30 {t("entries")}
        </div>
        <div className="flex items-center space-x-1">
          <button className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            «
          </button>
          <button className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-[#1162a8] text-white">
            1
          </button>
          <button className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 hover:bg-gray-200">
            2
          </button>
          <button className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 hover:bg-gray-200">
            3
          </button>
          <button className="h-8 w-8 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            »
          </button>
        </div>
      </div>

      {/* Add Abutment Modal */}
      <AddAbutmentModal
        isOpen={isAddAbutmentModalOpen}
        onClose={() => setIsAddAbutmentModalOpen(false)}
        onSave={(data) => {
          console.log("Abutment data:", data)
          // Handle abutment creation here
        }}
      />

      {/* Link Abutment Modal */}
      <LinkAbutmentModal
        isOpen={isLinkAbutmentModalOpen}
        onClose={() => setIsLinkAbutmentModalOpen(false)}
        context="global"
        onApply={(selectedAbutments, selectedProducts) => {
          console.log("Selected abutments:", selectedAbutments)
          console.log("Selected products:", selectedProducts)
          // Handle abutment linking here
        }}
      />
    </div>
  )
}
