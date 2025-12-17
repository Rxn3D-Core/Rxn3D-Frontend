"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Clock, Search, Phone, Mail, Plus, FileText } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"

interface CallLog {
  id: string
  date: string
  time: string
  callTaken: string
  personAttended: string
  reason: string
  timestamp: Date
}

export function CallLog() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const { toast } = useToast()
  const [newCall, setNewCall] = useState<Omit<CallLog, "id" | "timestamp">>({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    callTaken: "",
    personAttended: "",
    reason: "",
  })

  const handleAddCall = () => {
    const newCallLog: CallLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...newCall,
    }
    setCallLogs([...callLogs, newCallLog])
    setIsAddDialogOpen(false)
    setNewCall({
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      callTaken: "",
      personAttended: "",
      reason: "",
    })

    toast({
      title: "Call Log Added",
      description: "The call log has been successfully added.",
      duration: 3000,
    })
  }

  // Generate sample data
  const generateSampleData = () => {
    const sampleData: CallLog[] = [
      {
        id: "1",
        date: "2023-03-15",
        time: "09:30 AM",
        callTaken: "Dr. Smith",
        personAttended: "John Doe",
        reason: "Inquiry about dental implant procedure",
        timestamp: new Date(2023, 2, 15, 9, 30),
      },
      {
        id: "2",
        date: "2023-03-16",
        time: "11:45 AM",
        callTaken: "Dr. Johnson",
        personAttended: "Jane Smith",
        reason: "Follow-up on crown fitting",
        timestamp: new Date(2023, 2, 16, 11, 45),
      },
      {
        id: "3",
        date: "2023-03-17",
        time: "02:15 PM",
        callTaken: "Dr. Williams",
        personAttended: "Robert Brown",
        reason: "Scheduling emergency appointment for broken tooth",
        timestamp: new Date(2023, 2, 17, 14, 15),
      },
      {
        id: "4",
        date: "2023-03-18",
        time: "10:00 AM",
        callTaken: "Dr. Davis",
        personAttended: "Emily Wilson",
        reason: "Consultation for wisdom tooth extraction",
        timestamp: new Date(2023, 2, 18, 10, 0),
      },
      {
        id: "5",
        date: "2023-03-19",
        time: "03:30 PM",
        callTaken: "Dr. Miller",
        personAttended: "Michael Taylor",
        reason: "Discussion about dental bridge options",
        timestamp: new Date(2023, 2, 19, 15, 30),
      },
    ]

    setCallLogs(sampleData)
    toast({
      title: "Sample Data Generated",
      description: "5 call log records have been loaded.",
      duration: 3000,
    })
  }

  const clearCallLogs = () => {
    setCallLogs([])
    setIsAlertOpen(false)
    toast({
      title: "Call Logs Cleared",
      description: "All call log records have been removed.",
      duration: 3000,
    })
  }

  const filteredLogs = callLogs.filter(
    (log) =>
      log.callTaken.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.personAttended.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Call Log Records</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateSampleData} disabled={callLogs.length > 0}>
            <FileText className="mr-2 h-4 w-4" />
            Load Sample Data
          </Button>
          <Button variant="destructive" onClick={() => setIsAlertOpen(true)} disabled={callLogs.length === 0}>
            Clear Records
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" /> Add Call
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle className="text-center text-xl text-blue-600">Add call</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newCall.date}
                      onChange={(e) => setNewCall({ ...newCall, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={newCall.time}
                      onChange={(e) => setNewCall({ ...newCall, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="callTaken">Call Taken</Label>
                  <Input
                    id="callTaken"
                    placeholder="Name of person who took the call"
                    value={newCall.callTaken}
                    onChange={(e) => setNewCall({ ...newCall, callTaken: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personAttended">Person Attended</Label>
                  <Input
                    id="personAttended"
                    placeholder="Person attended"
                    value={newCall.personAttended}
                    onChange={(e) => setNewCall({ ...newCall, personAttended: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Reason for the call"
                    value={newCall.reason}
                    onChange={(e) => setNewCall({ ...newCall, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Back
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddCall}>
                  Submit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search call logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No call logs found</h3>
              <p className="text-muted-foreground mt-2">
                {callLogs.length === 0
                  ? "Click 'Load Sample Data' to populate the table with sample call logs or add a new call log."
                  : "Try adjusting your search to find what you're looking for."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-blue-50">
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead className="w-[100px]">Time</TableHead>
                    <TableHead className="w-[150px]">Call Taken</TableHead>
                    <TableHead className="w-[150px]">Attended</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{log.date}</TableCell>
                      <TableCell>{log.time}</TableCell>
                      <TableCell>{log.callTaken}</TableCell>
                      <TableCell>{log.personAttended}</TableCell>
                      <TableCell className="max-w-xs truncate" title={log.reason}>
                        {log.reason}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Call back</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Send email</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Call Logs</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all call log records? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearCallLogs} className="bg-red-500 hover:bg-red-600">
              Clear Records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
