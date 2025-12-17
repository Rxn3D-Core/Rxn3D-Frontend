"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar, Filter, Columns, MoreVertical, Paperclip, ChevronDown, Check, Trash2, Eye, Copy, Phone, Printer, Download, Plus, X } from "lucide-react"

// Dummy data
const dummySlips = [
  {
    id: 1,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-blue-700",
    officeCode: "SRD",
    patient: "Maria Pavlova",
    product: "SFN-IFD",
    status: "In Progress",
    rush: true,
    location: "In office ready to pick up",
    attachment: true,
    dueDate: "02/10",
    overdue: false,
  },
  {
    id: 2,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-red-700",
    officeCode: "SRD",
    patient: "Maria Pavlova",
    product: "AOT",
    status: "In Progress",
    rush: false,
    location: "In office ready to pick up",
    attachment: true,
    dueDate: "02/10",
    overdue: true,
  },
  {
    id: 3,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-blue-700",
    officeCode: "SRD",
    patient: "Maria Pavlova",
    product: "MFA-BB/MFA-BB",
    status: "In Progress",
    rush: false,
    location: "In office ready to pick up",
    attachment: true,
    dueDate: "02/15",
    overdue: false,
  },
  {
    id: 4,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-blue-700",
    officeCode: "RDS",
    patient: "Christina Perri",
    product: "FD-BB",
    status: "On Hold",
    rush: false,
    location: "In office ready to pick up",
    attachment: true,
    dueDate: "02/10",
    overdue: false,
  },
  {
    id: 5,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-red-700",
    officeCode: "CRD",
    patient: "Matt Damon",
    product: "CRN-FN",
    status: "Cancelled",
    rush: true,
    location: "In office ready to pick up",
    attachment: false,
    dueDate: "02/10",
    overdue: false,
  },
  {
    id: 6,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-blue-700",
    officeCode: "RDS",
    patient: "Angelica Panganiban",
    product: "FD-BB",
    status: "On Hold",
    rush: false,
    location: "In office ready to pick up",
    attachment: true,
    dueDate: "02/10",
    overdue: false,
  },
  {
    id: 7,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-red-700",
    officeCode: "CRD",
    patient: "Cynthia Gutierrez",
    product: "CRN-FN",
    status: "Cancelled",
    rush: true,
    location: "In office ready to pick up",
    attachment: false,
    dueDate: "02/10",
    overdue: false,
  },
  {
    id: 8,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-blue-700",
    officeCode: "RDS",
    patient: "Greciaa Pascual",
    product: "FD-BB",
    status: "On Hold",
    rush: false,
    location: "On route to the office",
    attachment: true,
    dueDate: "02/10",
    overdue: false,
  },
  {
    id: 9,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-red-700",
    officeCode: "SRD",
    patient: "Anthony Bylon",
    product: "AOT",
    status: "In Progress",
    rush: false,
    location: "In office ready to pick up",
    attachment: true,
    dueDate: "02/10",
    overdue: false,
  },
  {
    id: 10,
    createdAt: "01/23/25 @ 1:23 pm",
    pan: "----",
    panColor: "bg-blue-700",
    officeCode: "SRD",
    patient: "Mark Washington",
    product: "MFA-BB/MFA-BB",
    status: "In Progress",
    rush: false,
    location: "On route to the office",
    attachment: true,
    dueDate: "02/15",
    overdue: false,
  },
]

const allOffices = Array.from(new Set(dummySlips.map((s) => s.officeCode)))
const allStatuses = Array.from(new Set(dummySlips.map((s) => s.status)))
const allLocations = Array.from(new Set(dummySlips.map((s) => s.location)))

