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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"

// Mock data for products
const mockUpperProducts = [
  { id: 1, name: "PFM Crown", category: "Crowns", price: 250, description: "Porcelain-fused-to-metal crown" },
  { id: 2, name: "Zirconia Crown", category: "Crowns", price: 300, description: "Full zirconia crown" },
  { id: 3, name: "3-Unit Bridge", category: "Bridges", price: 750, description: "3-unit porcelain bridge" },
]

const mockLowerProducts = [
  { id: 1, name: "Titanium Implant", category: "Implants", price: 450, description: "Titanium dental implant" },
  { id: 2, name: "Porcelain Veneer", category: "Veneers", price: 350, description: "Custom porcelain veneer" },
  { id: 3, name: "Clear Aligner", category: "Aligners", price: 200, description: "Custom clear aligner" },
]

export function Products() {
  const { user } = useAuth()
  const { addHistoryEntry } = useLabAdmin()
  const [upperProducts, setUpperProducts] = useState(mockUpperProducts)
  const [lowerProducts, setLowerProducts] = useState(mockLowerProducts)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("upper")
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: 0,
    description: "",
  })

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.category) return

    const newId =
      activeTab === "upper"
        ? upperProducts.length > 0
          ? Math.max(...upperProducts.map((p) => p.id)) + 1
          : 1
        : lowerProducts.length > 0
          ? Math.max(...lowerProducts.map((p) => p.id)) + 1
          : 1

    const productToAdd = { id: newId, ...newProduct }

    if (activeTab === "upper") {
      setUpperProducts([...upperProducts, productToAdd])
    } else {
      setLowerProducts([...lowerProducts, productToAdd])
    }

    // Add to history
    addHistoryEntry({
      user: user?.name || "Admin",
      action: "create",
      itemType: "product",
      itemName: newProduct.name,
      details: `Created new ${activeTab} product: ${newProduct.name} (${newProduct.category}) - $${newProduct.price}`,
    })

    setNewProduct({ name: "", category: "", price: 0, description: "" })
    setIsAddDialogOpen(false)
  }

  const handleDeleteProduct = (id: number, name: string, type: "upper" | "lower") => {
    if (type === "upper") {
      setUpperProducts(upperProducts.filter((p) => p.id !== id))
    } else {
      setLowerProducts(lowerProducts.filter((p) => p.id !== id))
    }

    // Add to history
    addHistoryEntry({
      user: user?.name || "Admin",
      action: "delete",
      itemType: "product",
      itemName: name,
      details: `Deleted ${type} product: ${name}`,
    })
  }

  // Get categories based on active tab
  const getCategories = () => {
    return activeTab === "upper"
      ? [...new Set(mockUpperCategories.map((c) => c.name))]
      : [...new Set(mockLowerCategories.map((c) => c.name))]
  }

  // Mock categories for the select dropdown
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Products Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>+ Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Tabs defaultValue="upper" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upper">Upper Product</TabsTrigger>
                  <TabsTrigger value="lower">Lower Product</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Select
                  value={newProduct.category}
                  onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Price ($)
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddProduct}>Add Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upper Products */}
        <Card>
          <CardHeader>
            <CardTitle>Upper Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input placeholder="Search upper products..." />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upperProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.id}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell>{product.description}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteProduct(product.id, product.name, "upper")}
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

        {/* Lower Products */}
        <Card>
          <CardHeader>
            <CardTitle>Lower Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input placeholder="Search lower products..." />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowerProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.id}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell>{product.description}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteProduct(product.id, product.name, "lower")}
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
