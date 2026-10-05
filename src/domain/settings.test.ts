import { describe, expect, it } from 'vitest'
import { compactSettings, resolveSettings } from './settings'

describe('resolveSettings', () => {
  it('lets later layers override and empty values inherit', () => {
    const result = resolveSettings(
      { systemPrompt: 'global', options: { temperature: 0.7, num_ctx: 4096 } },
      { systemPrompt: '  ', options: { temperature: 0.2 } },
      { think: 'high', options: { num_ctx: Number.NaN } },
    )
    expect(result).toEqual({
      systemPrompt: 'global',
      think: 'high',
      options: { temperature: 0.2, num_ctx: 4096 },
    })
  })

  it('compacts empty settings to undefined', () => {
    expect(compactSettings({ systemPrompt: '', options: {} })).toBeUndefined()
  })
})
