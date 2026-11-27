"use client"

import { useState, type ReactNode } from "react"
import { ArrowLeft, Check, Clock, Layers, Loader2, Minus, Package2, Plus, Star } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

const FLAGS = [
  "is_single_stage",
  "has_multiple_grades",
  "is_teeth_based_price",
  "is_splinted",
  "gender_required",
  "age_required",
  "show_jaw_photo",
] as const

const TEETH_PRICES = ["teeth_per_tooth_price", "teeth_first_tooth_price", "teeth_additional_tooth_price"] as const

const isSet = (value: unknown) => value !== null && value !== undefined && value !== ""
const isYes = (value: unknown) => value === true || value === 1 || value === "Yes"
const money = (value: unknown) => (isSet(value) ? `$${value}` : "-")

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
      <div className="min-h-0 flex-1 overflow-auto bg-gray-50" data-testid="product-import-detail">
        {query.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#1162a8]" />
          </div>
        ) : !query.data ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[#CF0202]">{t("productImport.detail.loadFailed")}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()}>
              {t("productImport.retry")}
            </Button>
          </div>
        ) : (
          <Detail product={query.data} />
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-gray-200 px-4 sm:px-6 py-3">
        <Button variant="outline" onClick={onBack} data-testid="product-import-detail-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("productImport.back")}
        </Button>
        <Button
          variant={selected ? "outline" : "default"}
          className={selected ? "" : "bg-[#1162a8] hover:bg-[#0d4d87] text-white"}
          onClick={onToggle}
          disabled={!query.data}
          aria-pressed={selected}
          data-testid="product-import-detail-select"
        >
          {selected ? <Check className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {selected ? t("productImport.detail.unselect") : t("productImport.detail.select")}
        </Button>
      </div>
    </>
  )
}

