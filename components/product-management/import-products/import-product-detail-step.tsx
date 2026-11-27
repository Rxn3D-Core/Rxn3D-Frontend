"use client"

import type { ReactNode } from "react"
import { ArrowLeft, Loader2, Package2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useImportProduct } from "@/hooks/use-lab-product-import"
import type { ImportProductDetail, LinkedItem } from "@/types/lab-product-import"

interface ImportProductDetailStepProps {
  customerId: number
  productId: number
  lang: string
  selected: boolean
  onToggle: () => void
  onBack: () => void
}

const LINKED_SECTIONS = [
  "grades",
  "stages",
  "impressions",
  "materials",
  "retentions",
  "retention_options",
  "gum_shades",
  "teeth_shades",
  "addons",
  "extractions",
  "opposite_extractions",
] as const

const isSet = (value: unknown) => value !== null && value !== undefined && value !== ""

/** Everything configured on one global product. */
export function ImportProductDetailStep({
  customerId,
  productId,
  lang,
  selected,
  onToggle,
  onBack,
}: ImportProductDetailStepProps) {
  const { t } = useTranslation()
  const query = useImportProduct(customerId, productId, lang)

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto px-4 sm:px-6 py-4" data-testid="product-import-detail">
        {query.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#1162a8]" />
          </div>
        ) : !query.data ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#CF0202]">{t("productImport.detail.loadFailed")}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()}>
              {t("productImport.retry")}
            </Button>
          </div>
        ) : (
          <Detail product={query.data} />
        )}
      </div>
      <div className="flex justify-between gap-2 border-t border-gray-200 px-4 sm:px-6 py-3">
        <Button variant="outline" onClick={onBack} data-testid="product-import-detail-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("productImport.back")}
        </Button>
        <Button
          variant={selected ? "outline" : "default"}
          className={selected ? "" : "bg-[#1162a8] hover:bg-[#0d4d87] text-white"}
          onClick={onToggle}
          disabled={!query.data}
          data-testid="product-import-detail-select"
        >
          {selected ? t("productImport.detail.unselect") : t("productImport.detail.select")}
        </Button>
      </div>
    </>
  )
}

function Detail({ product }: { product: ImportProductDetail }) {
  const { t } = useTranslation()
  const label = (key: string) => t(`productImport.detail.${key}`)
  const money = (value: unknown) => (isSet(value) ? `$${value}` : "-")

  const overview = [
    [label("price"), money(product.price)],
    ...Object.entries(product.settings)
      .filter(([, value]) => isSet(value))
      .map(([key, value]) => [
        label(`settings.${key}`),
        key.startsWith("teeth_") && key.endsWith("_price") ? money(value) : value === true ? "Yes" : value === false ? "No" : String(value),
      ]),
  ]

  const itemFacts = (item: LinkedItem) =>
    [
      item.brand,
      item.variation && `${label("variation")}: ${item.variation}`,
      item.variations?.length ? `${label("variations")}: ${item.variations.join(", ")}` : null,
      isSet(item.price) ? money(item.price) : null,
      isSet(item.min_teeth) ? `${label("minTeeth")}: ${item.min_teeth}` : null,
      isSet(item.max_teeth) ? `${label("maxTeeth")}: ${item.max_teeth}` : null,
      item.is_default === "Yes" ? label("default") : null,
      item.is_required === "Yes" ? label("required") : null,
      item.is_optional === "Yes" ? label("optional") : null,
      item.status === "Inactive" ? label("inactive") : null,
    ]
      .filter(Boolean)
      .join(" · ")

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="h-16 w-16 flex-none rounded border border-gray-200 object-cover" />
        ) : (
          <span className="flex h-16 w-16 flex-none items-center justify-center rounded border border-gray-200 bg-gray-50">
            <Package2 className="h-5 w-5 text-gray-400" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="break-words text-base font-medium text-gray-900">{product.name}</h3>
          <p className="break-words text-xs text-gray-500">
            {[product.code, product.category?.name, product.subcategory?.name].filter(Boolean).join(" · ")}
          </p>
          {product.is_imported && (
            <p className="mt-1 break-words text-xs text-green-700">
              {t("productImport.imported")}: {product.imported_products.map((copy) => copy.name).join(", ")}
            </p>
          )}
        </div>
      </div>

      <Section title={label("overview")}>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {overview.map(([name, value]) => (
            <div key={name} className="flex justify-between gap-3 text-sm">
              <dt className="text-gray-500">{name}</dt>
              <dd className="break-words text-right text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Rows
        title={label("price_tiers")}
        rows={product.price_tiers.map((tier) => ({
          name: `${tier.min_teeth}${isSet(tier.max_teeth) ? `–${tier.max_teeth}` : "+"}`,
          facts: money(tier.total_price),
        }))}
      />
      {LINKED_SECTIONS.map((section) => (
        <Rows
          key={section}
          title={label(section)}
          rows={product[section].map((item) => ({ name: item.name, facts: itemFacts(item) }))}
        />
      ))}
      <Rows
        title={label("product_variations")}
        rows={product.variations.map((row) => ({
          name: row.name_template || row.teeth_spec || `#${row.id}`,
          facts: [row.teeth_spec, isSet(row.days) ? `${label("days")}: ${row.days}` : null].filter(Boolean).join(" · "),
          image: row.image_url,
        }))}
      />
      <Rows
        title={label("jaw_images")}
        rows={product.jaw_images.map((row) => ({ name: row.jaw_type, facts: "", image: row.image_url }))}
      />
      <Rows
        title={label("default_tooth_chart")}
        rows={product.default_tooth_chart.map((row) => ({
          name: `${label("tooth")} ${row.tooth_number}`,
          facts: [row.chart_type, row.retention_option, row.extraction].filter(Boolean).join(" · "),
        }))}
      />
      <Rows
        title={label("implants")}
        rows={product.implants.map((row) => ({ name: row.name, facts: row.platforms.join(", ") }))}
      />
      <Rows
        title={label("advance_fields")}
        rows={product.advance_fields.map((row) => ({
          name: row.name,
          facts: [row.field_type, row.is_required === "Yes" ? label("required") : null, row.options.join(", ")]
            .filter(Boolean)
            .join(" · "),
        }))}
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 border-b border-gray-200 pb-1 text-sm font-medium text-gray-900">{title}</h4>
      {children}
    </section>
  )
}

/** A titled list; nothing is shown for an empty one. */
function Rows({ title, rows }: { title: string; rows: Array<{ name: string; facts: string; image?: string | null }> }) {
  if (rows.length === 0) return null
  return (
    <Section title={`${title} (${rows.length})`}>
      <ul className="divide-y divide-gray-100">
        {rows.map((row, index) => (
          <li key={index} className="flex items-center gap-3 py-1.5">
            {row.image && <img src={row.image} alt="" className="h-10 w-10 flex-none rounded border border-gray-200 object-cover" />}
            <div className="flex min-w-0 flex-1 flex-wrap justify-between gap-x-3">
              <span className="break-words text-sm text-gray-900">{row.name}</span>
              {row.facts && <span className="break-words text-xs text-gray-500">{row.facts}</span>}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
