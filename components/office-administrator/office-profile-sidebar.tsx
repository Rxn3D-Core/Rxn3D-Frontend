"use client"

import { Mail, MapPin, Phone } from "lucide-react"

interface OfficeProfileSidebarProps {
  officeData: {
    name: string
    type: string
    email: string
    address: string
    phone: string
    logo?: string
  }
}

export function OfficeProfileSidebar({ officeData }: OfficeProfileSidebarProps) {
  return (
    <div className="w-80 bg-white p-6 border-r">
      <div className="flex flex-col items-center mb-8">
        <div className="w-40 h-40 rounded-full border-2 border-gray-200 flex items-center justify-center mb-4 bg-gray-50 overflow-hidden">
          {officeData.logo ? (
            <img 
              src={officeData.logo} 
              alt="Office Logo" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <span className="text-gray-400 text-2xl font-bold">
              {officeData.name?.[0]?.toUpperCase() || "O"}
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold text-center mb-2">{officeData.name}</h2>
        <p className="text-gray-600 text-sm mb-4">{officeData.type}</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{officeData.email}</span>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
          <span className="text-sm">{officeData.address}</span>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{officeData.phone}</span>
        </div>
      </div>
    </div>
  )
}
