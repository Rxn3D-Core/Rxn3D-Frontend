"use client"

import { useState } from "react"
import { useLabAdmin } from "@/contexts/lab-admin-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Clock, Search, Copy, FileText } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"

// Define the dental product record type to match the spreadsheet
interface DentalProductRecord {
  id: string
  category: string
  subCategory: string
  product: string
  retention: string
  grade: string
  stages: string
  teethShade: string
  impression: string
  timestamp: Date
  user: string
}

export function HistoryLog() {
  const { clearHistory } = useLabAdmin()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const { toast } = useToast()
  const [records, setRecords] = useState<DentalProductRecord[]>([])

  // Generate sample data based on the spreadsheet
  const generateSampleData = () => {
    const sampleData: DentalProductRecord[] = [
      {
        id: "1",
        category: "Removables Restoration",
        subCategory: "Complete Dentures",
        product: "Conventional Full Denture",
        retention: "-",
        grade: "Economy",
        stages: "Custom Tray",
        teethShade: "VITA Zahnfabrik - VITA Classical (A1-D4)",
        impression: "STL file",
        timestamp: new Date(),
        user: "System Admin",
      },
      {
        id: "2",
        category: "Removables Restoration",
        subCategory: "Complete Dentures",
        product: "Conventional Full Denture",
        retention: "-",
        grade: "Standard",
        stages: "Bite block",
        teethShade: "VITA Zahnfabrik - VITA 3D-Master",
        impression: "Alginate",
        timestamp: new Date(),
        user: "System Admin",
      },
      {
        id: "3",
        category: "Removables Restoration",
        subCategory: "Complete Dentures",
        product: "Conventional Full Denture",
        retention: "-",
        grade: "Premium",
        stages: "Try in",
        teethShade: "Ivoclar Vivadent - ChromaScope®",
        impression: "Light body PVS",
        timestamp: new Date(),
        user: "Lab Manager",
      },
      {
        id: "4",
        category: "Removables Restoration",
        subCategory: "Complete Dentures",
        product: "Conventional Full Denture",
        retention: "-",
        grade: "Ultra Premium",
        stages: "Finish",
        teethShade: "Ivoclar Vivadent - IPS Shade System (HT/LT)",
        impression: "Heavy body PVS",
        timestamp: new Date(),
        user: "Lab Manager",
      },
      {
        id: "5",
        category: "Removables Restoration",
        subCategory: "Complete Dentures",
        product: "Conventional Full Denture",
        retention: "-",
        grade: "-",
        stages: "-",
        teethShade: "GC America - GC Initial® Shade Guide",
        impression: "Clean impression",
        timestamp: new Date(),
        user: "Lab Technician",
      },
      {
        id: "6",
        category: "Removables Restoration",
        subCategory: "Complete Dentures",
        product: "Conventional Full Denture",
        retention: "-",
        grade: "-",
        stages: "-",
        teethShade: "Shofu Dental - Vintage Halo® Shade Guide",
        impression: "Bite registration",
        timestamp: new Date(),
        user: "Lab Technician",
      },
      {
        id: "7",
        category: "Removables Restoration",
        subCategory: "Complete Dentures",
        product: "Conventional Full Denture",
        retention: "-",
        grade: "-",
        stages: "-",
        teethShade: "DENTSPLY - Trubyte® Bioform Shade Guide",
        impression: "Denture Included",
        timestamp: new Date(),
        user: "Product Manager",
      },
      {
        id: "8",
        category: "Removables Restoration",
        subCategory: "Complete Dentures",
        product: "Conventional Full Denture",
        retention: "-",
        grade: "-",
        stages: "-",
        teethShade: "Artic Denture Teeth (Zahn Dental)",
        impression: "-",
        timestamp: new Date(),
        user: "Product Manager",
      },
      {
        id: "9",
        category: "Removables Restoration",
        subCategory: "Complete Dentures",
        product: "Immediate Full Denture",
        retention: "-",
        grade: "Economy",
        stages: "Custom Tray",
        teethShade: "VITA Zahnfabrik - VITA Classical (A1-D4)",
        impression: "STL file",
        timestamp: new Date(),
        user: "System Admin",
      },
      {
        id: "10",
        category: "Removables Restoration",
        subCategory: "Complete Dentures",
        product: "Immediate Full Denture",
        retention: "-",
        grade: "Standard",
        stages: "Bite block",
        teethShade: "VITA Zahnfabrik - VITA 3D-Master",
        impression: "Alginate",
        timestamp: new Date(),
        user: "System Admin",
      },
      {
        id: "11",
        category: "Removables Restoration",
        subCategory: "Complete Dentures",
        product: "Immediate Full Denture",
        retention: "-",
        grade: "Premium",
        stages: "Try in",
        teethShade: "Ivoclar Vivadent - ChromaScope®",
        impression: "Light body PVS",
        timestamp: new Date(),
        user: "Lab Manager",
      },
      {
        id: "12",
        category: "Removables Restoration",
        subCategory: "Complete Dentures",
        product: "Immediate Full Denture",
        retention: "-",
        grade: "Ultra Premium",
        stages: "Finish",
        teethShade: "Ivoclar Vivadent - IPS Shade System (HT/LT)",
        impression: "Heavy body PVS",
        timestamp: new Date(),
        user: "Lab Manager",
      },
      {
        id: "13",
        category: "Removables Restoration",
        subCategory: "Partial Dentures",
        product: "Acrylic Partial",
        retention: "-",
        grade: "Economy",
        stages: "Custom Tray",
        teethShade: "VITA Zahnfabrik - VITA Classical (A1-D4)",
        impression: "STL file",
        timestamp: new Date(),
        user: "System Admin",
      },
      {
        id: "14",
        category: "Removables Restoration",
        subCategory: "Partial Dentures",
        product: "Acrylic Partial",
        retention: "-",
        grade: "Standard",
        stages: "Bite block",
        teethShade: "VITA Zahnfabrik - VITA 3D-Master",
        impression: "Alginate",
        timestamp: new Date(),
        user: "System Admin",
      },
      {
        id: "15",
        category: "Removables Restoration",
        subCategory: "Partial Dentures",
        product: "Acrylic Partial",
        retention: "-",
        grade: "Premium",
        stages: "Try in",
        teethShade: "Ivoclar Vivadent - ChromaScope®",
        impression: "Light body PVS",
        timestamp: new Date(),
        user: "Lab Manager",
      },
      {
        id: "16",
        category: "Removables Restoration",
        subCategory: "Partial Dentures",
        product: "Cast metal",
        retention: "-",
        grade: "Economy",
        stages: "Custom Tray",
        teethShade: "VITA Zahnfabrik - VITA Classical (A1-D4)",
        impression: "STL file",
        timestamp: new Date(),
        user: "System Admin",
      },
      {
        id: "17",
        category: "Removables Restoration",
        subCategory: "Partial Dentures",
        product: "Cast metal",
        retention: "-",
        grade: "Standard",
        stages: "Bite block",
        teethShade: "VITA Zahnfabrik - VITA 3D-Master",
        impression: "Alginate",
        timestamp: new Date(),
        user: "System Admin",
      },
      {
        id: "18",
        category: "Removables Restoration",
        subCategory: "Partial Dentures",
        product: "Cast metal",
        retention: "-",
        grade: "Premium",
        stages: "Try in",
        teethShade: "Ivoclar Vivadent - ChromaScope®",
        impression: "Light body PVS",
        timestamp: new Date(),
        user: "Lab Manager",
      },
      {
        id: "19",
        category: "Removables Restoration",
        subCategory: "Partial Dentures",
        product: "Flexible/Valplast",
        retention: "-",
        grade: "Economy",
        stages: "Custom Tray",
        teethShade: "VITA Zahnfabrik - VITA Classical (A1-D4)",
        impression: "STL file",
        timestamp: new Date(),
        user: "System Admin",
      },
      {
        id: "20",
        category: "Removables Restoration",
        subCategory: "Partial Dentures",
        product: "Flexible/Valplast",
        retention: "-",
        grade: "Standard",
        stages: "Bite block",
        teethShade: "VITA Zahnfabrik - VITA 3D-Master",
        impression: "Alginate",
        timestamp: new Date(),
        user: "System Admin",
      },
    ]

    setRecords(sampleData)
    toast({
      title: "Sample Data Generated",
      description: "20 dental product records have been loaded.",
      duration: 3000,
    })
  }

  // Handle duplicate button click
  const handleDuplicate = (record: DentalProductRecord) => {
    const newRecord = {
      ...record,
      id: `${record.id}-copy-${Date.now()}`,
      timestamp: new Date(),
      user: record.user + " (Duplicated)",
    }

    setRecords([...records, newRecord])

    toast({
      title: "Record Duplicated",
      description: `${record.product} record has been duplicated.`,
      duration: 3000,
    })
  }

  // Filter records
  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.subCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.teethShade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.impression.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = filterCategory === "all" || record.category === filterCategory

    return matchesSearch && matchesCategory
  })

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

  // Get unique categories for filter
  const categories = ["all", ...new Set(records.map((record) => record.category))]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lab Administrator Product Records</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateSampleData} disabled={records.length > 0}>
            <FileText className="mr-2 h-4 w-4" />
            Load Sample Data
          </Button>
          <Button variant="destructive" onClick={() => setIsAlertOpen(true)} disabled={records.length === 0}>
            Clear Records
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="w-64">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No records found</h3>
              <p className="text-muted-foreground mt-2">
                {records.length === 0
                  ? "Click 'Load Sample Data' to populate the table with dental product records."
                  : "Try adjusting your search or filters to find what you're looking for."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Sub Category</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Retention</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Stages</TableHead>
                    <TableHead>Teeth Shade</TableHead>
                    <TableHead>Impression</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.category}</TableCell>
                      <TableCell>{record.subCategory}</TableCell>
                      <TableCell className="font-medium">{record.product}</TableCell>
                      <TableCell>{record.retention}</TableCell>
                      <TableCell>{record.grade}</TableCell>
                      <TableCell>{record.stages}</TableCell>
                      <TableCell className="max-w-xs truncate" title={record.teethShade}>
                        {record.teethShade}
                      </TableCell>
                      <TableCell>{record.impression}</TableCell>
                      <TableCell className="text-xs">
                        {record.user}
                        <div className="text-muted-foreground">{formatDate(record.timestamp)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleDuplicate(record)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Duplicate record</p>
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
            <AlertDialogTitle>Clear Records</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all product records? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setRecords([])
                clearHistory()
                setIsAlertOpen(false)
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Clear Records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
