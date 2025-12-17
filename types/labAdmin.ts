export interface Category {
  id: number
  name: string
  description: string
}

export interface Product {
  id: number
  name: string
  category: string
  price: number
  description: string
}

export interface Addon {
  id: number
  name: string
  description: string
  price: number
}

export interface Department {
  id: number
  name: string
  description: string
  staffCount: number
  status: "Active" | "Inactive"
}

export interface Staff {
  id: number
  name: string
  email: string
  phone: string
  department: string
  position: string
  hireDate: string
  status: "Active" | "Inactive"
  avatar?: string
}

export interface Grade {
  id: number
  name: string
  code: string
  description: string
  status: "Active" | "Inactive"
}

export interface HistoryLogEntry {
  id: number
  timestamp: string
  user: string
  action: "create" | "update" | "delete" | "view"
  itemType: string
  itemName: string
  details: string
}

export interface CallLogEntry {
  id: number
  timestamp: string
  caller: string
  recipient: string
  duration: string
  subject: string
  notes: string
  status: "Completed" | "Pending" | "Missed" | "Scheduled"
  followUpDate?: string
}

export interface LabAdmin {
  id: number
  name: string
  email: string
  phone: string
  role: string
  lastLogin: string
  status: "Active" | "Inactive"
  avatar?: string
}
