"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { Download, Search, Filter, Eye, AlertTriangle, CheckCircle } from "lucide-react"
import { AuditLogEntry, hipaaAuditLogger } from "@/lib/hipaa-audit-logger"

interface HIPAAAuditLogViewerProps {
  showPatientData?: boolean
  showUserData?: boolean
  showExportOptions?: boolean
}

export function HIPAAAuditLogViewer({ 
  showPatientData = true,
  showUserData = true,
  showExportOptions = true
}: HIPAAAuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [successFilter, setSuccessFilter] = useState("all")
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [selectedPatientId, setSelectedPatientId] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")

  // Load logs on component mount
  useEffect(() => {
    loadLogs()
  }, [])

  // Apply filters when any filter changes
  useEffect(() => {
    applyFilters()
  }, [logs, searchTerm, actionFilter, successFilter, startDate, endDate, selectedPatientId, selectedUserId])

  const loadLogs = () => {
    const allLogs = hipaaAuditLogger.getAuditLogs()
    setLogs(allLogs)
  }

  const applyFilters = () => {
    let filtered = [...logs]

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(log => log.timestamp >= startDate)
    }
    if (endDate) {
      filtered = filtered.filter(log => log.timestamp <= endDate)
    }

    // Action filter
    if (actionFilter !== "all") {
      filtered = filtered.filter(log => log.action === actionFilter)
    }

    // Success filter
    if (successFilter !== "all") {
      const success = successFilter === "success"
      filtered = filtered.filter(log => log.success === success)
    }

    // Patient filter
    if (selectedPatientId) {
      filtered = filtered.filter(log => log.patientId === selectedPatientId)
    }

    // User filter
    if (selectedUserId) {
      filtered = filtered.filter(log => log.userId === selectedUserId)
    }

    // Search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(log => 
        log.userId.toLowerCase().includes(term) ||
        log.userRole.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        log.resource.toLowerCase().includes(term) ||
        log.details?.toLowerCase().includes(term) ||
        log.patientId?.toLowerCase().includes(term)
      )
    }

    setFilteredLogs(filtered)
  }

  const exportLogs = (format: 'json' | 'csv') => {
    const data = format === 'json' 
      ? JSON.stringify(filteredLogs, null, 2)
      : convertToCSV(filteredLogs)

    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hipaa-audit-logs-${new Date().toISOString().split('T')[0]}.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const convertToCSV = (logs: AuditLogEntry[]): string => {
    const headers = ['Timestamp', 'User ID', 'User Role', 'Action', 'Resource', 'Patient ID', 'Success', 'IP Address', 'Details']
    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.userId,
      log.userRole,
      log.action,
      log.resource,
      log.patientId || '',
      log.success ? 'Yes' : 'No',
      log.ipAddress || '',
      log.details || ''
    ])
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
      case 'LOGOUT':
        return <Eye className="h-4 w-4" />
      case 'EXPORT':
        return <Download className="h-4 w-4" />
      case 'CREATE':
      case 'UPDATE':
      case 'DELETE':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Eye className="h-4 w-4" />
    }
  }

  const getSuccessBadge = (success: boolean) => {
    return success ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            HIPAA Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="EXPORT">Export</SelectItem>
                  <SelectItem value="VIEW">View</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={successFilter} onValueChange={setSuccessFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showPatientData && (
              <div>
                <label className="text-sm font-medium mb-2 block">Patient ID</label>
                <Input
                  placeholder="Filter by patient..."
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* Export Options */}
          {showExportOptions && (
            <div className="flex gap-2 mb-6">
              <Button onClick={() => exportLogs('json')} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button onClick={() => exportLogs('csv')} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={loadLogs} variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}

          {/* Results Summary */}
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} total logs
          </div>

          {/* Logs Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  {showPatientData && <TableHead>Patient ID</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {log.timestamp.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.userId}</div>
                        <div className="text-sm text-gray-500">{log.userRole}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="text-sm">{log.action}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{log.resource}</TableCell>
                    {showPatientData && (
                      <TableCell className="text-sm">
                        {log.patientId ? (
                          <Badge variant="outline">{log.patientId}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>{getSuccessBadge(log.success)}</TableCell>
                    <TableCell className="text-sm">{log.ipAddress || '-'}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {log.details || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No audit logs found matching the current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 