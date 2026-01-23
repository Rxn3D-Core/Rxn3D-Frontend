"use client"

import { useState } from "react"
import { KpiCard } from "./kpi-card"
import { Search, Eye, Plus, Calendar, FileText, Users, Clock, CheckCircle, CirclePause, CircleOff, EllipsisVertical, MoreHorizontal, Wrench } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardSettings } from "@/hooks/use-dashboard-settings"
import { WIDGET_IDS, getCustomerId } from "@/lib/dashboard-widgets"

interface StatusCardProps {
  title: string
  count: number
  color: string
}

function StatusCard({ title, count, color }: StatusCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col items-center justify-center">
          <div className={`text-sm font-medium mb-2 ${color}`}>{title}</div>
          <div className="text-2xl font-bold">{count}</div>
          <div className="mt-2">
            <Eye className="h-4 w-4 text-[#a19d9d]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function LabUserDashboard() {
  const { user } = useAuth()
  const userRole = user?.roles?.[0] || "lab_user"
  const userId = user?.id
  const customerId = getCustomerId(user)
  const { isEnabled, enabledWidgets } = useDashboardSettings(userRole, userId, customerId)

  const [searchQuery, setSearchQuery] = useState("")
  const [casesTab, setCasesTab] = useState("active")
  const [tasksTab, setTasksTab] = useState("assigned")

  // Mock data - replace with actual API calls
  const mockCases: Array<{ id: number; patientName: string; caseType: string; status: string; date: string }> = []
  const mockTasks: Array<{ id: number; taskName: string; caseId: string; priority: string; dueDate: string }> = []

  const getStatusBadgeClass = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    switch (statusLower) {
      case "approved":
      case "completed":
        return "bg-[#c3f2cf] text-[#119933]"
      case "active":
      case "in-progress":
        return "bg-[#c3f2cf] text-[#119933]"
      case "pending":
      case "pending-review":
        return "bg-[#fff3e1] text-[#ff9500]"
      case "on-hold":
      case "on hold":
        return "bg-[#fff3e1] text-[#ff9500]"
      case "rush":
        return "bg-[#f8dddd] text-[#eb0303]"
      default:
        return "bg-[#eeeeee] text-[#a19d9d]"
    }
  }

  const getStatusLabel = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    switch (statusLower) {
      case "approved":
        return "Approved"
      case "completed":
        return "Completed"
      case "active":
      case "in-progress":
        return "In Progress"
      case "pending":
      case "pending-review":
        return "Pending Review"
      case "on-hold":
      case "on hold":
        return "On Hold"
      case "rush":
        return "Rush"
      default:
        return status || "Unknown"
    }
  }

  const getPriorityBadgeClass = (priority: string) => {
    const priorityLower = priority?.toLowerCase() || ""
    switch (priorityLower) {
      case "high":
      case "rush":
        return "bg-[#f8dddd] text-[#eb0303]"
      case "medium":
        return "bg-[#fff3e1] text-[#ff9500]"
      case "low":
        return "bg-[#c3f2cf] text-[#119933]"
      default:
        return "bg-[#eeeeee] text-[#a19d9d]"
    }
  }

  return (
    <div className="p-3 sm:p-4 bg-white min-h-screen">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header Section */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Lab User Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your assigned cases, tasks, and work progress</p>
        </div>

        {/* KPI Cards */}
        {isEnabled(WIDGET_IDS.KPI_CARDS) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <KpiCard title="Assigned Cases" value="42" change="8.5%" isPositive={true} icon="document" />
          <KpiCard title="Active Cases" value="18" change="3.2%" isPositive={true} icon="document" />
          <KpiCard title="Completed Cases" value="24" change="12.1%" isPositive={true} icon="document" />
          <KpiCard title="Completion Rate" value="92.5%" change="4.3%" isPositive={true} icon="dollar" />
        </div>
        )}

        {/* Status Cards */}
        {isEnabled(WIDGET_IDS.STATUS_CARDS) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <StatusCard title="Pending Review" count={6} color="text-orange-500" />
          <StatusCard title="In Progress" count={12} color="text-blue-500" />
          <StatusCard title="Completed" count={8} color="text-green-500" />
          <StatusCard title="On Hold" count={2} color="text-yellow-500" />
          <StatusCard title="Rush Cases" count={1} color="text-red-500" />
        </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* My Cases Section */}
          <div className="bg-white rounded-xl shadow-sm border border-[#e4e6ef] overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-[#e4e6ef] bg-[#1162a8]">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-white mb-1">My Cases</h2>
                  <p className="text-blue-100 text-xs">Cases assigned to you</p>
                </div>
                <Button
                  className="bg-white text-[#1162a8] hover:bg-blue-50 shadow-md font-medium text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">View All</span>
                  <span className="sm:hidden">All</span>
                </Button>
              </div>
            </div>

            <div className="p-3 sm:p-4 lg:p-6 border-b border-[#e4e6ef]">
              <div className="relative mb-4 sm:mb-6">
                <Input
                  type="text"
                  className="pl-8 sm:pl-10 pr-4 py-2 sm:py-3 border-[#d9d9d9] rounded-lg focus:ring-2 focus:ring-[#1162a8] focus:border-[#1162a8] text-sm sm:text-base"
                  placeholder="Search cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-[#a19d9d]" />
              </div>

              <div className="flex flex-col sm:flex-row border-b border-[#e4e6ef]">
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    casesTab === "active" 
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50" 
                      : "text-gray-500 hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => setCasesTab("active")}
                >
                  <span className="hidden sm:inline">Active Cases</span>
                  <span className="sm:hidden">Active</span>
                  <span className="block sm:inline">(0)</span>
                </button>
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    casesTab === "pending" 
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50" 
                      : "text-gray-500 hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => setCasesTab("pending")}
                >
                  <span className="hidden sm:inline">Pending Review</span>
                  <span className="sm:hidden">Pending</span>
                  <span className="block sm:inline">(0)</span>
                </button>
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    casesTab === "completed" 
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50" 
                      : "text-gray-500 hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => setCasesTab("completed")}
                >
                  <span className="hidden sm:inline">Completed</span>
                  <span className="sm:hidden">Done</span>
                  <span className="block sm:inline">(0)</span>
                </button>
              </div>
            </div>

            <div className="max-h-80 sm:max-h-96 overflow-y-auto">
              {mockCases.length > 0 ? (
                <div className="divide-y divide-[#e4e6ef]">
                  {mockCases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-6 hover:bg-[#f5f5f5] cursor-pointer transition-all duration-200 group space-y-2 sm:space-y-0"
                    >
                      <div className="flex-1">
                        <div className="text-[#1162a8] font-semibold text-base sm:text-lg group-hover:text-blue-700 transition-colors">
                          {caseItem.patientName}
                        </div>
                        <div className="text-xs sm:text-sm text-[#a19d9d] mt-1">
                          {caseItem.caseType} • {caseItem.date}
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                        <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(caseItem.status)}`}>
                          {getStatusLabel(caseItem.status)}
                        </span>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all">
                            <CirclePause className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                          <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                            <CircleOff className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                          <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                            <EllipsisVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 sm:p-12 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">No cases found</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">You don't have any assigned cases yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Tasks Section */}
          <div className="bg-white rounded-xl shadow-sm border border-[#d9d9d9] overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-[#d9d9d9] bg-[#1162a8]">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-white mb-1">My Tasks</h2>
                  <p className="text-blue-100 text-xs">Track your work assignments</p>
                </div>
                <Button
                  className="bg-white text-[#1162a8] hover:bg-blue-50 shadow-md font-medium text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">View All</span>
                  <span className="sm:hidden">All</span>
                </Button>
              </div>
            </div>

            <div className="p-3 sm:p-4 lg:p-6 border-b border-[#d9d9d9]">
              <div className="flex flex-col sm:flex-row border-b border-[#d9d9d9]">
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    tasksTab === "assigned"
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50"
                      : "text-[#a19d9d] hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => setTasksTab("assigned")}
                >
                  <span className="hidden sm:inline">Assigned</span>
                  <span className="sm:hidden">Assigned</span>
                  <span className="block sm:inline">(0)</span>
                </button>
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    tasksTab === "in-progress"
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50"
                      : "text-[#a19d9d] hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => setTasksTab("in-progress")}
                >
                  <span className="hidden sm:inline">In Progress</span>
                  <span className="sm:hidden">Progress</span>
                  <span className="block sm:inline">(0)</span>
                </button>
                <button
                  className={`flex-1 text-center py-2 sm:py-3 px-2 sm:px-4 font-medium transition-all text-sm sm:text-base ${
                    tasksTab === "completed"
                      ? "border-b-2 sm:border-b-2 border-[#1162a8] text-[#1162a8] bg-blue-50"
                      : "text-[#a19d9d] hover:text-[#1162a8] hover:bg-gray-50"
                  }`}
                  onClick={() => setTasksTab("completed")}
                >
                  <span className="hidden sm:inline">Completed</span>
                  <span className="sm:hidden">Done</span>
                  <span className="block sm:inline">(0)</span>
                </button>
              </div>
            </div>

            <div className="max-h-80 sm:max-h-96 overflow-y-auto">
              {mockTasks.length > 0 ? (
                <div className="divide-y divide-[#d9d9d9]">
                  {mockTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 sm:p-6 hover:bg-[#f5f5f5] cursor-pointer transition-all duration-200 group space-y-2 sm:space-y-0"
                    >
                      <div className="flex-1">
                        <div className="text-[#1162a8] font-semibold text-base sm:text-lg group-hover:text-emerald-600 transition-colors">
                          {task.taskName}
                        </div>
                        <div className="text-xs sm:text-sm text-[#a19d9d] mt-1">
                          Case: {task.caseId} • Due: {task.dueDate}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </span>
                        <button className="p-1.5 sm:p-2 text-[#a19d9d] hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                          <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 sm:p-12 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">No tasks found</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    {tasksTab === "assigned" 
                      ? "No tasks assigned to you yet." 
                      : tasksTab === "in-progress"
                      ? "No tasks in progress."
                      : "No completed tasks."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* More Features Coming Soon */}
        {isEnabled(WIDGET_IDS.COMING_SOON) && (
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl border border-emerald-200 p-6 sm:p-8 lg:p-12 text-center shadow-lg relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-0 left-0 w-16 h-16 sm:w-32 sm:h-32 bg-emerald-200 rounded-full opacity-20 -translate-x-8 sm:-translate-x-16 -translate-y-8 sm:-translate-y-16"></div>
          <div className="absolute bottom-0 right-0 w-20 h-20 sm:w-40 sm:h-40 bg-cyan-200 rounded-full opacity-20 translate-x-10 sm:translate-x-20 translate-y-10 sm:translate-y-20"></div>
          <div className="absolute top-1/2 left-1/4 w-3 h-3 sm:w-6 sm:h-6 bg-teal-300 rounded-full opacity-30"></div>
          <div className="absolute top-1/4 right-1/3 w-2 h-2 sm:w-4 sm:h-4 bg-emerald-300 rounded-full opacity-40"></div>
          <div className="absolute bottom-1/3 left-2/3 w-4 h-4 sm:w-8 sm:h-8 bg-cyan-300 rounded-full opacity-25"></div>
          
          <div className="max-w-lg mx-auto relative z-10">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-[#1162a8] to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-xl transform -rotate-3 hover:-rotate-6 transition-transform duration-300">
              <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white rounded-xl flex items-center justify-center">
                <Plus className="h-5 w-5 sm:h-8 sm:w-8 text-[#1162a8]" />
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#1162a8] to-emerald-600 bg-clip-text text-transparent">
                More Features Coming Soon
              </h3>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                Exciting new features to enhance your lab work experience
              </p>
              <div className="flex items-center justify-center space-x-2 mt-4 sm:mt-6">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#1162a8] rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-2 sm:gap-3">
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-full text-xs sm:text-sm font-medium text-[#1162a8] shadow-md border border-emerald-200">
                  Work Tracking
                </span>
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-full text-xs sm:text-sm font-medium text-[#1162a8] shadow-md border border-emerald-200">
                  Quality Metrics
                </span>
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-full text-xs sm:text-sm font-medium text-[#1162a8] shadow-md border border-emerald-200">
                  Performance Insights
                </span>
              </div>
            </div>
          </div>
        </div>
        )}

      {/* Empty State - When all widgets are disabled */}
      {enabledWidgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
            <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 text-center">
            Dashboard is Empty
          </h3>
          <p className="text-sm sm:text-base text-gray-600 text-center max-w-md mb-6">
            All widgets are currently hidden. Enable widgets from Dashboard Settings to customize your dashboard.
          </p>
          <Button
            onClick={() => window.location.href = "/dashboard/settings"}
            className="bg-[#1162a8] hover:bg-[#0f5497] text-white"
          >
            Go to Dashboard Settings
          </Button>
        </div>
      )}
      </div>
    </div>
  )
}







