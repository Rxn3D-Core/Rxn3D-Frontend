import { z } from "zod"

const BaseEntitySchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string().optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
  sequence: z.number().optional(),
})

const CategorySchema = BaseEntitySchema.extend({
  type: z.string().nullable(),
  parent_id: z.number().nullable(),
})

const SubCategorySchema = BaseEntitySchema.extend({
  type: z.string().nullable(),
  category: CategorySchema.optional(),
})

const GradeSchema = BaseEntitySchema.extend({})
const StageSchema = BaseEntitySchema.extend({
  is_common: z.enum(["Yes", "No"]).optional(),
  days_to_pickup: z.number().optional(),
  days_to_process: z.number().optional(),
  days_to_deliver: z.number().optional(),
  is_releasing_stage: z.enum(["Yes", "No"]).optional(),
  is_stage_with_addons: z.enum(["Yes", "No"]).optional(),
})
const ImpressionSchema = BaseEntitySchema.extend({
  url: z.string().optional(),
  is_digital_impression: z.enum(["Yes", "No"]).optional(),
})
const GumShadeSchema = BaseEntitySchema.extend({})
const TeethShadeSchema = BaseEntitySchema.extend({})
const MaterialSchema = BaseEntitySchema.extend({})
const RetentionSchema = BaseEntitySchema.extend({})
const AddOnSchema = BaseEntitySchema.extend({
  subcategory_id: z.number().nullable(),
  type: z.string().nullable(),
  subcategory: SubCategorySchema.optional(),
})

const AddOnQuantitySchema = z
  .preprocess(
    (value) => {
      if (value === undefined || value === null) {
        return undefined
      }
      if (typeof value === "string") {
        const trimmed = value.trim()
        if (trimmed === "") {
          return undefined
        }
        const parsed = Number(trimmed)
        if (Number.isFinite(parsed)) {
          return parsed
        }
        return value
      }
      return value
    },
    z.number().int().min(1),
  )
  .optional()

const AddOnFormSchema = z.object({
  addon_id: z.number(),
  sequence: z.number().optional(),
  status: z.enum(["Active", "Inactive"]).default("Active").optional(),
  price: z.union([z.string(), z.number()]).optional(),
  quantity: AddOnQuantitySchema,
  is_default: z.enum(["Yes", "No"]).default("No").optional(),
})

export const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  subcategory_id: z.number().nullable(),
  type: z.enum(["Upper", "Lower", "Both"]).nullable(),
  status: z.enum(["Active", "Inactive"]),
  sequence: z.number(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  subcategory: SubCategorySchema.optional(),
  grades: z.array(GradeSchema).optional(),
  stages: z.array(StageSchema).optional(),
  impressions: z.array(ImpressionSchema).optional(),
  gum_shades: z.array(GumShadeSchema).optional(),
  teeth_shades: z.array(TeethShadeSchema).optional(),
  materials: z.array(MaterialSchema).optional(),
  retentions: z.array(RetentionSchema).optional(),
  addons: z.array(AddOnSchema).optional(),
  grade_details: z
    .array(
      z.object({
        grade_id: z.number(),
        sequence: z.number().nullable(),
        is_default: z.enum(["Yes", "No"]).nullable(),
      }),
    )
    .optional(),
  stage_details: z
    .array(
      z.object({
        stage_id: z.number(),
        sequence: z.number().nullable(),
      }),
    )
    .optional(),
  impression_details: z
    .array(
      z.object({
        impression_id: z.number(),
        sequence: z.number().nullable(),
      }),
    )
    .optional(),
  gum_shade_details: z
    .array(
      z.object({
        gum_shade_id: z.number(),
        sequence: z.number().nullable(),
      }),
    )
    .optional(),
  teeth_shade_details: z
    .array(
      z.object({
        teeth_shade_id: z.number(),
        sequence: z.number().nullable(),
      }),
    )
    .optional(),
  material_details: z
    .array(
      z.object({
        material_id: z.number(),
        sequence: z.number().nullable(),
      }),
    )
    .optional(),
  retention_details: z
    .array(
      z.object({
        retention_id: z.number(),
        sequence: z.number().nullable(),
      }),
    )
    .optional(),
  addon_details: z
    .array(
      z.object({
        addon_id: z.number(),
        sequence: z.number().nullable(),
      }),
    )
    .optional(),
})

export type Product = z.infer<typeof ProductSchema>

