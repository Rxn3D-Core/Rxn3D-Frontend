export interface ProductCategory {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductMaterial {
  id: string
  name: string
  description?: string
  inStock: boolean
  quantity?: number
  reorderLevel?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductShade {
  id: string
  name: string
  code: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DentalProduct {
  id: string
  name: string
  sku: string
  description?: string
  categoryId: string
  category?: ProductCategory
  price: number
  cost?: number
  materialIds?: string[]
  materials?: ProductMaterial[]
  shadeIds?: string[]
  shades?: ProductShade[]
  turnaroundTime?: number // in days
  requiresImpression: boolean
  requiresShade: boolean
  isActive: boolean
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface ProductFilter {
  search?: string
  categoryId?: string
  isActive?: boolean
  requiresImpression?: boolean
  requiresShade?: boolean
  minPrice?: number
  maxPrice?: number
  materialIds?: string[]
  shadeIds?: string[]
}

export interface ProductsResponse {
  products: DentalProduct[]
  total: number
  page: number
  limit: number
}
