import { afterEach, expect, it, vi } from 'vitest'
import { uuid } from './uuid'

afterEach(() => vi.restoreAllMocks())

it('creates UUID v4 IDs, preserving random bits and setting version and variant', () => {
  vi.spyOn(crypto, 'getRandomValues').mockImplementationOnce((array) => {
    ;(array as Uint8Array).set([
      0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0xff, 0xdc, 0xba, 0x98, 0x76, 0x54,
      0x32, 0x10,
    ])
    return array
  })
  expect(uuid()).toBe('01234567-89ab-4def-bfdc-ba9876543210')
  const ids = Array.from({ length: 100 }, uuid)
  expect(new Set(ids).size).toBe(ids.length)
  for (const id of ids)
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
})
