"use client"

import { useState, useRef } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkingHoursModal } from "@/components/lab-administrator/calendar/working-hours-modal"

export function TagsSection() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tags, setTags] = useState([
    { name: "Holiday", color: "bg-yellow-400" },
    { name: "Birthday", color: "bg-blue-500" },
    { name: "Appointment", color: "bg-red-500" },
  ])
  const [showAddTag, setShowAddTag] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("bg-yellow-400")
  const inputRef = useRef<HTMLInputElement>(null)

  function openWorkingHoursModal(): void {
    setIsModalOpen(true)
  }

  function handleAddTagClick() {
    setShowAddTag(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  function handleAddTagSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newTagName.trim()) return
    setTags([...tags, { name: newTagName.trim(), color: newTagColor }])
    setNewTagName("")
    setNewTagColor("bg-yellow-400")
    setShowAddTag(false)
  }

  function handleCancelAddTag() {
    setShowAddTag(false)
    setNewTagName("")
    setNewTagColor("bg-yellow-400")
  }

  return (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="font-medium text-sm mb-3">Tags</h3>
      <div className="space-y-2">
        {tags.map((tag) => (
          <div key={tag.name} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${tag.color}`} />
            <span className="text-sm text-gray-700">{tag.name}</span>
          </div>
        ))}
        {showAddTag ? (
          <form className="flex items-center gap-2" onSubmit={handleAddTagSubmit}>
            <input
              ref={inputRef}
              className="border rounded px-2 py-1 text-sm w-28"
              placeholder="Tag name"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              maxLength={20}
              required
            />
            <select
              className="border rounded px-1 py-1 text-sm"
              value={newTagColor}
              onChange={e => setNewTagColor(e.target.value)}
            >
              <option value="bg-yellow-400">Yellow</option>
              <option value="bg-blue-500">Blue</option>
              <option value="bg-red-500">Red</option>
              <option value="bg-green-500">Green</option>
              <option value="bg-purple-500">Purple</option>
              <option value="bg-pink-400">Pink</option>
              <option value="bg-gray-400">Gray</option>
            </select>
            <button type="submit" className="text-blue-600 hover:underline text-xs">Add</button>
            <button type="button" className="text-gray-400 hover:text-gray-600 text-xs" onClick={handleCancelAddTag}>Cancel</button>
          </form>
        ) : (
          <button type="button" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600" onClick={handleAddTagClick}>
            <Plus className="h-3 w-3" />
            Add new Tags
          </button>
        )}
      </div>

      <Button
        className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
        onClick={() => openWorkingHoursModal()}
      >
        Working Hours
      </Button>

      <WorkingHoursModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </div>
  )
}