export default function SlipPage() {
  const [search, setSearch] = useState("")
  const [office, setOffice] = useState("All")
  const [status, setStatus] = useState("All")
  const [location, setLocation] = useState("All")
  const [showWithAttachments, setShowWithAttachments] = useState(false)
  const [showLabConnect, setShowLabConnect] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showColumnsDialog, setShowColumnsDialog] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    timestamp: true,
    office: true,
    patient: true,
    pan: true,
    product: true,
    status: true,
    location: true,
    attachment: true,
    due: true,
    actions: true,
  })
  const [selected, setSelected] = useState<number[]>([])
  const [menuRow, setMenuRow] = useState<number | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState<number | null>(null)

  // Filtering
  const filteredSlips = useMemo(() => {
    let result = dummySlips
    if (search) result = result.filter((s) =>
      s.patient.toLowerCase().includes(search.toLowerCase())
      || s.officeCode.toLowerCase().includes(search.toLowerCase())
      || s.product.toLowerCase().includes(search.toLowerCase())
    )
    if (office !== "All") result = result.filter((s) => s.officeCode === office)
    if (status !== "All") result = result.filter((s) => s.status === status)
    if (location !== "All") result = result.filter((s) => s.location === location)
    if (showWithAttachments) result = result.filter((s) => s.attachment)
    return result
  }, [search, office, status, location, showWithAttachments])

  // Paging
  const maxPage = Math.ceil(filteredSlips.length / itemsPerPage)
  const slipsPage = filteredSlips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const allOnPageSelected = slipsPage.length && slipsPage.every((s) => selected.includes(s.id))
  const someOnPageSelected = slipsPage.some((s) => selected.includes(s.id))

  const handleSelectAllPage = () => {
    if (allOnPageSelected) {
      setSelected(selected.filter((id) => !slipsPage.map((s) => s.id).includes(id)))
    } else {
      setSelected([...selected, ...slipsPage.filter((s) => !selected.includes(s.id)).map((s) => s.id)])
    }
  }

  const handleColumnChange = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Archive Confirm
  const handleArchive = (id: number) => {
    setArchiveConfirm(id)
    setMenuRow(null)
  }
  const closeArchive = () => setArchiveConfirm(null)
  const confirmArchive = () => {
    // Implement deletion or archiving logic here
    closeArchive()
  }

  return (
    <div className="w-full p-6 space-y-4 bg-gray-50 min-h-screen">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center mb-4 rounded-lg bg-white shadow-sm px-4 py-3">
        <Input
          className="w-72 bg-white border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
          placeholder="Search by patient, office, doctor, case..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={office} onValueChange={setOffice}>
          <SelectTrigger className="w-40 bg-white border-gray-300">
            <SelectValue placeholder="All offices" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All offices</SelectItem>
            {allOffices.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 bg-white border-gray-300">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All status</SelectItem>
            {allStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="w-40 bg-white border-gray-300">
            <SelectValue placeholder="All location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All location</SelectItem>
            {allLocations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" className="flex items-center gap-2 text-gray-700 border-gray-300" onClick={() => setShowColumnsDialog(true)}>
          <Columns className="h-4 w-4" /> Columns
        </Button>
        <Button variant="outline" className="flex items-center gap-2 text-gray-700 border-gray-300">
          <Filter className="h-4 w-4" /> Advance Filter
        </Button>
        <div className="flex items-center gap-4 ml-2">
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <Checkbox checked={showWithAttachments} onCheckedChange={setShowWithAttachments} className="border-blue-400" />
            With attachments
          </label>
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <Checkbox checked={showLabConnect} onCheckedChange={setShowLabConnect} className="border-blue-400" />
            Lab Connect only
          </label>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selected.length > 0 && (
        <div className="sticky top-20 z-20 flex flex-wrap gap-2 items-center px-4 py-3 mb-2 rounded-lg bg-blue-50 border border-blue-200 animate-fade-in">
          <span className="font-semibold text-blue-700 mr-3">Bulk actions:</span>
          <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100"><Check className="h-4 w-4" />Pick up</Button>
          <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100"><Printer className="h-4 w-4" />Print Driver label</Button>
          <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100"><Printer className="h-4 w-4" />Print Paper slip</Button>
          <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100"><Printer className="h-4 w-4" />Print Statement</Button>
          <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100"><Plus className="h-4 w-4" />Send back to office</Button>
          <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100"><ChevronDown className="h-4 w-4" />Rush case</Button>
          <Button variant="ghost" size="sm" className="flex gap-1 text-red-600 hover:bg-red-50" onClick={() => setArchiveConfirm(-1)}><Trash2 className="h-4 w-4" />Archive case</Button>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 w-12">
                <Checkbox
                  checked={allOnPageSelected}
                  indeterminate={!allOnPageSelected && someOnPageSelected}
                  onCheckedChange={handleSelectAllPage}
                  aria-label="Select all"
                  className="border-gray-400"
                />
              </th>
              {visibleColumns.timestamp && <th className="px-4 py-3 text-left font-medium text-gray-700">Timestamp</th>}
              {visibleColumns.office && <th className="px-4 py-3 text-left font-medium text-gray-700">Office Code</th>}
              {visibleColumns.patient && <th className="px-4 py-3 text-left font-medium text-gray-700">Patient</th>}
              {visibleColumns.pan && <th className="px-4 py-3 text-left font-medium text-gray-700">Pan</th>}
              {visibleColumns.product && <th className="px-4 py-3 text-left font-medium text-gray-700">Product</th>}
              {visibleColumns.status && <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>}
              {visibleColumns.location && <th className="px-4 py-3 text-left font-medium text-gray-700">Location</th>}
              {visibleColumns.attachment && <th className="px-4 py-3 text-left font-medium text-gray-700">Attachment</th>}
              {visibleColumns.due && <th className="px-4 py-3 text-left font-medium text-gray-700">Due date</th>}
              {visibleColumns.actions && <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {slipsPage.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-gray-500">
                  No slips found for selected filters.
                </td>
              </tr>
            ) : (
              slipsPage.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`transition-all duration-150 ${selected.includes(row.id)
                    ? "bg-blue-50 border-l-4 border-blue-500"
                    : "hover:bg-gray-50"}`}
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected.includes(row.id)}
                      onCheckedChange={() =>
                        setSelected(selected.includes(row.id)
                          ? selected.filter(id => id !== row.id)
                          : [...selected, row.id])
                      }
                      className="border-gray-400"
                    />
                  </td>
                  {visibleColumns.timestamp && <td className="px-4 py-3 whitespace-nowrap text-gray-600">   <span className="inline-flex items-center gap-2 text-black">
                    <svg width="22" height="23" viewBox="0 0 22 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8.21875 3.70044H4.71875C3.75225 3.70044 2.96875 4.52125 2.96875 5.53377V9.20044C2.96875 10.213 3.75225 11.0338 4.71875 11.0338H8.21875C9.18525 11.0338 9.96875 10.213 9.96875 9.20044V5.53377C9.96875 4.52125 9.18525 3.70044 8.21875 3.70044Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6.46875 11.0337V14.7004C6.46875 15.1866 6.65312 15.6529 6.98131 15.9967C7.3095 16.3405 7.75462 16.5337 8.21875 16.5337H11.7188" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M16.9688 12.8672H13.4688C12.5023 12.8672 11.7188 13.688 11.7188 14.7005V18.3672C11.7188 19.3797 12.5023 20.2005 13.4688 20.2005H16.9688C17.9352 20.2005 18.7188 19.3797 18.7188 18.3672V14.7005C18.7188 13.688 17.9352 12.8672 16.9688 12.8672Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>

                    <span className="text-sm">{row.createdAt}</span>
                  </span>
                  </td>}
                  {visibleColumns.office && <td className="px-4 py-3 font-medium text-gray-900">{row.officeCode}</td>}
                  {visibleColumns.patient && <td className="px-4 py-3 text-gray-900">{row.patient}</td>}
                  {visibleColumns.pan &&
                    <td className="px-4 py-3">
                      <span className={`inline-block w-12 text-center py-1 rounded text-white font-mono text-xs ${row.panColor}`}>{row.pan}</span>
                    </td>}
                  {visibleColumns.product && <td className="px-4 py-3 text-gray-900">{row.product}</td>}
                  {visibleColumns.status &&
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        {row.rush && (
                          <Badge className="bg-red-600 text-white font-medium px-2 py-1 text-xs">
                            <svg width="12" height="14" viewBox="0 0 16 19" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                              <path d="M8.15625 7.91504V2.66504L2.53125 10.915H6.90625L6.90625 16.165L12.5313 7.91504L8.15625 7.91504Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Rush
                          </Badge>
                        )}
                        {row.status === "In Progress" && (
                          <Badge className="bg-green-100 text-green-800 border border-green-200 font-medium px-2 py-1 text-xs">In Progress</Badge>
                        )}
                        {row.status === "On Hold" && (
                          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200 font-medium px-2 py-1 text-xs">On Hold</Badge>
                        )}
                        {row.status === "Cancelled" && (
                          <Badge className="bg-gray-100 text-gray-600 border border-gray-200 font-medium px-2 py-1 text-xs">Cancelled</Badge>
                        )}
                      </div>
                    </td>}
                  {visibleColumns.location &&
                    <td className="px-4 py-3">
                      {row.location.includes("pick up") && (
                        <span className="inline-flex items-center gap-2 text-green-700">
                          <svg width="22" height="32" viewBox="0 0 22 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_4629_86001)">
                              <path d="M8.30094 7.06323H2.50094C1.51235 7.06323 0.710938 7.86464 0.710938 8.85323V15.8032C0.710938 16.7918 1.51235 17.5932 2.50094 17.5932H8.30094C9.28953 17.5932 10.0909 16.7918 10.0909 15.8032V8.85323C10.0909 7.86464 9.28953 7.06323 8.30094 7.06323Z" stroke="#119933" strokeMiterlimit="10" />
                              <path d="M5.40164 18.1333L1.68164 22.5233H9.13164L5.40164 18.1333Z" stroke="#119933" strokeMiterlimit="10" />
                              <path d="M5.40039 22.5232V31.3832" stroke="#119933" strokeMiterlimit="10" />
                              <path d="M17.7718 6.65321C19.2519 6.65321 20.4518 5.45334 20.4518 3.97321C20.4518 2.49309 19.2519 1.29321 17.7718 1.29321C16.2917 1.29321 15.0918 2.49309 15.0918 3.97321C15.0918 5.45334 16.2917 6.65321 17.7718 6.65321Z" stroke="#119933" strokeMiterlimit="10" />
                              <path d="M12.0504 14.7832L17.2004 8.82324H18.6804C19.0704 8.82324 19.4304 9.01324 19.6904 9.34324L20.3904 10.2432C20.6604 10.5932 20.8104 11.0232 20.8104 11.4632V18.9032L15.3504 24.9932V28.7332C15.3504 29.5032 15.1404 30.2732 14.6904 30.8632C14.6104 30.9632 14.5404 31.0432 14.4804 31.0832C14.2004 31.2632 13.4904 31.2232 13.1904 31.0832C13.1304 31.0532 13.0504 30.9932 12.9604 30.9132C12.4604 30.4332 12.2004 29.7132 12.2004 28.9732V25.2132L17.0504 19.1232L16.8604 14.1832L13.8704 17.7532H5.40039" stroke="#119933" strokeMiterlimit="10" />
                              <path d="M21.2214 21.1633V28.3733C21.2214 29.1433 21.0514 29.9133 20.6914 30.5033C20.6314 30.6033 20.5714 30.6833 20.5214 30.7233C20.3014 30.9033 19.7214 30.8633 19.4814 30.7233C19.4314 30.6933 19.3714 30.6333 19.3014 30.5533C18.9014 30.0733 18.6914 29.3533 18.6914 28.6133V24.8533" stroke="#119933" strokeMiterlimit="10" />
                            </g>
                            <defs>
                              <clipPath id="clip0_4629_86001">
                                <rect width="21.51" height="30.91" fill="white" transform="translate(0.210938 0.793213)" />
                              </clipPath>
                            </defs>
                          </svg>

                          <span className="text-sm">{row.location}</span>
                        </span>
                      )}
                      {row.location.includes("route") && (
                        <span className="inline-flex items-center gap-2 text-red-600">
                          <svg width="23" height="32" viewBox="0 0 23 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8.84977 18.0735H3.04977C2.06118 18.0735 1.25977 18.8749 1.25977 19.8635V26.8135C1.25977 27.8021 2.06118 28.6035 3.04977 28.6035H8.84977C9.83836 28.6035 10.6398 27.8021 10.6398 26.8135V19.8635C10.6398 18.8749 9.83836 18.0735 8.84977 18.0735Z" stroke="#CF0202" strokeMiterlimit="10" />
                            <path d="M5.95383 17.3179L9.67383 12.9279L2.22383 12.9279L5.95383 17.3179Z" stroke="#CF0202" strokeMiterlimit="10" />
                            <path d="M5.95312 12.928L5.95312 4.06798" stroke="#CF0202" strokeMiterlimit="10" />
                            <path d="M18.3206 6.74794C19.8007 6.74794 21.0006 5.54806 21.0006 4.06794C21.0006 2.58782 19.8007 1.38794 18.3206 1.38794C16.8405 1.38794 15.6406 2.58782 15.6406 4.06794C15.6406 5.54806 16.8405 6.74794 18.3206 6.74794Z" stroke="#CF0202" strokeMiterlimit="10" />
                            <path d="M12.5992 14.878L17.7492 8.91797H19.2292C19.6192 8.91797 19.9792 9.10797 20.2392 9.43797L20.9392 10.338C21.2092 10.688 21.3592 11.118 21.3592 11.558V18.998L15.8992 25.088V28.828C15.8992 29.598 15.6892 30.368 15.2392 30.958C15.1592 31.058 15.0892 31.138 15.0292 31.178C14.7492 31.358 14.0392 31.318 13.7392 31.178C13.6792 31.148 13.5992 31.088 13.5092 31.008C13.0092 30.528 12.7492 29.808 12.7492 29.068V25.308L17.5992 19.218L17.4092 14.278L14.4192 17.848H5.94922" stroke="#CF0202" strokeMiterlimit="10" />
                            <path d="M21.7702 21.2581V28.4681C21.7702 29.2381 21.6002 30.0081 21.2402 30.5981C21.1802 30.6981 21.1202 30.7781 21.0702 30.8181C20.8502 30.9981 20.2702 30.9581 20.0302 30.8181C19.9802 30.7881 19.9202 30.7281 19.8502 30.6481C19.4502 30.1681 19.2402 29.4481 19.2402 28.7081V24.9481" stroke="#CF0202" strokeMiterlimit="10" />
                          </svg>

                          <span className="text-sm">{row.location}</span>
                        </span>
                      )}
                    </td>}
                  {visibleColumns.attachment &&
                    <td className="px-4 py-3 text-center">
                      {row.attachment
                        ? <Paperclip className="h-4 w-4 text-blue-600 inline-block" />
                        : <Paperclip className="h-4 w-4 text-gray-300 inline-block" />}
                    </td>}
                  {visibleColumns.due &&
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2">
                        <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.12109 2.55518V4.24268M12.9961 2.55518V4.24268M2.30859 14.3677V5.93018C2.30859 5.48262 2.48638 5.0534 2.80285 4.73693C3.11932 4.42047 3.54854 4.24268 3.99609 4.24268H14.1211C14.5686 4.24268 14.9979 4.42047 15.3143 4.73693C15.6308 5.0534 15.8086 5.48262 15.8086 5.93018V14.3677M2.30859 14.3677C2.30859 14.8152 2.48638 15.2445 2.80285 15.5609C3.11932 15.8774 3.54854 16.0552 3.99609 16.0552H14.1211C14.5686 16.0552 14.9979 15.8774 15.3143 15.5609C15.6308 15.2445 15.8086 14.8152 15.8086 14.3677M2.30859 14.3677V8.74268C2.30859 8.29512 2.48638 7.8659 2.80285 7.54943C3.11932 7.23297 3.54854 7.05518 3.99609 7.05518H14.1211C14.5686 7.05518 14.9979 7.23297 15.3143 7.54943C15.6308 7.8659 15.8086 8.29512 15.8086 8.74268V14.3677M9.05859 9.86768H9.06459V9.87368H9.05859V9.86768ZM9.05859 11.5552H9.06459V11.5612H9.05859V11.5552ZM9.05859 13.2427H9.06459V13.2487H9.05859V13.2427ZM7.37109 11.5552H7.37709V11.5612H7.37109V11.5552ZM7.37109 13.2427H7.37709V13.2487H7.37109V13.2427ZM5.68359 11.5552H5.68959V11.5612H5.68359V11.5552ZM5.68359 13.2427H5.68959V13.2487H5.68359V13.2427ZM10.7461 9.86768H10.7521V9.87368H10.7461V9.86768ZM10.7461 11.5552H10.7521V11.5612H10.7461V11.5552ZM10.7461 13.2427H10.7521V13.2487H10.7461V13.2427ZM12.4336 9.86768H12.4396V9.87368H12.4336V9.86768ZM12.4336 11.5552H12.4396V11.5612H12.4336V11.5552Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>

                        <span className="text-gray-900">{row.dueDate}</span>
                        {row.rush && <span className="text-red-500">
                          <svg width="12" height="14" viewBox="0 0 16 19" fill="none">
                            <path d="M8.71094 8.41504V3.16504L3.08594 11.415H7.46094L7.46094 16.665L13.0859 8.41504L8.71094 8.41504Z" stroke="#CF0202" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>}
                        {row.overdue && <Badge className="bg-red-100 text-red-700 text-xs px-2 py-1">Overdue</Badge>}
                      </div>
                    </td>}
                  {visibleColumns.actions &&
                    <td className="px-4 py-3">
                      <Popover open={menuRow === row.id} onOpenChange={open => setMenuRow(open ? row.id : null)}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0 border border-gray-200 rounded-lg shadow-lg">
                          <div className="py-1 divide-y divide-gray-100">
                            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                              <Eye className="h-4 w-4" />View Case
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                              <Copy className="h-4 w-4" />Duplicate
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                              <Printer className="h-4 w-4" />Print Paper Slip
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-red-600 text-sm" onClick={() => handleArchive(row.id)}>
                              <Trash2 className="h-4 w-4" />Archive Case
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {(currentPage - 1) * itemsPerPage + 1}
          -
          {Math.min(currentPage * itemsPerPage, filteredSlips.length)}
          {" "}of {filteredSlips.length} entries
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-600 mr-2">Show</span>
          <Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1) }}>
            <SelectTrigger className="w-20 bg-white border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map(n => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600 ml-2 mr-4">entries</span>
          <Button variant="outline" size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="border-gray-300">
            Prev
          </Button>
          <span className="text-sm text-gray-600 mx-2">{currentPage} / {maxPage || 1}</span>
          <Button variant="outline" size="sm"
            onClick={() => setCurrentPage(Math.min(maxPage, currentPage + 1))}
            disabled={currentPage === maxPage}
            className="border-gray-300">
            Next
          </Button>
        </div>
      </div>

      {/* Columns Dialog */}
      <Dialog open={showColumnsDialog} onOpenChange={setShowColumnsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold text-gray-900">Show/Hide Columns</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowColumnsDialog(false)}
              className="h-6 w-6 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {Object.entries(visibleColumns).map(([key, val]) => {
              const labels = {
                timestamp: "Time Stamp",
                office: "Office Code",
                patient: "Patient",
                pan: "Pan",
                product: "Product",
                status: "Status",
                location: "Location",
                attachment: "Attachment",
                due: "Due Date",
                actions: "Actions"
              }
              const isRequired = key === 'actions'
              return (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={val}
                      onCheckedChange={() => handleColumnChange(key as keyof typeof visibleColumns)}
                      disabled={isRequired}
                      className="border-gray-400"
                    />
                    <span className="text-sm text-gray-700">{labels[key as keyof typeof labels]}</span>
                  </div>
                  {isRequired && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Required</span>
                  )}
                </label>
              )
            })}
            <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
              Settings saved automatically
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Archive Confirm Dialog */}
      <Dialog open={archiveConfirm !== null} onOpenChange={v => { if (!v) closeArchive() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Case</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            Are you sure you want to archive {archiveConfirm === -1 ? 'the selected cases' : 'this case'}?
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={closeArchive}>Cancel</Button>
            <Button variant="destructive" onClick={confirmArchive}>Archive</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

