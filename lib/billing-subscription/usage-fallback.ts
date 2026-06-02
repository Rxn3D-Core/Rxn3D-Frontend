type SlipUsageLike = {
  timestamp?: string | null
  created_at?: string | null
}

export type UsagePeriod = {
  start: Date
  end: Date
}

function toValidDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function resolveUsagePeriod(
  periodStart?: string | null,
  periodEnd?: string | null,
  now: Date = new Date()
): UsagePeriod {
  const start = toValidDate(periodStart)
  const end = toValidDate(periodEnd)

  if (start && end) {
    return { start, end }
  }

  const fallbackStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const fallbackEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  )

  return {
    start: start ?? fallbackStart,
    end: end ?? fallbackEnd,
  }
}

export function countSlipUsageInPeriod(
  slips: SlipUsageLike[],
  period: UsagePeriod
): number {
  return slips.reduce((count, slip) => {
    const timestamp = toValidDate(slip.timestamp ?? slip.created_at)
    if (!timestamp) return count
    if (timestamp < period.start || timestamp > period.end) return count
    return count + 1
  }, 0)
}