export const ProductCreateFormSchema = z
  .object({
    name: z.string().min(1, "Product Name is required"),
    code: z.string().min(1, "Product Code is required"),
    category_id: z.number().nullable().optional(), // UI-only field for filtering subcategories
    subcategory_id: z
      .number()
      .nullable()
      .refine((val) => val === null || (typeof val === "number" && val >= 0), {
        message: "Sub Category must be a number or null",
      }),
    type: z.enum(["Upper", "Lower", "Both"]).default("Both"),
    status: z.enum(["Active", "Inactive"]).default("Active"),
    sequence: z.number().min(1, "Sequence must be at least 1").default(1),
    description: z.string().nullable().optional(),
    base_price: z
      .union([z.string(), z.number()])
      .refine(
        (val) => {
          if (val === undefined || val === null || val === "") {
            return false;
          }
          const numValue = typeof val === "string" ? parseFloat(val) : val;
          return !isNaN(numValue) && numValue >= 0;
        },
        {
          message: "Base Price is required and must be a valid number",
        }
      ),
    image: z.string().nullable().optional(),
    is_teeth_based_price: z.enum(["Yes", "No"]).default("No").optional(),

    // Related items (all optional, no min)
    grades: z
      .array(
        z.object({
          grade_id: z.number(),
          sequence: z.number().optional(),
          is_default: z.enum(["Yes", "No"]).optional(),
          status: z.enum(["Active", "Inactive"]).default("Active").optional(),
          price: z
            .string()
            .optional()
            .refine(
              (val) => {
                // If price is provided, it cannot be 0
                if (val === undefined || val === null || val === "") {
                  return true; // Empty is allowed
                }
                const numValue = parseFloat(val);
                return !isNaN(numValue) && numValue > 0;
              },
              {
                message: "Price must be greater than 0",
              }
            ),
        }),
      )
      .optional(),
    stages: z
      .array(
        z.object({
          stage_id: z.union([z.string(), z.number()]),
          economy_price: z.string().optional(),
          standard_price: z.string().optional(),
          days: z.string().optional(),
          sequence: z.number().optional(),
          status: z.enum(["Active", "Inactive"]).default("Active").optional(),
        }),
      )
      .optional()
      .transform((arr) =>
        Array.isArray(arr)
          ? arr.map((item) => ({
              ...item,
              status: item.status || "Active",
            }))
          : arr
      ),
    impressions: z
      .array(
        z.object({
          impression_id: z.number(),
          sequence: z.number().optional(),
          status: z.enum(["Active", "Inactive"]).default("Active").optional(),
        }),
      )
      .optional(),
    gum_shades: z
      .array(
        z.object({
          gum_shade_id: z.number(),
          sequence: z.number().optional(),
          status: z.enum(["Active", "Inactive"]).default("Active").optional(),
        }),
      )
      .optional()
      .transform((arr) =>
        Array.isArray(arr)
          ? arr.map((item) => ({
              ...item,
              status: item.status || "Active",
            }))
          : arr
      ),
    teeth_shades: z
      .array(
        z.object({
          teeth_shade_id: z.number(),
          sequence: z.number().optional(),
          status: z.enum(["Active", "Inactive"]).default("Active").optional(),
        }),
      )
      .optional()
      .transform((arr) =>
        Array.isArray(arr)
          ? arr.map((item) => ({
              ...item,
              status: item.status || "Active",
            }))
          : arr
      ),
    materials: z
      .array(
        z.object({
          material_id: z.number(),
          sequence: z.number().optional(),
          status: z.enum(["Active", "Inactive"]).default("Active").optional(),
          price: z.union([z.number().min(0).max(999999.99), z.string()]).optional(),
        }),
      )
      .optional()
      .transform((arr) =>
        Array.isArray(arr)
          ? arr.map((item) => {
              // Handle price: convert to number, default to 0 if missing/invalid
              let price = 0
              if (item.price !== undefined && item.price !== null && item.price !== "") {
                const parsedPrice = typeof item.price === "number" ? item.price : parseFloat(item.price as string)
                if (!Number.isNaN(parsedPrice) && parsedPrice >= 0) {
                  price = Math.min(parsedPrice, 999999.99)
                }
              }
              return {
                ...item,
                status: item.status || "Active",
                price: price,
              }
            })
          : arr
      ),
    retentions: z
      .array(
        z.object({
          retention_id: z.number(),
          sequence: z.number().optional(),
          status: z.enum(["Active", "Inactive"]).default("Active").optional(),
        }),
      )
      .optional()
      .transform((arr) =>
        Array.isArray(arr)
          ? arr.map((item) => ({
              ...item,
              status: item.status || "Active",
            }))
          : arr
      ),
    addons: z
      .array(AddOnFormSchema)
      .optional()
      .transform((arr) =>
        Array.isArray(arr)
          ? arr.map((item) => ({
              ...item,
              status: item.status || "Active",
            }))
          : arr
      ),
    extractions: z
      .array(
        z.object({
          extraction_id: z.number(),
          sequence: z.number().optional(),
          status: z.enum(["Active", "Inactive"]).default("Active").optional(),
          is_default: z.enum(["Yes", "No"]).default("No").optional(),
          is_required: z.enum(["Yes", "No"]).default("No").optional(),
          is_optional: z.enum(["Yes", "No"]).default("No").optional(),
          min_teeth: z.number().min(0).max(16).nullable().optional(),
          max_teeth: z.number().min(0).max(16).nullable().optional(),
        })
          .refine(
            (data) => {
              // If min_teeth is 16, max_teeth can only be 0, 16, or null
              if (data.min_teeth === 16 && data.max_teeth !== null) {
                return data.max_teeth === 0 || data.max_teeth === 16;
              }
              return true;
            },
            {
              message: "When minimum teeth is 16, maximum teeth must be 0 or 16 only",
              path: ["max_teeth"],
            }
          )
          .refine(
            (data) => {
              // If both min_teeth and max_teeth are provided (and not the special case), max_teeth must be >= min_teeth
              if (data.min_teeth !== null && data.max_teeth !== null && data.min_teeth !== 16) {
                return data.max_teeth >= data.min_teeth;
              }
              return true;
            },
            {
              message: "Maximum teeth must be greater than or equal to minimum teeth",
              path: ["max_teeth"],
            }
          ),
      )
      .optional()
      .transform((arr) =>
        Array.isArray(arr)
          ? arr.map((item) => ({
              ...item,
              status: item.status || "Active",
            }))
          : arr
      ),

    opposite_extractions: z
      .array(
        z.object({
          extraction_id: z.number(),
          sequence: z.number().optional(),
          status: z.enum(["Active", "Inactive"]).default("Active").optional(),
          is_default: z.enum(["Yes", "No"]).default("No").optional(),
          is_required: z.enum(["Yes", "No"]).default("No").optional(),
          is_optional: z.enum(["Yes", "No"]).default("No").optional(),
          min_teeth: z.number().min(0).max(16).nullable().optional(),
          max_teeth: z.number().min(0).max(16).nullable().optional(),
        })
          .refine(
            (data) => {
              // If min_teeth is 16, max_teeth can only be 0, 16, or null
              if (data.min_teeth === 16 && data.max_teeth !== null) {
                return data.max_teeth === 0 || data.max_teeth === 16;
              }
              return true;
            },
            {
              message: "When minimum teeth is 16, maximum teeth must be 0 or 16 only",
              path: ["max_teeth"],
            }
          )
          .refine(
            (data) => {
              // If both min_teeth and max_teeth are provided (and not the special case), max_teeth must be >= min_teeth
              if (data.min_teeth !== null && data.max_teeth !== null && data.min_teeth !== 16) {
                return data.max_teeth >= data.min_teeth;
              }
              return true;
            },
            {
              message: "Maximum teeth must be greater than or equal to minimum teeth",
              path: ["max_teeth"],
            }
          ),
      )
      .optional()
      .transform((arr) =>
        Array.isArray(arr)
          ? arr.map((item) => ({
              ...item,
              status: item.status || "Active",
            }))
          : arr
      ),

    has_grade_based_pricing: z.enum(["Yes", "No"]).default("No"),
    default_grade_id: z.number().nullable().optional(),
    enable_auto_billing: z.enum(["Yes", "No"]).default("No"),
    auto_billing_days: z
      .number()
      .min(1, "Auto bill days must be at least 1")
      .max(31, "Auto bill days must be at most 31")
      .optional(),
    is_single_stage: z.enum(["Yes", "No"]).default("No"),
    link_all_addons: z.enum(["Yes", "No"]).default("No"),
    apply_retention_mechanism: z.enum(["Yes", "No"]).default("No"),
    retention_type: z.enum(["Cement Retained", "Screw Retained", "Hybrid Retention"]).nullable().optional(),
    show_to_all_lab: z.enum(["Yes", "No", "Hide"]).default("Yes"),
    office_visibilities: z
      .array(
        z.object({
          office_id: z.number(),
          is_visible: z.enum(["Yes", "No"]),
        }),
      )
      .optional(),
    impression_group_id: z.number().nullable().optional(),
    gum_shade_group_id: z.number().nullable().optional(),
    teeth_shade_group_id: z.number().nullable().optional(),
    material_group_id: z.number().nullable().optional(),
    addon_group_id: z.number().nullable().optional(),
    office_grade_pricing: z.array(z.any()).optional(),
    office_stage_pricing: z.array(z.any()).optional(),
    office_stage_grade_pricing: z.array(z.any()).optional(),
    
    // Tooth Mapping fields
    tooth_mapping: z.array(
      z.object({
        status_id: z.string(),
        name: z.string(),
        color: z.string(),
        is_default: z.boolean().default(false),
        is_required: z.boolean().default(false),
        is_optional: z.boolean().default(false),
        is_active: z.boolean().default(true),
        min_teeth: z.number().min(1).max(16).nullable().optional(),
        max_teeth: z.number().min(1).max(16).nullable().optional(),
      })
    ).optional(),
    apply_same_status_to_opposing: z.boolean().default(true),
    min_days_to_process: z.number().nullable().optional(),
    max_days_to_process: z.number().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.enable_auto_billing === "Yes") {
        return data.auto_billing_days !== undefined && data.auto_billing_days !== null;
      }
      return true;
    },
    {
      message: "Auto bill days is required when auto billing is enabled",
      path: ["auto_billing_days"],
    }
  )

