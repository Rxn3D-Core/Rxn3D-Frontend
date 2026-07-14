"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  useGetBillingInvoiceByIdQuery,
  useUpdateBillingInvoicePricingMutation,
} from "@/lib/redux/api/billingApi"
import type {
  BillingInvoice,
  UpdateBillingInvoicePricingBody,
  UpdateBillingInvoicePricingProductLine,
} from "@/lib/redux/api/billingApi"
import { useToast } from "@/hooks/use-toast"

function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0
  const n = typeof v === "string" ? Number.parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : 0
}

function formatMoneyPreview(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

export type ProductEditState = {
  productId: number
  label: string
  base_price: string
  material_price: string
  teeth_count: string
  rush_percentage: string
  addons: { id: number; label: string; price: string; quantity: string }[]
  retentions: { id: number; label: string; price: string }[]
  advance_fields: { id: number; label: string; price: string; quantity: string }[]
}

function invoiceToEditStates(inv: BillingInvoice): ProductEditState[] {
  const products = inv.products ?? []
  return products.map((p) => ({
    productId: p.id,
    label: [p.product_name, p.grade_name, p.stage_name].filter(Boolean).join(" · ") || `Product #${p.id}`,
    base_price: String(num(p.base_price)),
    material_price: String(num(p.material_price)),
    teeth_count: p.teeth_count != null ? String(p.teeth_count) : "",
    rush_percentage: String(num(p.rush_percentage)),
    addons: (p.addons ?? [])
      .filter((a) => a.id != null)
      .map((a) => ({
        id: a.id as number,
        label: a.addon_name ?? `Addon ${a.id}`,
        price: String(num(a.price ?? a.total)),
        quantity: a.quantity != null && a.quantity !== "" ? String(a.quantity) : "1",
      })),
    retentions: (p.retentions ?? []).map((r) => ({
      id: r.id,
      label: r.retention_name ?? r.name ?? `Retention ${r.id}`,
      price: String(num(r.price ?? r.total)),
    })),
    advance_fields: (p.advance_fields ?? []).map((f) => ({
      id: f.id,
      label: f.advance_field_name ?? f.name ?? `Field ${f.id}`,
      price: String(num(f.price)),
      quantity: f.quantity != null ? String(f.quantity) : "",
    })),
  }))
}

/** Matches server: subtotal = base + material + addons + retentions + advance (price×qty); rush_fee = subtotal × rush%/100; line = subtotal + rush_fee */
function estimatedLineTotal(edit: ProductEditState): number {
  const base = Number.parseFloat(edit.base_price) || 0
  const material = Number.parseFloat(edit.material_price) || 0
  const rushPct = Number.parseFloat(edit.rush_percentage) || 0
  const addonSum = edit.addons.reduce((s, a) => {
    const pr = Number.parseFloat(a.price) || 0
    const q = Number.parseFloat(a.quantity) || 1
    return s + pr * (q >= 1 ? q : 1)
  }, 0)
  const retSum = edit.retentions.reduce((s, r) => s + (Number.parseFloat(r.price) || 0), 0)
  const advSum = edit.advance_fields.reduce((s, f) => {
    const pr = Number.parseFloat(f.price) || 0
    const q = f.quantity.trim() !== "" ? Number.parseFloat(f.quantity) : 1
    return s + pr * (Number.isFinite(q) && q >= 1 ? q : 1)
  }, 0)
  const subtotal = base + material + addonSum + retSum + advSum
  const rushFee = subtotal * (rushPct / 100)
  return subtotal + rushFee
}

export type EditBillingInvoiceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  billingInvoiceId: number | null
  onSaved?: () => void
}

const MAX_EDIT_REASON = 500

