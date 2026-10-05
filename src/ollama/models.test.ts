import { afterEach, describe, expect, it, vi } from 'vitest'
import { pullModel, toModelInfo } from './models'

vi.mock('../composables/useSettings', async () => {
  const { ref } = await import('vue')
  return { ollamaUrl: ref('http://ollama.test') }
})

afterEach(() => vi.unstubAllGlobals())

describe('toModelInfo', () => {
  it('reads capabilities and the context length from model_info', () => {
    const info = toModelInfo('llama3.2', {
      capabilities: ['completion', 'tools'],
      model_info: { 'general.architecture': 'llama', 'llama.context_length': 131072 },
    })
    expect(info.capabilities).toEqual(['completion', 'tools'])
    expect(info.contextLength).toBe(131072)
    expect(info.thinkLevels).toBeUndefined()
  })

  it('offers effort levels only for gpt-oss thinking models', () => {
    expect(
      toModelInfo('gpt-oss:20b', {
        capabilities: ['thinking'],
        details: { family: 'gptoss' },
      }).thinkLevels,
    ).toEqual(['low', 'medium', 'high'])
    expect(
      toModelInfo('qwen3', { capabilities: ['thinking'] }).thinkLevels,
    ).toBeUndefined()
  })

  it('tolerates a missing capabilities field (older Ollama)', () => {
    expect(toModelInfo('x', {}).capabilities).toEqual([])
  })
})

describe('pullModel', () => {
  it('sums progress across layers', async () => {
    const lines = [
      { status: 'pulling manifest' },
      { status: 'pulling a', digest: 'a', total: 100, completed: 50 },
      { status: 'pulling b', digest: 'b', total: 300, completed: 0 },
      { status: 'pulling b', digest: 'b', total: 300, completed: 150 },
      { status: 'success' },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(lines.map((l) => JSON.stringify(l)).join('\n') + '\n'),
      ),
    )
    const states = []
    for await (const s of pullModel('x')) states.push(s)
    expect(states.map((s) => [s.completed, s.total])).toEqual([
      [0, 0],
      [50, 100],
      [50, 400],
      [200, 400],
      [200, 400],
    ])
    expect(states.at(-1)?.status).toBe('success')
  })
})