// NOTE: Make sure your initial form values in the modal include a valid base_price!

export type ProductCreateForm = z.infer<typeof ProductCreateFormSchema>

export const ProductPaginationSchema = z.object({
  total: z.number(),
  per_page: z.number(),
  current_page: z.number(),
  last_page: z.number(),
})

export type ProductPagination = z.infer<typeof ProductPaginationSchema>

// Extractions API Schemas
export const ExtractionSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  url: z.string().nullable(),
  sequence: z.number(),
  status: z.enum(["Active", "Inactive"]),
  customer_id: z.number().nullable(),
  is_custom: z.enum(["Yes", "No"]),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
})

export const ExtractionsPaginationSchema = z.object({
  total: z.number(),
  per_page: z.number(),
  current_page: z.number(),
  last_page: z.number(),
})

export const ExtractionsListResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z.object({
    data: z.array(ExtractionSchema),
    pagination: ExtractionsPaginationSchema,
  }),
})

export const ExtractionsResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: ExtractionSchema,
})

export const CreateExtractionSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  code: z.string().min(1, "Code is required").max(50, "Code must be less than 50 characters"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #FF0000)"),
  sequence: z.number().min(1, "Sequence must be at least 1").max(9999, "Sequence must be less than 10000"),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  description: z.string().nullable().optional(),
  url: z
    .string()
    .url("URL must be valid")
    .nullable()
    .optional(),
})

