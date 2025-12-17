"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, Plus, Trash2, Edit } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"

type PaymentMethod = {
  id: string
  type: "card" | "bank"
  name: string
  last4: string
  expiry?: string
  isDefault: boolean
}

const paymentMethods: PaymentMethod[] = [
  {
    id: "pm_1",
    type: "card",
    name: "Visa",
    last4: "4242",
    expiry: "12/2026",
    isDefault: true,
  },
  {
    id: "pm_2",
    type: "card",
    name: "Mastercard",
    last4: "5555",
    expiry: "10/2025",
    isDefault: false,
  },
]

export function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>(paymentMethods)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)

  const handleSetDefault = (id: string) => {
    setMethods(
      methods.map((method) => ({
        ...method,
        isDefault: method.id === id,
      })),
    )
  }

  const handleDelete = (method: PaymentMethod) => {
    setSelectedMethod(method)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (selectedMethod) {
      setMethods(methods.filter((method) => method.id !== selectedMethod.id))
      setIsDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Manage your payment methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {methods.map((method) => (
            <div
              key={method.id}
              className={`flex items-center justify-between p-4 border rounded-lg ${method.isDefault ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
            >
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-gray-100 p-2">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {method.name} •••• {method.last4}
                    {method.isDefault && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                        Default
                      </Badge>
                    )}
                  </div>
                  {method.expiry && <div className="text-sm text-muted-foreground">Expires {method.expiry}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!method.isDefault && (
                  <Button variant="outline" size="sm" onClick={() => handleSetDefault(method.id)}>
                    Set Default
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                  <Edit className="h-4 w-4" />
                </Button>
                {!method.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(method)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Payment Method
          </Button>
        </CardFooter>
      </Card>

      {/* Add Payment Method Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>Add a new payment method to your account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup defaultValue="card" className="space-y-3">
              <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Credit or Debit Card
                </Label>
              </div>
            </RadioGroup>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="card-number">Card Number</Label>
                <Input id="card-number" placeholder="1234 5678 9012 3456" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input id="expiry" placeholder="MM/YY" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="123" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name on Card</Label>
                <Input id="name" placeholder="John Doe" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsAddDialogOpen(false)}>Add Payment Method</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove Payment Method</DialogTitle>
            <DialogDescription>Are you sure you want to remove this payment method?</DialogDescription>
          </DialogHeader>
          {selectedMethod && (
            <div className="py-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="rounded-full bg-gray-100 p-2">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium">
                    {selectedMethod.name} •••• {selectedMethod.last4}
                  </div>
                  {selectedMethod.expiry && (
                    <div className="text-sm text-muted-foreground">Expires {selectedMethod.expiry}</div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
