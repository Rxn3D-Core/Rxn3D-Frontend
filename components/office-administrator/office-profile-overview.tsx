"use client"

import { Edit, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface OverviewTabProps {
  officeData: {
    name: string
    type: string
    id: string
    number: string
    email: string
    address: string
    phone: string
    website: string
    contactName: string
    contactEmail: string
    contactNumber: string
    joiningDate: string
    position: string
  }
}

export default function OverviewTab({ officeData }: OverviewTabProps) {
  return (
    <div className="p-6">
      <Card className="">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Office Info
            <Edit className="h-4 w-4 text-gray-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-blue-200 flex items-center justify-center bg-blue-50 overflow-hidden">
                {officeData.logo ? (
                  <img 
                    src={officeData.logo} 
                    alt="Office Logo" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-blue-600 text-2xl font-bold">
                    {officeData.name?.[0]?.toUpperCase() || "O"}
                  </span>
                )}
              </div>
              <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                <Upload className="h-4 w-4 mr-2" />
                Upload Photo
              </Button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Office Name:</label>
                <p className="font-medium text-sm">{officeData.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Office Type:</label>
                <p className="font-medium text-sm">{officeData.type}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Office ID:</label>
                <p className="font-medium text-sm">{officeData.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Office Number:</label>
                <p className="font-medium text-sm">{officeData.number}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Office email:</label>
                <p className="font-medium text-sm">{officeData.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Address:</label>
                <p className="font-medium text-sm">{officeData.address}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Phone:</label>
                <p className="font-medium text-sm">{officeData.phone}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Website:</label>
                <p className="font-medium text-blue-600 text-sm">{officeData.website}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Contact Name:</label>
                <p className="font-medium text-sm">{officeData.contactName}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Contact Email:</label>
                <p className="font-medium text-sm">{officeData.contactEmail}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Contact number:</label>
                <p className="font-medium text-sm">{officeData.contactNumber}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Joining Date:</label>
                <p className="font-medium text-sm">{officeData.joiningDate}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm text-gray-500">Position:</label>
                <p className="font-medium text-sm">{officeData.position}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
