"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AddCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCategoryDialog({ open, onOpenChange }: AddCategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" />
          </div>

          <div className="grid gap-2">
            <Label>Casespan</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select casespan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular cases</SelectItem>
                <SelectItem value="rush">Rush cases</SelectItem>
                <SelectItem value="ortho">Ortho</SelectItem>
                <SelectItem value="appointments">Appointments</SelectItem>
                <SelectItem value="crowns">Crowns & Bridges</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Category Type</Label>
            <RadioGroup defaultValue="upper">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upper" id="upper" />
                <Label htmlFor="upper">Upper</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lower" id="lower" />
                <Label htmlFor="lower">Lower</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both">Both</Label>
              </div>
            </RadioGroup>
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
