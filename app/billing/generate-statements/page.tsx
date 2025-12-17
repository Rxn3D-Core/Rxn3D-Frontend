"use client"

import { useState } from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import { Search, Calendar, Filter, Download, Eye, Send, Mail } from "lucide-react"

export default function GenerateStatementsPage() {
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const statements = [
    {
      id: "1",
      statementId: "INV-354894",
      code: "SRD",
      recipient: "accountspayable@srd.com",
      dateSent: "01/29/2025",
      dueDate: "02/15/2025",
      amountDue: "$1,699",
      direction: "Outgoing",
      payment: "Overdue",
    },
    {
      id: "2",
      statementId: "INV-654789",
      code: "CSD",
      recipient: "admin@csd.com",
      dateSent: "01/29/2025",
      dueDate: "02/15/2025",
      amountDue: "$358",
      direction: "Outgoing",
      payment: "Billed",
    },
    {
      id: "3",
      statementId: "INV-447856",
      code: "NDBND",
      recipient: "admin@nellisdurango.com",
      dateSent: "01/29/2025",
      dueDate: "02/15/2025",
      amountDue: "$3,145",
      direction: "Outgoing",
      payment: "Billed",
    },
    {
      id: "4",
      statementId: "INV-664789",
      code: "RHDS",
      recipient: "payable@rhodes.com",
      dateSent: "01/29/2025",
      dueDate: "02/15/2025",
      amountDue: "$6,987",
      direction: "Outgoing",
      payment: "Paid",
    },
    {
      id: "5",
      statementId: "INV-654781",
      code: "CMD",
      recipient: "dremail@cmd.com",
      dateSent: "01/29/2025",
      dueDate: "02/15/2025",
      amountDue: "$654",
      direction: "Outgoing",
      payment: "Paid",
    },
    {
      id: "6",
      statementId: "INV-652479",
      code: "HMD",
      recipient: "useremail@hmd.com",
      dateSent: "01/29/2025",
      dueDate: "02/15/2025",
      amountDue: "$50",
      direction: "Incoming",
      payment: "Integration",
    },
  ]

  const toggleSelectAll = () => {
    if (selectedItems.length === statements.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(statements.map(statement => statement.id))
    }
  }

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Overdue":
        return "bg-red-100 text-red-800"
      case "Billed":
        return "bg-blue-100 text-blue-800"
      case "Paid":
        return "bg-green-100 text-green-800"
      case "Sent":
        return "bg-gray-100 text-gray-800"
      case "Integration":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getDirectionIcon = (direction: string) => {
    if (direction === "Outgoing") {
      return "↗"
    } else if (direction === "Incoming") {
      return "↙"
    }
    return ""
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Generate Statements</h1>
      </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-4">
                <div className="text-green-600 text-xl">↗</div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Outgoing</p>
                <p className="text-2xl font-bold text-gray-900">10</p>
                <p className="text-xs text-gray-500">Sent to offices</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-4">
                <div className="text-blue-600 text-xl">↙</div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Incoming</p>
                <p className="text-2xl font-bold text-gray-900">2</p>
                <p className="text-xs text-gray-500">From vendors</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg mr-4">
                <div className="text-red-600 text-xl">⚠</div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">1</p>
                <p className="text-xs text-gray-500">Pending payment</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg mr-4">
                <div className="text-yellow-600 text-xl">⚡</div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Disputed</p>
                <p className="text-2xl font-bold text-gray-900">1</p>
                <p className="text-xs text-gray-500">Needs attention</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by office code, email, statement ID..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full sm:w-80"
                  />
                </div>
                
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Select Date Range"
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full sm:w-48"
                  />
                </div>

                <select className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  <option>Select Direction</option>
                  <option>Outgoing</option>
                  <option>Incoming</option>
                </select>

                <select className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                  <option>Select Payment Status</option>
                  <option>Paid</option>
                  <option>Billed</option>
                  <option>Overdue</option>
                  <option>Integration</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Statements Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === statements.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statement ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statements.map((statement) => (
                  <tr key={statement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(statement.id)}
                        onChange={() => toggleSelectItem(statement.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {statement.statementId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {statement.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {statement.recipient}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {statement.dateSent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={statement.payment === "Overdue" ? "text-red-600 font-medium" : ""}>
                        {statement.dueDate}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {statement.amountDue}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="mr-2">{getDirectionIcon(statement.direction)}</span>
                        {statement.direction}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(statement.payment)}`}>
                        {statement.payment}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-blue-600 hover:text-blue-800" title="Send">
                          <Send className="h-4 w-4" />
                        </button>
                        <button className="text-blue-600 hover:text-blue-800" title="Email">
                          <Mail className="h-4 w-4" />
                        </button>
                        <button className="text-blue-600 hover:text-blue-800" title="Download">
                          <Download className="h-4 w-4" />
                        </button>
                        {statement.payment === "Overdue" && (
                          <button className="text-yellow-600 hover:text-yellow-800" title="Alert">
                            ⚠
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  )
}
