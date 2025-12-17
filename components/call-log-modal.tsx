"use client"

import { useState, useRef, type ChangeEvent, type DragEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Phone,
  Filter,
  Plus,
  CalendarIcon,
  Clock,
  User,
  ChevronDown,
  Upload,
  Paperclip,
  MoreVertical,
  ExternalLink,
  X,
  Search,
} from "lucide-react"

interface CallLogModalProps {
  isOpen: boolean
  onClose: () => void
  slipNumber: string
}

interface CallerSuggestion {
  name: string
  slipDetails: string
  slipLink: string
}

interface CallLogEntry {
  id: string
  type: "Outgoing" | "Incoming"
  date: string
  time: string
  caller: string
  details: string
  isFollowUp: boolean
  attachments: { name: string; size: string }[]
  isEdited?: boolean
  isResolved?: boolean
  slipNumber: string
  stage: string
  deliveryDate: string
}

const mockCallerSuggestions: CallerSuggestion[] = [
  { name: "Mary Gutierrez", slipDetails: "Slip#665479 | MF-TWT | 01/13/2025", slipLink: "#" },
  { name: "Mary Sandoval", slipDetails: "Slip#547833 | BB-FD/BB-FD | 02/07/2025", slipLink: "#" },
  { name: "Dr. John Smith", slipDetails: "Slip#123456 | CRN | 03/01/2025", slipLink: "#" },
]

const mockCallHistory: CallLogEntry[] = [
  {
    id: "1",
    type: "Incoming",
    date: "01/03/15",
    time: "7:26am",
    caller: "Grecia",
    details: "Adrian said that new impression are ready to be picked up at the office. New slip passed.",
    isFollowUp: true,
    attachments: [],
    slipNumber: "665479",
    stage: "Try in with teeth",
    deliveryDate: "01/13/2025 @ 4pm",
  },
  {
    id: "2",
    type: "Outgoing",
    date: "01/01/15",
    time: "8:02am",
    caller: "Dr Cody Mugglestone",
    details: "Need to fabricate a metal frame acrylic + aot repair on existing partial. Wants the case rushed. new slip will be in system at 2pm",
    isFollowUp: false,
    attachments: [{ name: "attachment.pdf", size: "2.3 MB" }],
    slipNumber: "665479",
    stage: "Try in with teeth",
    deliveryDate: "01/13/2025 @ 4pm",
  },
  {
    id: "3",
    type: "Incoming",
    date: "01/03/15",
    time: "8:00am",
    caller: "Crys",
    details: "Missed call, left voicemail. Needs a metal frame rush, will call back.",
    isFollowUp: false,
    attachments: [],
    isEdited: true,
    slipNumber: "665479",
    stage: "Try in with teeth",
    deliveryDate: "01/13/2025 @ 4pm",
  },
]

