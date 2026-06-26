"use client"

import { format } from "date-fns"
import { Columns } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  SLIP_LOCATION_FILTER_OPTIONS,
} from "@/app/lab-case-management/lab-slip-listing-constants"
import { slipListingStatusLabel } from "@/components/slip-listing/SlipListingStatusTabs"

import { V2_STATUS_TABS } from "../case-table-ui.mjs"
import type { V2DateRange, V2VisibleColumns } from "../case-table-types"
import {
  CalendarIcon,
  CancelledIcon,
  DoneIcon,
  HoldIcon,
  ProgressIcon,
} from "./V2CaseIcons"

export type V2CaseControlsMenuProps = {
  search: string
  onSearchChange: (value: string) => void
  onSearchEnter: () => void
  status: string
  onStatusChange: (value: string) => void
  office: string
  onOfficeChange: (value: string) => void
  location: string
  onLocationChange: (value: string) => void
  dateRange: V2DateRange
  onDateRangeChange: (value: V2DateRange) => void
  productType: string
  onProductTypeChange: (value: string) => void
  doctor: string
  onDoctorChange: (value: string) => void
  user: string
  onUserChange: (value: string) => void
  stage: string
  onStageChange: (value: string) => void
  officeLab: string
  onOfficeLabChange: (value: string) => void
  attachmentsOnly: boolean
  onAttachmentsOnlyChange: (value: boolean) => void
  showAdvanced: boolean
  onShowAdvancedChange: (value: boolean) => void
  visibleColumns: V2VisibleColumns
  onColumnChange: (key: keyof V2VisibleColumns) => void
  itemsPerPage: number
  onItemsPerPageChange: (value: number) => void
  offices: string[]
  statuses: string[]
  products: string[]
  doctors: string[]
  users: string[]
  onClearFilters: () => void
}

const statusIcons = {
  progress: ProgressIcon,
  hold: HoldIcon,
  cancelled: CancelledIcon,
  done: DoneIcon,
}

const columnLabels: Record<keyof V2VisibleColumns, string> = {
  timestamp: "Time stamp",
  office: "Office",
  patient: "Patient",
  slipNumber: "Slip number",
  pan: "Pan",
  product: "Product",
  status: "Status",
  location: "Location",
  attachment: "Attachment",
  viewSlip: "View slip",
  due: "Due date",
  actions: "Actions",
}

const requiredColumns = new Set<keyof V2VisibleColumns>(["actions", "office", "patient", "pan"])

