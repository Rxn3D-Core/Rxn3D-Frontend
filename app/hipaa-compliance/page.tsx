"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { HIPAAAuditLogViewer } from "@/components/hipaa-audit-log-viewer"
import { HIPAAComplianceBanner } from "@/components/hipaa-compliance-banner"
import { 
  Shield, 
  Eye, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Users, 
  Database,
  Activity,
  Download,
  Settings
} from "lucide-react"

export default function HIPAACompliancePage() {
  const [activeTab, setActiveTab] = useState("overview")

  // Mock compliance data - in production this would come from your backend
  const complianceData = {
    overallScore: 87,
    lastAssessment: "2024-01-15",
    nextAssessment: "2024-04-15",
    totalUsers: 24,
    activeUsers: 18,
    totalPatients: 1247,
    securityIncidents: 0,
    auditLogs: 15420,
    dataBackups: 365,
    encryptionStatus: "Active",
    accessControls: "Enabled",
    auditTrail: "Active"
  }

  const complianceChecks = [
    { name: "SSL/TLS Encryption", status: "Pass", icon: Lock },
    { name: "Access Controls", status: "Pass", icon: Users },
    { name: "Audit Logging", status: "Pass", icon: Activity },
    { name: "Data Backup", status: "Pass", icon: Database },
    { name: "Privacy Policy", status: "Pass", icon: FileText },
    { name: "Breach Notification", status: "Pass", icon: AlertTriangle }
  ]

  const recentActivities = [
    { time: "2 minutes ago", user: "Dr. Smith", action: "Viewed patient records", patient: "P-12345" },
    { time: "5 minutes ago", user: "Lab Tech", action: "Updated case status", patient: "P-12346" },
    { time: "10 minutes ago", user: "Admin", action: "Exported audit logs", patient: "N/A" },
    { time: "15 minutes ago", user: "Dr. Johnson", action: "Created new case", patient: "P-12347" },
    { time: "1 hour ago", user: "System", action: "Automated backup completed", patient: "N/A" }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">HIPAA Compliance Dashboard</h1>
            <Badge variant="secondary" className="ml-2">
              <CheckCircle className="h-4 w-4 mr-1" />
              Compliant
            </Badge>
          </div>
          <p className="text-gray-600">
            Monitor and manage HIPAA compliance across your dental laboratory management system
          </p>
        </div>

        {/* Compliance Banner */}
        <div className="mb-6">
          <HIPAAComplianceBanner variant="info" showDetails={true} />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Compliance Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Compliance Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {complianceData.overallScore}%
                    </div>
                    <div className="text-sm text-gray-600">Overall Compliance</div>
                    <Progress value={complianceData.overallScore} className="mt-2" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      {complianceData.securityIncidents}
                    </div>
                    <div className="text-sm text-gray-600">Security Incidents</div>
                    <div className="text-xs text-green-600 mt-1">Last 30 days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-2">
                      {complianceData.auditLogs.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Audit Log Entries</div>
                    <div className="text-xs text-purple-600 mt-1">Last 30 days</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold">{complianceData.totalUsers}</div>
                      <div className="text-sm text-gray-600">Total Users</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Database className="h-8 w-8 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">{complianceData.totalPatients}</div>
                      <div className="text-sm text-gray-600">Patient Records</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Activity className="h-8 w-8 text-purple-500" />
                    <div>
                      <div className="text-2xl font-bold">{complianceData.activeUsers}</div>
                      <div className="text-sm text-gray-600">Active Users</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Download className="h-8 w-8 text-orange-500" />
                    <div>
                      <div className="text-2xl font-bold">{complianceData.dataBackups}</div>
                      <div className="text-sm text-gray-600">Backups</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compliance Checks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Compliance Checks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {complianceChecks.map((check, index) => {
                    const IconComponent = check.icon
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <IconComponent className="h-5 w-5 text-green-500" />
                        <div className="flex-1">
                          <div className="font-medium">{check.name}</div>
                          <div className="text-sm text-gray-600">{check.status}</div>
                        </div>
                        <Badge variant={check.status === "Pass" ? "default" : "destructive"}>
                          {check.status}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <div className="font-medium">{activity.user}</div>
                          <div className="text-sm text-gray-600">{activity.action}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{activity.time}</div>
                        <div className="text-xs text-gray-500">{activity.patient}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit-logs" className="space-y-6">
            <HIPAAAuditLogViewer 
              showPatientData={true}
              showUserData={true}
              showExportOptions={true}
            />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Encryption Status</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Data in Transit</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Data at Rest</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Backup Encryption</span>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Access Controls</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Multi-Factor Auth</span>
                        <Badge variant="default">Enabled</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Session Timeout</span>
                        <Badge variant="default">30 min</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed Login Lockout</span>
                        <Badge variant="default">5 attempts</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Security Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No security alerts at this time</p>
                  <p className="text-sm">All systems are operating normally</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Compliance Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Download className="h-6 w-6" />
                    <span>Export Audit Logs</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <FileText className="h-6 w-6" />
                    <span>Compliance Report</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Users className="h-6 w-6" />
                    <span>User Activity Report</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Database className="h-6 w-6" />
                    <span>Data Access Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 