export default function CallLogModal({ isOpen, onClose, slipNumber }: CallLogModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [callType, setCallType] = useState<"Outgoing" | "Incoming">("Outgoing")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState("8:45")
  const [caller, setCaller] = useState("")
  const [callerSuggestions, setCallerSuggestions] = useState<CallerSuggestion[]>(mockCallerSuggestions)
  const [callDetails, setCallDetails] = useState("")
  const [markAsFollowUp, setMarkAsFollowUp] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [callHistory, setCallHistory] = useState<CallLogEntry[]>(mockCallHistory)

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(event.target.files)])
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.dataTransfer.files) {
      setAttachments((prev) => [...prev, ...Array.from(event.dataTransfer.files)])
    }
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleSaveCallLog = () => {
    if (!caller.trim() || !callDetails.trim()) {
      alert("Caller and Call details are required.")
      return
    }

    const newCallLog: CallLogEntry = {
      id: String(Date.now()),
      type: callType,
      date: selectedDate ? format(selectedDate, "MM/dd/yy") : "",
      time: selectedTime,
      caller: caller,
      details: callDetails,
      isFollowUp: markAsFollowUp,
      attachments: attachments.map((file) => ({ name: file.name, size: `${(file.size / 1024).toFixed(2)} KB` })),
      slipNumber: slipNumber,
      stage: "Try in with teeth",
      deliveryDate: "01/13/2025 @ 4pm",
    }
    setCallHistory((prev) => [newCallLog, ...prev])
    
    // Reset form
    setCallType("Outgoing")
    setSelectedDate(new Date())
    setSelectedTime("8:45")
    setCaller("")
    setCallDetails("")
    setMarkAsFollowUp(false)
    setAttachments([])
  }

  const handleEditCallLog = (id: string) => {
  }

  const handleMarkAsResolved = (id: string) => {
    setCallHistory((prev) =>
      prev.map((log) => (log.id === id ? { ...log, isResolved: !log.isResolved, isFollowUp: false } : log)),
    )
  }

  const handleMarkAsFollowUp = (id: string) => {
    setCallHistory((prev) => prev.map((log) => (log.id === id ? { ...log, isFollowUp: !log.isFollowUp } : log)))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 rounded-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Call Log</h2>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search all call log"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>
        </div>

        {/* Add Call Log Form */}
        <div className="px-6 py-6 border-b bg-gray-50">
          <Button className="mb-6 bg-blue-600 hover:bg-blue-700">
            Add Call log
          </Button>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Call Type Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {callType} call
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setCallType("Outgoing")}>Outgoing call</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCallType("Incoming")}>Incoming call</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start bg-white">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "MM/dd/yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
              </PopoverContent>
            </Popover>

            {/* Time Input */}
            <div className="relative">
              <Button variant="outline" className="w-full justify-start bg-white text-gray-500">
                <Clock className="mr-2 h-4 w-4" />
                {selectedTime} am
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Caller Input */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Caller *"
                value={caller}
                onChange={(e) => setCaller(e.target.value)}
                className="pl-10 bg-white"
              />
              {caller.length > 0 && caller === "Mary Gutierrez" && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1">
                  <div className="p-3 hover:bg-gray-50 cursor-pointer border-b">
                    <div className="font-medium flex items-center gap-2">
                      Mary Gutierrez 
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      <span className="text-xs text-gray-500">Slip#665479 MF-TWT</span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Call Details Textarea */}
          <Textarea
            placeholder="Enter call details and notes.."
            rows={4}
            value={callDetails}
            onChange={(e) => setCallDetails(e.target.value)}
            className="mb-4 bg-white"
          />

          {/* Follow Up Switch */}
          <div className="flex items-center gap-2 mb-4">
            <Switch 
              id="follow-up" 
              checked={markAsFollowUp} 
              onCheckedChange={setMarkAsFollowUp}
              className="data-[state=checked]:bg-blue-600"
            />
            <Label htmlFor="follow-up" className="text-sm">
              Mark as follow up.
            </Label>
          </div>

          {/* File Upload Area */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors mb-6 bg-white"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Drag & drop files here or click to browse files.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSaveCallLog} className="bg-blue-600 hover:bg-blue-700">
              Save Call log
            </Button>
          </div>
        </div>

        {/* Call History */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Call History ({callHistory.length})</h3>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {callHistory.map((log) => (
                <div key={log.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-medium">{log.date} @ {log.time}</span>
                      <span className="font-medium">{log.caller}</span>
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded">
                        Slip #: {log.slipNumber}
                      </span>
                      <span className="text-gray-600 text-xs bg-gray-200 px-2 py-0.5 rounded">
                        {log.stage}
                      </span>
                      <span className="text-gray-600 text-xs bg-gray-200 px-2 py-0.5 rounded">
                        {log.deliveryDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.isFollowUp && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          FOLLOW UP
                        </span>
                      )}
                      {log.isEdited && (
                        <span className="text-gray-500 text-xs">EDITED</span>
                      )}
                      {log.attachments.length > 0 && (
                        <Paperclip className="w-4 h-4 text-gray-400" />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-6 h-6">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditCallLog(log.id)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkAsResolved(log.id)}>
                            {log.isResolved ? "Mark as unresolved" : "Mark as resolved"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkAsFollowUp(log.id)}>
                            {log.isFollowUp ? "Remove follow up" : "Mark as follow up"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}