export const UpdateExtractionSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters").optional(),
  code: z.string().min(1, "Code is required").max(50, "Code must be less than 50 characters").optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #FF0000)").optional(),
  sequence: z.number().min(1, "Sequence must be at least 1").max(9999, "Sequence must be less than 10000").optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
  description: z.string().nullable().optional(),
  url: z
    .string()
    .url("URL must be valid")
    .nullable()
    .optional(),
})

export const ExtractionsFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
  customer_id: z.number().optional(),
  is_custom: z.enum(["Yes", "No"]).optional(),
  per_page: z.number().min(1).max(100).default(10),
  page: z.number().min(1).default(1),
  sort_by: z.enum(["name", "code", "sequence", "created_at"]).default("sequence"),
  sort_order: z.enum(["asc", "desc"]).default("asc"),
  lang: z.string().optional(),
})

// Type exports
export type Extraction = z.infer<typeof ExtractionSchema>
export type ExtractionsPagination = z.infer<typeof ExtractionsPaginationSchema>
export type ExtractionsListResponse = z.infer<typeof ExtractionsListResponseSchema>
export type ExtractionsResponse = z.infer<typeof ExtractionsResponseSchema>
export type CreateExtractionPayload = z.infer<typeof CreateExtractionSchema>
export type UpdateExtractionPayload = z.infer<typeof UpdateExtractionSchema>
export type ExtractionsFilters = z.infer<typeof ExtractionsFiltersSchema>
