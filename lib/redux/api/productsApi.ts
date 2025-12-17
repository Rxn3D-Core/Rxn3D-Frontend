import { apiSlice } from "./apiSlice"
import type {
  DentalProduct,
  ProductCategory,
  ProductMaterial,
  ProductShade,
  ProductFilter,
  ProductsResponse,
} from "@/types/product"

export const productsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Products
    getProducts: builder.query<ProductsResponse, { page?: number; limit?: number; filter?: ProductFilter }>({
      query: ({ page = 1, limit = 10, filter = {} }) => {
        const params = new URLSearchParams()
        params.append("page", page.toString())
        params.append("limit", limit.toString())

        if (filter.search) params.append("search", filter.search)
        if (filter.categoryId) params.append("categoryId", filter.categoryId)
        if (filter.isActive !== undefined) params.append("isActive", filter.isActive.toString())
        if (filter.requiresImpression !== undefined)
          params.append("requiresImpression", filter.requiresImpression.toString())
        if (filter.requiresShade !== undefined) params.append("requiresShade", filter.requiresShade.toString())
        if (filter.minPrice !== undefined) params.append("minPrice", filter.minPrice.toString())
        if (filter.maxPrice !== undefined) params.append("maxPrice", filter.maxPrice.toString())
        if (filter.materialIds?.length) filter.materialIds.forEach((id) => params.append("materialIds", id))
        if (filter.shadeIds?.length) filter.shadeIds.forEach((id) => params.append("shadeIds", id))

        return `/products?${params.toString()}`
      },
      providesTags: (result) =>
        result
          ? [...result.products.map(({ id }) => ({ type: "Products" as const, id })), { type: "Products", id: "LIST" }]
          : [{ type: "Products", id: "LIST" }],
    }),

    getProductById: builder.query<DentalProduct, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Products", id }],
    }),

    addProduct: builder.mutation<DentalProduct, Partial<DentalProduct>>({
      query: (product) => ({
        url: "/products",
        method: "POST",
        body: product,
      }),
      invalidatesTags: [{ type: "Products", id: "LIST" }],
    }),

    updateProduct: builder.mutation<DentalProduct, Partial<DentalProduct>>({
      query: (product) => ({
        url: `/products/${product.id}`,
        method: "PUT",
        body: product,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Products", id },
        { type: "Products", id: "LIST" },
      ],
    }),

    deleteProduct: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Products", id },
        { type: "Products", id: "LIST" },
      ],
    }),

    // Categories
    getProductCategories: builder.query<ProductCategory[], void>({
      query: () => "/products/categories",
      providesTags: ["ProductCategories"],
    }),

    addProductCategory: builder.mutation<ProductCategory, Partial<ProductCategory>>({
      query: (category) => ({
        url: "/products/categories",
        method: "POST",
        body: category,
      }),
      invalidatesTags: ["ProductCategories"],
    }),

    updateProductCategory: builder.mutation<ProductCategory, Partial<ProductCategory>>({
      query: (category) => ({
        url: `/products/categories/${category.id}`,
        method: "PUT",
        body: category,
      }),
      invalidatesTags: ["ProductCategories"],
    }),

    deleteProductCategory: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `/products/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProductCategories"],
    }),

    // Materials
    getProductMaterials: builder.query<ProductMaterial[], void>({
      query: () => "/products/materials",
      providesTags: ["ProductMaterials"],
    }),

    addProductMaterial: builder.mutation<ProductMaterial, Partial<ProductMaterial>>({
      query: (material) => ({
        url: "/products/materials",
        method: "POST",
        body: material,
      }),
      invalidatesTags: ["ProductMaterials"],
    }),

    updateProductMaterial: builder.mutation<ProductMaterial, Partial<ProductMaterial>>({
      query: (material) => ({
        url: `/products/materials/${material.id}`,
        method: "PUT",
        body: material,
      }),
      invalidatesTags: ["ProductMaterials"],
    }),

    deleteProductMaterial: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `/products/materials/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProductMaterials"],
    }),

    // Shades
    getProductShades: builder.query<ProductShade[], void>({
      query: () => "/products/shades",
      providesTags: ["ProductShades"],
    }),

    addProductShade: builder.mutation<ProductShade, Partial<ProductShade>>({
      query: (shade) => ({
        url: "/products/shades",
        method: "POST",
        body: shade,
      }),
      invalidatesTags: ["ProductShades"],
    }),

    updateProductShade: builder.mutation<ProductShade, Partial<ProductShade>>({
      query: (shade) => ({
        url: `/products/shades/${shade.id}`,
        method: "PUT",
        body: shade,
      }),
      invalidatesTags: ["ProductShades"],
    }),

    deleteProductShade: builder.mutation<{ success: boolean; id: string }, string>({
      query: (id) => ({
        url: `/products/shades/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProductShades"],
    }),
  }),
})

export const {
  // Products
  useGetProductsQuery,
  useGetProductByIdQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,

  // Categories
  useGetProductCategoriesQuery,
  useAddProductCategoryMutation,
  useUpdateProductCategoryMutation,
  useDeleteProductCategoryMutation,

  // Materials
  useGetProductMaterialsQuery,
  useAddProductMaterialMutation,
  useUpdateProductMaterialMutation,
  useDeleteProductMaterialMutation,

  // Shades
  useGetProductShadesQuery,
  useAddProductShadeMutation,
  useUpdateProductShadeMutation,
  useDeleteProductShadeMutation,
} = productsApi
