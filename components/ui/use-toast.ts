"use client"

// Single source of truth — all consumers of either path share the same toast store.
export { useToast, toast, reducer } from "@/hooks/use-toast"
