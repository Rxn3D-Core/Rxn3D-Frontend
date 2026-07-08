"use client"

import { useState, useRef, useEffect } from "react"
import { Filter, Search, Columns } from "lucide-react"
import { Input } from "@/components/ui/input"
import { SLIP_LOCATION_FILTER_OPTIONS } from "@/app/lab-case-management/lab-slip-listing-constants"

const GRADIENT = "linear-gradient(231.46deg, #2AA6DE -14.5%, #82298D 51.11%, #C9539F 116.71%)"

const ALL_TAB = { id: 0, label: "All" }
const LOCATION_TABS = [ALL_TAB, ...SLIP_LOCATION_FILTER_OPTIONS]

const COLUMN_KEYS = [
  "patient",
  "slip",
  "panProduct",
  "location",
  "dueDate",
  "status",
  "office",
  "caseNo",
  "timestamp",
] as const

export type ColumnKey = typeof COLUMN_KEYS[number]

type ColumnDefinition = {
  key: ColumnKey
  label: string
  default: boolean
  required?: boolean
}

export const ALL_COLUMNS: readonly ColumnDefinition[] = [
  { key: "patient",    label: "Patient",        default: true },
  { key: "slip",       label: "Slip #",         default: true },
  { key: "panProduct", label: "Pan / Product",  default: true, required: true },
  { key: "location",   label: "Location",       default: true },
  { key: "dueDate",    label: "Due date",       default: true },
  { key: "status",     label: "Status",         default: true, required: true },
  { key: "office",     label: "Office",         default: false },
  { key: "caseNo",     label: "Case #",         default: false },
  { key: "timestamp",  label: "Time stamp",     default: false },
]

const DEFAULT_VISIBLE = new Set(ALL_COLUMNS.filter((c) => c.default || c.required).map((c) => c.key)) as Set<ColumnKey>

interface Props {
  search: string
  onSearchChange: (value: string) => void
  onSearchEnter: () => void
  onAdvancedFilterClick: () => void
  locations: string[]
  onLocationChange: (value: string) => void
  statuses: string[]
  onStatusChange: (status: string) => void
  onClearQuickFilters: () => void
  visibleColumns: Set<ColumnKey>
  onVisibleColumnsChange: (cols: Set<ColumnKey>) => void
}

