"use client"

import { useState } from "react"
import { useLabAdmin } from "@/contexts/lab-admin-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"

// Mock data for addons
const mockAddons = [
  { id: 1, name: "Premium Finish", description: "High-quality finish for better aesthetics", price: 50 },
  { id: 2, name: "Extended Warranty", description: "Additional 2 years of warranty coverage", price: 75 },
  { id: 3, name: "Titanium Upgrade", description: "Upgrade to titanium material for better durability", price: 120 },
  { id: 4, name: "Comfort Fit", description: "Enhanced comfort for daily wear", price: 45 },
  { id: 5, name: "Color Matching", description: "Perfect color matching with natural teeth", price: 60 },
]

export function Addons() {
  const { user } = useAuth()
  const { addHistoryEntry } = useLabAdmin()
  const [addons, setAddons] = useState(mockAddons)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newAddon, setNewAddon] = useState({
    name: "",
    description: "",
    price: 0,
  })

  const handleAddAddon = () => {
    if (!newAddon.name) return

    const newId = addons.length > 0 ? Math.max(...addons.map((item) => item.id)) + 1 : 1
    const addonToAdd = { id: newId, ...newAddon }

    setAddons([...addons, addonToAdd])

    // Add to history
    addHistoryEntry({
      user: user?.name || "Admin",
      action: "create",
      itemType: "addon",
      itemName: newAddon.name,
      details: `Created new add-on: ${newAddon.name} - $${newAddon.price}`,
    })

    setNewAddon({ name: "", description: "", price: 0 })
    setIsAddDialogOpen(false)
  }

  const handleDeleteAddon = (id: number, name: string) => {
    setAddons(addons.filter((addon) => addon.id !== id))

    // Add to history
    addHistoryEntry({
      user: user?.name || "Admin",
      action: "delete",
      itemType: "addon",
      itemName: name,
      details: `Deleted add-on: ${name}`,
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Add-ons</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New Add-on</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Add-on</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newAddon.name}
                  onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newAddon.description}
                  onChange={(e) => setNewAddon({ ...newAddon, description: e.target.value })}
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
                  value={newAddon.price}
                  onChange={(e) => setNewAddon({ ...newAddon, price: Number.parseFloat(e.target.value) })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddAddon}>Add Add-on</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input placeholder="Search add-ons..." />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addons.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>${item.price.toFixed(2)}</TableCell>
                <TableCell>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteAddon(item.id, item.name)}>
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
