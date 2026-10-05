import { describe, expect, it } from 'vitest'
import {
  dateGroup,
  dateGroupLabel,
  formatBytes,
  formatDuration,
  relativeTime,
  resolveLocale,
} from './format'

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

describe('formatBytes', () => {
  it('uses decimal units and the locale', () => {
    expect(formatBytes(512, 'en-US')).toBe('512 B')
    expect(formatBytes(4_700_000_000, 'en-US')).toBe('4.7 GB')
    expect(formatBytes(4_700_000_000, 'de-DE')).toBe('4,7 GB')
  })
})

describe('dateGroupLabel', () => {
  it('names fixed groups and formats month groups in the locale', () => {
    expect(dateGroupLabel('week', 'en-US')).toBe('Previous 7 days')
    expect(dateGroupLabel('2020-03', 'en-US')).toBe('March 2020')
    expect(dateGroupLabel('2020-03', 'de-DE')).toBe('März 2020')
  })
})
