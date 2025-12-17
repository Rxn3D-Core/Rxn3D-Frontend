"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { PopoverTrigger } from "@/components/ui/popover"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X, Search, Filter, Paperclip, Calendar, MoreHorizontal, Building, Diamond } from "lucide-react"
import { Popover, PopoverContent } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card" // Import Card components
import type { Note } from "@/types/note"

interface StageNotesModalProps {
  isOpen: boolean
  onClose: () => void
  patientName: string
  stage: string
  deliveryDate: string
  caseNumber: string
  slipNumber: string
  allNotes: Note[]
  setAllNotes: (notes: Note[]) => void
}

export default function StageNotesModal({
  isOpen,
  onClose,
  patientName,
  stage,
  deliveryDate,
  caseNumber,
  slipNumber,
  allNotes,
  setAllNotes,
}: StageNotesModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [newNoteContent, setNewNoteContent] = useState("")
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [filterDateRange, setFilterDateRange] = useState("")
  const [filterUser, setFilterUser] = useState("")
  const [filterAttachments, setFilterAttachments] = useState("")

  const filteredNotes = allNotes
    .filter((note) => note.slipNumber === slipNumber && note.stage === stage)
    .filter((note) => {
      const matchesSearch =
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.slipNumber.includes(searchTerm)

      const matchesDate = filterDateRange === "" || (filterDateRange === "today" && note.date === "01/03/15")
      const matchesUser = filterUser === "" || note.author === filterUser
      const matchesAttachments =
        filterAttachments === "" ||
        (filterAttachments === "yes" && note.attachments > 0) ||
        (filterAttachments === "no" && note.attachments === 0)

      return matchesSearch && matchesDate && matchesUser && matchesAttachments
    })

  const handleAddNote = () => {
    if (newNoteContent.trim()) {
      const newNote: Note = {
        id: String(Date.now()),
        date: new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }),
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
        author: "Current User",
        content: newNoteContent.trim(),
        attachments: 0,
        slipNumber: slipNumber,
        stage: stage,
        deliveryDate: deliveryDate,
        isRush: false,
      }
      setAllNotes((prevNotes) => [newNote, ...prevNotes])
      setNewNoteContent("")
    }
  }

  const handleResetFilter = () => {
    setFilterDateRange("")
    setFilterUser("")
    setFilterAttachments("")
    setShowFilterPopover(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 rounded-xl shadow-2xl flex flex-col h-[90vh]">
        <DialogHeader className="p-6 border-b flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Stage notes</DialogTitle>
                <div className="text-sm text-gray-500 mt-1">
                  Patient: <span className="font-medium text-gray-800">{patientName}</span>
                  <span className="mx-2">•</span>
                  Stage: <span className="font-medium text-gray-800">{stage}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-1" />
                {deliveryDate} at 4PM
                {allNotes.some((note) => note.isRush && note.slipNumber === slipNumber && note.stage === stage) && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white">
                    RUSH
                  </span>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Search and Filter */}
          <div className="flex items-center gap-3 mb-6 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search all stage notes"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 py-2 rounded-lg"
              />
            </div>
            <Popover open={showFilterPopover} onOpenChange={setShowFilterPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4 space-y-3">
                <h4 className="font-semibold text-sm mb-2">Filter</h4>
                <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                  <SelectTrigger className="w-full flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <SelectValue placeholder="Select Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="Maria Gonzales">Maria Gonzales</SelectItem>
                    <SelectItem value="Dr Cody Mugglestone">Dr Cody Mugglestone</SelectItem>
                    <SelectItem value="Horacio Oliva">Horacio Oliva</SelectItem>
                    <SelectItem value="Nizam Nizam">Nizam Nizam</SelectItem>
                    <SelectItem value="Belen Merida-Cortes">Belen Merida-Cortes</SelectItem>
                    <SelectItem value="Current User">Current User</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterAttachments} onValueChange={setFilterAttachments}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="With attachments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={handleResetFilter}>
                    Reset Filter
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowFilterPopover(false)}
                    className="bg-[#1162A8] hover:bg-[#0f5490] text-white"
                  >
                    Apply Filter
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Add Stage Notes */}
          <div className="mb-6 flex-shrink-0">
            <Button className="w-full bg-[#1162A8] hover:bg-[#0f5490] text-white mb-4">Add stage notes</Button>
            <Card className="border-gray-300">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700">
                    Slip #: {slipNumber}
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700">
                    {stage}
                  </Badge>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Diamond className="w-3 h-3 text-red-500 fill-red-500" /> {deliveryDate} @ 4pm
                  </span>
                </div>
                <Textarea
                  placeholder="Add a new note..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={3}
                  className="mb-3"
                />
                <div className="flex justify-between items-center">
                  <Button variant="ghost" size="sm" className="flex items-center gap-1 text-gray-600 hover:bg-gray-100">
                    <Paperclip className="w-4 h-4" />
                    Upload attachment
                  </Button>
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim()}
                    className="bg-[#1162A8] hover:bg-[#0f5490] text-white"
                  >
                    Submit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes History */}
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            <h3 className="font-semibold text-base mb-4">Notes History ({filteredNotes.length})</h3>
            <div className="space-y-4">
              {filteredNotes.map((note) => (
                <div key={note.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-800">
                        {note.date} @ {note.time}
                      </span>
                      <span className="text-gray-600">{note.author}</span>
                      <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700">
                        Slip #: {note.slipNumber}
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700">
                        {note.stage}
                      </Badge>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Diamond className="w-3 h-3 text-red-500 fill-red-500" /> {note.deliveryDate} @ 4pm
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {note.attachments > 0 && <Paperclip className="w-4 h-4 text-gray-500" />}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="text-sm text-gray-800">{note.content}</p>
                </div>
              ))}
              {filteredNotes.length === 0 && (
                <div className="text-center text-gray-500 py-8">No notes found matching your criteria.</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
