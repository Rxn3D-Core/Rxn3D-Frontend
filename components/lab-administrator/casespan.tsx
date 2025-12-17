"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Trash2, Search, Plus, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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

interface CasespanItem {
  id: string
  name: string
  color: string
  quantity: number
  sequence: number
  status: "Active" | "Inactive"
  timestamp: Date
}

// Sample data
const initialCasespanItems: CasespanItem[] = [
  {
    id: "1",
    name: "Bruxzier",
    color: "#9333ea", // Purple
    quantity: 0,
    sequence: 5,
    status: "Active",
    timestamp: new Date(),
  },
  {
    id: "2",
    name: "E-max",
    color: "#2563eb", // Blue
    quantity: 200,
    sequence: 10,
    status: "Active",
    timestamp: new Date(),
  },
  {
    id: "3",
    name: "PFM",
    color: "#dc2626", // Red
    quantity: 200,
    sequence: 15,
    status: "Active",
    timestamp: new Date(),
  },
  {
    id: "4",
    name: "Implants",
    color: "#ffffff", // White
    quantity: 0,
    sequence: 20,
    status: "Active",
    timestamp: new Date(),
  },
]

export function Casespan() {
  const [casespanItems, setCasespanItems] = useState<CasespanItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [currentItem, setCurrentItem] = useState<CasespanItem | null>(null)
  const [newItem, setNewItem] = useState<Partial<CasespanItem>>({
    name: "",
    color: "#ffffff",
    quantity: 0,
    sequence: 0,
    status: "Active",
  })
  const { toast } = useToast()

  // Generate sample data
  const generateSampleData = () => {
    setCasespanItems(initialCasespanItems)
    toast({
      title: "Sample Data Generated",
      description: "4 casespan items have been loaded.",
      duration: 3000,
    })
  }

  const filteredItems = casespanItems.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleAddItem = () => {
    const id = `${casespanItems.length + 1}`
    const itemToAdd = {
      ...newItem,
      id,
      timestamp: new Date(),
    } as CasespanItem

    setCasespanItems([...casespanItems, itemToAdd])
    setNewItem({
      name: "",
      color: "#ffffff",
      quantity: 0,
      sequence: 0,
      status: "Active",
    })
    setIsAddDialogOpen(false)

    toast({
      title: "Item Added",
      description: `New item "${itemToAdd.name}" has been added.`,
      duration: 3000,
    })
  }

  const handleEditItem = () => {
    if (!currentItem) return

    setCasespanItems(
      casespanItems.map((item) => (item.id === currentItem.id ? { ...currentItem, timestamp: new Date() } : item)),
    )
    setIsEditDialogOpen(false)

    toast({
      title: "Item Updated",
      description: `Item "${currentItem.name}" has been updated.`,
      duration: 3000,
    })
  }

  const handleDeleteItem = (id: string) => {
    setCasespanItems(casespanItems.filter((item) => item.id !== id))

    toast({
      title: "Item Deleted",
      description: "The casespan item has been deleted.",
      duration: 3000,
    })
  }

  const handleSelectItem = (id: string) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((itemId) => itemId !== id))
    } else {
      setSelectedItems([...selectedItems, id])
    }
  }

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredItems.map((item) => item.id))
    }
  }

  const handleViewCasespanNumber = (item: CasespanItem) => {
    toast({
      title: "Casespan Number",
      description: `Viewing casespan number for ${item.name}`,
      duration: 3000,
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Casespan</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateSampleData} disabled={casespanItems.length > 0}>
            <FileText className="mr-2 h-4 w-4" />
            Load Sample Data
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600">
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Casespan Item</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="name" className="text-right">
                    Name
                  </label>
                  <Input
                    id="name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="color" className="text-right">
                    Color
                  </label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={newItem.color}
                      onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <div className="w-10 h-10 rounded border" style={{ backgroundColor: newItem.color }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="quantity" className="text-right">
                    Quantity
                  </label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number.parseInt(e.target.value) || 0 })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="sequence" className="text-right">
                    Sequence
                  </label>
                  <Input
                    id="sequence"
                    type="number"
                    value={newItem.sequence}
                    onChange={(e) => setNewItem({ ...newItem, sequence: Number.parseInt(e.target.value) || 0 })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="status" className="text-right">
                    Status
                  </label>
                  <select
                    id="status"
                    value={newItem.status}
                    onChange={(e) => setNewItem({ ...newItem, status: e.target.value as "Active" | "Inactive" })}
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddItem}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No items found</h3>
              <p className="text-muted-foreground mt-2">
                {casespanItems.length === 0
                  ? "Click 'Load Sample Data' to populate the table with casespan items."
                  : "Try adjusting your search to find what you're looking for."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-900 text-white">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                        className="border-white data-[state=checked]:bg-white data-[state=checked]:text-blue-900"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Sequence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => handleSelectItem(item.id)}
                          aria-label={`Select ${item.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <div
                          className="w-full h-8 rounded"
                          style={{ backgroundColor: item.color, border: "1px solid #e2e8f0" }}
                        ></div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.sequence}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.status === "Active" ? "default" : "destructive"}
                          className={item.status === "Active" ? "bg-green-500" : ""}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setCurrentItem(item)
                                    setIsEditDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit item</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete item</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2 bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => handleViewCasespanNumber(item)}
                          >
                            Casespan Number
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredItems.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Trash2 className="h-4 w-4" />
                <span>
                  {selectedItems.length === 0
                    ? `1 to ${filteredItems.length} of ${filteredItems.length}`
                    : `${selectedItems.length} selected`}
                </span>
                {selectedItems.length > 0 && (
                  <Button variant="default" size="sm" className="ml-2 h-7 bg-blue-600">
                    1
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>10</span>
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
                  className="lucide lucide-chevron-down"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Casespan Item</DialogTitle>
          </DialogHeader>
          {currentItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-name" className="text-right">
                  Name
                </label>
                <Input
                  id="edit-name"
                  value={currentItem.name}
                  onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-color" className="text-right">
                  Color
                </label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input
                    id="edit-color"
                    type="color"
                    value={currentItem.color}
                    onChange={(e) => setCurrentItem({ ...currentItem, color: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <div className="w-10 h-10 rounded border" style={{ backgroundColor: currentItem.color }}></div>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-quantity" className="text-right">
                  Quantity
                </label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem({ ...currentItem, quantity: Number.parseInt(e.target.value) || 0 })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-sequence" className="text-right">
                  Sequence
                </label>
                <Input
                  id="edit-sequence"
                  type="number"
                  value={currentItem.sequence}
                  onChange={(e) => setCurrentItem({ ...currentItem, sequence: Number.parseInt(e.target.value) || 0 })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="edit-status" className="text-right">
                  Status
                </label>
                <select
                  id="edit-status"
                  value={currentItem.status}
                  onChange={(e) => setCurrentItem({ ...currentItem, status: e.target.value as "Active" | "Inactive" })}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleEditItem}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all casespan items? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCasespanItems([])
                setSelectedItems([])
                setIsAlertOpen(false)
                toast({
                  title: "Items Cleared",
                  description: "All casespan items have been removed.",
                  duration: 3000,
                })
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Clear Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

export default Casespan
