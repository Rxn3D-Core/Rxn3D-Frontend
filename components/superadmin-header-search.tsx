"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Building2, FlaskConical, Search, User as UserIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import {
  searchSuperadminLabCustomers,
  searchSuperadminOfficeCustomers,
  type SuperadminCustomer,
} from "@/lib/api/superadmin-customers"
import { cn } from "@/lib/utils"

type UserHit = {
  id: number
  name: string
  email: string
}

type SearchResults = {
  labs: SuperadminCustomer[]
  offices: SuperadminCustomer[]
  users: UserHit[]
}

const EMPTY_RESULTS: SearchResults = { labs: [], offices: [], users: [] }
const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300
const RESULT_LIMIT = 5

function mapUserHit(user: {
  id?: number
  first_name?: string
  last_name?: string
  email?: string
}): UserHit | null {
  if (!user?.id) return null
  const name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || `User #${user.id}`
  return { id: user.id, name, email: user.email || "" }
}

export function SuperadminHeaderSearch({ className }: { className?: string }) {
  const router = useRouter()
  const { fetchUsers } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const requestIdRef = useRef(0)

  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)

  const hasResults =
    results.labs.length > 0 || results.offices.length > 0 || results.users.length > 0

  const runSearch = useCallback(
    async (raw: string) => {
      const q = raw.trim()
      if (q.length < MIN_QUERY_LENGTH) {
        setResults(EMPTY_RESULTS)
        setLoading(false)
        return
      }

      const requestId = ++requestIdRef.current
      setLoading(true)

      try {
        const [labsRes, officesRes, usersRes] = await Promise.all([
          searchSuperadminLabCustomers({ q, per_page: RESULT_LIMIT, order_by: "name", sort_by: "asc" }),
          searchSuperadminOfficeCustomers({ q, per_page: RESULT_LIMIT, order_by: "name", sort_by: "asc" }),
          fetchUsers({ q, per_page: RESULT_LIMIT, order_by: "first_name", sort_by: "asc", page: 1 }),
        ])

        if (requestId !== requestIdRef.current) return

        const usersRaw = Array.isArray(usersRes?.data) ? usersRes.data : Array.isArray(usersRes) ? usersRes : []
        setResults({
          labs: labsRes.data.slice(0, RESULT_LIMIT),
          offices: officesRes.data.slice(0, RESULT_LIMIT),
          users: usersRaw.map(mapUserHit).filter(Boolean).slice(0, RESULT_LIMIT) as UserHit[],
        })
      } catch {
        if (requestId !== requestIdRef.current) return
        setResults(EMPTY_RESULTS)
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    },
    [fetchUsers]
  )

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_QUERY_LENGTH) {
      setResults(EMPTY_RESULTS)
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = window.setTimeout(() => {
      void runSearch(q)
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [query, runSearch])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  const navigateTo = (href: string) => {
    setOpen(false)
    setQuery("")
    setResults(EMPTY_RESULTS)
    router.push(href)
  }

  const showPanel = open && query.trim().length >= MIN_QUERY_LENGTH

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
      <Input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search labs, offices, users..."
        className="w-full pl-10 pr-4 h-8 sm:h-9 md:h-10 text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1162a8] focus:border-[#1162a8] dark:bg-gray-800 dark:border-gray-700"
        aria-label="Search labs, offices, and users"
        autoComplete="off"
      />

      {showPanel && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {loading && !hasResults ? (
            <p className="px-3 py-3 text-sm text-gray-500">Searching...</p>
          ) : !hasResults ? (
            <p className="px-3 py-3 text-sm text-gray-500">No matches found</p>
          ) : (
            <div className="py-1">
              {results.labs.length > 0 && (
                <ResultSection title="Labs" icon={<FlaskConical className="h-3.5 w-3.5" />}>
                  {results.labs.map((lab) => (
                    <ResultRow
                      key={`lab-${lab.id}`}
                      primary={lab.name}
                      secondary={lab.unique_code || lab.email}
                      onClick={() =>
                        navigateTo(`/lab-office-management/all-labs?q=${encodeURIComponent(lab.name)}`)
                      }
                    />
                  ))}
                </ResultSection>
              )}
              {results.offices.length > 0 && (
                <ResultSection title="Offices" icon={<Building2 className="h-3.5 w-3.5" />}>
                  {results.offices.map((office) => (
                    <ResultRow
                      key={`office-${office.id}`}
                      primary={office.name}
                      secondary={office.unique_code || office.email}
                      onClick={() =>
                        navigateTo(
                          `/lab-office-management/all-offices?q=${encodeURIComponent(office.name)}`
                        )
                      }
                    />
                  ))}
                </ResultSection>
              )}
              {results.users.length > 0 && (
                <ResultSection title="Users" icon={<UserIcon className="h-3.5 w-3.5" />}>
                  {results.users.map((user) => (
                    <ResultRow
                      key={`user-${user.id}`}
                      primary={user.name}
                      secondary={user.email}
                      onClick={() =>
                        navigateTo(
                          `/lab-office-management/all-users?q=${encodeURIComponent(
                            user.email || user.name
                          )}`
                        )
                      }
                    />
                  ))}
                </ResultSection>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}

function ResultRow({
  primary,
  secondary,
  onClick,
}: {
  primary: string
  secondary?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate w-full">
        {primary}
      </span>
      {secondary ? (
        <span className="text-xs text-gray-500 truncate w-full">{secondary}</span>
      ) : null}
    </button>
  )
}
