/**
 * IMPLANT_LIBRARY CSV template (row 1 = header).
 * Order is fixed for validation and preview (matches sample spreadsheet).
 * 1 brand · 2 system · 3 platform · 4 diameter_mm · 5 length_mm · 6 display_label
 */
export const IMPLANT_LIBRARY_CSV_HEADERS = [
  "brand",
  "system",
  "platform",
  "diameter_mm",
  "length_mm",
  "display_label",
] as const

export type ImplantLibraryCsvHeader = (typeof IMPLANT_LIBRARY_CSV_HEADERS)[number]

export type ImplantLibraryCsvRow = Record<ImplantLibraryCsvHeader, string>

export type ParsedImplantLibraryRow = {
  /** 1-based line number in the file (including header as line 1) */
  lineNumber: number
  values: ImplantLibraryCsvRow
  errors: string[]
  isValid: boolean
}

export type ImplantLibraryCsvParseResult = {
  ok: boolean
  headerErrors: string[]
  /** Non-header issues (e.g. no data rows) */
  fileWarnings: string[]
  /** Raw header cells from first row (trimmed) */
  rawHeaders: string[]
  rows: ParsedImplantLibraryRow[]
  /** Rows with no validation errors */
  validRowCount: number
  invalidRowCount: number
  totalDataRows: number
  uniqueBrands: number
  uniqueSystems: number
  /** Distinct platform values across valid rows */
  uniquePlatforms: number
}

/** Strip UTF-8 BOM if present */
function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1)
  return text
}

/**
 * Split a single CSV line into fields (supports "quoted","fields" with commas).
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        const next = line[i + 1]
        if (next === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ",") {
        out.push(cur)
        cur = ""
      } else {
        cur += c
      }
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function normalizeHeaderCell(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "_")
}

function validateHeaderRow(cells: string[]): string[] {
  const errs: string[] = []
  if (cells.length === 0 || (cells.length === 1 && cells[0] === "")) {
    errs.push("The first row must be the header row with six column names.")
    return errs
  }
  if (cells.length !== IMPLANT_LIBRARY_CSV_HEADERS.length) {
    errs.push(
      `Expected exactly ${IMPLANT_LIBRARY_CSV_HEADERS.length} columns in the header row, found ${cells.length}. Required: ${IMPLANT_LIBRARY_CSV_HEADERS.join(", ")}.`,
    )
    return errs
  }
  const expected = [...IMPLANT_LIBRARY_CSV_HEADERS]
  for (let i = 0; i < expected.length; i++) {
    const got = normalizeHeaderCell(cells[i] ?? "")
    const want = expected[i]!
    if (got !== want) {
      errs.push(
        `Column ${i + 1} must be "${want}" (found "${(cells[i] ?? "").trim() || "(empty)"}"). Use lowercase names and the exact order shown in the template.`,
      )
    }
  }
  return errs
}

function isPositiveNumberCell(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  const n = Number(t)
  return Number.isFinite(n) && n > 0
}

function validateDataRow(values: ImplantLibraryCsvRow): string[] {
  const errs: string[] = []
  const req: ImplantLibraryCsvHeader[] = ["brand", "system", "display_label", "platform"]
  for (const key of req) {
    if (!values[key]?.trim()) {
      errs.push(`${key} is required`)
    }
  }
  if (!isPositiveNumberCell(values.diameter_mm)) {
    errs.push("diameter_mm must be a positive number")
  }
  if (!isPositiveNumberCell(values.length_mm)) {
    errs.push("length_mm must be a positive number")
  }
  return errs
}

function rowObject(cells: string[]): ImplantLibraryCsvRow {
  const o = {} as ImplantLibraryCsvRow
  for (let i = 0; i < IMPLANT_LIBRARY_CSV_HEADERS.length; i++) {
    o[IMPLANT_LIBRARY_CSV_HEADERS[i]] = cells[i] ?? ""
  }
  return o
}

/**
 * Parse full file text: first row = headers; following non-empty lines = data.
 */
export function parseImplantLibraryCsv(text: string): ImplantLibraryCsvParseResult {
  const raw = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = raw.split("\n")

  const headerErrors: string[] = []
  let rawHeaders: string[] = []

  const firstNonEmptyIdx = lines.findIndex((l) => l.trim().length > 0)
  if (firstNonEmptyIdx === -1) {
    return {
      ok: false,
      headerErrors: ["File is empty."],
      fileWarnings: [],
      rawHeaders: [],
      rows: [],
      validRowCount: 0,
      invalidRowCount: 0,
      totalDataRows: 0,
      uniqueBrands: 0,
      uniqueSystems: 0,
      uniquePlatforms: 0,
    }
  }

  rawHeaders = splitCsvLine(lines[firstNonEmptyIdx]!)
  headerErrors.push(...validateHeaderRow(rawHeaders))
  const headerOk = headerErrors.length === 0

  const rows: ParsedImplantLibraryRow[] = []
  if (!headerOk) {
    return {
      ok: false,
      headerErrors,
      fileWarnings: [],
      rawHeaders,
      rows: [],
      validRowCount: 0,
      invalidRowCount: 0,
      totalDataRows: 0,
      uniqueBrands: 0,
      uniqueSystems: 0,
      uniquePlatforms: 0,
    }
  }

  const brandSet = new Set<string>()
  const systemSet = new Set<string>()
  const platformSet = new Set<string>()

  for (let i = firstNonEmptyIdx + 1; i < lines.length; i++) {
    const line = lines[i]!
    if (!line.trim()) continue
    const lineNumber = i + 1
    const cells = splitCsvLine(line)
    if (cells.length === 1 && cells[0] === "") continue

    const pad = [...cells]
    while (pad.length < IMPLANT_LIBRARY_CSV_HEADERS.length) pad.push("")
    const truncated = pad.slice(0, IMPLANT_LIBRARY_CSV_HEADERS.length)
    const extraCols = cells.length > IMPLANT_LIBRARY_CSV_HEADERS.length

    const values = rowObject(truncated)
    const errors: string[] = []
    if (extraCols) {
      errors.push(`Expected ${IMPLANT_LIBRARY_CSV_HEADERS.length} columns, found ${cells.length}`)
    } else if (cells.length < IMPLANT_LIBRARY_CSV_HEADERS.length) {
      errors.push(`Expected ${IMPLANT_LIBRARY_CSV_HEADERS.length} columns, found ${cells.length}`)
    }
    errors.push(...validateDataRow(values))

    const isValid = errors.length === 0
    rows.push({ lineNumber, values, errors, isValid })
    if (isValid) {
      brandSet.add(values.brand.trim())
      systemSet.add(values.system.trim())
      platformSet.add(values.platform.trim())
    }
  }

  const validRowCount = rows.filter((r) => r.isValid).length
  const invalidRowCount = rows.length - validRowCount

  const fileWarnings: string[] = []
  if (rows.length === 0) {
    fileWarnings.push("No data rows found after the header. Add at least one implant row below the header.")
  }

  return {
    ok: headerOk && invalidRowCount === 0 && rows.length > 0,
    headerErrors,
    fileWarnings,
    rawHeaders,
    rows,
    validRowCount,
    invalidRowCount,
    totalDataRows: rows.length,
    uniqueBrands: brandSet.size,
    uniqueSystems: systemSet.size,
    uniquePlatforms: platformSet.size,
  }
}

export function implantLibraryCsvTemplateRow(): string {
  return IMPLANT_LIBRARY_CSV_HEADERS.join(",")
}
