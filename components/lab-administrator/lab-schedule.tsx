"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Trash2, Search, Plus, Calendar, Clock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"

interface LabSchedule {
  id: number
  lab: string
  day: string
  time: string
  instructor: string
  course: string
  status: "Active" | "Inactive"
  timestamp: Date
}

// Sample data
const initialLabSchedules: LabSchedule[] = [
  {
    id: 1,
    lab: "Lab 1",
    day: "Monday",
    time: "9:00 AM - 11:00 AM",
    instructor: "John Doe",
    course: "Introduction to Programming",
    status: "Active",
    timestamp: new Date(2025, 2, 15, 9, 30),
  },
  {
    id: 2,
    lab: "Lab 2",
    day: "Tuesday",
    time: "1:00 PM - 3:00 PM",
    instructor: "Jane Smith",
    course: "Data Structures and Algorithms",
    status: "Active",
    timestamp: new Date(2025, 2, 14, 10, 15),
  },
  {
    id: 3,
    lab: "Lab 1",
    day: "Wednesday",
    time: "2:00 PM - 4:00 PM",
    instructor: "David Johnson",
    course: "Database Management Systems",
    status: "Active",
    timestamp: new Date(2025, 2, 13, 14, 45),
  },
  {
    id: 4,
    lab: "Lab 3",
    day: "Thursday",
    time: "10:00 AM - 12:00 PM",
    instructor: "Emily Brown",
    course: "Operating Systems",
    status: "Inactive",
    timestamp: new Date(2025, 2, 12, 16, 20),
  },
  {
    id: 5,
    lab: "Lab 2",
    day: "Friday",
    time: "3:00 PM - 5:00 PM",
    instructor: "Michael Wilson",
    course: "Computer Networks",
    status: "Active",
    timestamp: new Date(2025, 2, 11, 11, 10),
  },
]

