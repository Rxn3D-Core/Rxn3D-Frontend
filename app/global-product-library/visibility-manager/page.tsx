"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, ChevronUp, ChevronDown, Info } from "lucide-react"
import { AddVisibilityModal } from "@/components/product-management/add-visibility-modal"
import { CreateVisibilityGroupModal } from "@/components/product-management/create-visibility-group-modal"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"

interface VisibilityItem {
  id: string
  item: string
  type: string
  visibilityManagement: "All Offices" | "Selected" | "Hidden"
  selected: boolean
}

interface VisibilityGroup {
  id: string
  name: string
  selected: boolean
}

export default function VisibilityManagerPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{
    key: keyof VisibilityItem | null
    direction: "asc" | "desc"
  }>({ key: null, direction: "asc" })
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false)
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false)
  const [selectedVisibilityItem, setSelectedVisibilityItem] = useState<VisibilityItem | null>(null)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = (id: number) => {
    setDeleteTargetId(id)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    // await deleteVisibilityGroup(deleteTargetId) // implement your delete logic
    setIsDeleting(false)
    setIsDeleteModalOpen(false)
    setDeleteTargetId(null)
  }

  const [visibilityItems, setVisibilityItems] = useState<VisibilityItem[]>([
    { id: "1", item: "Item 01", type: "Retention", visibilityManagement: "All Offices", selected: false },
    { id: "2", item: "Item 02", type: "Stages", visibilityManagement: "All Offices", selected: false },
    { id: "3", item: "Item 03", type: "Product", visibilityManagement: "All Offices", selected: false },
    { id: "4", item: "Item 014", type: "Add-on", visibilityManagement: "All Offices", selected: false },
    { id: "5", item: "Item 024", type: "Add-on", visibilityManagement: "All Offices", selected: false },
    { id: "6", item: "Item 056", type: "Product", visibilityManagement: "All Offices", selected: false },
    { id: "7", item: "Item 0187", type: "Stages", visibilityManagement: "Selected", selected: false },
    { id: "8", item: "Item 0134", type: "Product", visibilityManagement: "Selected", selected: false },
    { id: "9", item: "Item 0145", type: "Grades", visibilityManagement: "Selected", selected: false },
    { id: "10", item: "Item 0165", type: "Impression", visibilityManagement: "Selected", selected: false },
    { id: "11", item: "Item 01778", type: "Product", visibilityManagement: "Selected", selected: false },
    { id: "12", item: "Item 0132", type: "Product", visibilityManagement: "Hidden", selected: false },
    { id: "13", item: "Item 01335", type: "Add-on", visibilityManagement: "Hidden", selected: false },
    { id: "14", item: "Item 016", type: "Add-on", visibilityManagement: "Hidden", selected: false },
    { id: "15", item: "Item 0156", type: "Stages", visibilityManagement: "Hidden", selected: false },
    { id: "16", item: "Item 0177", type: "Stages", visibilityManagement: "Hidden", selected: false },
  ])

  const [visibilityGroups, setVisibilityGroups] = useState<VisibilityGroup[]>([
    { id: "1", name: "PDG Offices", selected: false },
    { id: "2", name: "Independent Offices", selected: false },
    { id: "3", name: "Heartland Offices", selected: false },
    { id: "4", name: "Smile Connect Offices", selected: false },
  ])

  const filteredItems = visibilityItems.filter(
    (item) =>
      item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortConfig.key) return 0

    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1
    return 0
  })

  const handleSort = (key: keyof VisibilityItem) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }

  const handleOpenCreateVisibilityModal = () => {
    setIsVisibilityModalOpen(true)
  }

  const handleSelectAllItems = (checked: boolean) => {
    if (checked) {
      setSelectedItems(sortedItems.map((item) => item.id))
      setVisibilityItems((prev) => prev.map((item) => ({ ...item, selected: true })))
    } else {
      setSelectedItems([])
      setVisibilityItems((prev) => prev.map((item) => ({ ...item, selected: false })))
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId])
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId))
    }
    setVisibilityItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, selected: checked } : item)))
  }

  const handleSelectAllGroups = (checked: boolean) => {
    if (checked) {
      setSelectedGroups(visibilityGroups.map((group) => group.id))
      setVisibilityGroups((prev) => prev.map((group) => ({ ...group, selected: true })))
    } else {
      setSelectedGroups([])
      setVisibilityGroups((prev) => prev.map((group) => ({ ...group, selected: false })))
    }
  }

  const handleSelectGroup = (groupId: string, checked: boolean) => {
    if (checked) {
      setSelectedGroups((prev) => [...prev, groupId])
    } else {
      setSelectedGroups((prev) => prev.filter((id) => id !== groupId))
    }
    setVisibilityGroups((prev) => prev.map((group) => (group.id === groupId ? { ...group, selected: checked } : group)))
  }

  const handleEditVisibility = (item: VisibilityItem) => {
    setSelectedVisibilityItem(item)
    setIsVisibilityModalOpen(true)
  }

  const getSortIcon = (key: keyof VisibilityItem) => {
    if (sortConfig.key !== key) {
      return <div className="w-4 h-4" />
    }
    return sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                  <option>20</option>
                  <option>50</option>
                  <option>100</option>
                </select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button className="bg-[#1162a8] hover:bg-[#0f5597]">Import visibility</Button>
              <Button className="bg-[#1162a8] hover:bg-[#0f5597]"
               onClick={handleOpenCreateVisibilityModal}>
                + Add visibility
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search Product"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="w-12 px-6 py-3">
                  <Checkbox
                    checked={selectedItems.length === sortedItems.length && sortedItems.length > 0}
                    onCheckedChange={handleSelectAllItems}
                  />
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort("item")}
                    className="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700"
                  >
                    Item
                    {getSortIcon("item")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort("type")}
                    className="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700"
                  >
                    Type
                    {getSortIcon("type")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort("visibilityManagement")}
                    className="flex items-center gap-2 font-medium text-gray-900 hover:text-gray-700"
                  >
                    Visibility Management
                    {getSortIcon("visibilityManagement")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEditVisibility(item)}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                    />
                  </td>
                  <td className="px-6 py-4 text-gray-900">{item.item}</td>
                  <td className="px-6 py-4 text-gray-600">{item.type}</td>
                  <td className="px-6 py-4 text-gray-900">{item.visibilityManagement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Sidebar - Visibility Groups */}
      <div className="w-80 bg-white border-l flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedGroups.length === visibilityGroups.length && visibilityGroups.length > 0}
                onCheckedChange={handleSelectAllGroups}
              />
              <span className="font-medium text-gray-900">Visibility Group</span>
              <Info className="w-4 h-4 text-gray-400" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="text-[#1162a8] border-[#1162a8] hover:bg-[#1162a8] hover:text-white"
            >
              Create Group
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {visibilityGroups.map((group) => (
            <div key={group.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b">
              <Checkbox
                checked={group.selected}
                onCheckedChange={(checked) => handleSelectGroup(group.id, checked as boolean)}
              />
              <span className="flex-1 text-sm text-gray-900">{group.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <AddVisibilityModal
        isOpen={isVisibilityModalOpen}
        onClose={() => setIsVisibilityModalOpen(false)}
        item={selectedVisibilityItem}
      />

      <CreateVisibilityGroupModal isOpen={isCreateGroupModalOpen} onClose={() => setIsCreateGroupModalOpen(false)} />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        itemName="visibility group"
        isLoading={isDeleting}
      />
    </div>
  )
}
