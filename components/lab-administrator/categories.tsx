"use client"

import { useState } from "react"
import { useLabAdmin } from "@/contexts/lab-admin-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"

// Mock data for categories
const mockUpperCategories = [
  { id: 1, name: "Crowns", description: "All types of dental crowns" },
  { id: 2, name: "Bridges", description: "Fixed dental bridges" },
  { id: 3, name: "Dentures", description: "Full and partial dentures" },
]

const mockLowerCategories = [
  { id: 1, name: "Implants", description: "Dental implant solutions" },
  { id: 2, name: "Veneers", description: "Porcelain and composite veneers" },
  { id: 3, name: "Aligners", description: "Clear dental aligners" },
]

export function Categories() {
  const { user } = useAuth()
  const { addHistoryEntry } = useLabAdmin()
  const [upperCategories, setUpperCategories] = useState(mockUpperCategories)
  const [lowerCategories, setLowerCategories] = useState(mockLowerCategories)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("upper")
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
  })

  const handleAddCategory = () => {
    if (!newCategory.name) return

    const newId =
      activeTab === "upper"
        ? upperCategories.length > 0
          ? Math.max(...upperCategories.map((c) => c.id)) + 1
          : 1
        : lowerCategories.length > 0
          ? Math.max(...lowerCategories.map((c) => c.id)) + 1
          : 1

    const categoryToAdd = { id: newId, ...newCategory }

    if (activeTab === "upper") {
      setUpperCategories([...upperCategories, categoryToAdd])
    } else {
      setLowerCategories([...lowerCategories, categoryToAdd])
    }

    // Add to history
    addHistoryEntry({
      user: user?.name || "Admin",
      action: "create",
      itemType: "category",
      itemName: newCategory.name,
      details: `Created new ${activeTab} category: ${newCategory.name}`,
    })

    setNewCategory({ name: "", description: "" })
    setIsAddDialogOpen(false)
  }

  const handleDeleteCategory = (id: number, name: string, type: "upper" | "lower") => {
    if (type === "upper") {
      setUpperCategories(upperCategories.filter((c) => c.id !== id))
    } else {
      setLowerCategories(lowerCategories.filter((c) => c.id !== id))
    }

    // Add to history
    addHistoryEntry({
      user: user?.name || "Admin",
      action: "delete",
      itemType: "category",
      itemName: name,
      details: `Deleted ${type} category: ${name}`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Categories Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>+ Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Tabs defaultValue="upper" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upper">Upper Category</TabsTrigger>
                  <TabsTrigger value="lower">Lower Category</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddCategory}>Add Category</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upper Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Upper Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input placeholder="Search upper categories..." />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upperCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>{category.id}</TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>{category.description}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id, category.name, "upper")}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Lower Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Lower Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input placeholder="Search lower categories..." />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowerCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>{category.id}</TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>{category.description}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id, category.name, "lower")}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
