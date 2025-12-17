"use client"

import { useState, useEffect } from "react"
import { X, Printer } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "react-i18next"
import { useCaseTracking, type ReprintCase } from "@/contexts/case-tracking-context"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ReprintSlipsModalProps {
  isOpen: boolean
  onClose: () => void
  casePanId?: number
  casePanName?: string
  prefix?: string
}

export function ReprintSlipsModal({ isOpen, onClose, casePanId, casePanName, prefix }: ReprintSlipsModalProps) {
  const { t } = useTranslation()
  const { fetchReprintCases, printUpdatedSlips } = useCaseTracking()

  const [selectedCases, setSelectedCases] = useState<string[]>([])
  const [cases, setCases] = useState<ReprintCase[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Mock reprint cases data
  const mockReprintCases: ReprintCase[] = [
    {
      id: "1",
      caseId: "C-2025-041",
      patient: "Samantha Cruz",
      previousCode: "B07",
      currentCode: "RA7",
      status: "Receiving",
      reason: "Prefix Change",
      needsReprint: true,
    },
    {
      id: "2",
      caseId: "C-2025-043",
      patient: "James Sy",
      previousCode: "B09",
      currentCode: "B09",
      status: "Delivered",
      reason: "No change needed",
      needsReprint: false,
    },
    {
      id: "3",
      caseId: "C-2025-050",
      patient: "Analyn Mercado",
      previousCode: "B11",
      currentCode: "RB1",
      status: "On Route",
      reason: "Prefix Change",
      needsReprint: true,
    },
    {
      id: "4",
      caseId: "C-2025-052",
      patient: "Memphis Uy",
      previousCode: "B14",
      currentCode: "RC4",
      status: "In Production",
      reason: "Rush Assignment Update",
      needsReprint: true,
    },
    {
      id: "5",
      caseId: "C-2025-055",
      patient: "Sylvana jones",
      previousCode: "B16",
      currentCode: "RD6",
      status: "Receiving",
      reason: "Color Change",
      needsReprint: true,
    },
    {
      id: "6",
      caseId: "C-2025-058",
      patient: "Angel Smith",
      previousCode: "B19",
      currentCode: "RE9",
      status: "Receiving",
      reason: "Group Name Change",
      needsReprint: true,
    },
    {
      id: "7",
      caseId: "C-2025-061",
      patient: "Jack Anderson",
      previousCode: "B22",
      currentCode: "RF2",
      status: "In Production",
      reason: "Prefix Change",
      needsReprint: true,
    },
    {
      id: "8",
      caseId: "C-2025-062",
      patient: "Andrea Taytay",
      previousCode: "B23",
      currentCode: "B23",
      status: "Delivered",
      reason: "Already delivered",
      needsReprint: false,
    },
  ]

  useEffect(() => {
    if (isOpen && casePanId) {
      loadReprintCases()
    }
  }, [isOpen, casePanId])

  const loadReprintCases = async () => {
    if (!casePanId) return
    setIsLoading(true)
    try {
      const data = await fetchReprintCases(casePanId)
      setCases(data.length > 0 ? data : mockReprintCases)
      // Auto-select cases that need reprint
      const autoSelect = (data.length > 0 ? data : mockReprintCases)
        .filter((c) => c.needsReprint)
        .map((c) => c.id)
      setSelectedCases(autoSelect)
    } catch (error) {
      setCases(mockReprintCases)
      setSelectedCases(mockReprintCases.filter((c) => c.needsReprint).map((c) => c.id))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAll = () => {
    const reprintableCases = mockReprintCases.filter((c) => c.needsReprint)
    if (selectedCases.length === reprintableCases.length) {
      setSelectedCases([])
    } else {
      setSelectedCases(reprintableCases.map((c) => c.id))
    }
  }

  const handleClearAll = () => {
    setSelectedCases([])
  }

  const handleToggleCase = (caseId: string) => {
    setSelectedCases((prev) =>
      prev.includes(caseId) ? prev.filter((id) => id !== caseId) : [...prev, caseId]
    )
  }

  const handlePrintSlips = async () => {
    await printUpdatedSlips(selectedCases)
    onClose()
  }

  const needsReprintCount = mockReprintCases.filter((c) => c.needsReprint).length
  const totalCount = mockReprintCases.length

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      Receiving: { bg: "bg-blue-100", text: "text-blue-700" },
      "On Route": { bg: "bg-yellow-100", text: "text-yellow-700" },
      "In Production": { bg: "bg-purple-100", text: "text-purple-700" },
      Delivered: { bg: "bg-gray-100", text: "text-gray-700" },
    }
    const style = statusMap[status] || { bg: "bg-gray-100", text: "text-gray-700" }
    return (
      <Badge className={`${style.bg} ${style.text} border-0`}>
        {status}
      </Badge>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1000px] h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-medium flex items-center gap-2">
              <div className="bg-[#1162a8] text-white p-2 rounded">
                <Printer className="h-5 w-5" />
              </div>
              {t("caseTracking.reprintUpdatedSlips", "Reprint Updated Slips")} – {casePanName || "Regular Cases"} ({prefix || "R"})
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 border-b bg-gray-50">
          <p className="text-sm text-gray-600 mb-4">
            {t("caseTracking.reprintDescription", "Review cases affected by recent updates and select which slips need to be reprinted.")}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {t("caseTracking.selectAllNeeded", "Select All Needed")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                {t("caseTracking.clearAll", "Clear All")}
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                {needsReprintCount} of {totalCount} active cases require updated paper slips.
              </Badge>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4">
            <div className="border rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b font-medium text-sm">
                <div className="col-span-1 flex items-center justify-center">
                  <Checkbox
                    checked={selectedCases.length === needsReprintCount && needsReprintCount > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </div>
                <div className="col-span-2">{t("caseTracking.caseId", "Case ID")}</div>
                <div className="col-span-2">{t("caseTracking.patient", "Patient")}</div>
                <div className="col-span-2">{t("caseTracking.previousCode", "Previous Code")}</div>
                <div className="col-span-2">{t("caseTracking.currentCode", "Current Code")}</div>
                <div className="col-span-2">{t("caseTracking.status", "Status")}</div>
                <div className="col-span-1 text-center">{t("caseTracking.needsReprint", "Needs Reprint")}</div>
              </div>

              {/* Table Body */}
              {mockReprintCases.map((caseItem, index) => (
                <div
                  key={caseItem.id}
                  className={`grid grid-cols-12 gap-4 px-4 py-3 border-b last:border-b-0 items-center ${
                    index % 2 === 0 ? "bg-white" : "bg-blue-50"
                  } ${!caseItem.needsReprint ? "opacity-50" : ""}`}
                >
                  <div className="col-span-1 flex items-center justify-center">
                    <Checkbox
                      checked={selectedCases.includes(caseItem.id)}
                      disabled={!caseItem.needsReprint}
                      onCheckedChange={() => handleToggleCase(caseItem.id)}
                    />
                  </div>
                  <div className="col-span-2 text-sm font-medium">{caseItem.caseId}</div>
                  <div className="col-span-2 text-sm">{caseItem.patient}</div>
                  <div className="col-span-2">
                    <Badge variant="outline" className="text-xs">
                      {caseItem.previousCode}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                      {caseItem.currentCode}
                    </Badge>
                  </div>
                  <div className="col-span-2">{getStatusBadge(caseItem.status)}</div>
                  <div className="col-span-1 flex justify-center">
                    {caseItem.needsReprint ? (
                      <span className="text-green-600 text-xl">✓</span>
                    ) : (
                      <span className="text-gray-400 text-xl">✕</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t("caseTracking.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handlePrintSlips}
            disabled={selectedCases.length === 0}
            className="bg-[#1162a8] hover:bg-[#0f5490]"
          >
            <Printer className="h-4 w-4 mr-2" />
            {t("caseTracking.printUpdatedSlips", "Print updated slips")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
