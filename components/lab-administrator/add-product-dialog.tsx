"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface AddProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Is this a single-stage product?</Label>
              <RadioGroup defaultValue="yes" className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="yes" />
                  <Label htmlFor="yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="no" />
                  <Label htmlFor="no">No</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Product Type</Label>
              <RadioGroup defaultValue="upper" className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="upper" id="type-upper" />
                  <Label htmlFor="type-upper">Upper</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lower" id="type-lower" />
                  <Label htmlFor="type-lower">Lower</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="type-both" />
                  <Label htmlFor="type-both">Both</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Select Grades</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="mid-grade" />
                  <Label htmlFor="mid-grade">Mid Grade</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="high-noble" />
                  <Label htmlFor="high-noble">High Noble Alloy</Label>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="premium" />
                  <Label htmlFor="premium">Premium</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="non-precious" />
                  <Label htmlFor="non-precious">Non precious</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Gum Shades</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Flexible/TCS</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox id="standard-pink" />
                  <Label htmlFor="standard-pink">Standard pink</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="light-pink" />
                  <Label htmlFor="light-pink">Light pink</Label>
                </div>
              </div>

              {/* Add other gum shade sections */}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">Submit</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
