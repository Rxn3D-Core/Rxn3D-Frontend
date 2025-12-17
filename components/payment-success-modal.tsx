"use client"

import { CheckCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface PaymentSuccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  transactionId: string
}

export function PaymentSuccessModal({ open, onOpenChange, amount, transactionId }: PaymentSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-center text-xl">Payment Successful!</DialogTitle>
          <DialogDescription className="text-center">
            Your payment of ${amount} has been processed successfully.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Transaction ID:</span>
              <span className="font-medium">{transactionId}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-500">Amount:</span>
              <span className="font-medium">${amount}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-500">Status:</span>
              <span className="font-medium text-green-600">Paid</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