export function V2CaseControlsMenu(props: V2CaseControlsMenuProps) {
  return (
    <>
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            aria-label="Search cases"
            className="h-9 flex-1 border-gray-300 bg-white text-[13px] shadow-none placeholder:text-gray-400 focus-visible:border-gray-400 focus-visible:ring-1 focus-visible:ring-gray-400"
            placeholder="Search patient, slip, office…"
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && props.onSearchEnter()}
          />
          <Popover>
            <PopoverTrigger asChild>
              <button
                aria-label="Case table controls"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                type="button"
              >
                <Columns className="h-[18px] w-[18px]" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 border-gray-200 bg-white p-3 shadow-xl">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={props.office} onValueChange={props.onOfficeChange}>
                    <SelectTrigger className="h-8 bg-white text-xs"><SelectValue placeholder="All offices" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All offices</SelectItem>
                      {props.offices.filter(Boolean).map((office) => <SelectItem key={office} value={office}>{office}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={props.location} onValueChange={props.onLocationChange}>
                    <SelectTrigger className="h-8 bg-white text-xs"><SelectValue placeholder="All locations" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All locations</SelectItem>
                      {SLIP_LOCATION_FILTER_OPTIONS.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button className="h-8 flex-1 text-xs" variant="outline" onClick={() => props.onShowAdvancedChange(!props.showAdvanced)}>
                    {props.showAdvanced ? "Hide filters" : "Advanced filters"}
                  </Button>
                  <Select value={String(props.itemsPerPage)} onValueChange={(value) => props.onItemsPerPageChange(Number(value))}>
                    <SelectTrigger className="h-8 w-[88px] bg-white text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{[10, 20, 50, 100].map((size) => <SelectItem key={size} value={String(size)}>{size} rows</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="border-t border-[#e1ddd5] pt-2">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77736b]">Columns</p>
                  <div className="grid grid-cols-2 gap-x-3">
                    {(Object.keys(props.visibleColumns) as Array<keyof V2VisibleColumns>).map((key) => (
                      <label className="flex min-h-7 cursor-pointer items-center gap-2 text-xs text-[#4f4c47]" key={key}>
                        <Checkbox checked={props.visibleColumns[key]} disabled={requiredColumns.has(key)} onCheckedChange={() => props.onColumnChange(key)} />
                        <span>{columnLabels[key]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button className="w-full border-t border-gray-200 pt-2 text-left text-xs font-medium text-red-600 hover:text-red-800" type="button" onClick={props.onClearFilters}>
                  Clear filters
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {V2_STATUS_TABS.map((tab: { label: string; value: string; icon: string }) => {
            const Icon = statusIcons[tab.icon as keyof typeof statusIcons]
            const active = props.status === tab.value
            return (
              <button
                aria-pressed={active}
                className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${active ? "border-[#504d47] bg-[#504d47] text-white" : "border-gray-300 bg-white text-gray-600 hover:bg-[#ece9e2]"}`}
                key={tab.value}
                onClick={() => props.onStatusChange(active ? "All" : tab.value)}
                type="button"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {props.showAdvanced && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <DateControl label="Start date" value={props.dateRange.start} onChange={(start) => props.onDateRangeChange({ ...props.dateRange, start })} />
            <DateControl label="End date" value={props.dateRange.end} onChange={(end) => props.onDateRangeChange({ ...props.dateRange, end })} min={props.dateRange.start} />
            <CompactSelect value={props.status} onChange={props.onStatusChange} placeholder="All status" options={props.statuses.map((value) => ({ value, label: slipListingStatusLabel(value) }))} />
            <CompactSelect value={props.productType} onChange={props.onProductTypeChange} placeholder="All product types" options={props.products.filter((value) => value && value !== "Unknown").map((value) => ({ value, label: value }))} />
            <CompactSelect value={props.doctor} onChange={props.onDoctorChange} placeholder="All doctors" options={props.doctors.map((value) => ({ value, label: value }))} />
            <CompactSelect value={props.user} onChange={props.onUserChange} placeholder="All users" options={props.users.map((value) => ({ value, label: value }))} />
            <CompactSelect value={props.stage} onChange={props.onStageChange} placeholder="All stages" options={[]} />
            <CompactSelect value={props.officeLab} onChange={props.onOfficeLabChange} placeholder="All office & lab" options={[]} />
            <Select value={props.location} onValueChange={props.onLocationChange}>
              <SelectTrigger className="h-8 bg-white text-xs"><SelectValue placeholder="All locations" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All locations</SelectItem>
                {SLIP_LOCATION_FILTER_OPTIONS.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex h-8 items-center gap-2 text-xs text-[#55524c] xl:col-span-2">
              <Checkbox checked={props.attachmentsOnly} onCheckedChange={(checked) => props.onAttachmentsOnlyChange(checked === true)} />
              Cases with attachments only
            </label>
          </div>
        </div>
      )}
    </>
  )
}

function CompactSelect({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: Array<{ value: string; label: string }> }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 bg-white text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="All">{placeholder}</SelectItem>
        {options.filter((option) => option.value).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function DateControl({ label, value, onChange, min }: { label: string; value?: Date; onChange: (value?: Date) => void; min?: Date }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="h-8 justify-start bg-white px-2 text-xs font-normal" variant="outline">
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
          {value ? format(value, "MMM d, yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar mode="single" selected={value} onSelect={onChange} disabled={(date) => date > new Date() || date < (min ?? new Date("1900-01-01"))} initialFocus />
      </PopoverContent>
    </Popover>
  )
}
