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
  { key: "patient",    label: "Patient / Slip", default: true, required: true },
  { key: "panProduct", label: "Pan / Product",  default: true, required: true },
  { key: "location",   label: "Location",       default: true },
  { key: "dueDate",    label: "Due date",       default: true },
  { key: "status",     label: "Status",         default: true, required: true },
  { key: "office",     label: "Office",         default: false },
  { key: "caseNo",     label: "Case #",         default: false },
  { key: "timestamp",  label: "Time stamp",     default: false },
]

// "timestamp" starts visible but is not marked `default: true`, which would
// lock its Show/Hide Column checkbox — it has to stay toggleable from both the
// panel and the clock button in the action icon row.
const DEFAULT_VISIBLE = new Set<ColumnKey>([
  ...ALL_COLUMNS.filter((c) => c.default || c.required).map((c) => c.key),
  "timestamp",
])

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
  /** Office profile listing — the counterparty column is labelled "Lab". */
  officeProfile?: boolean
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
  officeProfile = false,
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
              {ALL_COLUMNS.map(({ key, label: baseLabel, default: isDefault, required: isRequired }) => {
                const locked = isDefault || isRequired
                const label = key === "office" && officeProfile ? "Lab" : baseLabel
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
            active={visibleColumns.has("timestamp")}
            aria-label="Show time stamp"
            title={visibleColumns.has("timestamp") ? "Hide time stamp" : "Show time stamp"}
            onClick={() => toggleColumn("timestamp")}
          >
            <ClockActionIcon active={visibleColumns.has("timestamp")} />
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
          <ActionIcon
            active={statusActive("Deleted")}
            aria-label="Deleted"
            title="Deleted"
            onClick={() => onStatusChange("Deleted")}
          >
            <DeletedActionIcon active={statusActive("Deleted")} />
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

// Inline rather than an <img> so the inactive state can recolour the ring and
// hand only. The asset version had to be greyed with a CSS filter, which also
// darkened the clock face and turned the whole icon into a solid disc.
function ClockActionIcon({ active }: { active: boolean }) {
  const inactiveFill = "#6B7280"

  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="7 3 31 31">
      <defs>
        <linearGradient id="v3ClockRing" x1="11.53" y1="29.41" x2="33.41" y2="7.54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6558A3" />
          <stop offset="0.47" stopColor="#965CA3" />
          <stop offset="1" stopColor="#A35EA3" />
        </linearGradient>
        <linearGradient id="v3ClockHand" x1="19.2" y1="17.09" x2="28.62" y2="17.09" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6558A3" />
          <stop offset="0.47" stopColor="#965CA3" />
          <stop offset="1" stopColor="#A35EA3" />
        </linearGradient>
      </defs>
      <path
        d="M22.4699 5.24283C29.7647 5.24283 35.697 11.1751 35.697 18.4699C35.697 25.7647 29.7647 31.697 22.4699 31.697C15.1751 31.697 9.24283 25.7647 9.24283 18.4699C9.24283 11.1751 15.1751 5.24283 22.4699 5.24283ZM22.4699 3C13.9247 3 7 9.92474 7 18.4699C7 27.0151 13.9247 33.9399 22.4699 33.9399C31.0151 33.9399 37.9399 27.0151 37.9399 18.4699C37.9399 9.92474 31.0151 3 22.4699 3Z"
        fill={active ? "url(#v3ClockRing)" : inactiveFill}
      />
      <path
        d="M28.2734 25.7704L27.7744 26.1853C27.4211 26.4768 26.9165 26.4768 26.5633 26.1853L21.9991 22.4005L19.5432 20.3651C19.3245 20.1857 19.2012 19.9166 19.2012 19.6362V8.73605C19.2012 8.21459 19.6273 7.78845 20.1488 7.78845H21.0571C21.5786 7.78845 22.0047 8.21459 22.0047 8.73605V18.6718C22.0047 18.9521 22.1281 19.2213 22.3467 19.4007L28.2678 24.3125C28.7276 24.6938 28.7276 25.3947 28.2678 25.7704H28.2734Z"
        fill={active ? "url(#v3ClockHand)" : inactiveFill}
      />
    </svg>
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

function DeletedActionIcon({ active }: { active: boolean }) {
  const inactiveFill = "#6B7280"

  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 20 20">
      <defs>
        <linearGradient id="v3TrashBody" x1="4" y1="4" x2="16" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6B7280" />
          <stop offset="1" stopColor="#374151" />
        </linearGradient>
      </defs>
      <path
        d="M7.5 3.5h5M4.5 5.5h11M6.5 5.5l.7 10.2a1.2 1.2 0 0 0 1.2 1.1h3.2a1.2 1.2 0 0 0 1.2-1.1L13.5 5.5M8.5 8.2v5.6M11.5 8.2v5.6"
        stroke={active ? "url(#v3TrashBody)" : inactiveFill}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.65}
      />
    </svg>
  )
}

function normalizeStatus(status: string) {
  const value = status.trim().toLowerCase()
  if (value === "on hold" || value === "on-hold") return "on hold"
  if (value === "cancelled" || value === "canceled") return "cancelled"
  if (value === "deleted") return "deleted"
  return value
}

export { DEFAULT_VISIBLE }