export function V3FilterBar({
  search,
  onSearchChange,
  onSearchEnter,
  onAdvancedFilterClick,
  locations,
  onLocationChange,
  statuses,
  onStatusChange,
  onClearQuickFilters,
  visibleColumns,
  onVisibleColumnsChange,
}: Props) {
  const [colPanelOpen, setColPanelOpen] = useState(false)
  const colPanelRef = useRef<HTMLDivElement>(null)
  const statusActive = (status: string) => statuses.some((item) => normalizeStatus(item) === normalizeStatus(status))
  const hasQuickFilters = locations.length > 0 || statuses.length > 0

  useEffect(() => {
    if (!colPanelOpen) return
    function onPointerDown(e: PointerEvent) {
      if (colPanelRef.current && !colPanelRef.current.contains(e.target as Node)) {
        setColPanelOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [colPanelOpen])

  function toggleColumn(key: ColumnKey) {
    const col = ALL_COLUMNS.find((c) => c.key === key)
    if (col?.default || col?.required) return
    const next = new Set(visibleColumns)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onVisibleColumnsChange(next)
  }

  return (
    <div className="border-b border-[#e5e7eb] bg-white px-4 py-3 space-y-3">
      {/* Search row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <Input
            aria-label="Search cases"
            className="h-9 pl-9 border-[#e5e7eb] bg-white text-[13px] shadow-none placeholder:text-[#9ca3af] focus-visible:border-[#9ca3af] focus-visible:ring-1 focus-visible:ring-[#9ca3af]"
            placeholder="Search patient, slip, office…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearchEnter()}
          />
        </div>
        <IconBtn aria-label="Filters" onClick={onAdvancedFilterClick}><Filter className="h-4 w-4" /></IconBtn>

        {/* Columns toggle button + panel */}
        <div ref={colPanelRef} style={{ position: "relative" }}>
          <IconBtn
            aria-label="Show/Hide Columns"
            onClick={() => setColPanelOpen((o) => !o)}
            style={{ background: colPanelOpen ? "#f3f4f6" : undefined }}
          >
            <Columns className="h-4 w-4" />
          </IconBtn>

          {colPanelOpen && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 60,
                background: "#fff", borderRadius: 12,
                boxShadow: "0px 8px 24px rgba(0,0,0,0.12)",
                border: "1px solid #E2E4E8",
                minWidth: 260, padding: "16px 0 12px",
              }}
            >
              <p style={{ fontSize: 18, fontWeight: 700, color: "#000", padding: "0 16px 12px" }}>Show/Hide Column</p>
              <div style={{ borderTop: "1px solid #E2E4E8", marginBottom: 4 }} />
              {ALL_COLUMNS.map(({ key, label, default: isDefault, required: isRequired }) => {
                const locked = isDefault || isRequired
                const checked = locked || visibleColumns.has(key)
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={locked}
                    aria-disabled={locked}
                    onClick={() => toggleColumn(key)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "10px 16px", background: "none", border: "none",
                      cursor: locked ? "default" : "pointer", gap: 12,
                      opacity: locked ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => { if (!locked) (e.currentTarget as HTMLElement).style.background = "#F9FAFB" }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Checkbox */}
                      <div
                        style={{
                          width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                          border: checked ? "none" : "1.5px solid #6B7280",
                          background: checked ? "#6B7280" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {checked && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: 15, color: checked ? "#6B7280" : "#111827" }}>{label}</span>
                    </div>
                    {isDefault && (
                      <span style={{ fontSize: 13, color: "#9CA3AF" }}>Default</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Location pill tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        <div className="flex shrink-0 items-center gap-1.5">
          {LOCATION_TABS.map((tab) => {
            const value = tab.id === 0 ? "All" : String(tab.id)
            const active = value === "All" ? locations.length === 0 : locations.includes(value)
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => onLocationChange(value)}
                className="relative inline-flex h-7 items-center px-3 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82298D]"
                style={{
                  borderRadius: 24,
                  ...(active
                    ? { background: "#fff", color: "#82298D" }
                    : { background: "#fff", color: "#6b7280", border: "1px solid #E2E4E8" }),
                }}
              >
                {active && (
                  <>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        borderRadius: 24,
                        padding: 1.5,
                        background: GRADIENT,
                        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                        WebkitMaskComposite: "xor",
                        maskComposite: "exclude",
                      }}
                    />
                    <span
                      style={{
                        background: GRADIENT,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {tab.label}
                    </span>
                  </>
                )}
                {!active && tab.label}
              </button>
            )
          })}
        </div>

        {/* Action icons */}
        <div className="flex shrink-0 items-center gap-1 ml-2">
          <ActionIcon
            active={statusActive("Draft")}
            aria-label="Draft"
            title="Draft"
            onClick={() => onStatusChange("Draft")}
          >
            <StatusAssetIcon active={statusActive("Draft")} src="/icons/stage-history.svg" />
          </ActionIcon>
          <ActionIcon
            active={statusActive("In Progress")}
            aria-label="In Progress"
            title="In Progress"
            onClick={() => onStatusChange("In Progress")}
          >
            <StatusAssetIcon active={statusActive("In Progress")} src="/icons/virtual-slip-actions/resume.svg" />
          </ActionIcon>
          <ActionIcon
            active={statusActive("On hold")}
            aria-label="On Hold"
            title="On Hold"
            onClick={() => onStatusChange("On hold")}
          >
            <PauseActionIcon active={statusActive("On hold")} />
          </ActionIcon>
          <ActionIcon
            active={statusActive("cancelled")}
            aria-label="Cancelled"
            title="Cancelled"
            onClick={() => onStatusChange("cancelled")}
          >
            <CancelActionIcon active={statusActive("cancelled")} />
          </ActionIcon>
          <ActionIcon
            active={statusActive("Finished")}
            aria-label="Finished"
            title="Finished"
            onClick={() => onStatusChange("Finished")}
          >
            <StatusAssetIcon active={statusActive("Finished")} src="/icons/check.svg" />
          </ActionIcon>
          <button
            type="button"
            disabled={!hasQuickFilters}
            onClick={onClearQuickFilters}
            className="ml-1 h-8 shrink-0 rounded-md border border-[#d1d5db] px-3 text-[11px] font-medium text-[#374151] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Filter
          </button>
        </div>
      </div>
    </div>
  )
}

function IconBtn({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-[#6b7280] transition-colors hover:bg-[#f3f4f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ca3af]"
      {...props}
    >
      {children}
    </button>
  )
}

function ActionIcon({
  active,
  children,
  className = "",
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#6b7280] transition-colors hover:bg-[#f3f4f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ca3af] ${className}`}
      aria-pressed={active}
      style={{ ...(active ? { backgroundColor: "#f3f4f6" } : null), ...style }}
      {...props}
    >
      {children}
    </button>
  )
}

function StatusAssetIcon({ active, src }: { active: boolean; src: string }) {
  return (
    <img
      src={src}
      alt=""
      className="h-5 w-5"
      style={active ? undefined : { filter: "grayscale(1) brightness(0)", opacity: 0.65 }}
    />
  )
}

function PauseActionIcon({ active }: { active: boolean }) {
  const inactiveFill = "#111827"

  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 20 20">
      <defs>
        <linearGradient id="v3PauseLeft" x1="15" y1="1" x2="3" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEBC38" />
          <stop offset="1" stopColor="#EDCC9F" />
        </linearGradient>
        <linearGradient id="v3PauseRight" x1="18" y1="1" x2="6" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8993E" />
          <stop offset="1" stopColor="#DB7F57" />
        </linearGradient>
      </defs>
      <rect x="4" y="3" width="4.5" height="14" rx="1.4" fill={active ? "url(#v3PauseLeft)" : inactiveFill} opacity={active ? 1 : 0.65} />
      <rect x="11.5" y="3" width="4.5" height="14" rx="1.4" fill={active ? "url(#v3PauseRight)" : inactiveFill} opacity={active ? 1 : 0.65} />
    </svg>
  )
}

function CancelActionIcon({ active }: { active: boolean }) {
  const inactiveFill = "#111827"

  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 20 20">
      <defs>
        <linearGradient id="v3CancelMain" x1="17" y1="3" x2="3" y2="17" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EF3D49" />
          <stop offset="1" stopColor="#C1404F" />
        </linearGradient>
        <linearGradient id="v3CancelAccent" x1="13" y1="7" x2="7" y2="13" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F26B73" />
          <stop offset="1" stopColor="#C44058" />
        </linearGradient>
      </defs>
      <rect x="2.3" y="8" width="15.4" height="4" rx="1.2" transform="rotate(-45 10 10)" fill={active ? "url(#v3CancelMain)" : inactiveFill} opacity={active ? 1 : 0.65} />
      <rect x="2.3" y="8" width="15.4" height="4" rx="1.2" transform="rotate(45 10 10)" fill={active ? "url(#v3CancelAccent)" : inactiveFill} opacity={active ? 1 : 0.65} />
    </svg>
  )
}

function normalizeStatus(status: string) {
  const value = status.trim().toLowerCase()
  if (value === "on hold" || value === "on-hold") return "on hold"
  if (value === "cancelled" || value === "canceled") return "cancelled"
  return value
}

export { DEFAULT_VISIBLE }
