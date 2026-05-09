import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  deleteGlobalRetentionOptionToothImage,
  getGlobalRetentionOptionToothImages,
  upsertGlobalRetentionOptionToothImages,
} from "@/services/retention-options-api"
import { useToast } from "@/hooks/use-toast"

export const retentionOptionToothImagesKeys = {
  all: ["retention-options", "global-tooth-images"] as const,
  list: (retentionOptionId: number) =>
    [...retentionOptionToothImagesKeys.all, retentionOptionId] as const,
}

export type GlobalRetentionOptionToothImageItem = {
  tooth_number: number
  image_url: string
  updated_at: string
}

export function useGlobalRetentionOptionToothImages(retentionOptionId: number | null, enabled = true) {
  return useQuery({
    queryKey:
      retentionOptionId != null
        ? retentionOptionToothImagesKeys.list(retentionOptionId)
        : [...retentionOptionToothImagesKeys.all, "none"],
    queryFn: async () => {
      if (retentionOptionId == null) throw new Error("Retention option ID is required")
      const res = await getGlobalRetentionOptionToothImages(retentionOptionId)
      return (res.data?.images ?? []) as GlobalRetentionOptionToothImageItem[]
    },
    enabled: enabled && retentionOptionId != null,
    staleTime: 0,
  })
}

export function useUpsertGlobalRetentionOptionToothImages() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      retentionOptionId,
      images,
    }: {
      retentionOptionId: number
      images: Array<{ tooth_number: number; image: string }>
    }) => upsertGlobalRetentionOptionToothImages(retentionOptionId, { images }),
    onSuccess: async (response, variables) => {
      await queryClient.invalidateQueries({
        queryKey: retentionOptionToothImagesKeys.list(variables.retentionOptionId),
      })
      toast({
        title: "Images saved",
        description: response.message || "Tooth images updated successfully.",
        variant: "default",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save tooth images",
        variant: "destructive",
      })
    },
  })
}

export function useDeleteGlobalRetentionOptionToothImage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      retentionOptionId,
      toothNumber,
    }: {
      retentionOptionId: number
      toothNumber: number
    }) => deleteGlobalRetentionOptionToothImage(retentionOptionId, toothNumber),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: retentionOptionToothImagesKeys.list(variables.retentionOptionId),
      })
      toast({
        title: "Image removed",
        description: data.message || "Tooth image deleted.",
        variant: "default",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tooth image",
        variant: "destructive",
      })
    },
  })
}