export function LabSchedule() {
  const [labSchedules, setLabSchedules] = useState<LabSchedule[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDay, setFilterDay] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [currentLabSchedule, setCurrentLabSchedule] = useState<LabSchedule | null>(null)
  const [newLabSchedule, setNewLabSchedule] = useState<Partial<LabSchedule>>({
    lab: "",
    day: "",
    time: "",
    instructor: "",
    course: "",
    status: "Active",
  })
  const { toast } = useToast()

  // Generate sample data
  const generateSampleData = () => {
    setLabSchedules(initialLabSchedules)
    toast({
      title: "Sample Data Generated",
      description: "5 lab schedule records have been loaded.",
      duration: 3000,
    })
  }

  const filteredLabSchedules = labSchedules.filter((schedule) => {
    const matchesSearch =
      schedule.lab.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.day.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.course.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDay = filterDay === "all" || schedule.day === filterDay

    return matchesSearch && matchesDay
  })

  const handleAddLabSchedule = () => {
    const id = Math.max(0, ...labSchedules.map((s) => s.id)) + 1
    const labScheduleToAdd = {
      ...newLabSchedule,
      id,
      timestamp: new Date(),
    } as LabSchedule

    setLabSchedules([...labSchedules, labScheduleToAdd])
    setNewLabSchedule({
      lab: "",
      day: "",
      time: "",
      instructor: "",
      course: "",
      status: "Active",
    })
    setIsAddDialogOpen(false)

    toast({
      title: "Schedule Added",
      description: `New schedule for ${labScheduleToAdd.course} has been added.`,
      duration: 3000,
    })
  }

  const handleEditLabSchedule = () => {
    if (!currentLabSchedule) return

    setLabSchedules(
      labSchedules.map((schedule) =>
        schedule.id === currentLabSchedule.id ? { ...currentLabSchedule, timestamp: new Date() } : schedule,
      ),
    )
    setIsEditDialogOpen(false)

    toast({
      title: "Schedule Updated",
      description: `Schedule for ${currentLabSchedule.course} has been updated.`,
      duration: 3000,
    })
  }

  const handleDeleteLabSchedule = (id: number) => {
    setLabSchedules(labSchedules.filter((schedule) => schedule.id !== id))

    toast({
      title: "Schedule Deleted",
      description: "The lab schedule has been deleted.",
      duration: 3000,
    })
  }

  const handleDuplicate = (schedule: LabSchedule) => {
    const newSchedule = {
      ...schedule,
      id: Math.max(0, ...labSchedules.map((s) => s.id)) + 1,
      timestamp: new Date(),
      course: `${schedule.course} (Copy)`,
    }

    setLabSchedules([...labSchedules, newSchedule])

    toast({
      title: "Schedule Duplicated",
      description: `${schedule.course} schedule has been duplicated.`,
      duration: 3000,
    })
  }

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

  // Get unique days for filter
  const days = ["all", ...new Set(labSchedules.map((schedule) => schedule.day))]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lab Schedule</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateSampleData} disabled={labSchedules.length > 0}>
            <Calendar className="mr-2 h-4 w-4" />
            Load Sample Data
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600">
                <Plus className="mr-2 h-4 w-4" /> Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Lab Schedule</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="lab" className="text-right">
                    Lab
                  </label>
                  <Input
                    id="lab"
                    value={newLabSchedule.lab}
                    onChange={(e) => setNewLabSchedule({ ...newLabSchedule, lab: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="day" className="text-right">
                    Day
                  </label>
                  <Input
                    id="day"
                    value={newLabSchedule.day}
                    onChange={(e) => setNewLabSchedule({ ...newLabSchedule, day: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="time" className="text-right">
                    Time
                  </label>
                  <Input
                    id="time"
                    value={newLabSchedule.time}
                    onChange={(e) => setNewLabSchedule({ ...newLabSchedule, time: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="instructor" className="text-right">
                    Instructor
                  </label>
                  <Input
                    id="instructor"
                    value={newLabSchedule.instructor}
                    onChange={(e) => setNewLabSchedule({ ...newLabSchedule, instructor: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="course" className="text-right">
                    Course
                  </label>
                  <Input
                    id="course"
                    value={newLabSchedule.course}
                    onChange={(e) => setNewLabSchedule({ ...newLabSchedule, course: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="status" className="text-right">
                    Status
                  </label>
                  <select
                    id="status"
                    value={newLabSchedule.status}
                    onChange={(e) =>
                      setNewLabSchedule({ ...newLabSchedule, status: e.target.value as "Active" | "Inactive" })
                    }
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddLabSchedule}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="destructive" onClick={() => setIsAlertOpen(true)} disabled={labSchedules.length === 0}>
            Clear Schedules
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search schedules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="w-64">
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by day" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day === "all" ? "All Days" : day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredLabSchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No schedules found</h3>
              <p className="text-muted-foreground mt-2">
                {labSchedules.length === 0
                  ? "Click 'Load Sample Data' to populate the table with lab schedules."
                  : "Try adjusting your search or filters to find what you're looking for."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lab</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLabSchedules.map((schedule) => (
                    <TableRow key={schedule.id} className="hover:bg-muted/50">
                      <TableCell>{schedule.lab}</TableCell>
                      <TableCell>{schedule.day}</TableCell>
                      <TableCell>{schedule.time}</TableCell>
                      <TableCell>{schedule.instructor}</TableCell>
                      <TableCell className="font-medium">{schedule.course}</TableCell>
                      <TableCell>
                        <Badge
                          variant={schedule.status === "Active" ? "default" : "destructive"}
                          className={schedule.status === "Active" ? "bg-green-500" : ""}
                        >
                          {schedule.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(schedule.timestamp)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  setCurrentLabSchedule(schedule)
                                  setIsEditDialogOpen(true)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit schedule</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleDuplicate(schedule)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="lucide lucide-copy"
                                >
                                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                </svg>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Duplicate schedule</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteLabSchedule(schedule.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete schedule</p>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lab Schedule</DialogTitle>
          </DialogHeader>
          {currentLabSchedule && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-lab" className="text-right">
                  Lab
                </label>
                <Input
                  id="edit-lab"
                  value={currentLabSchedule.lab}
                  onChange={(e) => setCurrentLabSchedule({ ...currentLabSchedule, lab: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-day" className="text-right">
                  Day
                </label>
                <Input
                  id="edit-day"
                  value={currentLabSchedule.day}
                  onChange={(e) => setCurrentLabSchedule({ ...currentLabSchedule, day: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-time" className="text-right">
                  Time
                </label>
                <Input
                  id="edit-time"
                  value={currentLabSchedule.time}
                  onChange={(e) => setCurrentLabSchedule({ ...currentLabSchedule, time: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-instructor" className="text-right">
                  Instructor
                </label>
                <Input
                  id="edit-instructor"
                  value={currentLabSchedule.instructor}
                  onChange={(e) => setCurrentLabSchedule({ ...currentLabSchedule, instructor: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-course" className="text-right">
                  Course
                </label>
                <Input
                  id="edit-course"
                  value={currentLabSchedule.course}
                  onChange={(e) => setCurrentLabSchedule({ ...currentLabSchedule, course: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-status" className="text-right">
                  Status
                </label>
                <select
                  id="edit-status"
                  value={currentLabSchedule.status}
                  onChange={(e) =>
                    setCurrentLabSchedule({
                      ...currentLabSchedule,
                      status: e.target.value as "Active" | "Inactive",
                    })
                  }
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleEditLabSchedule}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Schedules</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all lab schedules? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setLabSchedules([])
                setIsAlertOpen(false)
                toast({
                  title: "Schedules Cleared",
                  description: "All lab schedules have been removed.",
                  duration: 3000,
                })
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Clear Schedules
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

export default LabSchedule
