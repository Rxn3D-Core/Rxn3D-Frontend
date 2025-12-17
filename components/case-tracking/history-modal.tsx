"use client"

import { useState, useEffect } from "react"
import { X, Search, Printer, Edit } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "react-i18next"
import { useCaseTracking, type CaseHistoryEntry } from "@/contexts/case-tracking-context"
import { ScrollArea } from "@/components/ui/scroll-area"

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  casePanId?: number
  casePanName?: string
  prefix?: string
}

export function HistoryModal({ isOpen, onClose, casePanId, casePanName, prefix }: HistoryModalProps) {
  const { t } = useTranslation()
  const { fetchHistory } = useCaseTracking()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterAction, setFilterAction] = useState("all")
  const [history, setHistory] = useState<CaseHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Mock history data
  const mockHistory: CaseHistoryEntry[] = [
    {
      id: 1,
      date: "2025-11-12 10:35",
      user: "Samuel Lee",
      action: "Reprint Triggered",
      details: "7 slips auto-queued (Prefix R → H)",
    },
    {
      id: 2,
      date: "2025-11-11 14:23",
      user: "Samuel Lee",
      action: "Prefix changed",
      details: "from R → H, Auto-updated 17 cases",
    },
    {
      id: 3,
      date: "2025-11-10 09:15",
      user: "Henry Diaz",
      action: "QTY updated",
      details: "200 → 200",
    },
    {
      id: 4,
      date: "2025-11-09 16:42",
      user: "System",
      action: "Code generated",
      details: "R07 assigned to Case #112",
    },
    {
      id: 5,
      date: "2025-11-09 14:20",
      user: "Sarah Johnson",
      action: "Reprint Triggered",
      details: "3 slips reprinted (Color update)",
    },
    {
      id: 6,
      date: "2025-11-08 11:30",
      user: "Sarah Johnson",
      action: "Color updated",
      details: "Changed to #E53935",
    },
    {
      id: 7,
      date: "2025-11-07 08:00",
      user: "Sarah Johnson",
      action: "Group created",
      details: "Initial setup with 200 capacity",
    },
    {
      id: 8,
      date: "2025-11-06 13:20",
      user: "System",
      action: "Code generated",
      details: "R06 assigned to Case #098",
    },
    {
      id: 9,
      date: "2025-11-05 10:45",
      user: "Mike Chen",
      action: "Linked categories updated",
      details: "Added: Crown & Bridge, Implants",
    },
    {
      id: 10,
      date: "2025-11-04 16:30",
      user: "Theodore Roseman",
      action: "Reprint Triggered",
      details: "12 slips reprinted (Rush group assignment)",
    },
  ]

  useEffect(() => {
    if (isOpen && casePanId) {
      loadHistory()
    }
  }, [isOpen, casePanId])

  const loadHistory = async () => {
    if (!casePanId) return
    setIsLoading(true)
    try {
      const data = await fetchHistory(casePanId)
      setHistory(data.length > 0 ? data : mockHistory)
    } catch (error) {
      setHistory(mockHistory)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredHistory = mockHistory.filter((entry) => {
    const matchesSearch =
      entry.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.details.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = filterAction === "all" || entry.action === filterAction

    return matchesSearch && matchesFilter
  })

  const getActionBadge = (action: string) => {
    const actionLower = action.toLowerCase()
    if (actionLower.includes("reprint")) {
      return <Printer className="h-4 w-4 text-blue-600" />
    } else if (actionLower.includes("created")) {
      return <span className="text-green-600">●</span>
    } else if (actionLower.includes("updated") || actionLower.includes("changed")) {
      return <Edit className="h-4 w-4 text-orange-600" />
    } else if (actionLower.includes("generated")) {
      return <span className="text-purple-600">●</span>
    }
    return <span className="text-gray-600">●</span>
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[900px] h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-medium flex items-center gap-2">
              <div className="bg-[#1162a8] text-white p-2 rounded">
                <Edit className="h-5 w-5" />
              </div>
              {t("caseTracking.history", "History")} – {casePanName || "Regular Cases"} ({prefix || "R"} Prefix)
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 border-b bg-gray-50">
          <p className="text-sm text-gray-600 mb-4">
            {t("caseTracking.historyDescription", "View all actions and changes made to this tracking group. Type a code (e.g., R08) to view code-level history.")}
          </p>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t("caseTracking.searchByUserActionOrCode", "Search by user, action, or specific code")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{filteredHistory.length} {t("caseTracking.entries", "entries")}</span>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("caseTracking.allActions", "All Actions")}</SelectItem>
                  <SelectItem value="Reprint Triggered">{t("caseTracking.reprintTriggered", "Reprint Triggered")}</SelectItem>
                  <SelectItem value="Prefix changed">{t("caseTracking.prefixChanged", "Prefix Changed")}</SelectItem>
                  <SelectItem value="QTY updated">{t("caseTracking.qtyUpdated", "QTY Updated")}</SelectItem>
                  <SelectItem value="Color updated">{t("caseTracking.colorUpdated", "Color Updated")}</SelectItem>
                  <SelectItem value="Code generated">{t("caseTracking.codeGenerated", "Code Generated")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4">
            <div className="border rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b font-medium text-sm">
                <div className="col-span-2">{t("caseTracking.date", "Date")}</div>
                <div className="col-span-2">{t("caseTracking.user", "User")}</div>
                <div className="col-span-3">{t("caseTracking.action", "Action")}</div>
                <div className="col-span-5">{t("caseTracking.details", "Details")}</div>
              </div>

              {/* Table Body */}
              {filteredHistory.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`grid grid-cols-12 gap-4 px-4 py-3 border-b last:border-b-0 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <div className="col-span-2 text-sm">{entry.date}</div>
                  <div className="col-span-2">
                    <Badge variant="outline" className="text-xs">
                      {entry.user}
                    </Badge>
                  </div>
                  <div className="col-span-3 flex items-center gap-2 text-sm">
                    {getActionBadge(entry.action)}
                    {entry.action}
                  </div>
                  <div className="col-span-5 text-sm text-gray-600">{entry.details}</div>
                </div>
              ))}

              {filteredHistory.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-500">
                  {t("caseTracking.noHistoryFound", "No history entries found matching your search")}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
