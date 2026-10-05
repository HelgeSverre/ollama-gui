/** Validates a BCP 47 tag; falls back to the browser locale for empty or unsupported values. */
export function resolveLocale(preferred: string | undefined, fallback = defaultLocale()): string {
  const tag = preferred?.trim()
  if (!tag) return fallback
  try {
    return Intl.DateTimeFormat.supportedLocalesOf(tag)[0] ?? fallback
  } catch {
    return fallback
  }
}

function defaultLocale() {
  return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function relativeTime(date: Date, locale: string, now = Date.now()): string {
  const seconds = Math.round((date.getTime() - now) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(0, 'second')
}

export function formatBytes(bytes: number, locale: string): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unit = 0
  while (size >= 1000 && unit < units.length - 1) {
    size /= 1000
    unit++
  }
  const value = new Intl.NumberFormat(locale, { maximumFractionDigits: unit ? 1 : 0 }).format(size)
  return `${value} ${units[unit]}`
}

export function formatDuration(ms: number): string {
  const s = ms / 1000
  if (s < 1) return `${Math.round(ms)}ms`
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)}s`
  const m = Math.floor(s / 60)
  return `${m}m ${Math.round(s % 60)}s`
}

export type DateGroup = 'today' | 'yesterday' | 'week' | 'month' | string

/** Sidebar bucket for a date: today, yesterday, previous 7/30 days, else `YYYY-MM`. */
export function dateGroup(date: Date, now = new Date()): DateGroup {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const day = 24 * 3600 * 1000
  const t = date.getTime()
  if (t >= startOfToday) return 'today'
  if (t >= startOfToday - day) return 'yesterday'
  if (t >= startOfToday - 7 * day) return 'week'
  if (t >= startOfToday - 30 * day) return 'month'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function dateGroupLabel(group: DateGroup, locale: string): string {
  switch (group) {
    case 'today':
      return 'Today'
    case 'yesterday':
      return 'Yesterday'
    case 'week':
      return 'Previous 7 days'
    case 'month':
      return 'Previous 30 days'
  }
  const [year, month] = group.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  const sameYear = year === new Date().getFullYear()
  return new Intl.DateTimeFormat(locale, sameYear ? { month: 'long' } : { month: 'long', year: 'numeric' }).format(date)
}
