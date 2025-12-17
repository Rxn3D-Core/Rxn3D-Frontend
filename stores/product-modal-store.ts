import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface ProductCategory {
  id: number
  name: string
  sub_name?: string
  code: string
  type: string
  sequence: number
  status: string
  parent_id: number | null
  case_pan_id?: number | null
  created_at: string
  updated_at: string
  sub_categories?: ProductCategory[]
  is_sub_category?: boolean
  image_url?: string
}

export interface Product {
  id: number
  name: string
  code: string
  category_name: string
  subcategory_name?: string
  stage_type: string
  grades?: any[]
  image?: string
  [key: string]: any
}

interface ProductModalState {
  // Categories data
  allCategories: ProductCategory[]
  allCategoriesLoading: boolean
  allCategoriesError: string | null
  categoriesLastFetched: number | null
  categoriesLanguage: string | null
  
  // Subcategories data
  subcategoriesByCategory: Record<number, ProductCategory[]>
  subcategoriesLoading: Record<number, boolean>
  subcategoriesError: Record<number, string | null>
  subcategoriesLastFetched: Record<number, number>
  subcategoriesLanguage: Record<number, string>
  
  // Products data
  products: Record<string, Product[]>
  productsLoading: Record<string, boolean>
  productsError: Record<string, string | null>
  productsLastFetched: Record<string, number>
  
  // Cache settings
  cacheExpiry: number // in milliseconds (default: 5 minutes)
  
  // Actions
  setAllCategories: (categories: ProductCategory[], language: string) => void
  setAllCategoriesLoading: (loading: boolean) => void
  setAllCategoriesError: (error: string | null) => void
  
  setSubcategories: (categoryId: number, subcategories: ProductCategory[], language: string) => void
  setSubcategoriesLoading: (categoryId: number, loading: boolean) => void
  setSubcategoriesError: (categoryId: number, error: string | null) => void
  
  setProducts: (params: string, products: Product[]) => void
  setProductsLoading: (params: string, loading: boolean) => void
  setProductsError: (params: string, error: string | null) => void
  
  // Cache management
  isCategoriesCacheValid: (language: string) => boolean
  isSubcategoriesCacheValid: (categoryId: number, language: string) => boolean
  isProductsCacheValid: (params: string) => boolean
  
  // Clear cache
  clearCache: () => void
  clearCategoriesCache: () => void
  clearSubcategoriesCache: (categoryId?: number) => void
  clearProductsCache: (params?: string) => void
}

