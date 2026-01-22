import { useMutation, useQueryClient } from "@tanstack/react-query"

/**
 * Clear caseDesignCenterState from localStorage
 */
const clearCaseDesignCenterState = async (): Promise<void> => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("caseDesignCenterState")
  }
}

/**
 * Hook to clear caseDesignCenterState using React Query mutation
 */
export function useClearCaseDesignCenterStateMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: clearCaseDesignCenterState,
    onSuccess: () => {
      // Optionally invalidate any related queries if needed
      queryClient.removeQueries({ queryKey: ["caseDesignCenterState"] })
    },
  })
}

/**
 * Query key for caseDesignCenterState
 */
export const caseDesignCenterStateKeys = {
  all: ["caseDesignCenterState"] as const,
} as const
