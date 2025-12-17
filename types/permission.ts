export interface Permission {
  id: string
  name: string
  description: string
  category: string
  isActive: boolean
  roles: string[]
}

export interface Role {
  id: string
  name: string
  description: string
  permissionCount: number
  userCount: number
  isDefault: boolean
}

export interface UserPermission {
  id: string
  name: string
  email: string
  role: string
  department: string
  lastActive: string
  avatar?: string
}
