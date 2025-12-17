"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Mock data for category addons
const mockCategoryAddons = [
  { id: 1, categoryName: "Crowns", addonName: "Premium Finish", price: 50 },
  { id: 2, categoryName: "Bridges", addonName: "Extended Warranty", price: 75 },
  { id: 3, categoryName: "Implants", addonName: "Titanium Upgrade", price: 120 },
  { id: 4, categoryName: "Dentures", addonName: "Comfort Fit", price: 45 },
  { id: 5, categoryName: "Veneers", addonName: "Color Matching", price: 60 },
]

export function CategoryAddons() {
  const [categoryAddons, setCategoryAddons] = useState(mockCategoryAddons)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newCategoryAddon, setNewCategoryAddon] = useState({
    categoryName: "",
    addonName: "",
    price: 0,
  })

  const handleAddCategoryAddon = () => {
    const newId = categoryAddons.length > 0 ? Math.max(...categoryAddons.map((item) => item.id)) + 1 : 1
    setCategoryAddons([...categoryAddons, { id: newId, ...newCategoryAddon }])
    setNewCategoryAddon({ categoryName: "", addonName: "", price: 0 })
    setIsAddDialogOpen(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Category Add-ons</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New Category Add-on</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category Add-on</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoryName" className="text-right">
                  Category
                </Label>
                <Input
                  id="categoryName"
                  value={newCategoryAddon.categoryName}
                  onChange={(e) => setNewCategoryAddon({ ...newCategoryAddon, categoryName: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="addonName" className="text-right">
                  Add-on Name
                </Label>
                <Input
                  id="addonName"
                  value={newCategoryAddon.addonName}
                  onChange={(e) => setNewCategoryAddon({ ...newCategoryAddon, addonName: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Price
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={newCategoryAddon.price}
                  onChange={(e) =>
                    setNewCategoryAddon({ ...newCategoryAddon, price: Number.parseFloat(e.target.value) })
                  }
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAddCategoryAddon}>Add Category Add-on</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Add-on Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryAddons.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell>{item.categoryName}</TableCell>
                <TableCell>{item.addonName}</TableCell>
                <TableCell>${item.price.toFixed(2)}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" className="mr-2">
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setCategoryAddons(categoryAddons.filter((addon) => addon.id !== item.id))}
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
  )
}
