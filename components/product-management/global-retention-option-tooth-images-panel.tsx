"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Image as ImageIcon, Info, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip as HelpTooltip,
  TooltipContent as HelpTooltipContent,
  TooltipProvider as HelpTooltipProvider,
  TooltipTrigger as HelpTooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import {
  useDeleteGlobalRetentionOptionToothImage,
  useGlobalRetentionOptionToothImages,
  useUpsertGlobalRetentionOptionToothImages,
} from "@/hooks/use-retention-option-tooth-images"
import { cn } from "@/lib/utils"

const MAX_TOOTH_IMAGE_BYTES = 5120 * 1024

const UNIVERSAL_TEETH = Array.from({ length: 32 }, (_, i) => i + 1)

interface GlobalRetentionOptionToothImagesPanelProps {
  retentionOptionId: number
}

export function GlobalRetentionOptionToothImagesPanel({
  retentionOptionId,
}: GlobalRetentionOptionToothImagesPanelProps) {
  const { toast } = useToast()
  const pickInputRef = useRef<HTMLInputElement>(null)
  const pickToothRef = useRef<number | null>(null)

  const [localPreviewByTooth, setLocalPreviewByTooth] = useState<Record<number, string>>({})
  const [savingToothSet, setSavingToothSet] = useState<Set<number>>(new Set())
  const [dragOverTooth, setDragOverTooth] = useState<number | null>(null)

  const { data: images, isLoading, isFetching, error, refetch } =
    useGlobalRetentionOptionToothImages(retentionOptionId)
  const upsertMutation = useUpsertGlobalRetentionOptionToothImages()
  const deleteMutation = useDeleteGlobalRetentionOptionToothImage()

  useEffect(() => {
    setLocalPreviewByTooth({})
    setSavingToothSet(new Set())
  }, [retentionOptionId])

  const savedByTooth = useMemo(() => {
    const m = new Map<number, { image_url: string; updated_at: string }>()
    for (const row of images ?? []) {
      m.set(row.tooth_number, { image_url: row.image_url, updated_at: row.updated_at })
    }
    return m
  }, [images])

  const validateAndReadFile = useCallback(
    (file: File): Promise<string | null> => {
      const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
      if (!allowed.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG, JPEG, PNG, GIF, or WebP image.",
          variant: "destructive",
        })
        return Promise.resolve(null)
      }
      if (file.size > MAX_TOOTH_IMAGE_BYTES) {
        toast({
          title: "File too large",
          description: "Each image must be 5MB or less.",
          variant: "destructive",
        })
        return Promise.resolve(null)
      }
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(file)
      })
    },
    [toast],
  )

  const assignToTooth = useCallback(
    async (toothNumber: number, file: File) => {
      const dataUrl = await validateAndReadFile(file)
      if (!dataUrl) return
      setLocalPreviewByTooth((prev) => ({ ...prev, [toothNumber]: dataUrl }))
      setSavingToothSet((prev) => {
        const next = new Set(prev)
        next.add(toothNumber)
        return next
      })

      try {
        await upsertMutation.mutateAsync({
          retentionOptionId,
          images: [{ tooth_number: toothNumber, image: dataUrl }],
        })
      } catch {
        setLocalPreviewByTooth((prev) => {
          const next = { ...prev }
          delete next[toothNumber]
          return next
        })
      } finally {
        setSavingToothSet((prev) => {
          const next = new Set(prev)
          next.delete(toothNumber)
          return next
        })
      }
    },
    [retentionOptionId, upsertMutation, validateAndReadFile],
  )

  const handlePickForTooth = (toothNumber: number) => {
    pickToothRef.current = toothNumber
    pickInputRef.current?.click()
  }

  const handlePickInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const tooth = pickToothRef.current
    e.target.value = ""
    pickToothRef.current = null
    if (!file || tooth == null) return
    await assignToTooth(tooth, file)
  }

  const handleDragOver = (e: React.DragEvent, toothNumber: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTooth(toothNumber)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTooth(null)
  }

  const handleDrop = async (e: React.DragEvent, toothNumber: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTooth(null)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await assignToTooth(toothNumber, file)
  }

  const handleDelete = (toothNumber: number) => {
    if (savingToothSet.has(toothNumber)) return
    if (!globalThis.confirm(`Remove the stored image for tooth ${toothNumber}?`)) return
    deleteMutation.mutate(
      { retentionOptionId, toothNumber },
      {
        onSuccess: () => {
          setLocalPreviewByTooth((prev) => {
            const next = { ...prev }
            delete next[toothNumber]
            return next
          })
        },
      },
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50/80 px-4 py-6 text-center text-sm text-red-800">
        <p className="font-medium">Could not load tooth images</p>
        <p className="mt-1 text-red-700">{(error as Error).message}</p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-1">
      <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-medium text-gray-800">Teeth 1–32 (universal)</h4>
            <HelpTooltipProvider>
              <HelpTooltip>
                <HelpTooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex rounded-full p-0.5 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1162a8]"
                    aria-label="Global tooth images help"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </HelpTooltipTrigger>
                <HelpTooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">
                    Drag an image onto a tooth, or click a cell to browse. Upload saves immediately for that tooth.
                    Delete removes from the server. Previews use{" "}
                    <span className="font-medium">contain</span> (never stretched); tall narrow images use slightly wider
                    tiles so they scale larger while staying proportional.
                  </p>
                </HelpTooltipContent>
              </HelpTooltip>
            </HelpTooltipProvider>
          </div>
        </div>
        {(isLoading || isFetching) && (
          <p className="text-xs text-gray-500">{isLoading ? "Loading saved images…" : "Refreshing…"}</p>
        )}
      </div>

      <input
        ref={pickInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handlePickInputChange}
      />

      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-0 grid-cols-4 gap-2 sm:grid-cols-8 md:min-w-[1180px] md:grid-cols-[repeat(16,minmax(68px,1fr))] md:gap-2.5">
          {UNIVERSAL_TEETH.map((n) => {
            const localPreview = localPreviewByTooth[n]
            const saved = savedByTooth.get(n)
            const previewSrc = localPreview ?? saved?.image_url
            const hasSaved = Boolean(saved?.image_url)
            const isSaving = savingToothSet.has(n)

            const titleParts = [`Tooth ${n}`]
            if (saved?.updated_at) titleParts.push(`Saved: ${formatUpdated(saved.updated_at)}`)

            return (
              <div
                key={n}
                title={titleParts.join(" · ")}
                onDragOver={(e) => handleDragOver(e, n)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, n)}
                style={{ width: "-webkit-fill-available" }}
                className={cn(
                  "group relative flex aspect-[4/3] min-h-[72px] sm:min-h-[78px] md:min-h-[86px] flex-col overflow-hidden rounded-lg border bg-white transition-colors",
                  dragOverTooth === n && "border-[#1162a8] bg-[#1162a8]/5 ring-2 ring-[#1162a8]/30",
                  !dragOverTooth && "border-gray-200 hover:border-gray-400",
                )}
              >
                <div className="flex items-center justify-between gap-0.5 border-b border-gray-100 bg-gray-50/90 px-1 py-0.5">
                  <span className="text-[10px] font-semibold tabular-nums text-gray-700">{n}</span>
                  <div className="flex items-center gap-0.5">
                    {isSaving && (
                      <Loader2
                        className="h-2.5 w-2.5 animate-spin text-[#1162a8]"
                        aria-label="Saving upload"
                      />
                    )}
                    {(previewSrc || hasSaved) && (
                      <button
                        type="button"
                        title="Delete saved image"
                        className="rounded p-0.5 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 group-focus-within:opacity-100"
                        disabled={deleteMutation.isPending || isSaving}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          handleDelete(n)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePickForTooth(n)}
                  style={{ width: "-webkit-fill-available" }}
                  className="relative flex min-h-0 flex-1 w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50/80 to-gray-100/50 p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1162a8]"
                >
                  {previewSrc ? (
                    <img
                      src={previewSrc}
                      alt={`Tooth ${n}`}
                      className="block h-full w-full max-h-full max-w-full object-contain object-center"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-0.5 px-0.5 text-center text-[9px] leading-tight text-gray-400">
                      <ImageIcon className="h-5 w-5 opacity-60" />
                      <span className="max-w-full break-words">Drop or tap</span>
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function formatUpdated(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}
