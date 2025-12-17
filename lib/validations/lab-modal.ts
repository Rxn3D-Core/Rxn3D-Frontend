import { z } from 'zod'

// Lab search validation
export const labSearchSchema = z.object({
  searchTerm: z.string().min(1, "Search term is required").max(100, "Search term too long"),
  sortBy: z.enum(["name-az", "name-za", "location"]).default("name-az"),
})

// Lab invitation validation
export const labInviteSchema = z.object({
  name: z.string()
    .min(1, "Lab name is required")
    .max(100, "Lab name too long")
    .regex(/^[a-zA-Z0-9\s\-&.,()]+$/, "Lab name contains invalid characters"),
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email too long"),
})

// Lab connection request validation
export const labConnectionSchema = z.object({
  labId: z.string().min(1, "Lab ID is required"),
  labName: z.string().min(1, "Lab name is required"),
  labEmail: z.string().email("Valid email is required for connection"),
})

// Toast validation
export const toastSchema = z.object({
  title: z.string().min(1, "Toast title is required").max(100, "Title too long"),
  description: z.string().min(1, "Toast description is required").max(500, "Description too long"),
  variant: z.enum(["default", "destructive"]).default("default"),
})

// API response validation
export const labApiResponseSchema = z.object({
  id: z.number(),
  full_name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  profile_image: z.string().optional(),
  customers: z.array(z.object({
    id: z.number(),
    address: z.string().optional(),
  })).optional(),
})

export const labsApiResponseSchema = z.object({
  data: z.array(labApiResponseSchema),
  total: z.number().optional(),
  per_page: z.number().optional(),
  current_page: z.number().optional(),
  last_page: z.number().optional(),
})

// Form validation schemas
export const inviteFormSchema = z.object({
  labName: z.string()
    .min(1, "Lab name is required")
    .max(100, "Lab name too long")
    .regex(/^[a-zA-Z0-9\s\-&.,()]+$/, "Lab name contains invalid characters"),
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email too long"),
})

export const connectionFormSchema = z.object({
  labId: z.string().min(1, "Lab selection is required"),
  sendAndSubmit: z.boolean().default(false),
})

// Type exports
export type LabSearchInput = z.infer<typeof labSearchSchema>
export type LabInviteInput = z.infer<typeof labInviteSchema>
export type LabConnectionInput = z.infer<typeof labConnectionSchema>
export type ToastInput = z.infer<typeof toastSchema>
export type LabApiResponse = z.infer<typeof labApiResponseSchema>
export type LabsApiResponse = z.infer<typeof labsApiResponseSchema>
export type InviteFormInput = z.infer<typeof inviteFormSchema>
export type ConnectionFormInput = z.infer<typeof connectionFormSchema>


