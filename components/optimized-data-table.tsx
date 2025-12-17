"use client"

import { useState, useMemo, useCallback, memo } from "react"
import { useVirtualScroll, debounce, useOptimizedHandler } from "@/lib/performance-optimizations"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, Search, Filter } from "lucide-react"

interface DataTableProps<T> {
  data: T[]
  columns: {
    key: keyof T
    label: string
    sortable?: boolean
    width?: string
  }[]
  searchKeys?: (keyof T)[]
  pageSize?: number
  height?: number
  rowHeight?: number
  onRowClick?: (item: T) => void
  loading?: boolean
}

// Memoized table row component
const TableRow = memo(<T extends Record<string, any>>({ 
  item, 
  columns, 
  onRowClick,
  rowHeight 
}: { 
  item: T
  columns: DataTableProps<T>['columns']
  onRowClick?: (item: T) => void
  rowHeight: number
}) => {
  const handleClick = useOptimizedHandler(() => {
    onRowClick?.(item)
  }, [onRowClick, item])

  return (
    <tr 
      className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
      style={{ height: rowHeight }}
      onClick={handleClick}
    >
      {columns.map((column) => (
        <td 
          key={String(column.key)}
          className="px-4 py-2 text-sm"
          style={{ width: column.width }}
        >
          {String(item[column.key] || '')}
        </td>
      ))}
    </tr>
  )
})
TableRow.displayName = "TableRow"

// Memoized table header component
const TableHeader = memo(<T extends Record<string, any>>({ 
  columns, 
  sortColumn, 
  sortDirection, 
  onSort 
}: { 
  columns: DataTableProps<T>['columns']
  sortColumn: keyof T | null
  sortDirection: 'asc' | 'desc' | null
  onSort: (column: keyof T) => void
}) => {
  const handleSort = useOptimizedHandler((column: keyof T) => {
    if (column.sortable !== false) {
      onSort(column)
    }
  }, [onSort])

  return (
    <thead className="bg-gray-50 sticky top-0 z-10">
      <tr>
        {columns.map((column) => (
          <th 
            key={String(column.key)}
            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
            style={{ width: column.width }}
            onClick={() => handleSort(column.key)}
          >
            <div className="flex items-center gap-1">
              {column.label}
              {column.sortable !== false && sortColumn === column.key && (
                sortDirection === 'asc' ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  )
})
TableHeader.displayName = "TableHeader"

// Main optimized data table component
export const OptimizedDataTable = memo(<T extends Record<string, any>>({
  data,
  columns,
  searchKeys = [],
  pageSize = 25,
  height = 600,
  rowHeight = 48,
  onRowClick,
  loading = false
}: DataTableProps<T>) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = data

    // Apply search filter
    if (searchTerm && searchKeys.length > 0) {
      const searchLower = searchTerm.toLowerCase()
      filtered = data.filter(item =>
        searchKeys.some(key => 
          String(item[key]).toLowerCase().includes(searchLower)
        )
      )
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [data, searchTerm, searchKeys, sortColumn, sortDirection])

  // Memoized paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return processedData.slice(startIndex, startIndex + pageSize)
  }, [processedData, currentPage, pageSize])

  // Virtual scroll for large datasets
  const { visibleItems, totalHeight, offsetY, setScrollTop } = useVirtualScroll(
    paginatedData,
    rowHeight,
    height - 120, // Account for header and pagination
    5 // overscan
  )

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setSearchTerm(term)
      setCurrentPage(1) // Reset to first page when searching
    }, 300),
    []
  )

  // Optimized event handlers
  const handleSearchChange = useOptimizedHandler((e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value)
  }, [debouncedSearch])

  const handleSort = useOptimizedHandler((column: keyof T) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }, [sortColumn, sortDirection])

  const handlePageChange = useOptimizedHandler((page: number) => {
    setCurrentPage(page)
    setScrollTop(0) // Reset scroll position
  }, [setScrollTop])

  const totalPages = Math.ceil(processedData.length / pageSize)

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Search and Controls */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              className="pl-10"
              onChange={handleSearchChange}
            />
          </div>
          <div className="text-sm text-gray-500">
            {processedData.length} of {data.length} items
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative" style={{ height }}>
        <div 
          className="overflow-auto"
          style={{ height: height - 120 }}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
          <table className="w-full">
            <TableHeader
              columns={columns}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <tbody>
              <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                  {visibleItems.map((item, index) => (
                    <TableRow
                      key={`${item.id || index}-${offsetY}`}
                      item={item}
                      columns={columns}
                      onRowClick={onRowClick}
                      rowHeight={rowHeight}
                    />
                  ))}
                </div>
              </div>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      )}
    </div>
  )
})
OptimizedDataTable.displayName = "OptimizedDataTable" 