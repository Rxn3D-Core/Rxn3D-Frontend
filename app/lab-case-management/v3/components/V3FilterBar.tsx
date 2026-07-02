"use client"

import { Search, SlidersHorizontal, Columns } from "lucide-react"
import { Input } from "@/components/ui/input"
import { SLIP_LOCATION_FILTER_OPTIONS } from "@/app/lab-case-management/lab-slip-listing-constants"

const GRADIENT = "linear-gradient(231.46deg, #2AA6DE -14.5%, #82298D 51.11%, #C9539F 116.71%)"

const ALL_TAB = { id: 0, label: "All" }
const LOCATION_TABS = [ALL_TAB, ...SLIP_LOCATION_FILTER_OPTIONS]

interface Props {
  search: string
  onSearchChange: (value: string) => void
  onSearchEnter: () => void
  location: string
  onLocationChange: (value: string) => void
}

export function V3FilterBar({ search, onSearchChange, onSearchEnter, location, onLocationChange }: Props) {
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
        <IconBtn aria-label="Filters"><SlidersHorizontal className="h-4 w-4" /></IconBtn>
        <IconBtn aria-label="Columns"><Columns className="h-4 w-4" /></IconBtn>
      </div>

      {/* Location pill tabs + action icons — all on the same row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex flex-wrap items-center gap-1.5">
          {LOCATION_TABS.map((tab) => {
            const value = tab.id === 0 ? "All" : String(tab.id)
            const active = location === value
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => onLocationChange(active && value !== "All" ? "All" : value)}
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
                    {/* gradient border via pseudo-element replacement: box-shadow outline */}
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

        {/* Always-visible action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <ActionIcon aria-label="Stage history" title="Stage history">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </ActionIcon>
          <ActionIcon aria-label="Resume" title="Resume" className="text-[#16a34a] hover:bg-[#dcfce7]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </ActionIcon>
          <ActionIcon aria-label="Pause" title="Pause">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </ActionIcon>
          <ActionIcon aria-label="Cancel" title="Cancel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </ActionIcon>
          <ActionIcon aria-label="Complete" title="Mark complete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </ActionIcon>
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

function ActionIcon({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#6b7280] transition-colors hover:bg-[#f3f4f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ca3af] ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
