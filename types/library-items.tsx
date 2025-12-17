export interface Stage {
    id: number
    name: string
    code: string
    sequence: number
    status: string
  }
  
  export interface Product {
    id: number
    name: string
    code: string
    sequence: number
    status: string
  }
  
  export interface Subcategory {
    id: number
    name: string
    code: string
    sequence: number
    status: string
    products: Product[]
  }
  
  export interface Category {
    id: number
    name: string
    code: string
    sequence: number
    status: string
    subcategories: Subcategory[]
  }
  
  export interface Grade {
    id: number
    name: string
    code: string
    sequence: number
    status: string
  }
  
  export interface Impression {
    id: number
    name: string
    code: string
    sequence: number
    status: string
  }
  
  export interface TeethShade {
    id: number
    name: string
    code: string | null
    sequence: number
    status: string
  }
  
  export interface TeethShadeBrand {
    id: number
    name: string
    code: string | null
    sequence: number
    status: string
    teeth_shades: TeethShade[]
  }
  
  export interface GumShade {
    id: number
    name: string
    code: string | null
    sequence: number
    status: string
  }
  
  export interface GumShadeBrand {
    id: number
    name: string
    code: string | null
    sequence: number
    status: string
    gum_shades: GumShade[]
  }
  
  export interface Material {
    id: number
    name: string
    code: string
    sequence: number
    status: string
  }
  
  export interface Retention {
    id: number
    name: string
    code: string
    sequence: number
    status: string
  }
  
  export interface Addon {
    id: number
    name: string
    code: string
    sequence: number
    status: string
  }
  
  export interface AddonSubcategory {
    id: number
    name: string
    code: string
    sequence: number
    status: string
    addons: Addon[]
  }
  
  export interface AddonCategory {
    id: number
    name: string
    code: string
    sequence: number
    status: string
    subcategories: AddonSubcategory[]
  }
  
  export interface LibraryItemsData {
    categories: Category[]
    grades: Grade[]
    impressions: Impression[]
    teeth_shade_brands: TeethShadeBrand[]
    gum_shade_brands: GumShadeBrand[]
    materials: Material[]
    retentions: Retention[]
    addon_categories: AddonCategory[]
  }
  
  export interface LibraryItemsResponse {
    message: string
    data: LibraryItemsData
  }
  
  export interface SelectedProduct {
    categoryId: number
    subcategoryId: number
    productId: number
    selectedStages: number[]
  }
  
  export interface ProductSelection {
    [key: string]: SelectedProduct
  }
  