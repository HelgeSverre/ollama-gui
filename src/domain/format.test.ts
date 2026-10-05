import { describe, expect, it } from 'vitest'
import { dateGroup, formatDuration, relativeTime, resolveLocale } from './format'

describe('resolveLocale', () => {
  it('falls back for empty or invalid tags', () => {
    expect(resolveLocale('', 'nb-NO')).toBe('nb-NO')
    expect(resolveLocale('not a locale!!', 'nb-NO')).toBe('nb-NO')
  })

  it('accepts valid tags', () => {
    expect(resolveLocale('de-DE', 'en-US')).toBe('de-DE')
  })
})

describe('relativeTime', () => {
  it('formats in the given locale', () => {
    const now = Date.UTC(2026, 0, 10)
    expect(relativeTime(new Date(now - 3 * 3600_000), 'en-US', now)).toBe('3 hours ago')
    expect(relativeTime(new Date(now - 2 * 86400_000), 'de-DE', now)).toBe('vorgestern')
  })
})

describe('dateGroup', () => {
  const now = new Date(2026, 5, 15, 12)
  it('buckets dates', () => {
    expect(dateGroup(new Date(2026, 5, 15, 1), now)).toBe('today')
    expect(dateGroup(new Date(2026, 5, 14, 23), now)).toBe('yesterday')
    expect(dateGroup(new Date(2026, 5, 10), now)).toBe('week')
    expect(dateGroup(new Date(2026, 4, 25), now)).toBe('month')
    expect(dateGroup(new Date(2025, 11, 1), now)).toBe('2025-12')
  })
})

describe('formatDuration', () => {
  it('scales units', () => {
    expect(formatDuration(450)).toBe('450ms')
    expect(formatDuration(2500)).toBe('2.5s')
    expect(formatDuration(75_000)).toBe('1m 15s')
  })
})
