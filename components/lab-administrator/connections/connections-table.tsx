"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Eye, Phone, Mail, Trash2, Check, X, Info, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useConnectionHoldActions } from "@/components/dashboard/connection-hold-button"
import type { ConnectionHold } from "@/contexts/connection-context"

interface Connection {
  id: string
  /** lab_offices row id — required for hold/resume on Connected tab */
  connectionId?: number
  name: string
  address: string
  type: "Practice" | "Lab" | "User" | "Doctor"
  phoneNumber: string
  emailAddress: string
  date: string
  status: "Connected" | "OnHold" | "Requested" | "Pending"
  /** API `hold` block for the Connected tab (absent on an old backend). */
  hold?: ConnectionHold | null
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
      case "OnHold":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">On Hold</Badge>
      case "Requested":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Requested</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const renderConnectedStatus = (connection: Connection) => {
    if (!connection.connectionId) {
      return getStatusBadge(connection.status)
    }
    return <ConnectedStatusMenu connection={connection} connectionId={connection.connectionId} />
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
            <TableRow
              key={connection.connectionId ?? connection.id}
              className={selectedConnections.includes(connection.id) ? "bg-blue-50" : ""}
            >
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
              {type === "connected" && <TableCell>{renderConnectedStatus(connection)}</TableCell>}
              {type === "sent" && <TableCell>{getStatusBadge(connection.status)}</TableCell>}
              <TableCell>{renderActionButtons(connection)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Status badge + Hold / Resume / Request to Resume dropdown for one connected row. */
function ConnectedStatusMenu({ connection, connectionId }: { connection: Connection; connectionId: number }) {
  const actions = useConnectionHoldActions(
    { id: connectionId, status: connection.status, hold: connection.hold },
    connection.type === "Lab" ? "lab" : connection.type === "Practice" ? "office" : "partner",
  )
  const { t } = useTranslation()
  const onHold = actions.state.onHold
  const badge = (
    <Badge
      data-testid="connections-table-status-badge"
      className={
        onHold
          ? "bg-orange-100 text-orange-800 hover:bg-orange-100 whitespace-nowrap"
          : "bg-green-100 text-green-800 hover:bg-green-100 whitespace-nowrap"
      }
    >
      {actions.badgeLabel}
    </Badge>
  )

  const hasActions = onHold
    ? actions.canResume || actions.requestPending || actions.canRequestResume
    : actions.canHold
  if (!hasActions) return badge

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={actions.busy}>
        <button
          type="button"
          data-testid="connections-table-status-trigger"
          className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          aria-label={t("connections.hold.changeStatus")}
        >
          {badge}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {!onHold && (
          <DropdownMenuItem data-testid="connections-table-hold" disabled={actions.busy} onSelect={actions.hold}>
            {t("connections.hold.hold")}
          </DropdownMenuItem>
        )}
        {onHold && actions.canResume && (
          <DropdownMenuItem data-testid="connections-table-resume" disabled={actions.busy} onSelect={actions.resume}>
            {t("connections.hold.resume")}
          </DropdownMenuItem>
        )}
        {onHold && !actions.canResume && actions.requestPending && (
          <DropdownMenuItem data-testid="connections-table-requested" disabled title={actions.requestAvailableLabel}>
            {actions.requestedLabel}
          </DropdownMenuItem>
        )}
        {onHold && !actions.canResume && !actions.requestPending && actions.canRequestResume && (
          <DropdownMenuItem
            data-testid="connections-table-request-resume"
            disabled={actions.busy}
            onSelect={actions.requestResume}
          >
            {t("connections.hold.requestResume")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
