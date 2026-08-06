import { describe, it, expect } from 'vitest'

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0
  return Math.abs(hash)
}

describe('appConfig', () => {
  describe('hashString', () => {
    it('produces a positive integer', () => {
      expect(hashString('test')).toBeGreaterThan(0)
      expect(Number.isInteger(hashString('test'))).toBe(true)
    })

    it('is deterministic', () => {
      expect(hashString('hello')).toBe(hashString('hello'))
    })

    it('produces different hashes for different inputs', () => {
      expect(hashString('hello')).not.toBe(hashString('world'))
    })

    it('handles empty string', () => {
      expect(hashString('')).toBe(0)
    })
  })
})
