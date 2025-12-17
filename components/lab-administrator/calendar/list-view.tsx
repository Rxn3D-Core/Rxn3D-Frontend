"use client"

import { useState, useMemo } from "react"
import { Eye, Edit, Trash2, Filter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ListEvent {
  id: string
  title: string
  tags: string
  date: string
  user: string
  status: string
  repeat: string
  labClosed: boolean
}

const generateListEvents = (): ListEvent[] => [
  {
    id: "1",
    title: "Yasuko Funaki - Crown Prep",
    tags: "Appointment",
    date: "January 13, 2025, 9:00 am - 10:00 am",
    user: "Hon Oliva",
    status: "Lab Open",
    repeat: "Does Not Repeat",
    labClosed: false,
  },
  {
    id: "2",
    title: "Maria Rodriguez - Bridge Fitting",
    tags: "Appointment",
    date: "January 15, 2025, 2:00 pm - 3:30 pm",
    user: "Dr. Johnson",
    status: "Lab Open",
    repeat: "Does Not Repeat",
    labClosed: false,
  },
  {
    id: "3",
    title: "John Davis - Denture Delivery",
    tags: "Appointment",
    date: "January 17, 2025, 10:30 am - 11:30 am",
    user: "Dr. Williams",
    status: "Lab Open",
    repeat: "Does Not Repeat",
    labClosed: false,
  },
  {
    id: "4",
    title: "Equipment Maintenance",
    tags: "Appointment",
    date: "January 25, 2025, 8:00 am - 12:00 pm",
    user: "Maintenance Team",
    status: "Lab Open",
    repeat: "Monthly",
    labClosed: false,
  },
  {
    id: "5",
    title: "Robert Johnson - Implant Crown",
    tags: "Appointment",
    date: "January 28, 2025, 1:00 pm - 2:00 pm",
    user: "Dr. Anderson",
    status: "Lab Open",
    repeat: "Does Not Repeat",
    labClosed: false,
  },
  {
    id: "6",
    title: "New Year's Day",
    tags: "Holiday",
    date: "January 1, 2025, All day",
    user: "-",
    status: "Lab Closed",
    repeat: "Yearly",
    labClosed: true,
  },
  {
    id: "7",
    title: "Martin Luther King Jr. Day",
    tags: "Holiday",
    date: "January 20, 2025, All day",
    user: "-",
    status: "Lab Closed",
    repeat: "Yearly",
    labClosed: true,
  },
  {
    id: "8",
    title: "Presidents' Day",
    tags: "Holiday",
    date: "February 17, 2025, All day",
    user: "-",
    status: "Lab Closed",
    repeat: "Yearly",
    labClosed: true,
  },
  {
    id: "9",
    title: "Dr. Smith Birthday",
    tags: "Birthday",
    date: "January 3, 2025, All day",
    user: "Dr. Smith",
    status: "Lab Open",
    repeat: "Yearly",
    labClosed: false,
  },
  {
    id: "10",
    title: "Sarah Chen Birthday",
    tags: "Birthday",
    date: "January 22, 2025, All day",
    user: "Sarah Chen",
    status: "Lab Open",
    repeat: "Yearly",
    labClosed: false,
  },
]

interface ListViewProps {
  searchTerm?: string
}

export function ListView({ searchTerm = "" }: ListViewProps) {
  const [events, setEvents] = useState<ListEvent[]>(generateListEvents())
  const [entriesPerPage, setEntriesPerPage] = useState("10")
  const [currentPage, setCurrentPage] = useState(1)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

  const filteredEvents = useMemo(() => {
    if (!localSearchTerm) return events

    return events.filter(
      (event) =>
        event.title.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
        event.tags.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
        event.user.toLowerCase().includes(localSearchTerm.toLowerCase()),
    )
  }, [events, localSearchTerm])

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * Number.parseInt(entriesPerPage)
    const endIndex = startIndex + Number.parseInt(entriesPerPage)
    return filteredEvents.slice(startIndex, endIndex)
  }, [filteredEvents, currentPage, entriesPerPage])

  const totalPages = Math.ceil(filteredEvents.length / Number.parseInt(entriesPerPage))

  const handleStatusToggle = (eventId: string) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              labClosed: !event.labClosed,
              status: event.labClosed ? "Lab Open" : "Lab Closed",
            }
          : event,
      ),
    )
  }

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== eventId))
  }

  return (
    <div className="bg-white">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Show</span>
          <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">entries</span>
          <span className="text-sm text-gray-600">
            Showing {(currentPage - 1) * Number.parseInt(entriesPerPage) + 1} to{" "}
            {Math.min(currentPage * Number.parseInt(entriesPerPage), filteredEvents.length)} of {filteredEvents.length}{" "}
            entries
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search events..."
              className="pl-10 w-64"
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event Title</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Tagged User</TableHead>
            <TableHead>Lab Status</TableHead>
            <TableHead>Repeat</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedEvents.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">{event.title}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    event.tags === "Holiday"
                      ? "bg-yellow-100 text-yellow-800"
                      : event.tags === "Birthday"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {event.tags}
                </span>
              </TableCell>
              <TableCell>{event.date}</TableCell>
              <TableCell>{event.user}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!event.labClosed}
                    onCheckedChange={() => handleStatusToggle(event.id)}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <span className="text-sm">{event.status}</span>
                </div>
              </TableCell>
              <TableCell>{event.repeat}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Details">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Event">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    title="Delete Event"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