export function EditBillingInvoiceDialog({
  open,
  onOpenChange,
  billingInvoiceId,
  onSaved,
}: EditBillingInvoiceDialogProps) {
  const { toast } = useToast()
  const [editReason, setEditReason] = useState("")
  const [productEdits, setProductEdits] = useState<ProductEditState[]>([])

  const {
    data: invoice,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetBillingInvoiceByIdQuery(billingInvoiceId!, {
    skip: !open || billingInvoiceId == null || billingInvoiceId <= 0,
  })

  const [updateInvoicePricing, { isLoading: saving }] = useUpdateBillingInvoicePricingMutation()

  useEffect(() => {
    if (!open || !invoice) return
    setEditReason("")
    setProductEdits(invoiceToEditStates(invoice))
  }, [open, invoice])

  const invoiceHeader = useMemo(() => {
    if (!invoice) return null
    const patient = invoice.slip?.case?.patient_name ?? "—"
    const office = invoice.office?.name ?? "—"
    const invNo = invoice.invoice_number ?? `INV-${invoice.id}`
    const total = num(invoice.total_amount)
    return { patient, office, invNo, total }
  }, [invoice])

  const modalTitle = useMemo(() => {
    if (!invoice) return "EDIT"

    const patient = invoice.slip?.case?.patient_name?.trim()
    const firstProduct = invoice.products?.[0]
    const product = firstProduct?.product_name?.trim()
    const stage = firstProduct?.stage_name?.trim()
    const productStage = [product, stage].filter(Boolean).join(" ")
    const details = [patient, productStage].filter(Boolean).join(", ")

    return details ? `EDIT - ${details}` : "EDIT"
  }, [invoice])

  const buildPricingBody = (): UpdateBillingInvoicePricingBody | null => {
    if (!productEdits.length) return null
    const products: UpdateBillingInvoicePricingProductLine[] = []

    for (const edit of productEdits) {
      const base_price = Number.parseFloat(edit.base_price)
      if (!Number.isFinite(base_price) || base_price < 0) {
        toast({
          title: "Invalid base price",
          description: `Check ${edit.label}`,
          variant: "destructive",
        })
        return null
      }

      const line: UpdateBillingInvoicePricingProductLine = {
        id: edit.productId,
        base_price,
      }

      const material = Number.parseFloat(edit.material_price)
      if (Number.isFinite(material) && material >= 0) line.material_price = material

      const teeth = edit.teeth_count.trim()
      if (teeth !== "") {
        const tc = Number.parseInt(teeth, 10)
        if (Number.isFinite(tc) && tc >= 1) line.teeth_count = tc
      }

      const rush = Number.parseFloat(edit.rush_percentage)
      if (Number.isFinite(rush) && rush >= 0 && rush <= 100) line.rush_percentage = rush

      if (edit.addons.length > 0) {
        line.addons = edit.addons.map((a) => {
          const price = Number.parseFloat(a.price)
          const quantity = Number.parseInt(a.quantity, 10)
          const row: { id: number; price?: number; quantity?: number } = {
            id: a.id,
            price: Number.isFinite(price) && price >= 0 ? price : 0,
          }
          if (Number.isFinite(quantity) && quantity >= 1) row.quantity = quantity
          return row
        })
      }

      if (edit.retentions.length > 0) {
        line.retentions = edit.retentions.map((r) => {
          const price = Number.parseFloat(r.price)
          return {
            id: r.id,
            price: Number.isFinite(price) && price >= 0 ? price : 0,
          }
        })
      }

      if (edit.advance_fields.length > 0) {
        line.advance_fields = edit.advance_fields.map((f) => {
          const price = Number.parseFloat(f.price)
          const q = f.quantity.trim() !== "" ? Number.parseFloat(f.quantity) : undefined
          const row: { id: number; price?: number; quantity?: number } = {
            id: f.id,
            price: Number.isFinite(price) && price >= 0 ? price : 0,
          }
          if (q != null && Number.isFinite(q) && q >= 1) row.quantity = q
          return row
        })
      }

      products.push(line)
    }

    const body: UpdateBillingInvoicePricingBody = { products }
    const er = editReason.trim().slice(0, MAX_EDIT_REASON)
    if (er) body.edit_reason = er
    return body
  }

  const handleSave = async () => {
    if (!billingInvoiceId || !invoice || productEdits.length === 0) return
    const body = buildPricingBody()
    if (!body) return

    try {
      await updateInvoicePricing({ invoiceId: billingInvoiceId, body }).unwrap()
      onOpenChange(false)
      onSaved?.()
      toast({ title: "Invoice pricing updated", duration: 4000 })
    } catch (e: unknown) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Request failed",
        variant: "destructive",
      })
    }
  }

  const loading = isLoading || isFetching
  const hasProducts = productEdits.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(92vw,54rem)] overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-xl font-semibold leading-tight">
            {modalTitle}
          </DialogTitle>
        </DialogHeader>

        {billingInvoiceId != null && billingInvoiceId > 0 && (
          <div className="min-w-0">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading invoice…
              </div>
            )}
            {error && !loading && (
              <p className="text-sm text-destructive">Could not load invoice. Try again.</p>
            )}
            {!loading && invoice && invoiceHeader && (
              <div className="min-w-0 space-y-4 text-sm">
                {/* Stacked label/value rows on mobile; horizontal table from sm: up. */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border bg-muted/30 px-3 py-2 sm:hidden">
                  <div>
                    <dt className="text-muted-foreground">Patient</dt>
                    <dd className="font-medium">{invoiceHeader.patient}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Office</dt>
                    <dd className="font-medium">{invoiceHeader.office}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Invoice</dt>
                    <dd className="font-medium">{invoiceHeader.invNo}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Current total</dt>
                    <dd className="font-medium">{formatMoneyPreview(invoiceHeader.total)}</dd>
                  </div>
                </dl>

                <div className="hidden min-w-0 max-w-full rounded-md border bg-muted/30 overflow-x-auto sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="whitespace-nowrap">Patient</TableHead>
                        <TableHead className="whitespace-nowrap">Office</TableHead>
                        <TableHead className="whitespace-nowrap">Invoice</TableHead>
                        <TableHead className="whitespace-nowrap">Current total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="hover:bg-transparent">
                        <TableCell className="whitespace-nowrap font-medium">{invoiceHeader.patient}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{invoiceHeader.office}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{invoiceHeader.invNo}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {formatMoneyPreview(invoiceHeader.total)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-inv-reason">Edit reason (optional, max {MAX_EDIT_REASON})</Label>
                  <Textarea
                    id="edit-inv-reason"
                    placeholder="Short reason shown on audit…"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value.slice(0, MAX_EDIT_REASON))}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                {!hasProducts && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    This invoice has no product lines in the API response. Nothing to edit here.
                  </p>
                )}

                {hasProducts && (
                  <div className="space-y-6">
                    {productEdits.map((edit, idx) => (
                      <div key={edit.productId} className="rounded-lg border p-4 space-y-3">
                        <p className="font-medium text-foreground">{edit.label}</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-1.5">
                            <Label htmlFor={`base-${edit.productId}`}>Base price</Label>
                            <Input
                              id={`base-${edit.productId}`}
                              type="number"
                              min={0}
                              step="0.01"
                              value={edit.base_price}
                              onChange={(e) => {
                                const v = e.target.value
                                setProductEdits((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, base_price: v } : p)),
                                )
                              }}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`mat-${edit.productId}`}>Material price</Label>
                            <Input
                              id={`mat-${edit.productId}`}
                              type="number"
                              min={0}
                              step="0.01"
                              value={edit.material_price}
                              onChange={(e) => {
                                const v = e.target.value
                                setProductEdits((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, material_price: v } : p)),
                                )
                              }}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`teeth-${edit.productId}`}>Teeth count</Label>
                            <Input
                              id={`teeth-${edit.productId}`}
                              type="number"
                              min={1}
                              step={1}
                              value={edit.teeth_count}
                              onChange={(e) => {
                                const v = e.target.value
                                setProductEdits((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, teeth_count: v } : p)),
                                )
                              }}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`rush-${edit.productId}`}>Rush %</Label>
                            <Input
                              id={`rush-${edit.productId}`}
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              value={edit.rush_percentage}
                              onChange={(e) => {
                                const v = e.target.value
                                setProductEdits((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, rush_percentage: v } : p)),
                                )
                              }}
                            />
                          </div>
                        </div>

                        {edit.addons.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Add-ons</p>
                            {edit.addons.map((a, ai) => (
                              <div key={a.id} className="grid grid-cols-2 gap-2 items-end">
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                  <Label className="text-xs" htmlFor={`addon-${edit.productId}-${a.id}`}>
                                    {a.label}
                                  </Label>
                                  <div className="flex gap-2">
                                    <Input
                                      id={`addon-${edit.productId}-${a.id}`}
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      value={a.price}
                                      onChange={(e) => {
                                        const v = e.target.value
                                        setProductEdits((prev) =>
                                          prev.map((p, i) => {
                                            if (i !== idx) return p
                                            const addons = p.addons.map((x, j) =>
                                              j === ai ? { ...x, price: v } : x,
                                            )
                                            return { ...p, addons }
                                          }),
                                        )
                                      }}
                                      className="flex-1"
                                    />
                                    <Input
                                      type="number"
                                      min={1}
                                      step={1}
                                      className="w-20"
                                      title="Quantity"
                                      value={a.quantity}
                                      onChange={(e) => {
                                        const v = e.target.value
                                        setProductEdits((prev) =>
                                          prev.map((p, i) => {
                                            if (i !== idx) return p
                                            const addons = p.addons.map((x, j) =>
                                              j === ai ? { ...x, quantity: v } : x,
                                            )
                                            return { ...p, addons }
                                          }),
                                        )
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {edit.retentions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Retentions</p>
                            {edit.retentions.map((r, ri) => (
                              <div key={r.id} className="flex gap-2">
                                <div className="flex-1 space-y-1">
                                  <Label className="text-xs" htmlFor={`ret-${edit.productId}-${r.id}`}>
                                    {r.label}
                                  </Label>
                                  <Input
                                    id={`ret-${edit.productId}-${r.id}`}
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={r.price}
                                    onChange={(e) => {
                                      const v = e.target.value
                                      setProductEdits((prev) =>
                                        prev.map((p, i) => {
                                          if (i !== idx) return p
                                          const retentions = p.retentions.map((x, j) =>
                                            j === ri ? { ...x, price: v } : x,
                                          )
                                          return { ...p, retentions }
                                        }),
                                      )
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {edit.advance_fields.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Advance fields</p>
                            {edit.advance_fields.map((f, fi) => (
                              <div key={f.id} className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs" htmlFor={`adv-p-${edit.productId}-${f.id}`}>
                                    {f.label} (price)
                                  </Label>
                                  <Input
                                    id={`adv-p-${edit.productId}-${f.id}`}
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={f.price}
                                    onChange={(e) => {
                                      const v = e.target.value
                                      setProductEdits((prev) =>
                                        prev.map((p, i) => {
                                          if (i !== idx) return p
                                          const advance_fields = p.advance_fields.map((x, j) =>
                                            j === fi ? { ...x, price: v } : x,
                                          )
                                          return { ...p, advance_fields }
                                        }),
                                      )
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs" htmlFor={`adv-q-${edit.productId}-${f.id}`}>
                                    Qty
                                  </Label>
                                  <Input
                                    id={`adv-q-${edit.productId}-${f.id}`}
                                    type="number"
                                    min={1}
                                    step="1"
                                    value={f.quantity}
                                    onChange={(e) => {
                                      const v = e.target.value
                                      setProductEdits((prev) =>
                                        prev.map((p, i) => {
                                          if (i !== idx) return p
                                          const advance_fields = p.advance_fields.map((x, j) =>
                                            j === fi ? { ...x, quantity: v } : x,
                                          )
                                          return { ...p, advance_fields }
                                        }),
                                      )
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground border-t pt-2">
                          Estimated line total:{" "}
                          <span className="font-semibold text-foreground">
                            {formatMoneyPreview(estimatedLineTotal(edit))}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || loading || !hasProducts || !invoice}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
