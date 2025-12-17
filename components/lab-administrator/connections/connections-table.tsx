"use client"

import { useState } from "react"
import { Eye, Phone, Mail, Trash2, Check, X, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Connection {
  id: string
  name: string
  address: string
  type: "Practice" | "Lab" | "User" | "Doctor"
  phoneNumber: string
  emailAddress: string
  date: string
  status: "Connected" | "Requested" | "Pending"
}

interface ConnectionsTableProps {
  connections: Connection[]
  type: "connected" | "sent" | "received"
  onViewProfile: (connection: Connection) => void
  onAcceptConnection?: (id: string) => void
  onRejectConnection?: (id: string) => void
  onDeleteConnection?: (id: string) => void
  onResendInvitation?: (id: string, email: string) => void
}

export function ConnectionsTable({
  connections,
  type,
  onViewProfile,
  onAcceptConnection,
  onRejectConnection,
  onDeleteConnection,
  onResendInvitation,
}: ConnectionsTableProps) {
  const [selectedConnections, setSelectedConnections] = useState<string[]>([])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedConnections(connections.map((c) => c.id))
    } else {
      setSelectedConnections([])
    }
  }

  const handleSelectConnection = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedConnections([...selectedConnections, id])
    } else {
      setSelectedConnections(selectedConnections.filter((cId) => cId !== id))
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Connected":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Connected</Badge>
      case "Requested":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Requested</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const renderActionButtons = (connection: Connection) => {
    switch (type) {
      case "connected":
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Info className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onViewProfile(connection)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        )
      case "sent":
        return (
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => onResendInvitation?.(connection.id, connection.emailAddress)}
            >
              <Mail className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onDeleteConnection?.(connection.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onViewProfile(connection)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        )
      case "received":
        return (
          <div className="flex items-center gap-1">
            {connection.status === "Pending" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                  onClick={() => onAcceptConnection?.(connection.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  onClick={() => onRejectConnection?.(connection.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onDeleteConnection?.(connection.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onViewProfile(connection)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox checked={selectedConnections.length === connections.length} onCheckedChange={handleSelectAll} />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Email Address</TableHead>
            <TableHead>Date</TableHead>
            {type === "connected" && <TableHead>Status</TableHead>}
            {type === "sent" && <TableHead>Status</TableHead>}
            <TableHead className="w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connections.map((connection) => (
            <TableRow key={connection.id} className={selectedConnections.includes(connection.id) ? "bg-blue-50" : ""}>
              <TableCell>
                <Checkbox
                  checked={selectedConnections.includes(connection.id)}
                  onCheckedChange={(checked) => handleSelectConnection(connection.id, checked as boolean)}
                />
              </TableCell>
              <TableCell className="font-medium">{connection.name}</TableCell>
              <TableCell>{connection.address}</TableCell>
              <TableCell>{connection.type}</TableCell>
              <TableCell>{connection.phoneNumber}</TableCell>
              <TableCell>{connection.emailAddress}</TableCell>
              <TableCell>{connection.date}</TableCell>
              {(type === "connected" || type === "sent") && <TableCell>{getStatusBadge(connection.status)}</TableCell>}
              <TableCell>{renderActionButtons(connection)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