export const useProductModalStore = create<ProductModalState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        allCategories: [],
        allCategoriesLoading: false,
        allCategoriesError: null,
        categoriesLastFetched: null,
        categoriesLanguage: null,
        
        subcategoriesByCategory: {},
        subcategoriesLoading: {},
        subcategoriesError: {},
        subcategoriesLastFetched: {},
        subcategoriesLanguage: {},
        
        products: {},
        productsLoading: {},
        productsError: {},
        productsLastFetched: {},
        
        cacheExpiry: 5 * 60 * 1000, // 5 minutes
        
        // Categories actions
        setAllCategories: (categories, language) => set({
          allCategories: categories,
          allCategoriesLoading: false,
          allCategoriesError: null,
          categoriesLastFetched: Date.now(),
          categoriesLanguage: language
        }),
        
        setAllCategoriesLoading: (loading) => set({
          allCategoriesLoading: loading,
          allCategoriesError: loading ? null : get().allCategoriesError
        }),
        
        setAllCategoriesError: (error) => set({
          allCategoriesError: error,
          allCategoriesLoading: false
        }),
        
        // Subcategories actions
        setSubcategories: (categoryId, subcategories, language) => set((state) => ({
          subcategoriesByCategory: {
            ...state.subcategoriesByCategory,
            [categoryId]: subcategories
          },
          subcategoriesLoading: {
            ...state.subcategoriesLoading,
            [categoryId]: false
          },
          subcategoriesError: {
            ...state.subcategoriesError,
            [categoryId]: null
          },
          subcategoriesLastFetched: {
            ...state.subcategoriesLastFetched,
            [categoryId]: Date.now()
          },
          subcategoriesLanguage: {
            ...state.subcategoriesLanguage,
            [categoryId]: language
          }
        })),
        
        setSubcategoriesLoading: (categoryId, loading) => set((state) => ({
          subcategoriesLoading: {
            ...state.subcategoriesLoading,
            [categoryId]: loading
          },
          subcategoriesError: loading ? {
            ...state.subcategoriesError,
            [categoryId]: null
          } : state.subcategoriesError
        })),
        
        setSubcategoriesError: (categoryId, error) => set((state) => ({
          subcategoriesError: {
            ...state.subcategoriesError,
            [categoryId]: error
          },
          subcategoriesLoading: {
            ...state.subcategoriesLoading,
            [categoryId]: false
          }
        })),
        
        // Products actions
        setProducts: (params, products) => set((state) => ({
          products: {
            ...state.products,
            [params]: products
          },
          productsLoading: {
            ...state.productsLoading,
            [params]: false
          },
          productsError: {
            ...state.productsError,
            [params]: null
          },
          productsLastFetched: {
            ...state.productsLastFetched,
            [params]: Date.now()
          }
        })),
        
        setProductsLoading: (params, loading) => set((state) => ({
          productsLoading: {
            ...state.productsLoading,
            [params]: loading
          },
          productsError: loading ? {
            ...state.productsError,
            [params]: null
          } : state.productsError
        })),
        
        setProductsError: (params, error) => set((state) => ({
          productsError: {
            ...state.productsError,
            [params]: error
          },
          productsLoading: {
            ...state.productsLoading,
            [params]: false
          }
        })),
        
        // Cache validation
        isCategoriesCacheValid: (language) => {
          const state = get()
          return (
            state.categoriesLanguage === language &&
            state.categoriesLastFetched !== null &&
            (Date.now() - state.categoriesLastFetched) < state.cacheExpiry
          )
        },
        
        isSubcategoriesCacheValid: (categoryId, language) => {
          const state = get()
          return (
            state.subcategoriesLanguage[categoryId] === language &&
            state.subcategoriesLastFetched[categoryId] !== undefined &&
            (Date.now() - state.subcategoriesLastFetched[categoryId]) < state.cacheExpiry
          )
        },
        
        isProductsCacheValid: (params) => {
          const state = get()
          return (
            state.productsLastFetched[params] !== undefined &&
            (Date.now() - state.productsLastFetched[params]) < state.cacheExpiry
          )
        },
        
        // Cache clearing
        clearCache: () => set({
          allCategories: [],
          allCategoriesLoading: false,
          allCategoriesError: null,
          categoriesLastFetched: null,
          categoriesLanguage: null,
          subcategoriesByCategory: {},
          subcategoriesLoading: {},
          subcategoriesError: {},
          subcategoriesLastFetched: {},
          subcategoriesLanguage: {},
          products: {},
          productsLoading: {},
          productsError: {},
          productsLastFetched: {}
        }),
        
        clearCategoriesCache: () => set({
          allCategories: [],
          allCategoriesLoading: false,
          allCategoriesError: null,
          categoriesLastFetched: null,
          categoriesLanguage: null
        }),
        
        clearSubcategoriesCache: (categoryId) => {
          if (categoryId) {
            set((state) => {
              const newState = { ...state }
              delete newState.subcategoriesByCategory[categoryId]
              delete newState.subcategoriesLoading[categoryId]
              delete newState.subcategoriesError[categoryId]
              delete newState.subcategoriesLastFetched[categoryId]
              delete newState.subcategoriesLanguage[categoryId]
              return newState
            })
          } else {
            set({
              subcategoriesByCategory: {},
              subcategoriesLoading: {},
              subcategoriesError: {},
              subcategoriesLastFetched: {},
              subcategoriesLanguage: {}
            })
          }
        },
        
        clearProductsCache: (params) => {
          if (params) {
            set((state) => {
              const newState = { ...state }
              delete newState.products[params]
              delete newState.productsLoading[params]
              delete newState.productsError[params]
              delete newState.productsLastFetched[params]
              return newState
            })
          } else {
            set({
              products: {},
              productsLoading: {},
              productsError: {},
              productsLastFetched: {}
            })
          }
        }
      }),
      {
        name: 'product-modal-store',
        partialize: (state) => ({
          allCategories: state.allCategories,
          categoriesLastFetched: state.categoriesLastFetched,
          categoriesLanguage: state.categoriesLanguage,
          subcategoriesByCategory: state.subcategoriesByCategory,
          subcategoriesLastFetched: state.subcategoriesLastFetched,
          subcategoriesLanguage: state.subcategoriesLanguage,
          products: state.products,
          productsLastFetched: state.productsLastFetched
        })
      }
    ),
    {
      name: 'product-modal-store'
    }
  )
)
