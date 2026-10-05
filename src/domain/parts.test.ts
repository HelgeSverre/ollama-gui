import { describe, expect, it } from 'vitest'
import { applyEvent, partsFromLegacyContent, textOf, ThinkTagSplitter, type ChatEvent } from './parts'
import type { Part } from './types'

const feed = (chunks: string[]) => {
  const s = new ThinkTagSplitter()
  const events = chunks.flatMap((c) => s.push(c)).concat(s.flush())
  const parts: Part[] = []
  events.forEach((e) => applyEvent(parts, e, 0))
  return parts
}

describe('applyEvent', () => {
  it('times reasoning from first token to first answer token', () => {
    const parts: Part[] = []
    applyEvent(parts, { type: 'reasoning', text: 'hm' }, 1000)
    applyEvent(parts, { type: 'reasoning', text: 'm' }, 1500)
    applyEvent(parts, { type: 'text', text: 'Hi' }, 4000)
    applyEvent(parts, { type: 'text', text: '!' }, 4100)
    expect(parts).toEqual([
      { type: 'reasoning', text: 'hmm', durationMs: 3000 },
      { type: 'text', text: 'Hi!' },
    ])
  })

  it('returns finish meta and closes open reasoning', () => {
    const parts: Part[] = []
    applyEvent(parts, { type: 'reasoning', text: 'x' }, 0)
    const meta = applyEvent(parts, { type: 'finish', meta: { evalTokens: 3 } } as ChatEvent, 50)
    expect(meta).toEqual({ evalTokens: 3 })
    expect(parts[0]).toMatchObject({ durationMs: 50 })
  })

  it('records tool calls as parts', () => {
    const parts: Part[] = []
    applyEvent(parts, { type: 'tool-call', name: 'get_time', args: { tz: 'UTC' } }, 0)
    expect(parts[0]).toMatchObject({ type: 'tool-call', name: 'get_time', state: 'done' })
  })
})

describe('ThinkTagSplitter', () => {
  it('passes plain text through', () => {
    expect(feed(['Hello', ' world'])).toEqual([{ type: 'text', text: 'Hello world' }])
  })

  it('splits think tags split across chunks', () => {
    const parts = feed(['<thi', 'nk>reason', 'ing</th', 'ink>\n\nAnswer'])
    expect(parts).toMatchObject([
      { type: 'reasoning', text: 'reasoning' },
      { type: 'text', text: 'Answer' },
    ])
  })

  it('emits unterminated reasoning on flush', () => {
    expect(feed(['<think>still going'])).toMatchObject([{ type: 'reasoning', text: 'still going' }])
  })

  it('does not treat a later <think> as reasoning', () => {
    expect(textOf(feed(['Use <think> tags']))).toBe('Use <think> tags')
  })
})

describe('partsFromLegacyContent', () => {
  it('extracts think blocks and inline images', () => {
    const parts = partsFromLegacyContent('<think>plan</think>Look\n\n![image](data:image/png;base64,QUJD)')
    expect(parts).toEqual([
      { type: 'reasoning', text: 'plan', durationMs: 0 },
      { type: 'file', mediaType: 'image/png', name: 'image-1', data: 'QUJD' },
      { type: 'text', text: 'Look' },
    ])
  })
})
