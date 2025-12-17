import { useProductModalStore } from '@/stores/product-modal-store'
import { 
  fetchAllCategoriesWithCache, 
  fetchSubcategoriesWithCache, 
  fetchProductsWithCache 
} from '@/services/product-modal-api'

export const useProductModalCache = () => {
  const store = useProductModalStore()
  
  return {
    // State
    allCategories: store.allCategories,
    allCategoriesLoading: store.allCategoriesLoading,
    allCategoriesError: store.allCategoriesError,
    
    subcategoriesByCategory: store.subcategoriesByCategory,
    subcategoriesLoading: store.subcategoriesLoading,
    subcategoriesError: store.subcategoriesError,
    
    products: store.products,
    productsLoading: store.productsLoading,
    productsError: store.productsError,
    
    // Actions
    fetchAllCategories: fetchAllCategoriesWithCache,
    fetchSubcategories: fetchSubcategoriesWithCache,
    fetchProducts: fetchProductsWithCache,
    
    // Cache management
    clearCache: store.clearCache,
    clearCategoriesCache: store.clearCategoriesCache,
    clearSubcategoriesCache: store.clearSubcategoriesCache,
    clearProductsCache: store.clearProductsCache,
    
    // Cache validation
    isCategoriesCacheValid: store.isCategoriesCacheValid,
    isSubcategoriesCacheValid: store.isSubcategoriesCacheValid,
    isProductsCacheValid: store.isProductsCacheValid
  }
}