function Detail({ product }: { product: ImportProductDetail }) {
  const { t } = useTranslation()
  const label = (key: string) => t(`productImport.detail.${key}`)
  const [tab, setTab] = useState("overview")
  const { settings } = product

  const days = [settings.min_days_to_process, settings.max_days_to_process].filter(isSet)
  const stats = [
    {
      key: "days",
      icon: <Clock className="h-4 w-4" />,
      value: days.length ? [...new Set(days.map(String))].join("–") : "-",
      name: label("processingDays"),
    },
    { key: "stages", icon: <Layers className="h-4 w-4" />, value: product.stages.length, name: label("stages") },
    { key: "grades", icon: <Star className="h-4 w-4" />, value: product.grades.length, name: label("grades") },
    { key: "materials", icon: <Package2 className="h-4 w-4" />, value: product.materials.length, name: label("materials") },
  ]

  const teethPrices = TEETH_PRICES.filter((key) => isSet(settings[key]))

  /** A tab is offered only when it has something to show. */
  const tabs = [
    {
      key: "workflow",
      count: product.stages.length + product.variations.length,
    },
    {
      key: "options",
      count:
        product.grades.length +
        product.materials.length +
        product.retentions.length +
        product.retention_options.length +
        product.impressions.length +
        product.addons.length,
    },
    { key: "shades", count: product.teeth_shades.length + product.gum_shades.length },
    {
      key: "teeth",
      count:
        product.extractions.length +
        product.opposite_extractions.length +
        product.default_tooth_chart.length +
        product.jaw_images.length,
    },
    { key: "pricing", count: product.price_tiers.length + teethPrices.length },
    { key: "advanced", count: product.implants.length + product.advance_fields.length },
  ].filter((entry) => entry.count > 0)

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 sm:px-6 py-5">
        <div className="flex items-start gap-4">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt=""
              className="h-20 w-20 sm:h-24 sm:w-24 flex-none rounded-lg border border-gray-200 bg-white object-cover shadow-sm"
            />
          ) : (
            <span className="flex h-20 w-20 sm:h-24 sm:w-24 flex-none items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm">
              <Package2 className="h-7 w-7 text-gray-300" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <h3 className="min-w-0 break-words text-lg sm:text-xl font-semibold text-gray-900">{product.name}</h3>
              <p className="text-lg sm:text-xl font-semibold text-[#1162a8]">{money(product.price)}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {product.code && <Chip>{product.code}</Chip>}
              {product.category && (
                <Chip>
                  {[product.category.name, product.subcategory?.name].filter(Boolean).join(" › ")}
                </Chip>
              )}
              {product.is_imported && <Chip tone="green">{t("productImport.imported")}</Chip>}
            </div>
            {product.is_imported && (
              <p className="mt-2 break-words text-xs text-gray-600">
                {label("inLibraryAs")}: {product.imported_products.map((copy) => copy.name).join(", ")}
              </p>
            )}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div key={stat.key} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-blue-50 text-[#1162a8]">
                {stat.icon}
              </span>
              <div className="min-w-0">
                <dd className="text-base font-semibold leading-tight text-gray-900">{stat.value}</dd>
                <dt className="break-words text-xs text-gray-500">{stat.name}</dt>
              </div>
            </div>
          ))}
        </dl>
      </div>

      <div className="sticky top-0 z-10 border-y border-gray-200 bg-white px-4 sm:px-6">
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0">
          {[{ key: "overview", count: 0 }, ...tabs].map((entry) => (
            <TabsTrigger
              key={entry.key}
              value={entry.key}
              className="flex-none gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-gray-500 data-[state=active]:border-[#1162a8] data-[state=active]:text-[#1162a8] data-[state=active]:shadow-none"
              data-testid={`product-import-tab-${entry.key}`}
            >
              {label(`tabs.${entry.key}`)}
              {entry.count > 0 && (
                <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-medium text-gray-600">
                  {entry.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="px-4 sm:px-6 pb-5">
        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card title={label("settingsTitle")}>
            <ul className="flex flex-wrap gap-2">
              {FLAGS.filter((key) => isSet(settings[key])).map((key) => {
                const on = isYes(settings[key])
                return (
                  <li
                    key={key}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                      on ? "border-blue-200 bg-blue-50 text-[#1162a8]" : "border-gray-200 bg-white text-gray-400"
                    }`}
                  >
                    {on ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {label(`settings.${key}`)}
                    <span className="sr-only">: {on ? label("yes") : label("no")}</span>
                  </li>
                )
              })}
            </ul>
          </Card>
          {tabs.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tabs.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setTab(entry.key)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-left transition-colors hover:border-[#1162a8] hover:bg-blue-50"
                >
                  <span className="block text-sm font-medium text-gray-900">{label(`tabs.${entry.key}`)}</span>
                  <span className="block text-xs text-gray-500">
                    {t("productImport.detail.items", { number: entry.count })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="workflow" className="mt-4 space-y-4">
          {product.stages.length > 0 && (
            <Card title={label("stages")}>
              <ol>
                {product.stages.map((stage, index) => (
                  <li key={stage.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {index < product.stages.length - 1 && (
                      <span className="absolute left-[13px] top-7 bottom-0 w-px bg-gray-200" aria-hidden />
                    )}
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#1162a8] text-xs font-medium text-white">
                      {index + 1}
                    </span>
                    <ItemText
                      item={stage}
                      detail={stage.variation ? `${label("variation")}: ${stage.variation}` : null}
                    />
                  </li>
                ))}
              </ol>
            </Card>
          )}
          {product.variations.length > 0 && (
            <Card title={label("product_variations")}>
              <Tiles
                tiles={product.variations.map((row) => ({
                  key: row.id,
                  title: row.name_template || row.teeth_spec || `#${row.id}`,
                  text: [row.teeth_spec, isSet(row.days) ? `${label("days")}: ${row.days}` : null]
                    .filter(Boolean)
                    .join(" · "),
                  image: row.image_url,
                }))}
              />
            </Card>
          )}
        </TabsContent>

        <TabsContent value="options" className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          {(["grades", "materials", "retentions", "retention_options", "impressions", "addons"] as const)
            .filter((section) => product[section].length > 0)
            .map((section) => (
              <Card key={section} title={label(section)} count={product[section].length}>
                <ul className="divide-y divide-gray-100">
                  {product[section].map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <ItemText
                        item={item}
                        detail={
                          item.variations?.length
                            ? `${label("variations")}: ${item.variations.join(", ")}`
                            : null
                        }
                      />
                      {isSet(item.price) && <span className="flex-none text-sm text-gray-900">{money(item.price)}</span>}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="shades" className="mt-4 space-y-4">
          {(["teeth_shades", "gum_shades"] as const)
            .filter((section) => product[section].length > 0)
            .map((section) => (
              <Card key={section} title={label(section)} count={product[section].length}>
                <div className="space-y-3">
                  {Object.entries(groupByBrand(product[section])).map(([brand, shades]) => (
                    <div key={brand}>
                      {brand && <p className="mb-1.5 text-xs font-medium text-gray-500">{brand}</p>}
                      <ul className="flex flex-wrap gap-1.5">
                        {shades.map((shade) => (
                          <li
                            key={shade.id}
                            className={`rounded-md border px-2.5 py-1 text-xs ${
                              shade.status === "Inactive"
                                ? "border-gray-200 bg-gray-50 text-gray-400"
                                : "border-gray-300 bg-white text-gray-900"
                            }`}
                            title={shade.status === "Inactive" ? label("inactive") : undefined}
                          >
                            {shade.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="teeth" className="mt-4 space-y-4">
          {(["extractions", "opposite_extractions"] as const)
            .filter((section) => product[section].length > 0)
            .map((section) => (
              <Card key={section} title={label(section)} count={product[section].length}>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product[section].map((item) => (
                    <li key={item.id} className="rounded-lg border border-gray-200 px-3 py-2">
                      <ItemText
                        item={item}
                        detail={
                          [
                            isSet(item.min_teeth) ? `${label("minTeeth")}: ${item.min_teeth}` : null,
                            isSet(item.max_teeth) ? `${label("maxTeeth")}: ${item.max_teeth}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || null
                        }
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          {product.default_tooth_chart.length > 0 && (
            <Card title={label("default_tooth_chart")} count={product.default_tooth_chart.length}>
              <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {product.default_tooth_chart.map((row) => (
                  <li key={row.tooth_number} className="rounded-lg border border-gray-200 px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">
                      {label("tooth")} {row.tooth_number}
                    </p>
                    <p className="break-words text-xs text-gray-500">
                      {[row.chart_type, row.retention_option, row.extraction].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {product.jaw_images.length > 0 && (
            <Card title={label("jaw_images")}>
              <Tiles
                tiles={product.jaw_images.map((row) => ({
                  key: row.jaw_type,
                  title: row.jaw_type,
                  text: "",
                  image: row.image_url,
                }))}
              />
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pricing" className="mt-4 space-y-4">
          {teethPrices.length > 0 && (
            <Card title={label("teethPricing")}>
              {isSet(settings.teeth_pricing_strategy) && (
                <p className="mb-2 text-xs text-gray-500">
                  {label("settings.teeth_pricing_strategy")}: {String(settings.teeth_pricing_strategy)}
                </p>
              )}
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {teethPrices.map((key) => (
                  <div key={key} className="rounded-lg border border-gray-200 px-3 py-2">
                    <dd className="text-base font-semibold text-gray-900">{money(settings[key])}</dd>
                    <dt className="text-xs text-gray-500">{label(`settings.${key}`)}</dt>
                  </div>
                ))}
              </dl>
            </Card>
          )}
          {product.price_tiers.length > 0 && (
            <Card title={label("price_tiers")}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium">{label("teethCount")}</th>
                    <th className="pb-2 text-right font-medium">{label("price")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {product.price_tiers.map((tier) => (
                    <tr key={tier.min_teeth}>
                      <td className="py-2 text-gray-900">
                        {tier.min_teeth}
                        {isSet(tier.max_teeth) ? `–${tier.max_teeth}` : "+"}
                      </td>
                      <td className="py-2 text-right font-medium text-gray-900">{money(tier.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="mt-4 space-y-4">
          {product.implants.length > 0 && (
            <Card title={label("implants")} count={product.implants.length}>
              <Tiles
                tiles={product.implants.map((row) => ({
                  key: row.id,
                  title: row.name,
                  text: row.platforms.join(", "),
                }))}
              />
            </Card>
          )}
          {product.advance_fields.length > 0 && (
            <Card title={label("advance_fields")} count={product.advance_fields.length}>
              <Tiles
                tiles={product.advance_fields.map((row) => ({
                  key: row.id,
                  title: row.name,
                  text: [row.field_type, row.is_required === "Yes" ? label("required") : null, row.options.join(", ")]
                    .filter(Boolean)
                    .join(" · "),
                }))}
              />
            </Card>
          )}
        </TabsContent>
      </div>
    </Tabs>
  )
}

function groupByBrand(shades: LinkedItem[]): Record<string, LinkedItem[]> {
  return shades.reduce<Record<string, LinkedItem[]>>((groups, shade) => {
    ;(groups[shade.brand ?? ""] ??= []).push(shade)
    return groups
  }, {})
}

function Chip({ children, tone }: { children: ReactNode; tone?: "green" }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs ${
        tone === "green" ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-600"
      }`}
    >
      {children}
    </span>
  )
}

function Card({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        {title}
        {count !== undefined && (
          <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-medium text-gray-600">{count}</span>
        )}
      </h4>
      {children}
    </section>
  )
}

/** A linked item's name, its Default / Required / Optional / Inactive marks and one line of detail. */
function ItemText({ item, detail }: { item: LinkedItem; detail?: string | null }) {
  const { t } = useTranslation()
  const marks = [
    item.is_default === "Yes" && "default",
    item.is_required === "Yes" && "required",
    item.is_optional === "Yes" && "optional",
    item.status === "Inactive" && "inactive",
  ].filter(Boolean) as string[]

  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-1.5 text-sm text-gray-900">
        <span className="break-words">{item.name}</span>
        {marks.map((mark) => (
          <span
            key={mark}
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              mark === "inactive" ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-[#1162a8]"
            }`}
          >
            {t(`productImport.detail.${mark}`)}
          </span>
        ))}
      </p>
      {detail && <p className="break-words text-xs text-gray-500">{detail}</p>}
    </div>
  )
}

function Tiles({
  tiles,
}: {
  tiles: Array<{ key: string | number; title: string; text: string; image?: string | null }>
}) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {tiles.map((tile) => (
        <li key={tile.key} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
          {tile.image && (
            <img src={tile.image} alt="" className="h-12 w-12 flex-none rounded border border-gray-200 object-cover" />
          )}
          <div className="min-w-0">
            <p className="break-words text-sm font-medium text-gray-900">{tile.title}</p>
            {tile.text && <p className="break-words text-xs text-gray-500">{tile.text}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}
